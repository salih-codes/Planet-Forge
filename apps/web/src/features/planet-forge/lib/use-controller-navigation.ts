import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SystemInfo } from "./types";
import {
	getGamepadAxes,
	isActionJustPressed,
	useGamepadStore,
} from "./use-gamepad";

const DEADZONE = 0.2;
const CURSOR_SPEED = 8;

function applyDeadzone(v: number): number {
	return Math.abs(v) < DEADZONE ? 0 : v;
}

function checkGalaxyToggle(
	prev: boolean[],
	gp: Gamepad,
	onGalaxyToggle: () => void
): void {
	const l2 = gp.buttons[6]?.pressed ?? false;
	const r2 = gp.buttons[7]?.pressed ?? false;
	const wasL2 = prev[6] ?? false;
	const wasR2 = prev[7] ?? false;
	if (l2 && r2 && !(wasL2 && wasR2)) {
		onGalaxyToggle();
	}
}

function checkShortcuts(
	prev: boolean[],
	cb: {
		onForge: () => void;
		onTelemetry: () => void;
		onStrike: () => void;
		onDisintegrate: () => void;
		onResetCamera: () => void;
	}
): void {
	if (isActionJustPressed("r1", prev)) {
		cb.onForge();
	}
	if (isActionJustPressed("options", prev)) {
		cb.onTelemetry();
	}
	if (isActionJustPressed("action1", prev)) {
		cb.onStrike();
	}
	if (isActionJustPressed("action2", prev)) {
		cb.onDisintegrate();
	}
	if (isActionJustPressed("r3", prev)) {
		cb.onResetCamera();
	}
}

function handleL1Press(
	l1Pressed: boolean,
	wasL1Pressed: boolean,
	l1PressTime: React.MutableRefObject<number>,
	cb: ControllerNavCallbacks
): void {
	if (l1Pressed && !wasL1Pressed) {
		l1PressTime.current = Date.now();
	} else if (!l1Pressed && wasL1Pressed) {
		const duration = Date.now() - l1PressTime.current;
		if (duration < 250) {
			const isOpen = useGamepadStore.getState().systemsListOpen;
			if (isOpen) {
				useGamepadStore.setState({ systemsListOpen: false });
			} else {
				const currentIdx = cb.systems.findIndex(
					(s) => s.id === cb.currentSystemId
				);
				useGamepadStore.setState({
					systemsListOpen: true,
					highlightedSystemIndex: currentIdx === -1 ? 0 : currentIdx,
				});
			}
		}
	}
}

function handleSystemsMenuKeys(
	prev: boolean[],
	cb: ControllerNavCallbacks
): void {
	if (isActionJustPressed("dpadUp", prev)) {
		const currentIdx = useGamepadStore.getState().highlightedSystemIndex;
		if (cb.systems.length > 0) {
			const nextIdx = (currentIdx - 1 + cb.systems.length) % cb.systems.length;
			useGamepadStore.setState({ highlightedSystemIndex: nextIdx });
			useGamepadStore.getState().triggerHaptic("impact");
		}
	} else if (isActionJustPressed("dpadDown", prev)) {
		const currentIdx = useGamepadStore.getState().highlightedSystemIndex;
		if (cb.systems.length > 0) {
			const nextIdx = (currentIdx + 1) % cb.systems.length;
			useGamepadStore.setState({ highlightedSystemIndex: nextIdx });
			useGamepadStore.getState().triggerHaptic("impact");
		}
	}

	if (isActionJustPressed("confirm", prev)) {
		const currentIdx = useGamepadStore.getState().highlightedSystemIndex;
		if (currentIdx >= 0 && currentIdx < cb.systems.length) {
			cb.onSelectSystem(cb.systems[currentIdx].id);
		}
		useGamepadStore.setState({ systemsListOpen: false });
		useGamepadStore.getState().triggerHaptic("collision");
	}

	if (isActionJustPressed("cancel", prev)) {
		cb.onCancel();
	}
}

function handleClosedListShortcuts(
	prev: boolean[],
	gp: Gamepad,
	cb: ControllerNavCallbacks,
	lastConfirmTimeRef: React.MutableRefObject<number>
): void {
	checkShortcuts(prev, cb);
	checkGalaxyToggle(prev, gp, cb.onGalaxyToggle);

	if (isActionJustPressed("l3", prev)) {
		cb.onShowControls();
	}
	if (isActionJustPressed("cancel", prev)) {
		cb.onCancel();
	}
	if (isActionJustPressed("confirm", prev)) {
		const now = Date.now();
		if (now - lastConfirmTimeRef.current < 350) {
			cb.onConfirm?.();
		}
		lastConfirmTimeRef.current = now;
	}
}

export interface ControllerNavCallbacks {
	currentSystemId: string;
	onCancel: () => void;
	onConfirm?: () => void;
	onDisintegrate: () => void;
	onForge: () => void;
	onGalaxyToggle: () => void;
	onResetCamera: () => void;
	onSelectSystem: (id: string) => void;
	onShowControls: () => void;
	onStrike: () => void;
	onTelemetry: () => void;
	systems: SystemInfo[];
}

export interface ControllerNavState {
	cursorMode: boolean;
	cursorX: number;
	cursorY: number;
}

export function useControllerNavigation(
	callbacks: ControllerNavCallbacks
): ControllerNavState {
	const connected = useGamepadStore((s) => s.connected);

	const [cursorMode, setCursorMode] = useState(false);
	const [cursorX, setCursorX] = useState(window.innerWidth / 2);
	const [cursorY, setCursorY] = useState(window.innerHeight / 2);

	const prevButtons = useRef<boolean[]>([]);
	const l1PressTime = useRef<number>(0);
	const lastConfirmTimeRef = useRef<number>(0);
	const rafRef = useRef<number | null>(null);
	const callbacksRef = useRef(callbacks);
	callbacksRef.current = callbacks;

	const poll = useCallback(() => {
		const { gamepadIndex } = useGamepadStore.getState();
		if (gamepadIndex === null) {
			rafRef.current = requestAnimationFrame(poll);
			return;
		}
		const gp = navigator.getGamepads()[gamepadIndex];
		if (!gp) {
			rafRef.current = requestAnimationFrame(poll);
			return;
		}

		const [lx, ly] = getGamepadAxes();
		const dlx = applyDeadzone(lx);
		const dly = applyDeadzone(ly);

		const prev = prevButtons.current;
		const cb = callbacksRef.current;

		const l1Pressed = gp.buttons[4]?.pressed ?? false;
		const wasL1Pressed = prev[4] ?? false;

		handleL1Press(l1Pressed, wasL1Pressed, l1PressTime, cb);

		const listOpen = useGamepadStore.getState().systemsListOpen;
		const isHoldingL1 =
			l1Pressed && !listOpen && Date.now() - l1PressTime.current >= 250;
		setCursorMode(isHoldingL1);

		if (listOpen) {
			setCursorMode(false);
			handleSystemsMenuKeys(prev, cb);
		} else {
			if (dlx !== 0 || dly !== 0) {
				setCursorX((x) =>
					Math.max(0, Math.min(window.innerWidth, x + dlx * CURSOR_SPEED))
				);
				setCursorY((y) =>
					Math.max(0, Math.min(window.innerHeight, y + dly * CURSOR_SPEED))
				);
			}

			handleClosedListShortcuts(prev, gp, cb, lastConfirmTimeRef);
		}

		prevButtons.current = Array.from(gp.buttons).map((b) => b.pressed);
		rafRef.current = requestAnimationFrame(poll);
	}, []);

	useEffect(() => {
		if (!connected) {
			if (rafRef.current !== null) {
				cancelAnimationFrame(rafRef.current);
				rafRef.current = null;
			}
			setCursorMode(false);
			return;
		}

		rafRef.current = requestAnimationFrame(poll);
		return () => {
			if (rafRef.current !== null) {
				cancelAnimationFrame(rafRef.current);
			}
		};
	}, [connected, poll]);

	// Cursor mode: fire a synthetic click at the cursor position on confirm press
	useEffect(() => {
		if (!cursorMode) {
			return;
		}
		const id = setInterval(() => {
			if (isActionJustPressed("confirm", prevButtons.current)) {
				const el = document.elementFromPoint(cursorX, cursorY);
				if (el instanceof HTMLElement) {
					el.click();
				}
			}
		}, 50);
		return () => clearInterval(id);
	}, [cursorMode, cursorX, cursorY]);

	return { cursorMode, cursorX, cursorY };
}
