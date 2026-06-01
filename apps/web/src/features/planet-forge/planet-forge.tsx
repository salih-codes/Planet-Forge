import { useEffect, useMemo, useRef, useState } from "react";
import { CreatePlanetWizard } from "./forge/create-planet-wizard";
import { ConnectionStatus } from "./hud/connection-status";
import { ControllerButtonMapDialog } from "./hud/controller-button-map-dialog";
import { ControllerCursor } from "./hud/controller-cursor";
import { ControllerIndicator } from "./hud/controller-indicator";
import { InfoPanel } from "./hud/info-panel";
import { Minimap } from "./hud/minimap";
import { PlanetViewDialog } from "./hud/planet-view-dialog";
import { SystemsListOverlay } from "./hud/systems-list-overlay";
import { TelemetryDebugger } from "./hud/telemetry-debugger";
import { Toolbar } from "./hud/toolbar";
import {
	useDeletePlanet,
	useHurlPlanet,
	useLaunchComet,
	useSupernova,
	useSystem,
	useSystems,
} from "./lib/api";
import { isTourDone, startTour } from "./lib/onboarding-tour";
import type { SystemStats } from "./lib/types";
import { useControllerNavigation } from "./lib/use-controller-navigation";
import { useCursorVisibility } from "./lib/use-cursor-visibility";
import { useGamepad, useGamepadStore } from "./lib/use-gamepad";
import { useSimStore, useSimulationSocket } from "./lib/use-simulation-socket";
import { PlanetCanvas } from "./scene/planet-canvas";

export function PlanetForge() {
	useSimulationSocket();
	useGamepad();
	useCursorVisibility();

	const [currentSystemId, setCurrentSystemId] = useState<string>("sol");
	const [galaxyMode, setGalaxyMode] = useState<boolean>(false);

	const { data: systemsData } = useSystems();
	const systems = useMemo(() => systemsData?.systems ?? [], [systemsData]);

	const { data } = useSystem(currentSystemId);
	const bodies = useMemo(() => data?.bodies ?? [], [data]);
	const deletePlanet = useDeletePlanet(currentSystemId);
	const supernova = useSupernova(currentSystemId);
	const launchComet = useLaunchComet(currentSystemId);
	const hurlPlanet = useHurlPlanet(currentSystemId);

	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [focusedId, setFocusedId] = useState<string | null>(null);
	const [resetCameraTrigger, setResetCameraTrigger] = useState(0);
	const [wizardOpen, setWizardOpen] = useState(false);
	const [telemetryOpen, setTelemetryOpen] = useState(false);
	const [viewDetailsId, setViewDetailsId] = useState<string | null>(null);
	const [controlsMapOpen, setControlsMapOpen] = useState(false);
	// Id of a just-forged planet, briefly flagged so it plays its formation animation.
	const [formingId, setFormingId] = useState<string | null>(null);

	// Ref to track double-tap cancel timings for zooming out the camera
	const lastCancelTimeRef = useRef<number>(0);

	const selected = selectedId
		? (bodies.find((b) => b.id === selectedId) ?? null)
		: null;
	const viewDetailsPlanet = bodies.find((b) => b.id === viewDetailsId) ?? null;

	const stats: SystemStats = useMemo(() => {
		const mass = bodies.reduce((a, b) => a + b.stats.mass, 0);
		const hab = bodies.length
			? Math.round(
					bodies.reduce((a, b) => a + b.stats.habitability, 0) / bodies.length
				)
			: 0;
		return { count: bodies.length, mass: +mass.toFixed(1), habitability: hab };
	}, [bodies]);

	const handleSelectSystem = (id: string) => {
		setCurrentSystemId(id);
		setSelectedId(null);
		setFocusedId(null);
	};

	const handleResetCamera = () => {
		setFocusedId(null);
		setResetCameraTrigger((v) => v + 1);
	};

	const handleStrike = () => {
		if (selected) {
			launchComet.mutate(selected.id);
		}
	};

	const handleDisintegrate = () => {
		if (!selected || bodies.length <= 1) {
			return;
		}
		// Queue the visual effect before removing the body from the API so the
		// EffectsManager can play it even after the planet mesh unmounts.
		const worldPos =
			useSimStore.getState().positions[selected.id] ?? selected.position;
		useSimStore.getState().pushEvents([
			{
				type: "disintegrate",
				pos: worldPos,
				data: {
					radius: selected.config.radius,
					energy: 1.0,
					bodies: [{ type: selected.type, radius: selected.config.radius }],
				},
			},
		]);
		deletePlanet.mutate(selected.id);
	};

	const controllerNav = useControllerNavigation({
		onForge: () => setWizardOpen(true),
		onTelemetry: () => setTelemetryOpen((v) => !v),
		onStrike: handleStrike,
		onDisintegrate: handleDisintegrate,
		onGalaxyToggle: () => setGalaxyMode((v) => !v),
		onResetCamera: handleResetCamera,
		systems,
		currentSystemId,
		onSelectSystem: handleSelectSystem,
		onShowControls: () => setControlsMapOpen((v) => !v),
		onConfirm: () => {
			if (selected?.id) {
				setViewDetailsId(selected.id);
				useGamepadStore.getState().triggerHaptic("jump");
			}
		},
		onCancel: () => {
			const systemsOpen = useGamepadStore.getState().systemsListOpen;
			if (
				systemsOpen ||
				wizardOpen ||
				telemetryOpen ||
				viewDetailsId ||
				controlsMapOpen
			) {
				useGamepadStore.setState({ systemsListOpen: false });
				setWizardOpen(false);
				setTelemetryOpen(false);
				setViewDetailsId(null);
				setControlsMapOpen(false);
			} else {
				// No active dialogs are open -> Clear target focus and selection so user can pan freely!
				setFocusedId(null);
				setSelectedId(null);

				// Double-tap cancel detection (Circle / B)
				const now = Date.now();
				if (now - lastCancelTimeRef.current < 350) {
					useGamepadStore.getState().triggerZoomOut();
					useGamepadStore.getState().triggerHaptic("collision"); // Double buzz feedback!
				}
				lastCancelTimeRef.current = now;
			}

			// Dispatch a synthetic Escape keypress to close active Radix Modals natively
			const escEvent = new KeyboardEvent("keydown", {
				key: "Escape",
				code: "Escape",
				keyCode: 27,
				which: 27,
				bubbles: true,
				cancelable: true,
			});
			document.dispatchEvent(escEvent);
		},
	});

	// Global ESC key handler to clear focus & selection when no dialogs are open
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && e.isTrusted) {
				const systemsOpen = useGamepadStore.getState().systemsListOpen;
				if (
					!(
						systemsOpen ||
						wizardOpen ||
						telemetryOpen ||
						viewDetailsId ||
						controlsMapOpen
					)
				) {
					setFocusedId(null);
					setSelectedId(null);

					// Keyboard double-tap ESC zoom out!
					const now = Date.now();
					if (now - lastCancelTimeRef.current < 350) {
						useGamepadStore.getState().triggerZoomOut();
					}
					lastCancelTimeRef.current = now;
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [wizardOpen, telemetryOpen, viewDetailsId, controlsMapOpen]);

	const gamepadBrand = useGamepadStore((s) => s.brand);
	const gamepadConnected = useGamepadStore((s) => s.connected);

	// Request fullscreen on startup (works in Tauri webview and most browsers
	// when triggered during the initial page lifecycle)
	useEffect(() => {
		if (document.fullscreenEnabled && !document.fullscreenElement) {
			document.documentElement.requestFullscreen().catch(() => undefined);
		}
	}, []);

	// Auto-start onboarding tour on first visit (after scene has loaded)
	useEffect(() => {
		if (!isTourDone()) {
			const id = setTimeout(startTour, 1800);
			return () => clearTimeout(id);
		}
	}, []);

	return (
		<div className="relative h-screen w-screen overflow-hidden bg-background">
			<PlanetCanvas
				bodies={bodies}
				currentSystemId={currentSystemId}
				focusedId={focusedId}
				formingId={formingId}
				galaxyMode={galaxyMode}
				onFocus={setFocusedId}
				onSelect={setSelectedId}
				onSelectSystem={handleSelectSystem}
				onToggleGalaxyMode={() => setGalaxyMode(!galaxyMode)}
				onViewDetails={setViewDetailsId}
				resetCameraTrigger={resetCameraTrigger}
				selectedId={selected?.id ?? null}
				systems={systems}
			/>

			<div className="hud-layer">
				<ConnectionStatus />

				<Toolbar
					currentSystemId={currentSystemId}
					galaxyMode={galaxyMode}
					onCreate={() => setWizardOpen(true)}
					onHelp={startTour}
					onLoad={() => undefined}
					onResetCamera={handleResetCamera}
					onSave={() => undefined}
					onSelectSystem={handleSelectSystem}
					onSupernova={() => supernova.mutate()}
					onToggleGalaxyMode={() => setGalaxyMode(!galaxyMode)}
					onToggleTelemetry={() => setTelemetryOpen(!telemetryOpen)}
					stats={stats}
					systems={systems}
				/>

				<SystemsListOverlay
					onSelectSystem={handleSelectSystem}
					systems={systems}
				/>

				{!galaxyMode && (
					<>
						<InfoPanel
							bodies={bodies}
							body={selected}
							canDelete={bodies.length > 1}
							onDelete={() => handleDisintegrate()}
							onHurl={(planetId, targetId) =>
								hurlPlanet.mutate({ planetId, targetId })
							}
							onStrike={(id) => launchComet.mutate(id)}
						/>
						<Minimap bodies={bodies} selectedId={selected?.id ?? null} />
					</>
				)}

				<ControllerIndicator onShowControls={() => setControlsMapOpen(true)} />

				{gamepadConnected && gamepadBrand && (
					<ControllerCursor
						brand={gamepadBrand}
						visible={controllerNav.cursorMode}
						x={controllerNav.cursorX}
						y={controllerNav.cursorY}
					/>
				)}
			</div>

			<CreatePlanetWizard
				onForged={(id) => {
					setFormingId(id);
					setTimeout(() => setFormingId(null), 3000);
				}}
				onOpenChange={setWizardOpen}
				open={wizardOpen}
				systemId={currentSystemId}
			/>

			<TelemetryDebugger onOpenChange={setTelemetryOpen} open={telemetryOpen} />

			<PlanetViewDialog
				body={viewDetailsPlanet}
				onOpenChange={(o) => {
					if (!o) {
						setViewDetailsId(null);
					}
				}}
				open={!!viewDetailsId}
			/>

			<ControllerButtonMapDialog
				onOpenChange={setControlsMapOpen}
				open={controlsMapOpen}
			/>
		</div>
	);
}
