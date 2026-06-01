import { useEffect, useRef } from "react";
import { PLANET_TYPES } from "../lib/planet-presets";
import type { CelestialBody } from "../lib/types";
import { useGamepadStore } from "../lib/use-gamepad";
import { useSimStore } from "../lib/use-simulation-socket";

function ControllerDpadHint() {
	const connected = useGamepadStore((s) => s.connected);
	if (!connected) {
		return null;
	}
	return (
		<div className="mt-2 flex items-center justify-center gap-1 text-[9px] text-muted-foreground/60 uppercase tracking-widest">
			<span>◀▶</span>
			<span>Cycle Planets</span>
			<span>▲▼</span>
			<span>Zoom</span>
		</div>
	);
}

export function Minimap({
	bodies,
	selectedId,
}: {
	bodies: CelestialBody[];
	selectedId: string | null;
}) {
	const ref = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = ref.current;
		if (!canvas) {
			return;
		}
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			return;
		}
		let raf: number;

		const draw = () => {
			canvas.width = 176;
			canvas.height = 176;
			const w = 176;
			const h = 176;
			const cx = w / 2;
			const cy = h / 2;
			const positions = useSimStore.getState().positions;
			ctx.clearRect(0, 0, w, h);

			ctx.strokeStyle = "oklch(0.795 0.184 86.047 / 0.10)";
			for (let r = 18; r < Math.min(w, h) / 2; r += 18) {
				ctx.beginPath();
				ctx.arc(cx, cy, r, 0, Math.PI * 2);
				ctx.stroke();
			}
			ctx.strokeStyle = "oklch(0.795 0.184 86.047 / 0.14)";
			ctx.beginPath();
			ctx.moveTo(cx, 6);
			ctx.lineTo(cx, h - 6);
			ctx.moveTo(6, cy);
			ctx.lineTo(w - 6, cy);
			ctx.stroke();

			const scale = (Math.min(w, h) / 2 - 12) / 18;
			for (const b of bodies) {
				const p = positions[b.id] ?? [b.config.orbitRadius ?? 0, 0, 0];
				const x = cx + p[0] * scale;
				const y = cy + p[2] * scale;
				const sel = b.id === selectedId;
				ctx.beginPath();
				ctx.fillStyle = PLANET_TYPES[b.type].color;
				ctx.arc(x, y, sel ? 5 : 3.2, 0, Math.PI * 2);
				ctx.fill();
				if (sel) {
					ctx.strokeStyle = "oklch(0.985 0 0 / 0.9)";
					ctx.lineWidth = 1.5;
					ctx.beginPath();
					ctx.arc(x, y, 8, 0, Math.PI * 2);
					ctx.stroke();
				}
			}
			raf = requestAnimationFrame(draw);
		};
		draw();
		return () => cancelAnimationFrame(raf);
	}, [bodies, selectedId]);

	return (
		<div
			className="glass absolute bottom-4 left-4 w-[200px] p-3"
			data-interactive
			data-tour="minimap"
		>
			<div className="mb-2 flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-[0.28em]">
				<span>Orbital Scan</span>
				<span className="text-primary">◉ LIVE</span>
			</div>
			<canvas className="block h-44 w-44" ref={ref} />
			<ControllerDpadHint />
		</div>
	);
}
