import { useEffect, useRef } from "react";
import { create } from "zustand";
import {
	type ControllerBrand,
	detectBrand,
	getButtonIndex,
	type SemanticAction,
} from "./gamepad-mappings";

type HapticType = "impact" | "collision" | "explosion" | "jump";

interface HapticPattern {
	duration: number;
	strongMagnitude: number;
	weakMagnitude: number;
}

const HAPTIC_PATTERNS: Record<HapticType, HapticPattern> = {
	impact: { duration: 200, strongMagnitude: 0.5, weakMagnitude: 0.3 },
	collision: { duration: 400, strongMagnitude: 0.8, weakMagnitude: 0.5 },
	explosion: { duration: 800, strongMagnitude: 1.0, weakMagnitude: 0.7 },
	jump: { duration: 160, strongMagnitude: 0.65, weakMagnitude: 0.1 },
};

interface GamepadState {
	brand: ControllerBrand | null;
	connected: boolean;
	controllerPanning: boolean;
	gamepadIndex: number | null;
	highlightedSystemIndex: number;
	setControllerPanning: (v: boolean) => void;
	systemsListOpen: boolean;
	triggerHaptic: (type: HapticType) => void;
	triggerZoomOut: () => void;
	zoomOutTrigger: number;
}

export const useGamepadStore = create<GamepadState>((set) => ({
	brand: null,
	connected: false,
	controllerPanning: false,
	gamepadIndex: null,
	systemsListOpen: false,
	highlightedSystemIndex: 0,
	setControllerPanning: (v) => set({ controllerPanning: v }),
	triggerHaptic: () => undefined,
	zoomOutTrigger: 0,
	triggerZoomOut: () => set((s) => ({ zoomOutTrigger: s.zoomOutTrigger + 1 })),
}));

export function triggerHaptic(type: HapticType): void {
	const { gamepadIndex } = useGamepadStore.getState();
	if (gamepadIndex === null) {
		return;
	}
	const gamepad = navigator.getGamepads()[gamepadIndex];
	if (!gamepad) {
		return;
	}

	const pattern = HAPTIC_PATTERNS[type];
	// biome-ignore lint/suspicious/noExplicitAny: vibrationActuator is not in TS types yet
	const actuator = (gamepad as any).vibrationActuator;
	if (actuator?.playEffect) {
		actuator
			.playEffect("dual-rumble", {
				duration: pattern.duration,
				strongMagnitude: pattern.strongMagnitude,
				weakMagnitude: pattern.weakMagnitude,
			})
			.catch(() => undefined);
	}
}

export function useGamepad() {
	const rafRef = useRef<number | null>(null);

	useEffect(() => {
		const onConnect = (e: GamepadEvent) => {
			const brand = detectBrand(e.gamepad.id);
			useGamepadStore.setState({
				connected: true,
				brand,
				gamepadIndex: e.gamepad.index,
				triggerHaptic,
			});
		};

		const onDisconnect = (e: GamepadEvent) => {
			const { gamepadIndex } = useGamepadStore.getState();
			if (gamepadIndex === e.gamepad.index) {
				useGamepadStore.setState({
					connected: false,
					brand: null,
					gamepadIndex: null,
				});
			}
		};

		window.addEventListener("gamepadconnected", onConnect);
		window.addEventListener("gamepaddisconnected", onDisconnect);

		// Check for already-connected gamepads (page reload scenario)
		const existing = navigator.getGamepads();
		for (const gp of existing) {
			if (gp) {
				const brand = detectBrand(gp.id);
				useGamepadStore.setState({
					connected: true,
					brand,
					gamepadIndex: gp.index,
					triggerHaptic,
				});
				break;
			}
		}

		return () => {
			window.removeEventListener("gamepadconnected", onConnect);
			window.removeEventListener("gamepaddisconnected", onDisconnect);
			if (rafRef.current !== null) {
				cancelAnimationFrame(rafRef.current);
			}
		};
	}, []);
}

export function getGamepadAxes(): [number, number, number, number] {
	const { gamepadIndex } = useGamepadStore.getState();
	if (gamepadIndex === null) {
		return [0, 0, 0, 0];
	}
	const gp = navigator.getGamepads()[gamepadIndex];
	if (!gp) {
		return [0, 0, 0, 0];
	}
	const axes = gp.axes;
	return [axes[0] ?? 0, axes[1] ?? 0, axes[2] ?? 0, axes[3] ?? 0];
}

export function isActionPressed(action: SemanticAction): boolean {
	const { gamepadIndex, brand } = useGamepadStore.getState();
	if (gamepadIndex === null || brand === null) {
		return false;
	}
	const gp = navigator.getGamepads()[gamepadIndex];
	if (!gp) {
		return false;
	}
	const idx = getButtonIndex(brand, action);
	return gp.buttons[idx]?.pressed ?? false;
}

export function isActionJustPressed(
	action: SemanticAction,
	prevState: boolean[]
): boolean {
	const { gamepadIndex, brand } = useGamepadStore.getState();
	if (gamepadIndex === null || brand === null) {
		return false;
	}
	const gp = navigator.getGamepads()[gamepadIndex];
	if (!gp) {
		return false;
	}
	const idx = getButtonIndex(brand, action);
	const now = gp.buttons[idx]?.pressed ?? false;
	const was = prevState[idx] ?? false;
	return now && !was;
}
