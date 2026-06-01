import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
	AdditiveBlending,
	BufferAttribute,
	BufferGeometry,
	Color,
	type Mesh,
	type MeshBasicMaterial,
	type Points,
	type PointsMaterial,
	Vector3,
} from "three";
import { PLANET_TYPES } from "../../lib/planet-presets";
import type { PlanetType, SimEvent } from "../../lib/types";

interface DebrisParticle {
	pos: Vector3;
	vel: Vector3;
}

const MAX_COUNT = 460;

/**
 * One-shot cataclysm burst played at a collision / star-impact location:
 * a bright flash, an expanding blast-front shell, and debris ejected in the
 * colours of the bodies involved. Calls `onDone` once it has fully faded.
 */
export function DebrisBurst({
	event,
	onDone,
}: {
	event: SimEvent;
	onDone: () => void;
}) {
	const pointsRef = useRef<Points>(null);
	const flashRef = useRef<Mesh>(null);
	const shockRef = useRef<Mesh>(null);
	const life = useRef(0);
	const done = useRef(false);

	const origin = useMemo(
		() => new Vector3(event.pos[0], event.pos[1], event.pos[2]),
		[event.pos]
	);

	const bodies = event.data.bodies ?? [];
	const radiusSum = bodies.reduce((acc, b) => acc + b.radius, 0) || 1;
	const energy = event.data.energy ?? 0.5;
	const duration = 1.9;

	// biome-ignore lint/correctness/useExhaustiveDependencies: burst is initialised once per event
	const { geometry, particles, count } = useMemo(() => {
		const total = Math.min(MAX_COUNT, Math.round(120 + radiusSum * 60));
		const positions = new Float32Array(total * 3);
		const colors = new Float32Array(total * 3);
		const palette = bodies.length
			? bodies.map((b) => new Color(PLANET_TYPES[b.type]?.color ?? "#ffffff"))
			: [new Color("#ffd9a0")];
		const parts: DebrisParticle[] = [];

		for (let i = 0; i < total; i++) {
			const dir = new Vector3(
				Math.random() * 2 - 1,
				Math.random() * 2 - 1,
				Math.random() * 2 - 1
			).normalize();
			const speed = (2.5 + Math.random() * 7) * (0.6 + energy * 0.5);
			parts.push({ pos: origin.clone(), vel: dir.multiplyScalar(speed) });

			const c = palette[i % palette.length]
				.clone()
				.multiplyScalar(0.7 + Math.random() * 0.8);
			colors[i * 3] = c.r;
			colors[i * 3 + 1] = c.g;
			colors[i * 3 + 2] = c.b;
		}

		const g = new BufferGeometry();
		g.setAttribute("position", new BufferAttribute(positions, 3));
		g.setAttribute("color", new BufferAttribute(colors, 3));
		return { geometry: g, particles: parts, count: total };
	}, []);

	useFrame((_, rawDt) => {
		if (done.current) {
			return;
		}
		const dt = Math.min(0.03, rawDt || 0.016);
		life.current += dt;
		const t = life.current / duration;

		const pos = geometry.attributes.position.array as Float32Array;
		for (let i = 0; i < count; i++) {
			const p = particles[i];
			p.vel.multiplyScalar(0.95); // drag
			p.pos.addScaledVector(p.vel, dt);
			pos[i * 3] = p.pos.x;
			pos[i * 3 + 1] = p.pos.y;
			pos[i * 3 + 2] = p.pos.z;
		}
		geometry.attributes.position.needsUpdate = true;

		if (pointsRef.current) {
			(pointsRef.current.material as PointsMaterial).opacity = Math.max(
				0,
				1 - t
			);
		}
		if (flashRef.current) {
			const s = radiusSum * (1 + t * 5);
			flashRef.current.scale.setScalar(s);
			(flashRef.current.material as MeshBasicMaterial).opacity = Math.max(
				0,
				1 - t * 3
			);
		}
		if (shockRef.current) {
			const s = radiusSum * (1 + t * 13);
			shockRef.current.scale.setScalar(s);
			(shockRef.current.material as MeshBasicMaterial).opacity = Math.max(
				0,
				0.7 - t * 0.9
			);
		}

		if (life.current >= duration) {
			done.current = true;
			onDone();
		}
	});

	return (
		<group position={origin}>
			<points geometry={geometry} ref={pointsRef}>
				<pointsMaterial
					blending={AdditiveBlending}
					depthWrite={false}
					size={1.4}
					sizeAttenuation
					transparent
					vertexColors
				/>
			</points>

			{/* Core flash */}
			<mesh ref={flashRef}>
				<sphereGeometry args={[1, 24, 16]} />
				<meshBasicMaterial
					blending={AdditiveBlending}
					color="#fff2d0"
					depthWrite={false}
					toneMapped={false}
					transparent
				/>
			</mesh>

			{/* Expanding blast front */}
			<mesh ref={shockRef}>
				<sphereGeometry args={[1, 32, 24]} />
				<meshBasicMaterial
					blending={AdditiveBlending}
					color="#ff7a3a"
					depthWrite={false}
					transparent
				/>
			</mesh>
		</group>
	);
}

// ─── Disintegration Effect ─────────────────────────────────────────────────────

const DISINTEGRATE_DURATION = 3.0;

function advanceCore(
	mesh: Mesh | null,
	mat: MeshBasicMaterial | null,
	t: number
): void {
	if (!(mesh && mat)) {
		return;
	}
	if (t < 0.5) {
		mesh.scale.setScalar(1 + t * 0.4);
		mat.opacity = 1;
	} else if (t < 1.0) {
		const p = (t - 0.5) / 0.5;
		mesh.scale.setScalar(Math.max(0, 1.2 * (1 - p * p)));
		mat.opacity = Math.max(0, 1 - p * 1.6);
	} else {
		mesh.visible = false;
	}
}

function advanceRing(mesh: Mesh | null, t: number, r: number): void {
	if (!mesh) {
		return;
	}
	const mat = mesh.material as MeshBasicMaterial;
	if (t < 0.15 || t > 0.75) {
		mat.opacity = 0;
		return;
	}
	const p = (t - 0.15) / 0.6;
	mesh.scale.setScalar(r * Math.max(0.05, 2 - p * 1.8));
	mat.opacity = Math.max(0, 0.9 - p * 1.1);
}

function advanceShockwave(mesh: Mesh | null, t: number, r: number): void {
	if (!mesh) {
		return;
	}
	const mat = mesh.material as MeshBasicMaterial;
	if (t < 0.85 || t > 2.2) {
		mat.opacity = 0;
		return;
	}
	const p = (t - 0.85) / 1.35;
	mesh.scale.setScalar(r * (1 + p * 22));
	mat.opacity = Math.max(0, 0.6 - p * 0.7);
}

function advanceFlash(mesh: Mesh | null, t: number, r: number): void {
	if (!mesh) {
		return;
	}
	const mat = mesh.material as MeshBasicMaterial;
	if (t < 0.8 || t > 1.3) {
		mat.opacity = 0;
		return;
	}
	const p = (t - 0.8) / 0.5;
	mesh.scale.setScalar(r * (0.5 + p * 5));
	mat.opacity = Math.max(0, 1 - p * 1.4);
}

function advanceDebris(
	geo: BufferGeometry,
	parts: DebrisParticle[],
	count: number,
	points: Points | null,
	t: number,
	dt: number
): void {
	if (t < 0.85 || !points) {
		return;
	}
	const pos = geo.attributes.position.array as Float32Array;
	for (let i = 0; i < count; i++) {
		const p = parts[i];
		p.vel.multiplyScalar(0.96);
		p.pos.addScaledVector(p.vel, dt);
		pos[i * 3] = p.pos.x;
		pos[i * 3 + 1] = p.pos.y;
		pos[i * 3 + 2] = p.pos.z;
	}
	geo.attributes.position.needsUpdate = true;
	const debrisT = Math.min(1, (t - 0.85) / 1.8);
	(points.material as PointsMaterial).opacity = Math.max(0, 1 - debrisT * 0.85);
}

/**
 * Dramatic implosion-then-explosion played when a body is manually disintegrated.
 * Phase 1: glow + compression ring. Phase 2: rapid collapse. Phase 3: shockwave +
 * debris burst. Total duration ~3 s.
 */
export function DisintegrationEffect({
	event,
	onDone,
}: {
	event: SimEvent;
	onDone: () => void;
}) {
	const life = useRef(0);
	const done = useRef(false);
	const coreRef = useRef<Mesh>(null);
	const coreMatRef = useRef<MeshBasicMaterial>(null);
	const ringRef = useRef<Mesh>(null);
	const shockRef = useRef<Mesh>(null);
	const flashRef = useRef<Mesh>(null);
	const pointsRef = useRef<Points>(null);

	const radius = event.data.radius ?? 3;
	const bodies = event.data.bodies ?? [];

	const origin = useMemo(
		() => new Vector3(event.pos[0], event.pos[1], event.pos[2]),
		[event.pos]
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: initialised once per event
	const { geometry, particles, count } = useMemo(() => {
		const total = 640;
		const positions = new Float32Array(total * 3);
		const colors = new Float32Array(total * 3);
		const palette = bodies.length
			? bodies.map((b) => new Color(PLANET_TYPES[b.type]?.color ?? "#ff6622"))
			: [new Color("#ff7a3a"), new Color("#ffffff"), new Color("#ffcc44")];
		const parts: DebrisParticle[] = [];

		for (let i = 0; i < total; i++) {
			const dir = new Vector3(
				Math.random() * 2 - 1,
				Math.random() * 2 - 1,
				Math.random() * 2 - 1
			).normalize();
			const speed = (4 + Math.random() * 14) * (0.6 + radius * 0.08);
			parts.push({ pos: origin.clone(), vel: dir.multiplyScalar(speed) });
			const c = palette[i % palette.length]
				.clone()
				.multiplyScalar(0.7 + Math.random() * 0.9);
			colors[i * 3] = c.r;
			colors[i * 3 + 1] = c.g;
			colors[i * 3 + 2] = c.b;
		}

		const g = new BufferGeometry();
		g.setAttribute("position", new BufferAttribute(positions, 3));
		g.setAttribute("color", new BufferAttribute(colors, 3));
		return { geometry: g, particles: parts, count: total };
	}, []);

	useFrame((_, rawDt) => {
		if (done.current) {
			return;
		}
		const dt = Math.min(0.03, rawDt || 0.016);
		life.current += dt;
		const t = life.current;

		advanceCore(coreRef.current, coreMatRef.current, t);
		advanceRing(ringRef.current, t, radius);
		advanceShockwave(shockRef.current, t, radius);
		advanceFlash(flashRef.current, t, radius);
		advanceDebris(geometry, particles, count, pointsRef.current, t, dt);

		if (t >= DISINTEGRATE_DURATION) {
			done.current = true;
			onDone();
		}
	});

	const tiltedRot: [number, number, number] = [Math.PI / 2, 0, 0];

	return (
		<group position={origin}>
			{/* Core: glows white-hot then implodes */}
			<mesh ref={coreRef}>
				<sphereGeometry args={[radius, 32, 24]} />
				<meshBasicMaterial
					blending={AdditiveBlending}
					color="#ffffff"
					depthWrite={false}
					ref={coreMatRef}
					toneMapped={false}
					transparent
				/>
			</mesh>

			{/* Compression ring squeezes inward */}
			<mesh ref={ringRef} rotation={tiltedRot}>
				<torusGeometry args={[1, 0.28, 10, 64]} />
				<meshBasicMaterial
					blending={AdditiveBlending}
					color="#44d4ff"
					depthWrite={false}
					toneMapped={false}
					transparent
				/>
			</mesh>

			{/* Shockwave sphere expands outward after implosion */}
			<mesh ref={shockRef}>
				<sphereGeometry args={[1, 24, 16]} />
				<meshBasicMaterial
					blending={AdditiveBlending}
					color="#ff6622"
					depthWrite={false}
					toneMapped={false}
					transparent
				/>
			</mesh>

			{/* Bright white flash at moment of collapse */}
			<mesh ref={flashRef}>
				<sphereGeometry args={[1, 16, 12]} />
				<meshBasicMaterial
					blending={AdditiveBlending}
					color="#ffffff"
					depthWrite={false}
					toneMapped={false}
					transparent
				/>
			</mesh>

			{/* Debris particles */}
			<points geometry={geometry} ref={pointsRef}>
				<pointsMaterial
					blending={AdditiveBlending}
					depthWrite={false}
					size={1.9}
					sizeAttenuation
					transparent
					vertexColors
				/>
			</points>
		</group>
	);
}

export function DyingPlanet({
	pos,
	radius,
	type,
	duration = 1.5,
	onDone,
}: {
	pos: [number, number, number];
	radius: number;
	type?: string;
	duration?: number;
	onDone: () => void;
}) {
	const meshRef = useRef<Mesh>(null);
	const matRef = useRef<MeshBasicMaterial>(null);
	const life = useRef(0);
	const done = useRef(false);

	// The doomed world glows with its own material as it is torn apart / consumed.
	const color = (type && PLANET_TYPES[type as PlanetType]?.color) || "#ff5a2a";

	useFrame((_, rawDt) => {
		if (done.current) {
			return;
		}
		const dt = Math.min(0.03, rawDt || 0.016);
		life.current += dt;
		const t = life.current / duration;

		if (meshRef.current) {
			const scale = Math.max(0, 1 - t);
			meshRef.current.scale.setScalar(scale);
		}

		if (matRef.current) {
			matRef.current.opacity = Math.max(0, 1 - t * 1.1);
		}

		if (life.current >= duration) {
			done.current = true;
			onDone();
		}
	});

	return (
		<mesh position={pos} ref={meshRef}>
			<sphereGeometry args={[radius, 32, 24]} />
			<meshBasicMaterial
				color={color}
				depthWrite={false}
				ref={matRef}
				toneMapped={false}
				transparent
			/>
		</mesh>
	);
}
