import { Button } from "@planet-forge/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@planet-forge/ui/components/dialog";
import { Input } from "@planet-forge/ui/components/input";
import { Slider } from "@planet-forge/ui/components/slider";
import { Switch } from "@planet-forge/ui/components/switch";
import { useForm } from "@tanstack/react-form";
import { Check } from "lucide-react";
import { useState } from "react";
import { ControllerButtonHint } from "../hud/controller-button-hint";
import { useCreatePlanet } from "../lib/api";
import { deriveStats } from "../lib/planet-presets";
import type { Climate, PlanetConfig, PlanetType } from "../lib/types";

const STEPS = [
	"Type",
	"Size",
	"Atmosphere",
	"Features",
	"Climate",
	"Confirm",
] as const;

const DEG_TO_RAD = Math.PI / 180;

const TYPE_CARDS: { k: PlanetType; t: string; d: string; g: string }[] = [
	{
		k: "terran",
		t: "Terran",
		d: "Continents & oceans",
		g: "radial-gradient(circle at 38% 35%, #6fd1ff, #1f6fb0 45%, #0a3a2a 70%, #052036)",
	},
	{
		k: "ocean",
		t: "Ocean",
		d: "Endless seas",
		g: "radial-gradient(circle at 38% 35%, #5fe0e8, #1f88a8 50%, #073a55)",
	},
	{
		k: "desert",
		t: "Desert",
		d: "Arid dunes",
		g: "radial-gradient(circle at 38% 35%, #ffd99a, #d8923a 50%, #7a4516)",
	},
	{
		k: "ice",
		t: "Ice",
		d: "Frozen crust",
		g: "radial-gradient(circle at 38% 35%, #ffffff, #bfe6ff 45%, #5f8fb0)",
	},
	{
		k: "lava",
		t: "Volcanic",
		d: "Molten surface",
		g: "radial-gradient(circle at 38% 35%, #ffd07a, #ff5a2a 40%, #5a1208)",
	},
	{
		k: "gas",
		t: "Gas Giant",
		d: "Banded storms",
		g: "repeating-linear-gradient(8deg, #e8c89a 0 7px, #c89a64 7px 13px, #f0dcb4 13px 19px, #b88a54 19px 26px)",
	},
];

const CLIMATES: { k: Climate; l: string; ic: string }[] = [
	{ k: "frozen", l: "Frozen", ic: "❄" },
	{ k: "temperate", l: "Temperate", ic: "🌤" },
	{ k: "tropical", l: "Tropical", ic: "🌴" },
	{ k: "scorched", l: "Scorched", ic: "🔥" },
];

function stepBackground(i: number, current: number): string {
	if (i === current) {
		return "var(--primary)";
	}
	if (i < current) {
		return "oklch(0.795 0.184 86.047 / 0.5)";
	}
	return "transparent";
}

function FieldLabel({ k, v }: { k: string; v: string }) {
	return (
		<div className="mb-2.5 flex items-baseline justify-between">
			<span className="text-[11px] text-muted-foreground uppercase tracking-[0.18em]">
				{k}
			</span>
			<span className="font-mono text-base text-primary">{v}</span>
		</div>
	);
}

function ToggleRow({
	title,
	desc,
	checked,
	onChange,
}: {
	title: string;
	desc: string;
	checked: boolean;
	onChange: (v: boolean) => void;
}) {
	return (
		<div className="mb-3 flex items-center justify-between rounded-lg border bg-secondary/40 px-3.5 py-3">
			<div>
				<div className="text-sm">{title}</div>
				<div className="text-[11px] text-muted-foreground">{desc}</div>
			</div>
			<Switch checked={checked} onCheckedChange={onChange} />
		</div>
	);
}

export function CreatePlanetWizard({
	open,
	onOpenChange,
	systemId = "sol",
	onForged,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	systemId?: string;
	onForged?: (id: string) => void;
}) {
	const [step, setStep] = useState(0);
	const createPlanet = useCreatePlanet(systemId);

	const form = useForm({
		defaultValues: {
			type: "terran" as PlanetType,
			radius: 3.2,
			atmosphere: 0.9,
			clouds: true as boolean,
			rings: false as boolean,
			climate: "temperate" as Climate,
			name: "",
			moons: 0 as number,
			// Axial tilt in degrees (converted to radians on submit) and orbital
			// eccentricity (0 = circular). Both round-trip through the sim.
			tiltDeg: 23 as number,
			eccentricity: 0 as number,
		},
		onSubmit: async ({ value }) => {
			const { tiltDeg, ...rest } = value;
			const created = await createPlanet.mutateAsync({
				...rest,
				tilt: tiltDeg * DEG_TO_RAD,
				name: value.name || undefined,
			} satisfies PlanetConfig);
			onForged?.(created.id);
			onOpenChange(false);
			setStep(0);
			form.reset();
		},
	});

	const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
	const prev = () => setStep((s) => Math.max(s - 1, 0));

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent
				className="glass w-[calc(100vw-2rem)] max-w-190 gap-0 overflow-hidden p-0 sm:max-w-190"
				data-interactive
				showCloseButton={false}
			>
				<DialogHeader className="border-b px-6 py-4">
					<div className="text-[10px] text-primary uppercase tracking-[0.28em]">
						Genesis Sequence
					</div>
					<DialogTitle className="font-mono text-lg tracking-[0.1em]">
						CREATE PLANET
					</DialogTitle>
				</DialogHeader>

				<div className="flex gap-0 px-6 pt-4 pb-1">
					{STEPS.map((s, i) => (
						<div className="flex flex-1 flex-col gap-1.5" key={s}>
							<div className="h-[3px] overflow-hidden rounded-full bg-white/10">
								<div
									className="h-full rounded-full transition-[width] duration-300"
									style={{
										width: i <= step ? "100%" : "0%",
										background: stepBackground(i, step),
									}}
								/>
							</div>
							<div
								className={`text-[10px] uppercase tracking-[0.2em] ${i === step ? "text-primary" : "text-muted-foreground"}`}
							>
								{String(i + 1).padStart(2, "0")} {s}
							</div>
						</div>
					))}
				</div>

				<div className="min-h-[300px] overflow-y-auto p-6">
					{step === 0 && (
						<form.Field name="type">
							{(field) => (
								<>
									<p className="mb-4 text-muted-foreground text-sm">
										Select a{" "}
										<b className="text-foreground">planetary archetype</b>.
										Defines the surface shader and base composition.
									</p>
									<div className="grid grid-cols-3 gap-3">
										{TYPE_CARDS.map((c) => {
											const sel = field.state.value === c.k;
											return (
												<button
													className={`group relative overflow-hidden rounded-lg border bg-secondary/40 text-left transition-all hover:-translate-y-0.5 ${
														sel
															? "border-primary ring-1 ring-primary"
															: "hover:border-foreground/20"
													}`}
													key={c.k}
													onClick={() => {
														field.handleChange(c.k);
														form.setFieldValue("rings", c.k === "gas");
													}}
													type="button"
												>
													<div className="relative h-[78px]">
														<div
															className="absolute top-1/2 left-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full"
															style={{
																background: c.g,
																boxShadow:
																	"inset -6px -6px 14px rgba(0,0,0,0.45)",
															}}
														/>
														{sel && (
															<div className="absolute top-2 right-2 grid size-[18px] place-items-center rounded-full bg-primary">
																<Check
																	className="size-3 text-primary-foreground"
																	strokeWidth={3}
																/>
															</div>
														)}
													</div>
													<div className="px-2.5 py-2">
														<div className="font-mono text-foreground text-xs">
															{c.t}
														</div>
														<div className="text-[11px] text-muted-foreground">
															{c.d}
														</div>
													</div>
												</button>
											);
										})}
									</div>
								</>
							)}
						</form.Field>
					)}

					{step === 1 && (
						<form.Field name="radius">
							{(field) => (
								<>
									<p className="mb-4 text-muted-foreground text-sm">
										Set the <b className="text-foreground">planetary radius</b>.
										Larger bodies pull more mass and gravity.
									</p>
									<FieldLabel
										k="Radius"
										v={`${(field.state.value * 1850).toFixed(0)} km`}
									/>
									<Slider
										max={6}
										min={1}
										onValueChange={(vals) =>
											field.handleChange(
												typeof vals === "number" ? vals : (vals[0] ?? 1)
											)
										}
										step={0.1}
										value={[field.state.value]}
									/>
									<div className="mt-6 grid grid-cols-2 gap-2.5">
										<div className="rounded-md border bg-secondary/40 px-3 py-2">
											<div className="text-[9.5px] text-muted-foreground uppercase tracking-[0.18em]">
												Est. Mass
											</div>
											<div className="mt-1 font-mono text-base">
												{(
													(field.state.value / 3.4) ** 3 *
													(form.getFieldValue("type") === "gas" ? 95 : 1)
												).toFixed(2)}
												<span className="ml-0.5 text-[10px] text-muted-foreground">
													M⊕
												</span>
											</div>
										</div>
										<div className="rounded-md border bg-secondary/40 px-3 py-2">
											<div className="text-[9.5px] text-muted-foreground uppercase tracking-[0.18em]">
												Est. Gravity
											</div>
											<div className="mt-1 font-mono text-base">
												{(
													(field.state.value / 3.4) ** 1 *
													(form.getFieldValue("type") === "gas" ? 95 : 1)
												).toFixed(2)}
												<span className="ml-0.5 text-[10px] text-muted-foreground">
													g
												</span>
											</div>
										</div>
									</div>
								</>
							)}
						</form.Field>
					)}

					{step === 2 && (
						<>
							<p className="mb-4 text-muted-foreground text-sm">
								Tune the <b className="text-foreground">atmospheric envelope</b>{" "}
								— Fresnel glow and cloud cover.
							</p>
							<form.Field name="atmosphere">
								{(field) => (
									<div className="mb-6">
										<FieldLabel
											k="Atmosphere Density"
											v={`${Math.round(field.state.value * 100)}%`}
										/>
										<Slider
											max={1.5}
											min={0}
											onValueChange={(vals) =>
												field.handleChange(
													typeof vals === "number" ? vals : (vals[0] ?? 0)
												)
											}
											step={0.05}
											value={[field.state.value]}
										/>
									</div>
								)}
							</form.Field>
							<form.Field name="clouds">
								{(field) => (
									<ToggleRow
										checked={field.state.value}
										desc="Animated procedural cloud shell"
										onChange={(v) => field.handleChange(v)}
										title="Cloud Layer"
									/>
								)}
							</form.Field>
						</>
					)}

					{step === 3 && (
						<>
							<p className="mb-4 text-muted-foreground text-sm">
								Add <b className="text-foreground">orbital companions</b> and
								shape the world's geometry — rings, moons, axial tilt and orbit
								shape.
							</p>
							<form.Field name="rings">
								{(field) => (
									<ToggleRow
										checked={field.state.value}
										desc="Icy band plus thousands of tumbling debris rocks"
										onChange={(v) => field.handleChange(v)}
										title="Ring System & Debris"
									/>
								)}
							</form.Field>
							<form.Field name="moons">
								{(field) => (
									<div className="mb-6">
										<FieldLabel
											k="Moons"
											v={`${field.state.value} ${field.state.value === 1 ? "moon" : "moons"}`}
										/>
										<Slider
											max={12}
											min={0}
											onValueChange={(vals) =>
												field.handleChange(
													typeof vals === "number" ? vals : (vals[0] ?? 0)
												)
											}
											step={1}
											value={[field.state.value]}
										/>
										<p className="mt-2 text-[10.5px] text-muted-foreground">
											Natural satellites, scaled well below the planet and
											spaced out along inclined orbits (up to 4 shown in-scene).
										</p>
									</div>
								)}
							</form.Field>
							<form.Field name="tiltDeg">
								{(field) => (
									<div className="mb-6">
										<FieldLabel k="Axial Tilt" v={`${field.state.value}°`} />
										<Slider
											max={90}
											min={0}
											onValueChange={(vals) =>
												field.handleChange(
													typeof vals === "number" ? vals : (vals[0] ?? 0)
												)
											}
											step={1}
											value={[field.state.value]}
										/>
										<p className="mt-2 text-[10.5px] text-muted-foreground">
											Tilts the spin axis and any ring plane. Earth ≈ 23°,
											Uranus ≈ 98°.
										</p>
									</div>
								)}
							</form.Field>
							<form.Field name="eccentricity">
								{(field) => (
									<div className="mb-6">
										<FieldLabel
											k="Orbit Eccentricity"
											v={field.state.value.toFixed(2)}
										/>
										<Slider
											max={0.6}
											min={0}
											onValueChange={(vals) =>
												field.handleChange(
													typeof vals === "number" ? vals : (vals[0] ?? 0)
												)
											}
											step={0.02}
											value={[field.state.value]}
										/>
										<p className="mt-2 text-[10.5px] text-muted-foreground">
											0 = perfect circle. Higher values stretch the orbit into
											an ellipse that swings closer to and farther from the
											star.
										</p>
									</div>
								)}
							</form.Field>
						</>
					)}

					{step === 4 && (
						<form.Field name="climate">
							{(field) => (
								<>
									<p className="mb-4 text-muted-foreground text-sm">
										Choose a <b className="text-foreground">climate band</b>.
										Shifts surface temperature and biosignature odds.
									</p>
									<div className="flex flex-wrap gap-2">
										{CLIMATES.map((c) => {
											const sel = field.state.value === c.k;
											return (
												<button
													className={`min-w-[90px] flex-1 rounded-lg border px-2.5 py-3.5 text-center transition-all ${
														sel
															? "border-primary bg-primary/10 text-foreground"
															: "bg-secondary/40 hover:border-foreground/20"
													}`}
													key={c.k}
													onClick={() => field.handleChange(c.k)}
													type="button"
												>
													<span className="mb-1.5 block text-xl">{c.ic}</span>
													<span className="text-xs uppercase tracking-[0.1em]">
														{c.l}
													</span>
												</button>
											);
										})}
									</div>
									<div className="mt-5 rounded-md border bg-secondary/40 px-3 py-2">
										<div className="text-[9.5px] text-muted-foreground uppercase tracking-[0.18em]">
											Projected Surface Temperature
										</div>
										<div className="mt-1 font-mono text-base text-primary">
											{
												deriveStats(
													form.getFieldValue("type"),
													form.getFieldValue("radius"),
													field.state.value
												).temp
											}
											<span className="ml-0.5 text-[10px] text-muted-foreground">
												°C baseline
											</span>
										</div>
									</div>
								</>
							)}
						</form.Field>
					)}

					{step === 5 && (
						<form.Subscribe selector={(s) => s.values}>
							{(v) => {
								const card = TYPE_CARDS.find((c) => c.k === v.type);
								if (!card) {
									return null;
								}
								return (
									<>
										<p className="mb-4 text-muted-foreground text-sm">
											Confirm parameters and{" "}
											<b className="text-foreground">commit to the forge</b>.
										</p>
										<div className="grid grid-cols-[150px_1fr] items-center gap-6">
											<div
												className="relative aspect-square rounded-full"
												style={{
													background: card.g,
													boxShadow: "0 0 40px rgba(0,0,0,0.6)",
												}}
											>
												{v.atmosphere > 0 && (
													<div
														className="absolute -inset-2 rounded-full blur-md"
														style={{
															background: card.g,
															opacity: 0.4 * v.atmosphere,
														}}
													/>
												)}
											</div>
											<div>
												<form.Field name="name">
													{(field) => (
														<Input
															className="font-mono text-lg tracking-wide"
															onChange={(e) =>
																field.handleChange(e.target.value)
															}
															placeholder="Designate name…"
															value={field.state.value}
														/>
													)}
												</form.Field>
												<div className="mt-3.5 space-y-0">
													{[
														["Type", card.t],
														["Radius", `${(v.radius * 1850).toFixed(0)} km`],
														[
															"Atmosphere",
															`${Math.round(v.atmosphere * 100)}%`,
														],
														[
															"Clouds / Rings",
															`${v.clouds ? "Yes" : "No"} / ${v.rings ? "Yes" : "No"}`,
														],
														["Moons", `${v.moons}`],
														["Axial Tilt", `${v.tiltDeg}°`],
														["Eccentricity", v.eccentricity.toFixed(2)],
														[
															"Climate",
															CLIMATES.find((c) => c.k === v.climate)?.l ?? "",
														],
													].map(([k, val]) => (
														<div
															className="flex justify-between border-white/5 border-b py-1.5 text-sm"
															key={k}
														>
															<span className="text-[11px] text-muted-foreground uppercase tracking-[0.1em]">
																{k}
															</span>
															<span className="font-mono text-foreground">
																{val}
															</span>
														</div>
													))}
												</div>
											</div>
										</div>
									</>
								);
							}}
						</form.Subscribe>
					)}
				</div>

				<div className="flex items-center justify-between border-t px-6 py-4">
					<div className="flex items-center gap-2">
						<Button disabled={step === 0} onClick={prev} variant="ghost">
							← Back
						</Button>
						<button
							className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground uppercase tracking-wider transition-colors hover:text-foreground"
							onClick={() => onOpenChange(false)}
							type="button"
						>
							Cancel [ ESC ]
						</button>
						<ControllerButtonHint action="cancel" className="scale-100" />
					</div>
					<div className="whitespace-nowrap text-[11px] text-muted-foreground uppercase tracking-[0.2em]">
						Step {step + 1} / {STEPS.length}
					</div>
					{step < STEPS.length - 1 ? (
						<Button onClick={next}>Next →</Button>
					) : (
						<Button
							className="gap-2 font-mono tracking-[0.12em]"
							disabled={createPlanet.isPending}
							onClick={() => form.handleSubmit()}
						>
							{createPlanet.isPending ? "FORGING…" : "⬢ FORGE PLANET"}
						</Button>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
