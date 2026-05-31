import { Button } from "@planet-forge/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@planet-forge/ui/components/dialog";
import { Cpu, Server, Wifi } from "lucide-react";
import { useSimStore } from "../lib/use-simulation-socket";

interface TelemetryDebuggerProps {
	onOpenChange: (open: boolean) => void;
	open: boolean;
}

export function TelemetryDebugger({
	open,
	onOpenChange,
}: TelemetryDebuggerProps) {
	const lastMsg = useSimStore((s) => s.lastMsg);
	const connected = useSimStore((s) => s.connected);

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent
				className="glass w-[calc(100vw-2rem)] max-w-275 gap-0 overflow-hidden p-0 sm:max-w-275"
				data-interactive
				showCloseButton={false}
			>
				<DialogHeader className="border-b px-6 py-4">
					<div className="flex items-center gap-2 text-[10px] text-primary uppercase tracking-[0.28em]">
						<Server className="size-3.5 animate-pulse" />
						Data Feed Telemetry
					</div>
					<DialogTitle className="font-mono text-lg tracking-[0.1em]">
						SIMULATION BROADCAST FEED
					</DialogTitle>
				</DialogHeader>

				<div className="grid grid-cols-[1fr_300px] gap-0">
					{/* Left: Pretty JSON stream */}
					<div className="flex min-w-0 flex-col border-r bg-black/40 p-5">
						<div className="mb-3 flex items-center justify-between">
							<span className="font-mono text-[11px] text-muted-foreground uppercase tracking-wider">
								Live WebSocket Stream (30 Hz)
							</span>
							<span className="flex items-center gap-1.5 font-mono text-[10px]">
								<span
									className={`size-2 rounded-full ${
										connected ? "animate-ping bg-green-500" : "bg-red-500"
									}`}
								/>
								<span className={connected ? "text-green-400" : "text-red-400"}>
									{connected ? "CONNECTED" : "DISCONNECTED"}
								</span>
							</span>
						</div>

						<div className="relative h-110 overflow-hidden rounded-md border bg-black/75 p-3.5 font-mono text-[#b5e8b0] text-xs">
							<div className="absolute inset-0 z-0 bg-[radial-gradient(#1a331a_1px,transparent_1px)] bg-size-[16px_16px] opacity-10" />
							<pre className="scrollbar-thin wrap-break-word relative z-10 h-full overflow-y-auto whitespace-pre-wrap">
								{lastMsg
									? JSON.stringify(lastMsg, null, 2)
									: `{
  "status": "Awaiting first packet...",
  "connection": ${connected ? '"active"' : '"connecting"'},
  "note": "Simulation updates stream immediately upon physics tick."
}`}
							</pre>
						</div>
					</div>

					{/* Right: Telemetry Glossary & explanation */}
					<div className="flex flex-col bg-secondary/15 p-5">
						<div className="mb-4 flex items-center gap-2 font-mono text-foreground text-xs uppercase tracking-widest">
							<Cpu className="size-4 text-primary" />
							<span>Data Fields Glossary</span>
						</div>

						<div className="flex-1 space-y-4">
							<div>
								<div className="font-mono font-semibold text-primary text-xs">
									"t": float
								</div>
								<p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
									<b>Simulation Time:</b> The exact cumulative simulation
									seconds elapsed since this sector started. Drives orbital and
									spin clock rates.
								</p>
							</div>

							<div>
								<div className="font-mono font-semibold text-primary text-xs">
									"bodies": array
								</div>
								<p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
									<b>Coordinates List:</b> Live positions containing the body ID
									and the 3D position vector <code>[x, y, z]</code> coordinates,
									streamed at 30Hz to keep orbital paths perfectly smooth.
								</p>
							</div>

							<div>
								<div className="font-mono font-semibold text-primary text-xs">
									"ephemerals": array
								</div>
								<p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
									<b>Transient Bodies:</b> Moving comets, cometary trails, or
									hurl impactors that are rendered dynamically in the scene but
									excluded from REST system metrics.
								</p>
							</div>

							<div>
								<div className="font-mono font-semibold text-primary text-xs">
									"events": array
								</div>
								<p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
									<b>Cataclysms Log:</b> One-shot triggers generated during
									physics resolution (e.g. <code>collision</code>,{" "}
									<code>impact</code>, <code>supernova</code>) which fire
									particles, explosions, and craters.
								</p>
							</div>
						</div>
					</div>
				</div>

				<div className="flex items-center justify-between border-t px-6 py-4">
					<div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
						<Wifi className="size-3.5" />
						ws://127.0.0.1:8000/stream
					</div>
					<Button onClick={() => onOpenChange(false)}>Close View</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
