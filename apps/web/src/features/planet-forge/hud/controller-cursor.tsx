import type { ControllerBrand } from "../lib/gamepad-mappings";

interface ControllerCursorProps {
	brand: ControllerBrand;
	visible: boolean;
	x: number;
	y: number;
}

function PS5Cursor() {
	return (
		<svg
			aria-label="PS5 controller cursor"
			fill="none"
			height="28"
			role="img"
			viewBox="0 0 28 28"
			width="28"
		>
			<circle cx="14" cy="14" r="12" stroke="white" strokeWidth="2" />
			<circle cx="14" cy="14" fill="white" r="3" />
		</svg>
	);
}

function XboxCursor() {
	return (
		<svg
			aria-label="Xbox controller cursor"
			fill="none"
			height="28"
			role="img"
			viewBox="0 0 28 28"
			width="28"
		>
			<line stroke="white" strokeWidth="2" x1="14" x2="14" y1="2" y2="26" />
			<line stroke="white" strokeWidth="2" x1="2" x2="26" y1="14" y2="14" />
			<circle cx="14" cy="14" fill="white" r="2.5" />
		</svg>
	);
}

export function ControllerCursor({
	visible,
	brand,
	x,
	y,
}: ControllerCursorProps) {
	if (!visible) {
		return null;
	}

	return (
		<div
			className="pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_6px_rgba(255,255,255,0.8)] transition-[left,top] duration-[50ms] ease-linear"
			style={{ left: x, top: y }}
		>
			{brand === "ps5" ? <PS5Cursor /> : <XboxCursor />}
		</div>
	);
}
