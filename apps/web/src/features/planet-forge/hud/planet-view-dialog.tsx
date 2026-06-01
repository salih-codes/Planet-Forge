import { Badge } from "@planet-forge/ui/components/badge";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@planet-forge/ui/components/dialog";
import { Canvas } from "@react-three/fiber";
import { PLANET_TYPES } from "../lib/planet-presets";
import type { CelestialBody } from "../lib/types";
import { IsolatedPlanetView } from "../scene/isolated-planet-view";
import { ControllerButtonHint } from "./controller-button-hint";

interface PlanetViewDialogProps {
	body: CelestialBody | null;
	onOpenChange: (open: boolean) => void;
	open: boolean;
}

const STAT_ROWS = [
	{
		key: "radiusKm",
		label: "Radius",
		fmt: (v: number) => `${Math.round(v).toLocaleString()} km`,
	},
	{ key: "mass", label: "Mass", fmt: (v: number) => `${v.toFixed(2)} M⊕` },
	{ key: "gravity", label: "Gravity", fmt: (v: number) => `${v.toFixed(2)} g` },
	{
		key: "temp",
		label: "Surface Temp",
		fmt: (v: number) => `${Math.round(v)} °C`,
	},
	{ key: "day", label: "Day Length", fmt: (v: number) => `${v.toFixed(1)} h` },
	{ key: "moons", label: "Moons", fmt: (v: number) => `${v}` },
] as const;

export function PlanetViewDialog({
	body,
	open,
	onOpenChange,
}: PlanetViewDialogProps) {
	if (!body) {
		return null;
	}

	const meta = PLANET_TYPES[body.type];
	const r = body.config.radius;
	const camZ = r * 3.5;

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent
				className="glass w-[calc(100vw-2rem)] max-w-3xl gap-0 overflow-hidden p-0 sm:max-w-3xl"
				data-interactive
				showCloseButton={false}
			>
				<DialogHeader className="border-b px-6 py-4">
					<div className="flex items-center gap-2 text-[10px] text-primary uppercase tracking-[0.28em]">
						<span
							className="size-2 rounded-full"
							style={{ background: meta?.color ?? "#888" }}
						/>
						{meta?.label ?? body.type}
					</div>
					<div className="flex items-center justify-between">
						<DialogTitle className="font-mono text-lg tracking-[0.1em]">
							{body.name.toUpperCase()}
						</DialogTitle>
						<Badge
							className="font-mono text-[10px] uppercase"
							variant="outline"
						>
							ID: {body.id}
						</Badge>
					</div>
				</DialogHeader>

				<div className="grid grid-cols-[1fr_260px]">
					{/* Left: isolated planet canvas */}
					<div className="relative h-80 bg-black/60">
						<Canvas
							camera={{
								fov: 45,
								near: 0.01,
								far: camZ * 10,
								position: [0, 0, camZ],
							}}
							dpr={[1, 2]}
							gl={{ antialias: true }}
						>
							<ambientLight intensity={0.15} />
							<directionalLight intensity={1.4} position={[5, 3, 4]} />
							<IsolatedPlanetView body={body} />
						</Canvas>
						<p className="absolute right-0 bottom-3 left-0 text-center font-mono text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
							Long-press a planet to view it here
						</p>
					</div>

					{/* Right: stats */}
					<div className="flex flex-col gap-4 border-l bg-black/40 p-5">
						<p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
							Planet Statistics
						</p>
						<div className="grid gap-2">
							{STAT_ROWS.map(({ key, label, fmt }) => (
								<div className="flex items-center justify-between" key={key}>
									<span className="text-[11px] text-muted-foreground">
										{label}
									</span>
									<span className="font-mono text-[11px] text-foreground">
										{fmt(body.stats[key] as number)}
									</span>
								</div>
							))}
						</div>

						<div className="mt-auto border-t pt-4">
							<p className="mb-1 font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
								Life Status
							</p>
							<Badge className="font-mono text-[10px]" variant="outline">
								{body.stats.life}
							</Badge>
						</div>

						<div>
							<p className="mb-1 font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
								Thermal Profile
							</p>
							<p className="text-[11px] text-foreground/80">
								{body.stats.tempProfile}
							</p>
						</div>

						<div className="mt-2 flex items-center justify-between gap-3">
							<button
								className="flex-1 border border-foreground/20 py-1.5 font-mono text-[10px] text-muted-foreground uppercase tracking-widest transition-colors hover:border-foreground/40 hover:text-foreground"
								onClick={() => onOpenChange(false)}
								type="button"
							>
								Close [ ESC ]
							</button>
							<ControllerButtonHint action="cancel" className="scale-100" />
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
