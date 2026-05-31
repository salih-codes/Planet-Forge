import { useFrame } from "@react-three/fiber";
import type { MutableRefObject } from "react";
import { useRef } from "react";
import { AdditiveBlending, type MeshBasicMaterial } from "three";

// Triangular pulse: 0 outside [a,b], peaking at the midpoint.
function pulse(p: number, a: number, b: number): number {
	if (p <= a || p >= b) {
		return 0;
	}
	const mid = (a + b) / 2;
	return 1 - Math.abs(p - mid) / ((b - a) / 2);
}

/**
 * Concentric layers (core → mantle → crust) that light up in sequence and fade
 * out as the planet's real surface resolves. Driven by a shared 0→1 progress
 * ref owned by the Planet so it stays in lockstep with the surface dissolve.
 */
export function PlanetFormation({
	radius,
	progress,
}: {
	radius: number;
	progress: MutableRefObject<number>;
}) {
	const core = useRef<MeshBasicMaterial>(null);
	const mantle = useRef<MeshBasicMaterial>(null);
	const crust = useRef<MeshBasicMaterial>(null);

	useFrame(() => {
		const p = progress.current;
		if (core.current) {
			core.current.opacity = Math.max(0, 1 - p * 1.3) * 0.9;
		}
		if (mantle.current) {
			mantle.current.opacity = pulse(p, 0.2, 0.7) * 0.7;
		}
		if (crust.current) {
			crust.current.opacity = pulse(p, 0.45, 0.95) * 0.6;
		}
	});

	return (
		<group>
			{/* Core — searing inner heat */}
			<mesh>
				<sphereGeometry args={[radius * 0.6, 32, 24]} />
				<meshBasicMaterial
					blending={AdditiveBlending}
					color="#ffe7b0"
					depthWrite={false}
					ref={core}
					toneMapped={false}
					transparent
				/>
			</mesh>
			{/* Mantle — molten magma shell */}
			<mesh>
				<sphereGeometry args={[radius * 0.85, 32, 24]} />
				<meshBasicMaterial
					blending={AdditiveBlending}
					color="#ff7a3a"
					depthWrite={false}
					ref={mantle}
					transparent
				/>
			</mesh>
			{/* Crust — cooling rock that hardens into the surface */}
			<mesh>
				<sphereGeometry args={[radius * 1.03, 32, 24]} />
				<meshBasicMaterial
					blending={AdditiveBlending}
					color="#9a6a4a"
					depthWrite={false}
					ref={crust}
					transparent
				/>
			</mesh>
		</group>
	);
}
