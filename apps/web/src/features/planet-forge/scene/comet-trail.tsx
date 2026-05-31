import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
	AdditiveBlending,
	BufferAttribute,
	BufferGeometry,
	CanvasTexture,
	Color,
	type Points,
	type Texture,
	Vector3,
} from "three";
import { useSimStore } from "../lib/use-simulation-socket";

// Beyond this distance from the star a comet shows no tail (no sublimation).
const ACTIVE_DIST = 140;

// Tail particles shift colour as they age and drift down the tail.
const ION_END = new Color("#1a3aff"); // cyan → deep electric blue
const DUST_END = new Color("#ff5a2a"); // warm gold → burnt orange
const scratchColor = new Color();

// A soft radial sprite so particles render as feathered dots, not hard squares.
// White→black falloff works with additive blending (edges multiply to nothing).
function makeSparkTexture(): Texture {
	const size = 64;
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d");
	if (ctx) {
		const g = ctx.createRadialGradient(
			size / 2,
			size / 2,
			0,
			size / 2,
			size / 2,
			size / 2
		);
		g.addColorStop(0, "rgba(255,255,255,1)");
		g.addColorStop(0.5, "rgba(160,160,160,1)");
		g.addColorStop(1, "rgba(0,0,0,1)");
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, size, size);
	}
	return new CanvasTexture(canvas);
}

const SPARK_TEXTURE = makeSparkTexture();

interface CometTrailProps {
	cometId: string;
	nucleusRadius: number;
}

interface Particle {
	color: Color;
	isIon: boolean;
	life: number;
	maxLife: number;
	pos: Vector3;
	size: number;
	vel: Vector3;
}

export function CometTrail({ cometId, nucleusRadius }: CometTrailProps) {
	const pointsRef = useRef<Points>(null);
	const maxParticles = 900;

	// Particle pool state
	const particles = useMemo<Particle[]>(() => [], []);

	// Buffers for ThreeJS Points
	const [positions, colors, sizes] = useMemo(() => {
		const pos = new Float32Array(maxParticles * 3);
		const col = new Float32Array(maxParticles * 3);
		const siz = new Float32Array(maxParticles);
		return [pos, col, siz];
	}, []);

	const geometry = useMemo(() => {
		const geo = new BufferGeometry();
		geo.setAttribute("position", new BufferAttribute(positions, 3));
		geo.setAttribute("color", new BufferAttribute(colors, 3));
		geo.setAttribute("size", new BufferAttribute(sizes, 1));
		return geo;
	}, [positions, colors, sizes]);

	const lastCometPos = useRef<Vector3 | null>(null);

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: particle physics update is unified in frame loop
	useFrame((state) => {
		const pArr = useSimStore.getState().positions[cometId];
		if (!(pArr && pointsRef.current)) {
			return;
		}

		const currentPos = new Vector3(pArr[0], pArr[1], pArr[2]);
		const sunPos = new Vector3(0, 0, 0); // Sun is at the origin

		// Direction away from the Sun
		const dirAwayFromSun = new Vector3()
			.copy(currentPos)
			.sub(sunPos)
			.normalize();

		// Calculate velocity of the comet from the positions delta
		const cometVel = new Vector3();
		if (lastCometPos.current) {
			cometVel.copy(currentPos).sub(lastCometPos.current).multiplyScalar(60); // 60 FPS approx
		}
		lastCometPos.current = currentPos.clone();

		// Solar proximity scaling — a comet only grows a coma/tail when solar heat
		// sublimates its ices, i.e. when it is close to the star. Far out it is a
		// bare nucleus with no trail at all.
		const distToSun = currentPos.distanceTo(sunPos);
		const intensity = Math.min(3.0, 3500.0 / (distToSun * distToSun + 0.1));
		const spawnCount = distToSun < ACTIVE_DIST ? Math.floor(intensity * 7) : 0;

		// Spawn new particles
		for (let k = 0; k < spawnCount; k++) {
			if (particles.length >= maxParticles) {
				break;
			}

			const isIon = Math.random() > 0.45;
			const p = new Vector3()
				.copy(currentPos)
				// Jitter spawn location around nucleus bounds
				.addScaledVector(
					new Vector3(
						Math.random() - 0.5,
						Math.random() - 0.5,
						Math.random() - 0.5
					).normalize(),
					nucleusRadius * 0.5
				);

			let vel: Vector3;
			let color: Color;
			let maxLife: number;

			if (isIon) {
				// Ion Tail: Blue/Cyan, fast flow directly away from Sun
				const speed = 7.0 + Math.random() * 6.0;
				vel = new Vector3()
					.copy(dirAwayFromSun)
					.addScaledVector(
						new Vector3(
							Math.random() - 0.5,
							Math.random() - 0.5,
							Math.random() - 0.5
						),
						0.06 // very narrow dispersion
					)
					.normalize()
					.multiplyScalar(speed);

				color = new Color("#00d0ff").multiplyScalar(1.2);
				maxLife = 0.9 + Math.random() * 0.7;
			} else {
				// Dust Tail: Yellow/White/Orange, slower, lags behind orbit
				const speed = 3.5 + Math.random() * 3.0;
				// Pushed away from Sun but influenced by orbital inertia (cometVel)
				vel = new Vector3()
					.copy(cometVel)
					.multiplyScalar(0.4)
					.addScaledVector(dirAwayFromSun, speed)
					.addScaledVector(
						new Vector3(
							Math.random() - 0.5,
							Math.random() - 0.5,
							Math.random() - 0.5
						),
						0.28 // wider fan dispersion
					);

				color = new Color("#ffe2aa").multiplyScalar(0.85);
				maxLife = 1.4 + Math.random() * 0.9;
			}

			particles.push({
				pos: p,
				vel,
				color,
				life: 0,
				maxLife,
				size: (isIon ? 2.5 : 4.0) * (0.8 + Math.random() * 0.4),
				isIon,
			});
		}

		// Update particles
		const dt = Math.min(0.03, state.clock.getDelta() || 0.016);
		let index = 0;

		for (let i = particles.length - 1; i >= 0; i--) {
			const p = particles[i];
			p.life += dt;

			if (p.life >= p.maxLife) {
				particles.splice(i, 1);
				continue;
			}

			// Add velocity with minor gravity/solar wind effects
			p.pos.addScaledVector(p.vel, dt);

			// Write into buffer
			const offset = index * 3;
			positions[offset] = p.pos.x;
			positions[offset + 1] = p.pos.y;
			positions[offset + 2] = p.pos.z;

			// Fade out and shift colour down the tail as the particle ages.
			const lifeRatio = p.life / p.maxLife;
			const opacity = 1.0 - lifeRatio;

			scratchColor
				.copy(p.color)
				.lerp(p.isIon ? ION_END : DUST_END, lifeRatio * 0.7);

			colors[offset] = scratchColor.r * opacity;
			colors[offset + 1] = scratchColor.g * opacity;
			colors[offset + 2] = scratchColor.b * opacity;

			sizes[index] = p.size * opacity;
			index++;
		}

		// Clear rest of buffer
		for (let i = index; i < maxParticles; i++) {
			const offset = i * 3;
			positions[offset] = 0;
			positions[offset + 1] = 0;
			positions[offset + 2] = 0;
			colors[offset] = 0;
			colors[offset + 1] = 0;
			colors[offset + 2] = 0;
			sizes[i] = 0;
		}

		// Trigger attribute updates
		const geo = pointsRef.current.geometry;
		geo.attributes.position.needsUpdate = true;
		geo.attributes.color.needsUpdate = true;
		geo.attributes.size.needsUpdate = true;
	});

	return (
		<points geometry={geometry} ref={pointsRef}>
			<pointsMaterial
				blending={AdditiveBlending}
				depthWrite={false}
				map={SPARK_TEXTURE}
				size={1.0}
				sizeAttenuation
				transparent
				vertexColors
			/>
		</points>
	);
}
