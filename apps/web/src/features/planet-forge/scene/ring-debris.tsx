import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, type InstancedMesh, Matrix4, Quaternion, Vector3 } from "three";

interface RingDebrisProps {
	color: string;
	count?: number;
	innerRadius: number;
	outerRadius: number;
}

export function RingDebris({
	innerRadius,
	outerRadius,
	color,
	count = 2500,
}: RingDebrisProps) {
	const meshRef = useRef<InstancedMesh>(null);

	// Seed random properties for each instance
	const debris = useMemo(() => {
		const data: {
			radius: number;
			theta: number;
			speed: number;
			scale: number;
			verticalOffset: number;
			spinAxis: Vector3;
			spinSpeed: number;
			spinAngle: number;
			color: Color;
		}[] = [];
		const baseColor = new Color(color);

		for (let i = 0; i < count; i++) {
			// Distribute radius procedurally (denser towards inner radius)
			const t = Math.random();
			const radius =
				innerRadius + (outerRadius - innerRadius) * (t * t * 0.7 + t * 0.3);

			const theta = Math.random() * Math.PI * 2;

			// Keplerian orbital speed: omega is proportional to r^(-1.5)
			const speed = 0.45 * radius ** -1.5 * (0.9 + Math.random() * 0.2);

			// Randomized scale (small 3D rocks)
			const scale = 0.02 + Math.random() * 0.05;

			// Slightly wobble the orbital inclination for vertical thickness
			const verticalOffset = (Math.random() - 0.5) * 0.025 * radius;

			// Spin (tumbling) axis and speed
			const spinAxis = new Vector3(
				Math.random() - 0.5,
				Math.random() - 0.5,
				Math.random() - 0.5
			).normalize();
			const spinSpeed = 0.5 + Math.random() * 2.0;

			// Shade variations
			const variation = 0.8 + Math.random() * 0.4;
			const rockColor = baseColor.clone().multiplyScalar(variation);

			data.push({
				radius,
				theta,
				speed,
				scale,
				verticalOffset,
				spinAxis,
				spinSpeed,
				spinAngle: Math.random() * Math.PI * 2,
				color: rockColor,
			});
		}
		return data;
	}, [innerRadius, outerRadius, color, count]);

	const tempMatrix = useMemo(() => new Matrix4(), []);
	const tempPosition = useMemo(() => new Vector3(), []);
	const tempRotation = useMemo(() => new Quaternion(), []);
	const tempScale = useMemo(() => new Vector3(), []);

	// Initialize colors once
	useFrame((state) => {
		if (!meshRef.current) {
			return;
		}

		const dt = Math.min(0.03, state.clock.getDelta() || 0.016);
		const mesh = meshRef.current;

		for (let i = 0; i < count; i++) {
			const rock = debris[i];

			// Update orbital angle
			rock.theta += rock.speed * dt;

			// Update tumbling rotation
			rock.spinAngle += rock.spinSpeed * dt;

			// Compute 3D position in the orbital plane
			const x = rock.radius * Math.cos(rock.theta);
			const z = rock.radius * Math.sin(rock.theta);
			const y = rock.verticalOffset;

			tempPosition.set(x, y, z);
			tempRotation.setFromAxisAngle(rock.spinAxis, rock.spinAngle);
			tempScale.set(rock.scale, rock.scale, rock.scale);

			tempMatrix.compose(tempPosition, tempRotation, tempScale);
			mesh.setMatrixAt(i, tempMatrix);
			mesh.setColorAt(i, rock.color);
		}

		mesh.instanceMatrix.needsUpdate = true;
		if (mesh.instanceColor) {
			mesh.instanceColor.needsUpdate = true;
		}
	});

	return (
		<instancedMesh
			// biome-ignore lint/suspicious/noExplicitAny: R3F instancedMesh args signature requires any casting
			args={[null as any, null as any, count]}
			castShadow
			receiveShadow
			ref={meshRef}
		>
			<icosahedronGeometry args={[1, 0]} />
			<meshStandardMaterial
				metalness={0.1}
				roughness={0.9}
				toneMapped={false}
			/>
		</instancedMesh>
	);
}
