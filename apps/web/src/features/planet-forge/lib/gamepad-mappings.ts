export type ControllerBrand = "ps5" | "xbox" | "generic";

export type SemanticAction =
	| "confirm"
	| "cancel"
	| "action1"
	| "action2"
	| "l1"
	| "r1"
	| "l2"
	| "r2"
	| "share"
	| "options"
	| "l3"
	| "r3"
	| "dpadUp"
	| "dpadDown"
	| "dpadLeft"
	| "dpadRight";

// Standard Gamepad API button indices (same physical layout for PS5 + Xbox)
const STANDARD_MAP: Record<SemanticAction, number> = {
	confirm: 0,
	cancel: 1,
	action1: 2,
	action2: 3,
	l1: 4,
	r1: 5,
	l2: 6,
	r2: 7,
	share: 8,
	options: 9,
	l3: 10,
	r3: 11,
	dpadUp: 12,
	dpadDown: 13,
	dpadLeft: 14,
	dpadRight: 15,
};

export const BUTTON_MAPS: Record<
	ControllerBrand,
	Record<SemanticAction, number>
> = {
	ps5: STANDARD_MAP,
	xbox: STANDARD_MAP,
	generic: STANDARD_MAP,
};

// Human-readable label for each semantic action per brand
export const ACTION_LABELS: Record<
	ControllerBrand,
	Partial<Record<SemanticAction, string>>
> = {
	ps5: {
		confirm: "Cross",
		cancel: "Circle",
		action1: "Square",
		action2: "Triangle",
		l1: "L1",
		r1: "R1",
		l2: "L2",
		r2: "R2",
		share: "Share",
		options: "Options",
		l3: "L3 Click",
		r3: "R3 Click",
	},
	xbox: {
		confirm: "A",
		cancel: "B",
		action1: "X",
		action2: "Y",
		l1: "LB",
		r1: "RB",
		l2: "LT",
		r2: "RT",
		share: "View",
		options: "Menu",
		l3: "LS Click",
		r3: "RS Click",
	},
	generic: {
		confirm: "A",
		cancel: "B",
		action1: "X",
		action2: "Y",
		l1: "L1",
		r1: "R1",
		l2: "L2",
		r2: "R2",
		options: "Start",
		l3: "L3 Click",
		r3: "R3 Click",
	},
};

// Short symbols shown inside button badges
export const ACTION_SYMBOLS: Record<
	ControllerBrand,
	Partial<Record<SemanticAction, string>>
> = {
	ps5: {
		confirm: "✕",
		cancel: "○",
		action1: "□",
		action2: "△",
		l1: "L1",
		r1: "R1",
		l2: "L2",
		r2: "R2",
		share: "SHR",
		options: "OPT",
		l3: "L3",
		r3: "R3",
		dpadLeft: "◀",
		dpadRight: "▶",
		dpadUp: "▲",
		dpadDown: "▼",
	},
	xbox: {
		confirm: "A",
		cancel: "B",
		action1: "X",
		action2: "Y",
		l1: "LB",
		r1: "RB",
		l2: "LT",
		r2: "RT",
		share: "VIEW",
		options: "MENU",
		l3: "LS",
		r3: "RS",
		dpadLeft: "◀",
		dpadRight: "▶",
		dpadUp: "▲",
		dpadDown: "▼",
	},
	generic: {
		confirm: "A",
		cancel: "B",
		action1: "X",
		action2: "Y",
		l1: "L1",
		r1: "R1",
		l2: "L2",
		r2: "R2",
		options: "START",
		l3: "L3",
		r3: "R3",
		dpadLeft: "◀",
		dpadRight: "▶",
		dpadUp: "▲",
		dpadDown: "▼",
	},
};

// Background and text colours for each button per brand
export const ACTION_COLORS: Record<
	ControllerBrand,
	Partial<Record<SemanticAction, { bg: string; fg: string }>>
> = {
	ps5: {
		confirm: { bg: "#003791", fg: "#fff" }, // PlayStation blue
		cancel: { bg: "#a0003e", fg: "#fff" }, // PlayStation red
		action1: { bg: "#6a0080", fg: "#fff" }, // PlayStation pink/magenta
		action2: { bg: "#006a5e", fg: "#fff" }, // PlayStation teal/green
		l1: { bg: "#2a2a2a", fg: "#ccc" },
		r1: { bg: "#2a2a2a", fg: "#ccc" },
		l2: { bg: "#2a2a2a", fg: "#ccc" },
		r2: { bg: "#2a2a2a", fg: "#ccc" },
		share: { bg: "#2a2a2a", fg: "#ccc" },
		options: { bg: "#2a2a2a", fg: "#ccc" },
		l3: { bg: "#ffb300", fg: "#000" }, // Mapped with highlighted amber color to match triggers
		r3: { bg: "#ffb300", fg: "#000" },
	},
	xbox: {
		confirm: { bg: "#107c10", fg: "#fff" }, // Xbox green (A)
		cancel: { bg: "#c0392b", fg: "#fff" }, // Xbox red (B)
		action1: { bg: "#0078d4", fg: "#fff" }, // Xbox blue (X)
		action2: { bg: "#b8860b", fg: "#fff" }, // Xbox yellow (Y)
		l1: { bg: "#2a2a2a", fg: "#ccc" },
		r1: { bg: "#2a2a2a", fg: "#ccc" },
		l2: { bg: "#2a2a2a", fg: "#ccc" },
		r2: { bg: "#2a2a2a", fg: "#ccc" },
		share: { bg: "#2a2a2a", fg: "#ccc" },
		options: { bg: "#2a2a2a", fg: "#ccc" },
		l3: { bg: "#ffb300", fg: "#000" },
		r3: { bg: "#ffb300", fg: "#000" },
	},
	generic: {
		confirm: { bg: "#107c10", fg: "#fff" },
		cancel: { bg: "#c0392b", fg: "#fff" },
		action1: { bg: "#0078d4", fg: "#fff" },
		action2: { bg: "#b8860b", fg: "#fff" },
		l1: { bg: "#2a2a2a", fg: "#ccc" },
		r1: { bg: "#2a2a2a", fg: "#ccc" },
		l2: { bg: "#2a2a2a", fg: "#ccc" },
		r2: { bg: "#2a2a2a", fg: "#ccc" },
		options: { bg: "#2a2a2a", fg: "#ccc" },
		l3: { bg: "#ffb300", fg: "#000" },
		r3: { bg: "#ffb300", fg: "#000" },
	},
};

export function detectBrand(id: string): ControllerBrand {
	const lower = id.toLowerCase();
	if (
		lower.includes("dualsense") ||
		lower.includes("054c") ||
		lower.includes("0ce6") ||
		lower.includes("ps5")
	) {
		return "ps5";
	}
	if (
		lower.includes("xbox") ||
		lower.includes("045e") ||
		lower.includes("xinput") ||
		lower.includes("microsoft")
	) {
		return "xbox";
	}
	return "generic";
}

export function getButtonIndex(
	brand: ControllerBrand,
	action: SemanticAction
): number {
	return BUTTON_MAPS[brand][action];
}
