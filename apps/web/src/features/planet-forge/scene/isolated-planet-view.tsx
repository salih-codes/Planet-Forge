import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import { AdditiveBlending, BackSide, Vector3 } from "three";

import { PLANET_TYPES } from "../lib/planet-presets";
import type { CelestialBody } from "../lib/types";
import {
	ATMOSPHERE_FRAG,
	CLOUD_FRAG,
	SURFACE_FRAG,
	SURFACE_VERT,
} from "./shaders";

const v3 = (a: [number, number, number]) => new Vector3(a[0], a[1], a[2]);
const SUN_DIR = new Vector3(1, 0.3, 0.5).normalize();

interface IsolatedPlanetViewProps {
	body: CelestialBody;
}

export function IsolatedPlanetView({ body }: IsolatedPlanetViewProps) {
	const meta = PLANET_TYPES[body.type];
	const r = body.config.radius;
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
			uForm: { value: 1 },
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

	const spinSpeed = body.type === "gas" ? 0.12 : 0.07;

	useFrame((_, dt) => {
		surfaceUniforms.uTime.value += dt;
		cloudUniforms.uTime.value += dt;
		atmoUniforms.uTime.value += dt;
		if (spin.current) {
			spin.current.rotation.y += spinSpeed * dt;
		}
	});

	const tiltRad = body.config.tilt ?? 0.4;

	return (
		<group rotation={[0, 0, tiltRad]}>
			<group ref={spin}>
				{/* Surface */}
				<mesh>
					<sphereGeometry args={[r, 64, 48]} />
					<shaderMaterial
						fragmentShader={SURFACE_FRAG}
						uniforms={surfaceUniforms}
						vertexShader={SURFACE_VERT}
					/>
				</mesh>

				{/* Clouds */}
				{body.config.clouds && (
					<mesh>
						<sphereGeometry args={[r * 1.012, 48, 36]} />
						<shaderMaterial
							depthWrite={false}
							fragmentShader={CLOUD_FRAG}
							transparent
							uniforms={cloudUniforms}
						/>
					</mesh>
				)}
			</group>

			{/* Atmosphere */}
			<mesh>
				<sphereGeometry args={[r * 1.14, 48, 36]} />
				<shaderMaterial
					blending={AdditiveBlending}
					depthWrite={false}
					fragmentShader={ATMOSPHERE_FRAG}
					side={BackSide}
					transparent
					uniforms={atmoUniforms}
				/>
			</mesh>
		</group>
	);
}
