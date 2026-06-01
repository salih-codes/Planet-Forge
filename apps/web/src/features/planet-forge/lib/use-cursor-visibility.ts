import { useEffect } from "react";
import { useGamepadStore } from "./use-gamepad";

const IDLE_DEBOUNCE_MS = 100;

/**
 * Hides the OS cursor while the controller is being actively used.
 * The cursor reappears instantly on any mouse movement, even while the
 * controller stays connected.
 */
export function useCursorVisibility(): void {
	const connected = useGamepadStore((s) => s.connected);

	useEffect(() => {
		let hideTimer: ReturnType<typeof setTimeout> | null = null;
		let rafId: number;
		let cursorVisible = true;

		const showCursor = () => {
			if (!cursorVisible) {
				document.body.style.cursor = "";
				cursorVisible = true;
			}
			if (hideTimer !== null) {
				clearTimeout(hideTimer);
				hideTimer = null;
			}
		};

		const hideCursor = () => {
			if (cursorVisible) {
				document.body.style.cursor = "none";
				cursorVisible = false;
			}
		};

		const pollGamepad = () => {
			const { gamepadIndex } = useGamepadStore.getState();
			if (gamepadIndex !== null) {
				const gp = navigator.getGamepads()[gamepadIndex];
				if (gp) {
					const axisActive = gp.axes.some((a) => Math.abs(a) > 0.15);
					const buttonActive = gp.buttons.some(
						(b) => b.pressed || b.value > 0.05
					);
					// Debounce: only hide after a short burst to avoid flicker on connect
					if ((axisActive || buttonActive) && hideTimer === null) {
						hideTimer = setTimeout(hideCursor, IDLE_DEBOUNCE_MS);
					}
				}
			}
			rafId = requestAnimationFrame(pollGamepad);
		};

		document.addEventListener("mousemove", showCursor);
		document.addEventListener("mousedown", showCursor);

		if (connected) {
			rafId = requestAnimationFrame(pollGamepad);
		}

		return () => {
			document.removeEventListener("mousemove", showCursor);
			document.removeEventListener("mousedown", showCursor);
			cancelAnimationFrame(rafId);
			if (hideTimer !== null) {
				clearTimeout(hideTimer);
			}
			document.body.style.cursor = "";
		};
	}, [connected]);
}
