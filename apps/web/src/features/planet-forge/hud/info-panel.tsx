import { Badge } from "@planet-forge/ui/components/badge";
import { Button } from "@planet-forge/ui/components/button";
import { Separator } from "@planet-forge/ui/components/separator";
import { Crosshair, Send, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { PLANET_TYPES } from "../lib/planet-presets";
import type { CelestialBody } from "../lib/types";
import { ControllerButtonHint } from "./controller-button-hint";

const ATMO_COLORS: Record<string, string> = {
	N2: "#5fa8ff",
	O2: "#37e0ff",
	CO2: "#ffce5a",
	Ar: "#9b7bd8",
	H2O: "#46d6e0",
	CH4: "#7be08a",
	SO2: "#ff7a5a",
	H2: "#c0d0ff",
	He: "#ffd27a",
};

function HabitabilityGauge({ value }: { value: number }) {
	const R = 34;
	const C = 2 * Math.PI * R;
	const [draw, setDraw] = useState(0);

	useEffect(() => {
		let raf: number;
		const t0 = performance.now();
		const tick = (t: number) => {
			const k = Math.min((t - t0) / 700, 1);
			setDraw(1 - (1 - k) ** 3);
			if (k < 1) {
				raf = requestAnimationFrame(tick);
			}
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, []);

	let verdict: string;
	if (value >= 70) {
		verdict = "Highly Viable";
	} else if (value >= 45) {
		verdict = "Marginal";
	} else if (value >= 20) {
		verdict = "Hostile";
	} else {
		verdict = "Uninhabitable";
	}

	let color: string;
	if (value >= 70) {
		color = "var(--primary)";
	} else if (value >= 45) {
		color = "#ffb04a";
	} else {
		color = "#ff7a5a";
	}

	return (
		<div className="flex items-center gap-4">
			<svg
				aria-label={`Habitability: ${value}%`}
				className="shrink-0"
				height="84"
				role="img"
				width="84"
			>
				<circle
					cx="42"
					cy="42"
					fill="none"
					r={R}
					stroke="oklch(1 0 0 / 7%)"
					strokeWidth="7"
				/>
				<circle
					cx="42"
					cy="42"
					fill="none"
					r={R}
					stroke={color}
					strokeDasharray={C}
					strokeDashoffset={C * (1 - (value / 100) * draw)}
					strokeLinecap="round"
					strokeWidth="7"
					style={{ filter: `drop-shadow(0 0 6px ${color})` }}
					transform="rotate(-90 42 42)"
				/>
			</svg>
			<div>
				<div className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
					Habitability
				</div>
				<div className="font-mono text-3xl" style={{ color }}>
					{Math.round(value * draw)}
					<span className="text-base">%</span>
				</div>
				<div className="text-sm" style={{ color }}>
					{verdict}
				</div>
			</div>
		</div>
	);
}

function StatCell({
	k,
	v,
	unit,
	valueColor,
}: {
	k: string;
	v: string | number;
	unit?: string;
	valueColor?: string;
}) {
	return (
		<div className="rounded-md border bg-secondary/40 px-3 py-2">
			<div className="text-[9.5px] text-muted-foreground uppercase tracking-[0.18em]">
				{k}
			</div>
			<div
				className="mt-1 font-mono text-base text-foreground"
				style={valueColor ? { color: valueColor } : undefined}
			>
				{v}
				{unit && (
					<span className="ml-0.5 text-[10px] text-muted-foreground">
						{unit}
					</span>
				)}
			</div>
		</div>
	);
}

const RADIATION_COLORS: Record<string, string> = {
	Low: "var(--primary)",
	Moderate: "#ffb04a",
	High: "#ff8a4a",
	Extreme: "#ff5a5a",
};

export function InfoPanel({
	body,
	bodies,
	canDelete,
	onDelete,
	onStrike,
	onHurl,
}: {
	body: CelestialBody | null;
	bodies: CelestialBody[];
	canDelete: boolean;
	onDelete: (id: string) => void;
	onStrike: (id: string) => void;
	onHurl: (planetId: string, targetId: string) => void;
}) {
	const [targetId, setTargetId] = useState<string | null>(null);

	if (!body) {
		return null;
	}

	const otherBodies = bodies.filter((b) => b.id !== body.id);
	const effectiveTarget =
		otherBodies.find((b) => b.id === targetId) ?? otherBodies[0] ?? null;
	const meta = PLANET_TYPES[body.type];
	const s = body.stats;
	let lifeColor: string;
	if (s.life === "None") {
		lifeColor = "#ff7a5a";
	} else if (s.life === "Sparse" || s.life === "Dormant") {
		lifeColor = "#ffb04a";
	} else {
		lifeColor = "var(--primary)";
	}

	return (
		<div
			className="glass absolute top-[92px] right-4 flex max-h-[calc(100vh-200px)] w-[330px] flex-col overflow-hidden"
			data-interactive
			data-tour="info-panel"
			key={body.id}
		>
			<div className="relative overflow-hidden border-b p-4">
				<div
					className="absolute -top-8 -right-8 h-30 w-30 rounded-full opacity-30 blur-md"
					style={{ background: meta.color }}
				/>
				<div className="flex items-center gap-2 text-[10px] text-primary uppercase tracking-[0.28em]">
					<span
						className="size-1.5 rounded-full"
						style={{
							background: meta.color,
							boxShadow: `0 0 8px ${meta.color}`,
						}}
					/>
					{meta.label} World
				</div>
				<h2 className="mt-2 font-mono text-2xl text-foreground tracking-wide">
					{body.name}
				</h2>
				<div className="text-muted-foreground text-xs uppercase tracking-[0.16em]">
					ID {body.id.toUpperCase()} · Class-
					{({ gas: "G", terran: "M" } as Record<string, string>)[body.type] ??
						"X"}
				</div>
			</div>

			<div className="overflow-y-auto p-4">
				<HabitabilityGauge value={s.habitability} />

				<div className="mt-4 grid grid-cols-2 gap-2.5">
					<StatCell k="Radius" unit="km" v={s.radiusKm.toLocaleString()} />
					<StatCell k="Mass" unit="M⊕" v={s.mass} />
					<StatCell k="Gravity" unit="g" v={s.gravity} />
					<StatCell k="Surface Temp" unit="°C" v={s.temp} />
					<StatCell k="Day Length" unit="h" v={s.day} />
					<StatCell k="Moons" v={String(s.moons).padStart(2, "0")} />
					<StatCell
						k="Radiation"
						v={s.radiation}
						valueColor={RADIATION_COLORS[s.radiation]}
					/>
					<StatCell
						k="Magnetic Field"
						v={s.magnetosphere ? "Protected" : "None"}
						valueColor={s.magnetosphere ? "var(--primary)" : "#ff8a4a"}
					/>
				</div>

				<div className="mt-2.5 rounded-md border bg-secondary/40 px-3 py-2">
					<div className="text-[9.5px] text-muted-foreground uppercase tracking-[0.18em]">
						Thermal Profile
					</div>
					<div className="mt-1 text-foreground text-xs leading-relaxed">
						{s.tempProfile}
					</div>
				</div>

				<div className="mt-4 mb-2.5 flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-[0.28em]">
					<span>Atmosphere</span>
					<span>% vol</span>
				</div>
				<div className="flex flex-col gap-1.5">
					{Object.entries(s.atmo).map(([gas, pct]) => (
						<div
							className="grid grid-cols-[46px_1fr_38px] items-center gap-2.5 text-xs"
							key={gas}
						>
							<span>{gas}</span>
							<span className="h-1.5 overflow-hidden rounded-full bg-white/5">
								<span
									className="block h-full rounded-full transition-[width] duration-700"
									style={{
										width: `${pct}%`,
										background: ATMO_COLORS[gas] ?? "#888",
										boxShadow: `0 0 8px ${ATMO_COLORS[gas] ?? "#888"}88`,
									}}
								/>
							</span>
							<span className="text-right font-mono text-muted-foreground">
								{pct}
							</span>
						</div>
					))}
				</div>

				<Separator className="my-4" />
				<Badge className="gap-2" variant="outline">
					<span
						className="size-1.5 rounded-full"
						style={{ background: lifeColor, boxShadow: `0 0 8px ${lifeColor}` }}
					/>
					Life: {s.life}
				</Badge>

				<Separator className="my-4" />
				<div className="mb-2.5 text-[10px] text-muted-foreground uppercase tracking-[0.28em]">
					Cataclysm
				</div>

				<Button
					className="w-full gap-2 border-[#7ae5ff]/50 font-mono text-[#9de0ff] text-xs tracking-[0.16em] hover:bg-[#7ae5ff]/15"
					onClick={() => onStrike(body.id)}
					variant="outline"
				>
					<Crosshair className="size-4" />
					STRIKE WITH COMET
					<ControllerButtonHint action="action1" className="ml-auto" />
				</Button>

				<div className="mt-2 flex items-center gap-2">
					<select
						className="h-9 min-w-0 flex-1 cursor-pointer rounded-md border bg-secondary/40 px-2 font-mono text-foreground text-xs uppercase tracking-wider outline-none focus:ring-0 disabled:opacity-50"
						disabled={!effectiveTarget}
						onChange={(e) => setTargetId(e.target.value)}
						value={effectiveTarget?.id ?? ""}
					>
						{otherBodies.map((b) => (
							<option
								className="bg-background text-foreground"
								key={b.id}
								value={b.id}
							>
								{b.name}
							</option>
						))}
					</select>
					<Button
						className="gap-2 font-mono text-xs tracking-[0.16em]"
						disabled={!effectiveTarget}
						onClick={() =>
							effectiveTarget && onHurl(body.id, effectiveTarget.id)
						}
						variant="outline"
					>
						<Send className="size-4" />
						HURL
					</Button>
				</div>

				<Button
					className="mt-4 w-full gap-2 font-mono text-xs tracking-[0.16em]"
					disabled={!canDelete}
					onClick={() => onDelete(body.id)}
					variant="destructive"
				>
					<Trash2 className="size-4" />
					{canDelete ? "DISINTEGRATE BODY" : "CANNOT REMOVE LAST BODY"}
					{canDelete && (
						<ControllerButtonHint action="action2" className="ml-auto" />
					)}
				</Button>
			</div>
		</div>
	);
}
