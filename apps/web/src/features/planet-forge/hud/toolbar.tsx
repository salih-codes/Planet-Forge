import { Button } from "@planet-forge/ui/components/button";
import { Separator } from "@planet-forge/ui/components/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@planet-forge/ui/components/tooltip";
import {
	Activity,
	Camera,
	FolderOpen,
	Map as MapIcon,
	Plus,
	Save,
	Zap,
} from "lucide-react";
import type { SystemInfo, SystemStats } from "../lib/types";

function Stat({
	label,
	value,
	unit,
	accent,
}: {
	label: string;
	value: string | number;
	unit?: string;
	accent?: boolean;
}) {
	return (
		<div className="flex flex-col justify-center px-5">
			<span className="whitespace-nowrap text-[10px] text-muted-foreground uppercase tracking-[0.22em]">
				{label}
			</span>
			<span
				className={`mt-0.5 font-mono font-semibold text-xl tabular-nums ${
					accent ? "text-primary" : "text-foreground"
				}`}
			>
				{value}
				{unit && (
					<span className="ml-1 text-muted-foreground text-xs">{unit}</span>
				)}
			</span>
		</div>
	);
}

export function Toolbar({
	stats,
	onCreate,
	onSave,
	onLoad,
	onResetCamera,
	onSupernova,
	systems = [],
	currentSystemId = "sol",
	onSelectSystem,
	galaxyMode = false,
	onToggleGalaxyMode,
	onToggleTelemetry,
}: {
	stats: SystemStats;
	onCreate: () => void;
	onSave: () => void;
	onLoad: () => void;
	onResetCamera: () => void;
	onSupernova: () => void;
	systems?: SystemInfo[];
	currentSystemId?: string;
	onSelectSystem: (id: string) => void;
	galaxyMode?: boolean;
	onToggleGalaxyMode: () => void;
	onToggleTelemetry: () => void;
}) {
	// Calculate consolidated galaxy stats if in galaxy mode
	const galaxyStats = {
		count: systems.reduce((acc, sys) => acc + sys.planetsCount, 0),
		mass: +systems.reduce((acc, sys) => acc + sys.stats.mass, 0).toFixed(1),
		habitability: systems.length
			? Math.round(
					systems.reduce((acc, sys) => acc + sys.stats.habitability, 0) /
						systems.length
				)
			: 0,
	};

	const displayStats = galaxyMode ? galaxyStats : stats;

	return (
		<div
			className="absolute inset-x-4 top-4 flex h-15 items-stretch gap-3"
			data-interactive
		>
			<div className="glass flex min-w-[290px] items-center gap-3 px-4">
				<div className="relative h-9 w-9 shrink-0">
					<span className="absolute inset-0 rounded-full border border-primary/80 shadow-[0_0_14px_oklch(0.795_0.184_86.047/0.4)]" />
					<span className="absolute inset-[7px] rounded-full border border-primary/50 border-dashed" />
					<span className="absolute top-1/2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
				</div>
				<div className="flex-1 leading-none">
					<div className="font-bold font-mono text-muted-foreground text-xs uppercase tracking-[0.16em]">
						Sector Navigator
					</div>
					<div className="mt-1 flex items-center gap-1">
						<select
							className="max-w-[170px] cursor-pointer border-none bg-transparent font-bold font-mono text-foreground text-sm uppercase tracking-widest outline-none focus:ring-0"
							onChange={(e) => onSelectSystem(e.target.value)}
							value={currentSystemId}
						>
							{systems.map((sys) => (
								<option
									className="bg-background font-mono text-foreground text-xs uppercase"
									key={sys.id}
									value={sys.id}
								>
									{sys.name}
								</option>
							))}
						</select>
					</div>
				</div>
			</div>

			<div className="glass flex flex-1 items-center">
				<Stat
					label={galaxyMode ? "Total Planets" : "Bodies"}
					value={String(displayStats.count).padStart(2, "0")}
				/>
				<Separator className="h-8" orientation="vertical" />
				<Stat label="Total Mass" unit="M⊕" value={displayStats.mass} />
				<Separator className="h-8" orientation="vertical" />
				<Stat
					accent
					label={galaxyMode ? "Avg Sector Hab" : "Avg Habitability"}
					unit="%"
					value={displayStats.habitability}
				/>
			</div>

			<div className="glass flex items-center gap-2 px-2">
				<Button
					className={`gap-2 font-mono tracking-[0.12em] ${galaxyMode ? "border-primary bg-primary/25 text-primary hover:bg-primary/30" : ""}`}
					onClick={onToggleGalaxyMode}
					variant="outline"
				>
					<MapIcon className="size-4" />{" "}
					{galaxyMode ? "LOCAL PLANETS" : "GALAXY VIEW"}
				</Button>

				<Button
					className="gap-2 font-mono tracking-[0.12em]"
					disabled={galaxyMode}
					onClick={onCreate}
				>
					<Plus className="size-4" /> FORGE PLANET
				</Button>

				<Button
					className="gap-2 border-[#ff7a3a]/60 font-mono text-[#ff9a5a] tracking-[0.12em] hover:bg-[#ff7a3a]/15"
					disabled={galaxyMode}
					onClick={onSupernova}
					variant="outline"
				>
					<Zap className="size-4" /> SUPERNOVA
				</Button>

				<Button
					className="gap-2 border-primary/50 font-mono text-primary tracking-[0.12em] hover:bg-primary/15"
					onClick={onToggleTelemetry}
					variant="outline"
				>
					<Activity className="size-4" /> TELEMETRY
				</Button>

				{[
					{
						icon: Save,
						label: "Save System",
						fn: onSave,
						disabled: galaxyMode,
					},
					{ icon: FolderOpen, label: "Load", fn: onLoad, disabled: galaxyMode },
					{
						icon: Camera,
						label: "Reset Camera",
						fn: onResetCamera,
						disabled: false,
					},
				].map(({ icon: Icon, label, fn, disabled }) => (
					<Tooltip key={label}>
						<TooltipTrigger
							render={
								<Button
									disabled={disabled}
									onClick={fn}
									size="icon"
									variant="outline"
								/>
							}
						>
							<Icon className="size-4" />
						</TooltipTrigger>
						<TooltipContent>{label}</TooltipContent>
					</Tooltip>
				))}
			</div>
		</div>
	);
}
