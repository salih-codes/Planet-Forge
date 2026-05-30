import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import { AdditiveBlending, BackSide, DoubleSide, Vector3 } from "three";
import { PLANET_TYPES } from "../lib/planet-presets";
import type { CelestialBody } from "../lib/types";
import { useSimStore } from "../lib/use-simulation-socket";
import { CometNucleus } from "./comet-body";
import { CometTrail } from "./comet-trail";
import { RingDebris } from "./ring-debris";
import {
	ATMOSPHERE_FRAG,
	CLOUD_FRAG,
	SURFACE_FRAG,
	SURFACE_VERT,
} from "./shaders";

const v3 = (a: [number, number, number]) => new Vector3(a[0], a[1], a[2]);
const SUN_DIR = new Vector3(1, 0.25, 0.6).normalize();

export function Planet({
	body,
	selected,
	onSelect,
	onFocus,
}: {
	body: CelestialBody;
	selected: boolean;
	onSelect: (id: string) => void;
	onFocus: (id: string) => void;
}) {
	const meta = PLANET_TYPES[body.type];
	const group = useRef<Group>(null);
	const spin = useRef<Group>(null);
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
		}),
		[meta, seed, body.type, body.config.clouds]
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
	});

	const r = body.config.radius;

	return (
		<>
			<group ref={group}>
				<group ref={spin}>
					{body.type === "comet" ? (
						// biome-ignore lint/a11y/noStaticElementInteractions: ThreeJS group is virtual inside Canvas
						<group
							onDoubleClick={(e) => {
								e.stopPropagation();
								onFocus(body.id);
							}}
							onPointerDown={(e) => {
								e.stopPropagation();
								onSelect(body.id);
							}}
						>
							<CometNucleus radius={r} />
						</group>
					) : (
						<>
							{/* Regular Planet */}
							{/* biome-ignore lint/a11y/noStaticElementInteractions: ThreeJS mesh is virtual inside Canvas */}
							<mesh
								onDoubleClick={(e) => {
									e.stopPropagation();
									onFocus(body.id);
								}}
								onPointerDown={(e) => {
									e.stopPropagation();
									onSelect(body.id);
								}}
							>
								<sphereGeometry args={[r, 64, 48]} />
								<shaderMaterial
									fragmentShader={SURFACE_FRAG}
									uniforms={surfaceUniforms}
									vertexShader={SURFACE_VERT}
								/>
							</mesh>

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
								<group rotation={[Math.PI * 0.5 - 0.32, 0, 0.1]}>
									<mesh>
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
			</group>

			{body.type === "comet" && (
				<CometTrail cometId={body.id} nucleusRadius={r} />
			)}
		</>
	);
}
