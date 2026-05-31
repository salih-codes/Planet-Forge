import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useEffect, useRef } from "react";
import { AdditiveBlending, DoubleSide, Vector3 } from "three";
import type { CelestialBody, SystemInfo } from "../lib/types";
import { useSimStore } from "../lib/use-simulation-socket";
import { AmbientComets } from "./ambient-comets";
import { EffectsManager } from "./effects/effects-manager";
import { CentralStar, Nebula, Starfield, Sun } from "./environment";
import { Planet } from "./planet";

const GALAXY_COORDS: Record<string, [number, number, number]> = {
	sol: [0, 0, 0],
	kepler: [-35, 5, 25],
	alpha: [30, -4, -20],
};

function GalaxyCameraController({
	currentSystemId,
	controlsRef,
}: {
	currentSystemId: string;
	// biome-ignore lint/suspicious/noExplicitAny: ref is OrbitControls typed
	controlsRef: any;
}) {
	const { camera } = useThree();

	useFrame(() => {
		if (!controlsRef.current) {
			return;
		}
		const coords = GALAXY_COORDS[currentSystemId] || [0, 0, 0];
		const targetVec = new Vector3(coords[0], coords[1], coords[2]);

		controlsRef.current.target.lerp(targetVec, 0.08);

		const desiredCamPos = new Vector3()
			.copy(targetVec)
			.add(new Vector3(0, 45, 95));
		camera.position.lerp(desiredCamPos, 0.06);
		controlsRef.current.update();
	});

	return null;
}

function LocalCameraController({
	focusedId,
	bodies,
	controlsRef,
}: {
	focusedId: string | null;
	bodies: CelestialBody[];
	// biome-ignore lint/suspicious/noExplicitAny: ref is OrbitControls typed
	controlsRef: any;
}) {
	const { camera } = useThree();
	const isFirstFocus = useRef(true);

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: camera tracking step is unified in local system view
	useFrame(() => {
		if (!controlsRef.current) {
			return;
		}

		if (focusedId) {
			const posArr = useSimStore.getState().positions[focusedId];
			if (posArr) {
				const currentTarget = new Vector3(posArr[0], posArr[1], posArr[2]);
				controlsRef.current.target.lerp(currentTarget, 0.08);

				if (isFirstFocus.current) {
					const body = bodies.find((b) => b.id === focusedId);
					const r = body ? body.config.radius : 3.0;
					// Frame tight so the planet fills the view (its atmosphere shell
					// reaches ~r*1.14); a closer, mostly head-on angle keeps it centred.
					const desiredCamPos = new Vector3()
						.copy(currentTarget)
						.add(new Vector3(r * 1.1, r * 0.7, r * 2.2));

					camera.position.lerp(desiredCamPos, 0.1);

					if (camera.position.distanceTo(desiredCamPos) < r * 0.1) {
						isFirstFocus.current = false;
					}
				} else {
					controlsRef.current.target.copy(currentTarget);
				}
				controlsRef.current.update();
			}
		} else {
			const origin = new Vector3(0, 0, 0);
			controlsRef.current.target.lerp(origin, 0.08);
			controlsRef.current.update();
		}
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset camera focus state when selected planet changes
	useEffect(() => {
		isFirstFocus.current = true;
	}, [focusedId]);

	return null;
}

export function PlanetCanvas({
	bodies,
	selectedId,
	onSelect,
	focusedId,
	onFocus,
	systems = [],
	currentSystemId = "sol",
	onSelectSystem,
	galaxyMode = false,
	onToggleGalaxyMode,
	formingId = null,
}: {
	bodies: CelestialBody[];
	selectedId: string | null;
	onSelect: (id: string) => void;
	focusedId: string | null;
	onFocus: (id: string | null) => void;
	systems?: SystemInfo[];
	currentSystemId?: string;
	onSelectSystem: (id: string) => void;
	galaxyMode?: boolean;
	onToggleGalaxyMode: () => void;
	formingId?: string | null;
}) {
	// biome-ignore lint/suspicious/noExplicitAny: OrbitControls typed ref
	const controlsRef = useRef<any>(null);

	const activeSystem = systems.find((sys) => sys.id === currentSystemId);
	const starColor = activeSystem?.star.color ?? "#ffaa00";
	// A real star dwarfs its planets — render it well larger than the biggest
	// planet (~4.5). This display radius is decoupled from the sim's physics
	// radius; orbits are spaced (MIN_ORBIT) to stay clear of it.
	// A real star dwarfs its planets. We don't render the literal ~109× ratio
	// (planets would be invisible specks), but the star is the clearly-dominant
	// body — roughly 3× the largest gas giant. Orbits (seeded in the sim) are
	// pushed out so nothing sits inside it. Decoupled from the physics radius.
	const starRadius = Math.max(20, (activeSystem?.star.radius ?? 1.0) * 14);

	return (
		<Canvas
			camera={{ position: [0, 95, 270], fov: 50, near: 0.1, far: 5000 }}
			className="fixed inset-0 z-0"
			dpr={[1, 2]}
			gl={{ antialias: true, powerPreference: "high-performance" }}
			onCreated={({ gl }) => {
				gl.toneMappingExposure = 1.05;
			}}
			onDoubleClick={() => onFocus(null)}
		>
			<color args={["#03060d"]} attach="background" />

			<Nebula />
			<Starfield />

			{!galaxyMode && <Sun />}

			{galaxyMode ? (
				// ================= GALAXY VIEW MODE =================
				<group>
					{systems.map((sys) => {
						const coords = GALAXY_COORDS[sys.id] || [0, 0, 0];
						const isSelected = sys.id === currentSystemId;

						let sRad = 2.6;
						if (sys.id === "sol") {
							sRad = 2.2;
						} else if (sys.id === "kepler") {
							sRad = 1.4;
						}

						const sCol = sys.star.color;

						return (
							<group key={sys.id} position={coords}>
								{/* Glowing Star Body */}
								{/* biome-ignore lint/a11y/noStaticElementInteractions: ThreeJS mesh is virtual inside Canvas */}
								<mesh
									onClick={(e) => {
										e.stopPropagation();
										onSelectSystem(sys.id);
									}}
									onDoubleClick={(e) => {
										e.stopPropagation();
										onSelectSystem(sys.id);
										onToggleGalaxyMode();
									}}
								>
									<sphereGeometry args={[sRad, 32, 24]} />
									<meshBasicMaterial color={sCol} toneMapped={false} />
								</mesh>

								{/* Star Corona Halo */}
								<mesh>
									<sphereGeometry args={[sRad * 1.6, 16, 16]} />
									<meshBasicMaterial
										blending={AdditiveBlending}
										color={sCol}
										depthWrite={false}
										opacity={0.25}
										transparent
									/>
								</mesh>

								{/* Faint Orbital disc of system */}
								<mesh rotation={[Math.PI * 0.5, 0, 0.1]}>
									<ringGeometry args={[sRad * 1.8, sRad * 4.5, 64]} />
									<meshBasicMaterial
										color={sCol}
										depthWrite={false}
										opacity={0.14}
										side={DoubleSide}
										transparent
									/>
								</mesh>

								{/* System selection ring */}
								{isSelected && (
									<mesh rotation={[Math.PI * 0.5, 0, 0]}>
										<ringGeometry args={[sRad * 5.2, sRad * 5.5, 64]} />
										<meshBasicMaterial
											color="#ffce5a"
											opacity={0.8}
											side={DoubleSide}
											transparent
										/>
									</mesh>
								)}
							</group>
						);
					})}
				</group>
			) : (
				// ================= LOCAL SYSTEM VIEW MODE =================
				<group>
					{/* Central Majestic Star */}
					<CentralStar color={starColor} radius={starRadius} />

					{/* Local System Planets and Comets */}
					{bodies.map((b) => (
						<Planet
							body={b}
							forming={b.id === formingId}
							key={b.id}
							onFocus={onFocus}
							onSelect={onSelect}
							selected={b.id === selectedId}
						/>
					))}

					{/* Sim-spawned fly-by + impactor comets */}
					<AmbientComets />

					{/* Collision / supernova / impact visuals */}
					<EffectsManager />
				</group>
			)}

			<OrbitControls
				autoRotate={!(focusedId || galaxyMode)}
				autoRotateSpeed={0.3}
				dampingFactor={0.05}
				enableDamping
				enablePan={!galaxyMode}
				maxDistance={1200}
				minDistance={2}
				panSpeed={0.6}
				ref={controlsRef}
				rotateSpeed={0.5}
				zoomSpeed={0.9}
			/>

			{galaxyMode ? (
				<GalaxyCameraController
					controlsRef={controlsRef}
					currentSystemId={currentSystemId}
				/>
			) : (
				<LocalCameraController
					bodies={bodies}
					controlsRef={controlsRef}
					focusedId={focusedId}
				/>
			)}

			<EffectComposer>
				<Bloom
					intensity={1.15}
					luminanceSmoothing={0.5}
					luminanceThreshold={0.8}
					mipmapBlur
				/>
			</EffectComposer>
		</Canvas>
	);
}
