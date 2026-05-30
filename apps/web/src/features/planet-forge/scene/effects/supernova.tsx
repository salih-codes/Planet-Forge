import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
	AdditiveBlending,
	BackSide,
	BufferAttribute,
	BufferGeometry,
	Color,
	type Mesh,
	type MeshBasicMaterial,
	type Points,
	type PointsMaterial,
	Vector3,
} from "three";
import type { SimEvent } from "../../lib/types";

const DEBRIS_COUNT = 520;

/**
 * Full star-death sequence: a blinding flash, an expanding luminous blast
 * shell racing outward at the sim's shock speed, and a spray of stellar
 * debris. Plays for the explosion window plus a fade tail, then `onDone`.
 */
export function SupernovaEffect({
	event,
	onDone,
}: {
	event: SimEvent;
	onDone: () => void;
}) {
	const shellRef = useRef<Mesh>(null);
	const flashRef = useRef<Mesh>(null);
	const pointsRef = useRef<Points>(null);
	const life = useRef(0);
	const done = useRef(false);

	const baseRadius = event.data.baseRadius ?? 1.4;
	const shockSpeed = event.data.shockSpeed ?? 9;
	const duration = event.data.duration ?? 2.6;
	const total = duration + 1.6;
	const color = useMemo(
		() => new Color(event.data.color ?? "#ffaa00"),
		[event.data.color]
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: initialised once
	const { geometry, velocities } = useMemo(() => {
		const positions = new Float32Array(DEBRIS_COUNT * 3);
		const colors = new Float32Array(DEBRIS_COUNT * 3);
		const vels: Vector3[] = [];
		const hot = color.clone().lerp(new Color("#ffffff"), 0.4);
		for (let i = 0; i < DEBRIS_COUNT; i++) {
			const dir = new Vector3(
				Math.random() * 2 - 1,
				Math.random() * 2 - 1,
				Math.random() * 2 - 1
			).normalize();
			vels.push(dir.multiplyScalar(shockSpeed * (0.4 + Math.random() * 0.8)));
			const c = hot.clone().multiplyScalar(0.6 + Math.random() * 0.7);
			colors[i * 3] = c.r;
			colors[i * 3 + 1] = c.g;
			colors[i * 3 + 2] = c.b;
		}
		const g = new BufferGeometry();
		g.setAttribute("position", new BufferAttribute(positions, 3));
		g.setAttribute("color", new BufferAttribute(colors, 3));
		return { geometry: g, velocities: vels };
	}, []);

	useFrame((_, rawDt) => {
		if (done.current) {
			return;
		}
		const dt = Math.min(0.03, rawDt || 0.016);
		life.current += dt;
		const t = life.current / total;

		// Blast shell tracks the sim's actual shock front.
		if (shellRef.current) {
			shellRef.current.scale.setScalar(
				Math.max(0.001, life.current * shockSpeed)
			);
			(shellRef.current.material as MeshBasicMaterial).opacity = Math.max(
				0,
				0.55 * (1 - t)
			);
		}

		// Initial flash, fast decay.
		if (flashRef.current) {
			flashRef.current.scale.setScalar(baseRadius * (4 + life.current * 6));
			(flashRef.current.material as MeshBasicMaterial).opacity = Math.max(
				0,
				1 - life.current * 1.6
			);
		}

		// Ejected stellar material.
		const pos = geometry.attributes.position.array as Float32Array;
		for (let i = 0; i < DEBRIS_COUNT; i++) {
			pos[i * 3] += velocities[i].x * dt;
			pos[i * 3 + 1] += velocities[i].y * dt;
			pos[i * 3 + 2] += velocities[i].z * dt;
		}
		geometry.attributes.position.needsUpdate = true;
		if (pointsRef.current) {
			(pointsRef.current.material as PointsMaterial).opacity = Math.max(
				0,
				1 - t
			);
		}

		if (life.current >= total) {
			done.current = true;
			onDone();
		}
	});

	return (
		<group>
			<points geometry={geometry} ref={pointsRef}>
				<pointsMaterial
					blending={AdditiveBlending}
					depthWrite={false}
					size={1.8}
					sizeAttenuation
					transparent
					vertexColors
				/>
			</points>

			{/* Blinding central flash */}
			<mesh ref={flashRef}>
				<sphereGeometry args={[1, 32, 24]} />
				<meshBasicMaterial
					blending={AdditiveBlending}
					color="#fff6e0"
					depthWrite={false}
					toneMapped={false}
					transparent
				/>
			</mesh>

			{/* Expanding luminous blast shell (viewed from inside) */}
			<mesh ref={shellRef}>
				<sphereGeometry args={[1, 48, 32]} />
				<meshBasicMaterial
					blending={AdditiveBlending}
					color={color}
					depthWrite={false}
					side={BackSide}
					transparent
				/>
			</mesh>
		</group>
	);
}
