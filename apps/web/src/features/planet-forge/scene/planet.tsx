import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Group } from "three";
import {
	AdditiveBlending,
	BackSide,
	DoubleSide,
	Quaternion,
	Vector3,
} from "three";
import { PLANET_TYPES } from "../lib/planet-presets";
import type { CelestialBody } from "../lib/types";
import { useSimStore } from "../lib/use-simulation-socket";
import { CometNucleus } from "./comet-body";
import { CometTrail } from "./comet-trail";
import { PlanetFormation } from "./planet-formation";
import { RingDebris } from "./ring-debris";
import {
	ATMOSPHERE_FRAG,
	CLOUD_FRAG,
	SURFACE_FRAG,
	SURFACE_VERT,
} from "./shaders";

const v3 = (a: [number, number, number]) => new Vector3(a[0], a[1], a[2]);
const SUN_DIR = new Vector3(1, 0.25, 0.6).normalize();
const UP = new Vector3(0, 1, 0);
const CRATER_FORWARD = new Vector3(0, 0, 1);
const MAX_CRATERS = 12;

interface Crater {
	dir: [number, number, number];
	id: number;
	size: number;
}

export function Planet({
	body,
	selected,
	onSelect,
	onFocus,
	forming = false,
}: {
	body: CelestialBody;
	selected: boolean;
	onSelect: (id: string) => void;
	onFocus: (id: string) => void;
	forming?: boolean;
}) {
	const meta = PLANET_TYPES[body.type];
	const r = body.config.radius;
	// Axial tilt (radians) — tilts the spin axis and the ring/moon plane together
	// so rings sit on the planet's equator. Defaults to a gentle Earth-like lean.
	const tiltRad = body.config.tilt ?? 0.4;
	const group = useRef<Group>(null);
	const spin = useRef<Group>(null);
	const moonRefs = useRef<Group[]>([]);
	const moonList = useMemo(() => {
		const list: {
			orbitRadius: number;
			speed: number;
			angle: number;
			inclination: number;
			size: number;
			color: string;
		}[] = [];
		const count = Math.min(4, body.config.moons || 0);
		// Moons sit clear of the planet (and its rings) and are scaled well below
		// it — a moon is a small fraction of its planet, never a sibling. The first
		// moon is the largest (Earth's Moon ≈ 0.27 R⊕); the rest taper down.
		const moonScales = [0.2, 0.13, 0.09, 0.07];
		for (let i = 0; i < count; i++) {
			const startRad = r * (body.config.rings ? 2.9 : 2.0);
			const orbitRadius = startRad + i * (r * 0.6) + Math.random() * (r * 0.2);
			const speed =
				(0.6 / Math.sqrt(orbitRadius)) * (0.8 + Math.random() * 0.4);
			list.push({
				orbitRadius,
				speed,
				angle: Math.random() * Math.PI * 2,
				inclination: (Math.random() - 0.5) * 0.3,
				size: r * moonScales[i] * (0.85 + Math.random() * 0.3),
				color: ["#8fa3ad", "#bfb49e", "#888c8f", "#ababab"][i % 4],
			});
		}
		return list;
	}, [r, body.config.moons, body.config.rings]);
	// Forge-formation progress, 0 (molten core) → 1 (finished world).
	const formProgress = useRef(forming ? 0 : 1);
	// Accumulated impact craters (in the spinning surface's local frame).
	const [craters, setCraters] = useState<Crater[]>([]);
	const craterSeq = useRef(0);
	const seed = useMemo(
		() =>
			new Vector3(
				Math.random() * 100,
				Math.random() * 100,
				Math.random() * 100
			),
		[]
	);

	const surfaceUniforms = useMemo(
		() => ({
			uTime: { value: 0 },
			uFreq: { value: body.type === "gas" ? 1.4 : 2.4 },
			uWater: { value: meta?.water ?? 0.0 },
			uIce: { value: meta?.ice ?? 0.0 },
			uBanded: { value: meta?.banded ?? 0.0 },
			uEmissive: { value: meta?.emissive ?? 0.0 },
			uClouds: { value: body.config.clouds ? 1.0 : 0.0 },
			uSunDir: { value: SUN_DIR.clone() },
			uOcean: { value: v3(meta?.ocean ?? [0, 0, 0]) },
			uLand1: { value: v3(meta?.land1 ?? [0, 0, 0]) },
			uLand2: { value: v3(meta?.land2 ?? [0, 0, 0]) },
			uSeed: { value: seed },
			uForm: { value: forming ? 0 : 1 },
		}),
		[meta, seed, body.type, body.config.clouds, forming]
	);

	const cloudUniforms = useMemo(
		() => ({
			uTime: { value: 0 },
			uSunDir: { value: SUN_DIR.clone() },
			uSeed: { value: Math.random() * 100 },
		}),
		[]
	);

	const atmoUniforms = useMemo(
		() => ({
			uColor: { value: v3(meta?.atmo ?? [1, 1, 1]) },
			uPow: { value: 3.2 },
			uCoef: { value: 0.62 },
			uStrength: { value: (meta?.atmoStr ?? 0.0) * body.config.atmosphere },
			uSunDir: { value: SUN_DIR.clone() },
			uTime: { value: 0 },
		}),
		[meta, body.config.atmosphere]
	);

	useFrame((_, dt) => {
		surfaceUniforms.uTime.value += dt;
		cloudUniforms.uTime.value += dt;
		atmoUniforms.uTime.value += dt;
		if (spin.current) {
			spin.current.rotation.y += (body.type === "gas" ? 0.08 : 0.05) * dt;
		}
		const p = useSimStore.getState().positions[body.id];
		if (p && group.current) {
			group.current.position.set(p[0], p[1], p[2]);
		}

		// Turn any pending comet impacts into craters fixed to the spinning surface.
		const impacts = useSimStore.getState().takeImpacts(body.id);
		if (impacts.length > 0 && group.current) {
			const center = group.current.position;
			const spinY = spin.current?.rotation.y ?? 0;
			const fresh: Crater[] = impacts.map((im) => {
				const dir = new Vector3(
					im.pos[0] - center.x,
					im.pos[1] - center.y,
					im.pos[2] - center.z
				)
					.normalize()
					.applyAxisAngle(UP, -spinY); // world → spin-local
				return {
					id: craterSeq.current++,
					dir: [dir.x, dir.y, dir.z],
					size: Math.max(0.18, im.size * 0.6),
				};
			});
			setCraters((prev) => [...prev, ...fresh].slice(-MAX_CRATERS));
		}

		// Forge formation: scale up from a hot speck and dissolve the surface in.
		if (formProgress.current < 1) {
			formProgress.current = Math.min(1, formProgress.current + dt / 2.2);
			const f = formProgress.current;
			surfaceUniforms.uForm.value = f;
			const eased = f * f * (3 - 2 * f); // smoothstep
			group.current?.scale.setScalar(0.3 + 0.7 * eased);
		}

		// Animate orbiting moons
		for (let idx = 0; idx < moonList.length; idx++) {
			const moon = moonList[idx];
			const ref = moonRefs.current[idx];
			if (ref) {
				moon.angle += moon.speed * dt;
				const cos = Math.cos(moon.angle);
				const sin = Math.sin(moon.angle);
				ref.position.set(
					moon.orbitRadius * cos,
					moon.orbitRadius * sin * Math.sin(moon.inclination),
					moon.orbitRadius * sin * Math.cos(moon.inclination)
				);
			}
		}
	});

	// Selecting taps; a ~450 ms long-press (or a double-click) focuses the camera.
	// Any pointer movement (e.g. dragging to orbit the camera) cancels the press.
	const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const clearPress = () => {
		if (pressTimer.current) {
			clearTimeout(pressTimer.current);
			pressTimer.current = null;
		}
	};
	useEffect(
		() => () => {
			if (pressTimer.current) {
				clearTimeout(pressTimer.current);
			}
		},
		[]
	);

	const interaction = {
		onDoubleClick: (e: { stopPropagation: () => void }) => {
			e.stopPropagation();
			onFocus(body.id);
		},
		onPointerDown: (e: { stopPropagation: () => void }) => {
			e.stopPropagation();
			onSelect(body.id);
			clearPress();
			pressTimer.current = setTimeout(() => onFocus(body.id), 450);
		},
		onPointerUp: clearPress,
		onPointerLeave: clearPress,
		onPointerMove: clearPress,
	};

	return (
		<>
			<group ref={group}>
				{/* Axial tilt — leans the spin axis and ring plane as one rigid body. */}
				<group rotation={[0, 0, tiltRad]}>
					<group ref={spin}>
						{body.type === "comet" ? (
							<group {...interaction}>
								<CometNucleus radius={r} />
							</group>
						) : (
							<>
								{/* Regular Planet */}
								<mesh {...interaction}>
									<sphereGeometry args={[r, 64, 48]} />
									<shaderMaterial
										fragmentShader={SURFACE_FRAG}
										uniforms={surfaceUniforms}
										vertexShader={SURFACE_VERT}
									/>
								</mesh>

								{forming && (
									<PlanetFormation progress={formProgress} radius={r} />
								)}

								{body.config.clouds && meta && meta.clouds > 0 && (
									<mesh>
										<sphereGeometry args={[r * 1.012, 48, 32]} />
										<shaderMaterial
											depthWrite={false}
											fragmentShader={CLOUD_FRAG}
											transparent
											uniforms={cloudUniforms}
											vertexShader={SURFACE_VERT}
										/>
									</mesh>
								)}

								{body.config.rings && (
									// No tilt here — the parent tilt group already leans the whole
									// frame. The band mesh rotates π/2 into the equatorial (XZ)
									// plane; RingDebris already orbits in XZ, so both stay aligned.
									<group>
										<mesh rotation={[Math.PI / 2, 0, 0]}>
											<ringGeometry args={[r * 1.45, r * 2.35, 96]} />
											<meshBasicMaterial
												color={meta.color}
												depthWrite={false}
												opacity={0.15}
												side={DoubleSide}
												transparent
											/>
										</mesh>
										<RingDebris
											color={meta.color}
											innerRadius={r * 1.45}
											outerRadius={r * 2.35}
										/>
									</group>
								)}
							</>
						)}

						{craters.map((c) => {
							const dir = new Vector3(c.dir[0], c.dir[1], c.dir[2]);
							const quat = new Quaternion().setFromUnitVectors(
								CRATER_FORWARD,
								dir
							);
							return (
								<group
									key={c.id}
									position={dir.clone().multiplyScalar(r * 1.004)}
									quaternion={quat}
								>
									{/* Scorched crater floor */}
									<mesh>
										<circleGeometry args={[c.size, 18]} />
										<meshBasicMaterial
											color="#160f08"
											depthWrite={false}
											opacity={0.95}
											side={DoubleSide}
											transparent
										/>
									</mesh>
									{/* Ejecta rim */}
									<mesh position={[0, 0, 0.002]}>
										<ringGeometry args={[c.size * 0.78, c.size * 1.08, 22]} />
										<meshBasicMaterial
											blending={AdditiveBlending}
											color="#caa078"
											depthWrite={false}
											opacity={0.55}
											side={DoubleSide}
											transparent
										/>
									</mesh>
								</group>
							);
						})}
					</group>
				</group>

				{body.type !== "comet" && body.config.atmosphere > 0 && (
					<mesh>
						<sphereGeometry args={[r * 1.14, 48, 32]} />
						<shaderMaterial
							blending={AdditiveBlending}
							depthWrite={false}
							fragmentShader={ATMOSPHERE_FRAG}
							side={BackSide}
							transparent
							uniforms={atmoUniforms}
							vertexShader={SURFACE_VERT}
						/>
					</mesh>
				)}

				{selected && (
					<mesh rotation={[Math.PI / 2, 0, 0]}>
						<ringGeometry args={[r * 1.25, r * 1.3, 64]} />
						<meshBasicMaterial
							color="#ffce5a"
							opacity={0.9}
							side={DoubleSide}
							transparent
						/>
					</mesh>
				)}

				{/* Orbiting visual moons — share the planet's tilted equatorial plane. */}
				<group rotation={[0, 0, tiltRad]}>
					{moonList.map((moon, idx) => (
						<group
							// biome-ignore lint/suspicious/noArrayIndexKey: moons list is static and never reordered
							key={idx}
							ref={(el) => {
								if (el) {
									moonRefs.current[idx] = el;
								}
							}}
						>
							<mesh castShadow receiveShadow>
								<sphereGeometry args={[moon.size, 12, 10]} />
								<meshStandardMaterial
									color={moon.color}
									metalness={0.1}
									roughness={0.8}
								/>
							</mesh>
						</group>
					))}
				</group>
			</group>

			{body.type === "comet" && (
				<CometTrail cometId={body.id} nucleusRadius={r} />
			)}
		</>
	);
}
