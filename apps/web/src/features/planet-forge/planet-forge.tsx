import { useMemo, useState } from "react";
import { CreatePlanetWizard } from "./forge/create-planet-wizard";
import { ConnectionStatus } from "./hud/connection-status";
import { InfoPanel } from "./hud/info-panel";
import { Minimap } from "./hud/minimap";
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
import type { SystemStats } from "./lib/types";
import { useSimulationSocket } from "./lib/use-simulation-socket";
import { PlanetCanvas } from "./scene/planet-canvas";

export function PlanetForge() {
	useSimulationSocket();

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
	const [wizardOpen, setWizardOpen] = useState(false);
	const [telemetryOpen, setTelemetryOpen] = useState(false);
	// Id of a just-forged planet, briefly flagged so it plays its formation animation.
	const [formingId, setFormingId] = useState<string | null>(null);

	const selected =
		bodies.find((b) => b.id === (selectedId ?? bodies[0]?.id)) ?? null;

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
				selectedId={selected?.id ?? null}
				systems={systems}
			/>

			<div className="hud-layer">
				<ConnectionStatus />

				<Toolbar
					currentSystemId={currentSystemId}
					galaxyMode={galaxyMode}
					onCreate={() => setWizardOpen(true)}
					onLoad={() => undefined}
					onResetCamera={() => setFocusedId(null)}
					onSave={() => undefined}
					onSelectSystem={handleSelectSystem}
					onSupernova={() => supernova.mutate()}
					onToggleGalaxyMode={() => setGalaxyMode(!galaxyMode)}
					onToggleTelemetry={() => setTelemetryOpen(!telemetryOpen)}
					stats={stats}
					systems={systems}
				/>

				{!galaxyMode && (
					<>
						<InfoPanel
							bodies={bodies}
							body={selected}
							canDelete={bodies.length > 1}
							onDelete={(id) => deletePlanet.mutate(id)}
							onHurl={(planetId, targetId) =>
								hurlPlanet.mutate({ planetId, targetId })
							}
							onStrike={(id) => launchComet.mutate(id)}
						/>
						<Minimap bodies={bodies} selectedId={selected?.id ?? null} />
					</>
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
		</div>
	);
}
