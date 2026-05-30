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
import type { SimEvent } from "../../lib/types";

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
