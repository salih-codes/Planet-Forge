import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
	AdditiveBlending,
	BackSide,
	BufferAttribute,
	BufferGeometry,
	Color,
	type ShaderMaterial,
	Vector3,
} from "three";
import { BODY_VERT, NOISE_GLSL, STAR_FRAG } from "./shaders";

export function Starfield({ count = 6500 }: { count?: number }) {
	const geo = useMemo(() => {
		const pos = new Float32Array(count * 3);
		const col = new Float32Array(count * 3);
		const pal = [
			new Color(0xff_ff_ff),
			new Color(0xbc_d6_ff),
			new Color(0xff_e6_c0),
			new Color(0x9f_d0_ff),
		];
		for (let i = 0; i < count; i++) {
			const r = 250 + Math.random() * 350;
			const th = Math.acos(2 * Math.random() - 1);
			const ph = Math.random() * Math.PI * 2;
			pos[i * 3] = r * Math.sin(th) * Math.cos(ph);
			pos[i * 3 + 1] = r * Math.cos(th);
			pos[i * 3 + 2] = r * Math.sin(th) * Math.sin(ph);
			const c = pal[Math.floor(Math.random() * pal.length)]
				.clone()
				.multiplyScalar(0.6 + Math.random() * 0.4);
			col[i * 3] = c.r;
			col[i * 3 + 1] = c.g;
			col[i * 3 + 2] = c.b;
		}
		const g = new BufferGeometry();
		g.setAttribute("position", new BufferAttribute(pos, 3));
		g.setAttribute("color", new BufferAttribute(col, 3));
		return g;
	}, [count]);

	return (
		<points geometry={geo}>
			<pointsMaterial
				depthWrite={false}
				opacity={0.9}
				size={1.1}
				sizeAttenuation
				transparent
				vertexColors
			/>
		</points>
	);
}

const NEBULA_FRAG = /* glsl */ `
  varying vec3 vd;
  ${NOISE_GLSL}
  void main(){
    vec3 d=normalize(vd);
    float n=fbm(d*1.6)*0.5+0.5;
    float n2=fbm(d*4.0+5.0)*0.5+0.5;
    vec3 deep=vec3(0.015,0.02,0.05);
    vec3 c1=vec3(0.10,0.06,0.22);
    vec3 c2=vec3(0.02,0.12,0.20);
    vec3 col=deep+c1*pow(n,2.2)*0.6+c2*pow(n2,3.0)*0.4;
    gl_FragColor=vec4(col,1.0);
  }
`;

export function Nebula() {
	return (
		<mesh>
			<sphereGeometry args={[620, 32, 24]} />
			<shaderMaterial
				depthWrite={false}
				fragmentShader={NEBULA_FRAG}
				side={BackSide}
				vertexShader={
					"varying vec3 vd; void main(){ vd=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} "
				}
			/>
		</mesh>
	);
}

/**
 * The visible star at the system origin: an animated convective surface
 * (STAR_FRAG) wrapped in layered additive corona halos. `color`/`radius` come
 * from the system's star and update live when it collapses to a remnant.
 */
export function CentralStar({
	color,
	radius,
}: {
	color: string;
	radius: number;
}) {
	const matRef = useRef<ShaderMaterial>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: uColor is updated imperatively below, not by re-creating uniforms
	const uniforms = useMemo(
		() => ({
			uTime: { value: 0 },
			uColor: { value: new Color(color) },
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

	useEffect(() => {
		uniforms.uColor.value.set(color);
	}, [color, uniforms]);

	useFrame((_, dt) => {
		uniforms.uTime.value += dt;
	});

	return (
		<group>
			<mesh>
				<sphereGeometry args={[radius, 64, 48]} />
				<shaderMaterial
					fragmentShader={STAR_FRAG}
					ref={matRef}
					uniforms={uniforms}
					vertexShader={BODY_VERT}
				/>
			</mesh>

			{/* Inner corona */}
			<mesh>
				<sphereGeometry args={[radius * 1.32, 32, 24]} />
				<meshBasicMaterial
					blending={AdditiveBlending}
					color={color}
					depthWrite={false}
					opacity={0.32}
					transparent
				/>
			</mesh>

			{/* Outer corona haze */}
			<mesh>
				<sphereGeometry args={[radius * 1.85, 32, 24]} />
				<meshBasicMaterial
					blending={AdditiveBlending}
					color={color}
					depthWrite={false}
					opacity={0.12}
					transparent
				/>
			</mesh>
		</group>
	);
}

export function Sun() {
	const pos = useMemo(
		() => new Vector3(1, 0.25, 0.6).normalize().multiplyScalar(70),
		[]
	);
	return (
		<group>
			<mesh position={pos}>
				<sphereGeometry args={[6, 32, 24]} />
				<meshBasicMaterial color={"#fff2d0"} toneMapped={false} />
			</mesh>
			<directionalLight color={"#fff0d8"} intensity={2.2} position={pos} />
			<ambientLight color={"#223044"} intensity={0.5} />
		</group>
	);
}
