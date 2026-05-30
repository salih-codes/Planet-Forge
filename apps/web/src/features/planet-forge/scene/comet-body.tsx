import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, type ShaderMaterial, Vector3 } from "three";
import { BODY_VERT, COMET_FRAG } from "./shaders";

const SUN_DIR = new Vector3(1, 0.25, 0.6).normalize();

/**
 * Shared comet nucleus: an irregular icy/rocky body with sun-facing
 * sublimation jets plus a soft coma glow. Reused by orbital and ambient comets.
 */
export function CometNucleus({ radius }: { radius: number }) {
	const matRef = useRef<ShaderMaterial>(null);

	const uniforms = useMemo(
		() => ({
			uTime: { value: 0 },
			uSunDir: { value: SUN_DIR.clone() },
			uSeed: {
				value: new Vector3(
					Math.random() * 100,
					Math.random() * 100,
					Math.random() * 100
				),
			},
		}),
		[]
	);

	useFrame((_, dt) => {
		uniforms.uTime.value += dt;
	});

	return (
		<>
			<mesh>
				<dodecahedronGeometry args={[radius, 1]} />
				<shaderMaterial
					fragmentShader={COMET_FRAG}
					ref={matRef}
					uniforms={uniforms}
					vertexShader={BODY_VERT}
				/>
			</mesh>

			{/* Coma — diffuse outgassing halo */}
			<mesh>
				<sphereGeometry args={[radius * 1.7, 24, 16]} />
				<meshBasicMaterial
					blending={AdditiveBlending}
					color="#86e3ff"
					depthWrite={false}
					opacity={0.16}
					transparent
				/>
			</mesh>
		</>
	);
}
