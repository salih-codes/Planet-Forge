import { useEffect, useRef } from "react";
import type { SystemInfo } from "../lib/types";
import { useGamepadStore } from "../lib/use-gamepad";
import { ControllerButtonHint } from "./controller-button-hint";

interface SystemsListOverlayProps {
	onSelectSystem: (id: string) => void;
	systems: SystemInfo[];
}

export function SystemsListOverlay({
	systems,
	onSelectSystem,
}: SystemsListOverlayProps) {
	const systemsListOpen = useGamepadStore((s) => s.systemsListOpen);
	const highlightedIndex = useGamepadStore((s) => s.highlightedSystemIndex);
	const activeItemRef = useRef<HTMLDivElement | null>(null);

	// Scroll highlighted item into view automatically
	useEffect(() => {
		if (activeItemRef.current) {
			activeItemRef.current.scrollIntoView({
				behavior: "smooth",
				block: "nearest",
			});
		}
	}, []);

	if (!systemsListOpen) {
		return null;
	}

	const highlightedSystem = systems[highlightedIndex] ?? null;
	const starColor = highlightedSystem?.star.color ?? "#ffaa00";

	return (
		<div className="fade-in fixed inset-0 z-[100] flex animate-in items-center justify-center bg-black/80 backdrop-blur-lg transition-all duration-300">
			{/* Radiant Star Backglow */}
			<div
				className="pointer-events-none absolute h-[600px] w-[600px] rounded-full opacity-20 blur-[150px] transition-all duration-700 ease-out"
				style={{
					background: `radial-gradient(circle, ${starColor} 0%, rgba(0,0,0,0) 70%)`,
				}}
			/>

			{/* Central Selector Container */}
			<div className="glass relative flex h-[580px] w-full max-w-xl flex-col gap-6 overflow-hidden rounded-2xl border border-white/10 p-8 shadow-[0_0_60px_rgba(0,0,0,0.8)]">
				{/* Top-right subtle glow border decorative */}
				<div className="pointer-events-none absolute top-0 right-0 h-32 w-32 rounded-bl-full bg-primary/10 blur-2xl" />

				{/* Header */}
				<div className="relative shrink-0">
					<div className="flex items-center gap-2 font-mono text-[10px] text-primary uppercase tracking-[0.28em]">
						<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
						Sector Directory
					</div>
					<h2 className="mt-1 font-bold font-mono text-2xl text-foreground uppercase tracking-[0.12em]">
						Solar Systems
					</h2>
					<p className="mt-1.5 text-muted-foreground text-xs leading-relaxed">
						Use the controller shoulder button to open/close directory, D-pad to
						navigate coordinates, and confirm button to warp.
					</p>
				</div>

				{/* Systems List */}
				<div className="custom-scrollbar flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
					{systems.map((sys, idx) => {
						const isHighlighted = idx === highlightedIndex;
						const isCurrent = sys.id === highlightedSystem?.id;
						const sCol = sys.star.color;

						return (
							// biome-ignore lint/a11y/noNoninteractiveElementInteractions: list item is virtual controller navigated
							// biome-ignore lint/a11y/noStaticElementInteractions: list item is virtual controller navigated
							// biome-ignore lint/a11y/useKeyWithClickEvents: click is a fallback for mouse, gamepad handles selections
							<div
								className={`group relative flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all duration-300 ${
									isHighlighted
										? "scale-[1.01] border-primary/60 bg-primary/10 shadow-[0_0_20px_rgba(var(--primary-rgb),0.15)]"
										: "border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10"
								}`}
								key={sys.id}
								onClick={() => {
									onSelectSystem(sys.id);
									useGamepadStore.setState({ systemsListOpen: false });
								}}
								ref={isHighlighted ? activeItemRef : null}
							>
								{/* Pulse glow background for highlighted item */}
								{isHighlighted && (
									<div
										className="pointer-events-none absolute inset-0 animate-pulse rounded-xl opacity-[0.04]"
										style={{ backgroundColor: sCol }}
									/>
								)}

								{/* Left: Star Preview Orb */}
								<div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
									{/* Glow Halo */}
									<div
										className={`absolute inset-0 rounded-full blur-[8px] transition-all duration-300 ${
											isHighlighted
												? "scale-125 opacity-60"
												: "scale-100 opacity-20"
										}`}
										style={{ backgroundColor: sCol }}
									/>
									{/* Pulsating Ring */}
									{isHighlighted && (
										<div
											className="absolute inset-0 animate-spin rounded-full border border-dashed"
											style={{
												borderColor: `${sCol}66`,
												animationDuration: "12s",
											}}
										/>
									)}
									{/* Core Sphere */}
									<div
										className="relative h-8 w-8 rounded-full shadow-[inset_0_-4px_8px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:scale-110"
										style={{
											background: `radial-gradient(circle at 35% 35%, #ffffff 0%, ${sCol} 60%, ${sCol}bb 100%)`,
										}}
									/>
								</div>

								{/* Middle: Name and classification */}
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<span className="truncate font-bold font-mono text-foreground text-sm uppercase tracking-wider">
											{sys.name}
										</span>
										{isCurrent && (
											<span className="rounded bg-primary/20 px-1 py-px font-mono text-[8px] text-primary uppercase tracking-wider">
												ACTIVE
											</span>
										)}
									</div>
									<div className="mt-1 flex items-center gap-3 font-mono text-[10px] text-muted-foreground uppercase">
										<span>Star: {sys.star.name}</span>
										<span className="h-1 w-1 rounded-full bg-white/20" />
										<span>Mass: {sys.star.mass} M☉</span>
									</div>
								</div>

								{/* Right: Badges */}
								<div className="flex shrink-0 items-center gap-2">
									{/* Planet count */}
									<div className="flex flex-col items-end">
										<span className="font-mono font-semibold text-foreground text-xs">
											{String(sys.planetsCount).padStart(2, "0")}
										</span>
										<span className="text-[8px] text-muted-foreground uppercase tracking-wider">
											Planets
										</span>
									</div>

									{/* Habitability */}
									<div className="ml-2 flex flex-col items-end border-white/10 border-l pl-3">
										<span className="font-mono font-semibold text-primary text-xs">
											{sys.stats.habitability}%
										</span>
										<span className="text-[8px] text-muted-foreground uppercase tracking-wider">
											Habit
										</span>
									</div>
								</div>
							</div>
						);
					})}
				</div>

				{/* Footer Controls Hint */}
				<div className="relative mt-2 flex shrink-0 items-center justify-between border-white/5 border-t pt-4 font-mono text-[10px] text-muted-foreground">
					<div className="flex items-center gap-3">
						<span className="flex items-center gap-1.5">
							<ControllerButtonHint action="dpadUp" />
							<ControllerButtonHint action="dpadDown" />
							Navigate
						</span>
						<span className="h-3 w-px bg-white/10" />
						<span className="flex items-center gap-1.5">
							<ControllerButtonHint action="confirm" />
							Warp / Select
						</span>
					</div>
					<div className="flex items-center gap-3">
						<span className="flex items-center gap-1.5">
							<ControllerButtonHint action="cancel" />
							Dismiss
						</span>
						<span className="h-3 w-px bg-white/10" />
						<span className="flex items-center gap-1.5">
							<ControllerButtonHint action="l1" />
							Close
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
