import {
	ACTION_COLORS,
	ACTION_SYMBOLS,
	type SemanticAction,
} from "../lib/gamepad-mappings";
import { useGamepadStore } from "../lib/use-gamepad";

interface ControllerButtonHintProps {
	/** A single mapped action, or a special combo label like "L2+R2" / "LT+RT" */
	action: SemanticAction | "galaxyToggle";
	className?: string;
}

export function ControllerButtonHint({
	action,
	className = "",
}: ControllerButtonHintProps) {
	const connected = useGamepadStore((s) => s.connected);
	const brand = useGamepadStore((s) => s.brand);

	if (!(connected && brand)) {
		return null;
	}

	if (action === "galaxyToggle") {
		const comboLabel = brand === "ps5" ? "L2+R2" : "LT+RT";
		return (
			<ButtonBadge
				bg="#2a2a2a"
				className={className}
				fg="#ccc"
				label={comboLabel}
			/>
		);
	}

	const symbol = ACTION_SYMBOLS[brand][action];
	const colors = ACTION_COLORS[brand][action];

	if (!(symbol && colors)) {
		return null;
	}

	return (
		<ButtonBadge
			bg={colors.bg}
			className={className}
			fg={colors.fg}
			label={symbol}
		/>
	);
}

function ButtonBadge({
	label,
	bg,
	fg,
	className,
}: {
	label: string;
	bg: string;
	fg: string;
	className: string;
}) {
	return (
		<span
			className={`inline-flex shrink-0 items-center justify-center rounded-md px-2 py-1 font-extrabold font-mono text-[12px] leading-none tracking-wide shadow-sm ${className}`}
			style={{ background: bg, color: fg }}
		>
			{label}
		</span>
	);
}
