import { useCallback, useEffect, useRef, useState } from "react";
import type { ControllerBrand } from "../lib/gamepad-mappings";
import { useGamepadStore } from "../lib/use-gamepad";
import { ControllerButtonHint } from "./controller-button-hint";

const IDLE_TIMEOUT_MS = 4000;

const BRAND_LABELS: Record<ControllerBrand, string> = {
	ps5: "PS5",
	xbox: "XBOX",
	generic: "CTRL",
};

interface ControllerIndicatorProps {
	onShowControls: () => void;
}

export function ControllerIndicator({
	onShowControls,
}: ControllerIndicatorProps) {
	const connected = useGamepadStore((s) => s.connected);
	const brand = useGamepadStore((s) => s.brand);
	const [idle, setIdle] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const resetIdle = useCallback(() => {
		setIdle(false);
		if (timerRef.current) {
			clearTimeout(timerRef.current);
		}
		timerRef.current = setTimeout(() => setIdle(true), IDLE_TIMEOUT_MS);
	}, []);

	useEffect(() => {
		if (!connected) {
			setIdle(false);
			if (timerRef.current) {
				clearTimeout(timerRef.current);
			}
			return;
		}
		resetIdle();
		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
			}
		};
	}, [connected, resetIdle]);

	useEffect(() => {
		if (!connected) {
			return;
		}
		window.addEventListener("gamepadconnected", resetIdle);
		return () => window.removeEventListener("gamepadconnected", resetIdle);
	}, [connected, resetIdle]);

	if (!(connected && brand)) {
		return null;
	}

	return (
		<div
			className="pointer-events-auto absolute right-4 bottom-4 flex flex-col items-end gap-1 transition-opacity duration-700"
			data-interactive
			style={{ opacity: idle ? 0.4 : 1 }}
		>
			{/* Show Controls button */}
			<button
				className="flex items-center gap-1.5 rounded-sm border border-foreground/25 bg-black/70 px-2.5 py-1 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.2em] transition-colors hover:border-primary/60 hover:text-primary"
				onClick={onShowControls}
				type="button"
			>
				{/* Controller icon */}
				<svg
					aria-hidden="true"
					className="size-3"
					fill="none"
					viewBox="0 0 16 16"
				>
					<rect
						height="8"
						rx="2"
						stroke="currentColor"
						strokeWidth="1.2"
						width="13"
						x="1.5"
						y="4"
					/>
					<line
						stroke="currentColor"
						strokeWidth="1.2"
						x1="4"
						x2="4"
						y1="7"
						y2="9"
					/>
					<line
						stroke="currentColor"
						strokeWidth="1.2"
						x1="3"
						x2="5"
						y1="8"
						y2="8"
					/>
					<circle cx="11" cy="7.5" fill="currentColor" r="0.8" />
					<circle cx="12.5" cy="9" fill="currentColor" r="0.8" />
				</svg>
				Show Controls (Press Left Stick)
				<ControllerButtonHint action="l3" className="ml-2 scale-110" />
			</button>

			{/* Connected indicator */}
			<div className="flex items-center gap-1.5 rounded-sm border border-foreground/20 bg-black/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em]">
				<span className="size-1.5 rounded-full bg-primary" />
				{BRAND_LABELS[brand]} CONNECTED
			</div>
		</div>
	);
}
