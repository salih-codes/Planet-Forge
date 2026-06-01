import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@planet-forge/ui/components/dialog";
import type { ControllerBrand } from "../lib/gamepad-mappings";
import { useGamepadStore } from "../lib/use-gamepad";
import { ControllerButtonHint } from "./controller-button-hint";

interface Props {
	onOpenChange: (open: boolean) => void;
	open: boolean;
}

// ─── PS5 DualSense schematic ──────────────────────────────────────────────────

function PS5Schematic() {
	return (
		<svg
			aria-label="PS5 DualSense controller wireframe diagram"
			className="w-full drop-shadow-[0_0_20px_rgba(255,170,0,0.25)]"
			role="img"
			viewBox="0 0 520 320"
		>
			<defs>
				{/* Glowing amber filter for tech blueprint look */}
				<filter height="140%" id="amber-glow" width="140%" x="-20%" y="-20%">
					<feGaussianBlur result="blur" stdDeviation="1.2" />
					<feMerge>
						<feMergeNode in="blur" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
			</defs>

			{/* ── Outer Shell Contour (Traced precisely from actual PS5 DualSense) ── */}
			<path
				d="M 145,65 C 120,65 95,80 80,100 C 65,120 40,180 35,210 C 30,235 42,275 75,288 C 105,299 135,278 152,252 C 162,236 166,210 166,182 C 166,176 164,171 161,168 C 155,168 147,180 141,195 C 131,215 116,260 106,272 C 101,277 94,277 91,272 C 84,264 91,215 98,180 C 104,150 121,95 141,80 C 151,72 161,70 171,70 L 349,70 C 359,70 369,72 379,80 C 399,95 416,150 422,180 C 429,215 436,264 429,272 C 426,277 419,277 414,272 C 404,260 389,215 379,195 C 373,180 365,168 359,168 C 356,171 354,176 354,182 C 354,210 358,236 368,252 C 385,278 415,299 445,288 C 478,275 490,235 485,210 C 480,180 455,120 440,100 C 425,80 400,65 375,65 Z"
				fill="rgba(255, 170, 0, 0.01)"
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeWidth="1.5"
			/>

			{/* ── Inner Body Seams & Black "Mustache" Plate Contour ── */}
			<path
				d="M 161,168 C 161,168 180,125 210,122 L 310,122 C 340,125 359,168 359,168 C 359,168 340,250 310,265 C 280,272 240,272 210,265 C 180,250 161,168 161,168 Z"
				fill="rgba(255, 170, 0, 0.02)"
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeDasharray="3,3"
				strokeWidth="1"
			/>

			{/* ── Touchpad (Real wedge-shape with rounded bottom corners) ── */}
			<path
				d="M 195,85 L 325,85 L 317,145 C 317,148 313,150 307,150 L 213,150 C 207,150 203,148 203,145 Z"
				fill="rgba(255, 170, 0, 0.04)"
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeWidth="1.5"
			/>
			<text
				fill="#ffaa00"
				fontSize="7"
				fontWeight="bold"
				opacity="0.8"
				textAnchor="middle"
				x="260"
				y="118"
			>
				TOUCHPAD
			</text>

			{/* ── Triggers (L2 / R2) ── */}
			<path
				d="M 72,18 C 82,12 105,10 123,14 L 123,46 C 105,42 82,46 72,50 Z"
				fill="rgba(255, 170, 0, 0.02)"
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeWidth="1.2"
			/>
			<text
				fill="#ffaa00"
				fontSize="8"
				fontWeight="bold"
				textAnchor="middle"
				x="97"
				y="34"
			>
				L2
			</text>

			<path
				d="M 448,18 C 438,12 415,10 397,14 L 397,46 C 415,42 438,46 448,50 Z"
				fill="rgba(255, 170, 0, 0.02)"
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeWidth="1.2"
			/>
			<text
				fill="#ffaa00"
				fontSize="8"
				fontWeight="bold"
				textAnchor="middle"
				x="423"
				y="34"
			>
				R2
			</text>

			{/* ── Bumpers (L1 / R1) ── */}
			<path
				d="M 70,55 C 80,48 105,44 125,48 L 125,62 C 105,58 80,62 70,68 Z"
				fill="none"
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeWidth="1.5"
			/>
			<text
				fill="#ffaa00"
				fontSize="8"
				fontWeight="bold"
				textAnchor="middle"
				x="97"
				y="58"
			>
				L1
			</text>

			<path
				d="M 450,55 C 440,48 415,44 395,48 L 395,62 C 415,58 440,62 450,68 Z"
				fill="none"
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeWidth="1.5"
			/>
			<text
				fill="#ffaa00"
				fontSize="8"
				fontWeight="bold"
				textAnchor="middle"
				x="423"
				y="58"
			>
				R1
			</text>

			{/* ── Create / Options Buttons ── */}
			<line
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeWidth="1.5"
				x1="184"
				x2="188"
				y1="108"
				y2="100"
			/>
			<text
				fill="#ffaa00"
				fontSize="6"
				opacity="0.8"
				textAnchor="middle"
				x="186"
				y="118"
			>
				CRE
			</text>

			<line
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeWidth="1.5"
				x1="336"
				x2="332"
				y1="108"
				y2="100"
			/>
			<text
				fill="#ffaa00"
				fontSize="6"
				opacity="0.8"
				textAnchor="middle"
				x="334"
				y="118"
			>
				OPT
			</text>

			{/* ── PS Button (Central branding) ── */}
			<circle
				cx="260"
				cy="178"
				fill="none"
				filter="url(#amber-glow)"
				r="8"
				stroke="#ffaa00"
				strokeWidth="1.2"
			/>
			<path
				d="M256,178 L264,178 M260,174 L260,182"
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeWidth="1.2"
			/>

			{/* ── D-pad (PS5 separate key cross pattern) ── */}
			<circle
				cx="115"
				cy="130"
				fill="none"
				filter="url(#amber-glow)"
				r="22"
				stroke="#ffaa00"
				strokeDasharray="2,2"
				strokeWidth="1"
			/>
			<path
				d="M 110,110 L 120,110 L 120,122 L 110,122 Z"
				fill="rgba(255, 170, 0, 0.05)"
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeWidth="1.2"
			/>
			<text
				fill="#ffaa00"
				fontSize="7"
				fontWeight="bold"
				textAnchor="middle"
				x="115"
				y="118"
			>
				▲
			</text>

			<path
				d="M 110,138 L 120,138 L 120,150 L 110,150 Z"
				fill="rgba(255, 170, 0, 0.05)"
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeWidth="1.2"
			/>
			<text
				fill="#ffaa00"
				fontSize="7"
				fontWeight="bold"
				textAnchor="middle"
				x="115"
				y="146"
			>
				▼
			</text>

			<path
				d="M 95,125 L 107,125 L 107,135 L 95,135 Z"
				fill="rgba(255, 170, 0, 0.05)"
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeWidth="1.2"
			/>
			<text
				fill="#ffaa00"
				fontSize="7"
				fontWeight="bold"
				textAnchor="middle"
				x="101"
				y="133"
			>
				◀
			</text>

			<path
				d="M 123,125 L 135,125 L 135,135 L 123,135 Z"
				fill="rgba(255, 170, 0, 0.05)"
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeWidth="1.2"
			/>
			<text
				fill="#ffaa00"
				fontSize="7"
				fontWeight="bold"
				textAnchor="middle"
				x="129"
				y="133"
			>
				▶
			</text>

			{/* ── Symmetrical Thumbsticks (Parallel at bottom) ── */}
			<circle
				cx="205"
				cy="205"
				fill="rgba(255, 170, 0, 0.02)"
				filter="url(#amber-glow)"
				r="26"
				stroke="#ffaa00"
				strokeWidth="1.5"
			/>
			<circle
				cx="205"
				cy="205"
				fill="none"
				filter="url(#amber-glow)"
				r="20"
				stroke="#ffaa00"
				strokeWidth="1"
			/>
			<circle
				cx="205"
				cy="205"
				fill="none"
				filter="url(#amber-glow)"
				r="14"
				stroke="#ffaa00"
				strokeDasharray="3,3"
				strokeWidth="0.8"
			/>
			<text
				fill="#ffaa00"
				filter="url(#amber-glow)"
				fontSize="8"
				fontWeight="bold"
				textAnchor="middle"
				x="205"
				y="208"
			>
				L3
			</text>

			<circle
				cx="315"
				cy="205"
				fill="rgba(255, 170, 0, 0.02)"
				filter="url(#amber-glow)"
				r="26"
				stroke="#ffaa00"
				strokeWidth="1.5"
			/>
			<circle
				cx="315"
				cy="205"
				fill="none"
				filter="url(#amber-glow)"
				r="20"
				stroke="#ffaa00"
				strokeWidth="1"
			/>
			<circle
				cx="315"
				cy="205"
				fill="none"
				filter="url(#amber-glow)"
				r="14"
				stroke="#ffaa00"
				strokeDasharray="3,3"
				strokeWidth="0.8"
			/>
			<text
				fill="#ffaa00"
				filter="url(#amber-glow)"
				fontSize="8"
				fontWeight="bold"
				textAnchor="middle"
				x="315"
				y="208"
			>
				R3
			</text>

			{/* ── Face Buttons (PlayStation layout) ── */}
			<circle
				cx="405"
				cy="130"
				fill="none"
				filter="url(#amber-glow)"
				r="22"
				stroke="#ffaa00"
				strokeDasharray="2,2"
				strokeWidth="1"
			/>
			<circle
				cx="405"
				cy="113"
				fill="rgba(255, 170, 0, 0.05)"
				filter="url(#amber-glow)"
				r="8"
				stroke="#ffaa00"
				strokeWidth="1.2"
			/>
			<text
				fill="#ffaa00"
				filter="url(#amber-glow)"
				fontSize="9"
				fontWeight="bold"
				textAnchor="middle"
				x="405"
				y="116"
			>
				△
			</text>

			<circle
				cx="388"
				cy="130"
				fill="rgba(255, 170, 0, 0.05)"
				filter="url(#amber-glow)"
				r="8"
				stroke="#ffaa00"
				strokeWidth="1.2"
			/>
			<text
				fill="#ffaa00"
				filter="url(#amber-glow)"
				fontSize="9"
				fontWeight="bold"
				textAnchor="middle"
				x="388"
				y="133"
			>
				□
			</text>

			<circle
				cx="422"
				cy="130"
				fill="rgba(255, 170, 0, 0.05)"
				filter="url(#amber-glow)"
				r="8"
				stroke="#ffaa00"
				strokeWidth="1.2"
			/>
			<text
				fill="#ffaa00"
				filter="url(#amber-glow)"
				fontSize="9"
				fontWeight="bold"
				textAnchor="middle"
				x="422"
				y="133"
			>
				○
			</text>

			<circle
				cx="405"
				cy="147"
				fill="rgba(255, 170, 0, 0.05)"
				filter="url(#amber-glow)"
				r="8"
				stroke="#ffaa00"
				strokeWidth="1.2"
			/>
			<text
				fill="#ffaa00"
				filter="url(#amber-glow)"
				fontSize="9"
				fontWeight="bold"
				textAnchor="middle"
				x="405"
				y="150"
			>
				✕
			</text>

			{/* ── Annotation Callout Lines & Text (Symmetrical design) ── */}
			<line
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeDasharray="2,2"
				strokeWidth="1"
				x1="97"
				x2="40"
				y1="30"
				y2="30"
			/>
			<text
				fill="#ffaa00"
				fontSize="8"
				fontWeight="bold"
				textAnchor="end"
				x="36"
				y="33"
			>
				Zoom Out
			</text>

			<line
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeDasharray="2,2"
				strokeWidth="1"
				x1="423"
				x2="480"
				y1="30"
				y2="30"
			/>
			<text fill="#ffaa00" fontSize="8" fontWeight="bold" x="484" y="33">
				Zoom In
			</text>

			<line
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeDasharray="2,2"
				strokeWidth="1"
				x1="97"
				x2="40"
				y1="55"
				y2="55"
			/>
			<text
				fill="#ffaa00"
				fontSize="8"
				fontWeight="bold"
				textAnchor="end"
				x="36"
				y="53"
			>
				Systems [Tap]
			</text>
			<text
				fill="#ffaa00"
				fontSize="7"
				opacity="0.8"
				textAnchor="end"
				x="36"
				y="61"
			>
				Cursor [Hold]
			</text>

			<line
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeDasharray="2,2"
				strokeWidth="1"
				x1="423"
				x2="480"
				y1="55"
				y2="55"
			/>
			<text fill="#ffaa00" fontSize="8" fontWeight="bold" x="484" y="58">
				Forge Planet
			</text>

			<line
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeDasharray="2,2"
				strokeWidth="1"
				x1="315"
				x2="250"
				y1="205"
				y2="240"
			/>
			<text fill="#ffaa00" fontSize="8" textAnchor="end" x="246" y="243">
				Reset Camera
			</text>

			<line
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeDasharray="2,2"
				strokeWidth="1"
				x1="334"
				x2="370"
				y1="100"
				y2="90"
			/>
			<text fill="#ffaa00" fontSize="8" x="374" y="93">
				Telemetry
			</text>

			<line
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeDasharray="2,2"
				strokeWidth="1"
				x1="95"
				x2="40"
				y1="130"
				y2="130"
			/>
			<text
				fill="#ffaa00"
				fontSize="8"
				fontWeight="bold"
				textAnchor="end"
				x="36"
				y="127"
			>
				◀▶ Cycle Planets
			</text>
			<text
				fill="#ffaa00"
				fontSize="7"
				opacity="0.8"
				textAnchor="end"
				x="36"
				y="136"
			>
				▲▼ Navigate List
			</text>

			<line
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeDasharray="2,2"
				strokeWidth="1"
				x1="205"
				x2="40"
				y1="205"
				y2="205"
			/>
			<text
				fill="#ffaa00"
				fontSize="8"
				fontWeight="bold"
				textAnchor="end"
				x="36"
				y="208"
			>
				Skate / Pan Space
			</text>

			<line
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeDasharray="2,2"
				strokeWidth="1"
				x1="315"
				x2="480"
				y1="205"
				y2="205"
			/>
			<text fill="#ffaa00" fontSize="8" fontWeight="bold" x="484" y="208">
				Orbit Camera
			</text>

			<line
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeDasharray="2,2"
				strokeWidth="1"
				x1="413"
				x2="480"
				y1="113"
				y2="113"
			/>
			<text fill="#ffaa00" fontSize="8" fontWeight="bold" x="484" y="116">
				Disintegrate Body
			</text>

			<line
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeDasharray="2,2"
				strokeWidth="1"
				x1="430"
				x2="480"
				y1="130"
				y2="130"
			/>
			<text fill="#ffaa00" fontSize="8" fontWeight="bold" x="484" y="133">
				Strike Comet
			</text>

			<line
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeDasharray="2,2"
				strokeWidth="1"
				x1="413"
				x2="480"
				y1="147"
				y2="147"
			/>
			<text fill="#ffaa00" fontSize="8" fontWeight="bold" x="484" y="150">
				Warp / Confirm
			</text>

			{/* LS Click / Controls callout */}
			<line
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeDasharray="2,2"
				strokeWidth="1"
				x1="205"
				x2="160"
				y1="205"
				y2="250"
			/>
			<text
				fill="#ffaa00"
				fontSize="8"
				fontWeight="bold"
				textAnchor="end"
				x="156"
				y="253"
			>
				LS Click: Toggle Controls
			</text>
		</svg>
	);
}

// ─── Xbox schematic ───────────────────────────────────────────────────────────

function XboxSchematic() {
	return (
		<svg
			aria-label="Xbox controller wireframe diagram"
			className="w-full drop-shadow-[0_0_20px_rgba(255,170,0,0.25)]"
			role="img"
			viewBox="0 0 520 320"
		>
			<defs>
				{/* Glowing amber filter for tech blueprint look */}
				<filter height="140%" id="amber-glow" width="140%" x="-20%" y="-20%">
					<feGaussianBlur result="blur" stdDeviation="1.2" />
					<feMerge>
						<feMergeNode in="blur" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
			</defs>

			{/* ── Outer Shell Contour (Traced precisely from actual Xbox Series X/S) ── */}
			<path
				d="M 160,65 C 130,62 100,82 80,105 C 55,135 35,190 35,220 C 35,250 45,282 78,288 C 108,294 138,272 165,248 C 190,268 225,274 260,274 C 295,274 330,268 355,248 C 382,272 412,294 442,288 C 475,282 485,250 485,220 C 485,190 465,135 440,105 C 420,82 390,62 360,65 C 342,85 315,96 260,96 C 205,96 178,85 160,65 Z"
				fill="rgba(255, 170, 0, 0.01)"
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeWidth="1.5"
			/>

			{/* ── Symmetrical Grip Outline Accent lines ── */}
			<path
				d="M78,115 C88,175 88,225 80,285"
				fill="none"
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeDasharray="3,3"
				strokeWidth="1"
			/>
			<path
				d="M442,115 C432,175 432,225 440,285"
				fill="none"
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeDasharray="3,3"
				strokeWidth="1"
			/>

			{/* ── Xbox Nexus Guide Button (Wireframe circle with inner X) ── */}
			<circle
				cx="260"
				cy="115"
				fill="rgba(255, 170, 0, 0.03)"
				filter="url(#amber-glow)"
				r="13"
				stroke="#ffaa00"
				strokeWidth="1.5"
			/>
			<path
				d="M 252,109 C 255,112 258,116 260,119 C 262,116 265,112 268,109 M 250,120 C 253,118 256,116 260,115 C 264,116 267,118 270,120"
				fill="none"
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeLinecap="round"
				strokeWidth="1.5"
			/>

			{/* ── Triggers (LT / RT) ── */}
			<path
				d="M 77,15 C 87,10 110,8 128,12 L 128,42 C 110,38 87,42 77,46 Z"
				fill="rgba(255, 170, 0, 0.02)"
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeWidth="1.2"
			/>
			<text
				fill="#ffaa00"
				fontSize="8"
				fontWeight="bold"
				textAnchor="middle"
				x="102"
				y="30"
			>
				LT
			</text>

			<path
				d="M 443,15 C 433,10 410,8 392,12 L 392,42 C 410,38 433,42 443,46 Z"
				fill="rgba(255, 170, 0, 0.02)"
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeWidth="1.2"
			/>
			<text
				fill="#ffaa00"
				fontSize="8"
				fontWeight="bold"
				textAnchor="middle"
				x="418"
				y="30"
			>
				RT
			</text>

			{/* ── Bumpers (LB / RB) ── */}
			<path
				d="M 75,52 C 85,45 110,40 130,44 L 130,58 C 110,54 85,58 75,64 Z"
				fill="none"
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeWidth="1.5"
			/>
			<text
				fill="#ffaa00"
				fontSize="8"
				fontWeight="bold"
				textAnchor="middle"
				x="102"
				y="54"
			>
				LB
			</text>

			<path
				d="M 445,52 C 435,45 410,40 390,44 L 390,58 C 410,54 435,58 445,64 Z"
				fill="none"
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeWidth="1.5"
			/>
			<text
				fill="#ffaa00"
				fontSize="8"
				fontWeight="bold"
				textAnchor="middle"
				x="418"
				y="54"
			>
				RB
			</text>

			{/* ── View / Menu / Share Buttons ── */}
			<circle
				cx="215"
				cy="140"
				fill="none"
				filter="url(#amber-glow)"
				r="6"
				stroke="#ffaa00"
				strokeWidth="1.2"
			/>
			<rect
				fill="none"
				filter="url(#amber-glow)"
				height="6"
				rx="1"
				stroke="#ffaa00"
				strokeWidth="1"
				width="8"
				x="211"
				y="137"
			/>
			<text
				fill="#ffaa00"
				fontSize="6"
				opacity="0.8"
				textAnchor="middle"
				x="215"
				y="152"
			>
				VIEW
			</text>

			<circle
				cx="305"
				cy="140"
				fill="none"
				filter="url(#amber-glow)"
				r="6"
				stroke="#ffaa00"
				strokeWidth="1.2"
			/>
			<path
				d="M 301,137 L 309,137 M 301,140 L 309,140 M 301,143 L 309,143"
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeLinecap="round"
				strokeWidth="1"
			/>
			<text
				fill="#ffaa00"
				fontSize="6"
				opacity="0.8"
				textAnchor="middle"
				x="305"
				y="152"
			>
				MENU
			</text>

			<rect
				fill="none"
				filter="url(#amber-glow)"
				height="7"
				rx="2.5"
				stroke="#ffaa00"
				strokeWidth="1.2"
				width="12"
				x="254"
				y="145"
			/>
			<path
				d="M 260,147 L 260,150 M 258,148.5 L 262,148.5"
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeLinecap="round"
				strokeWidth="1.2"
			/>

			{/* ── Offset Thumbsticks ── */}
			{/* Left Stick (Upper Left) */}
			<circle
				cx="150"
				cy="140"
				fill="rgba(255, 170, 0, 0.02)"
				filter="url(#amber-glow)"
				r="26"
				stroke="#ffaa00"
				strokeWidth="1.5"
			/>
			<circle
				cx="150"
				cy="140"
				fill="none"
				filter="url(#amber-glow)"
				r="20"
				stroke="#ffaa00"
				strokeWidth="1"
			/>
			<circle
				cx="150"
				cy="140"
				fill="none"
				filter="url(#amber-glow)"
				r="14"
				stroke="#ffaa00"
				strokeDasharray="3,3"
				strokeWidth="0.8"
			/>
			<text
				fill="#ffaa00"
				filter="url(#amber-glow)"
				fontSize="8"
				fontWeight="bold"
				textAnchor="middle"
				x="150"
				y="143"
			>
				LS
			</text>

			{/* Right Stick (Lower Right) */}
			<circle
				cx="310"
				cy="205"
				fill="rgba(255, 170, 0, 0.02)"
				filter="url(#amber-glow)"
				r="26"
				stroke="#ffaa00"
				strokeWidth="1.5"
			/>
			<circle
				cx="310"
				cy="205"
				fill="none"
				filter="url(#amber-glow)"
				r="20"
				stroke="#ffaa00"
				strokeWidth="1"
			/>
			<circle
				cx="310"
				cy="205"
				fill="none"
				filter="url(#amber-glow)"
				r="14"
				stroke="#ffaa00"
				strokeDasharray="3,3"
				strokeWidth="0.8"
			/>
			<text
				fill="#ffaa00"
				filter="url(#amber-glow)"
				fontSize="8"
				fontWeight="bold"
				textAnchor="middle"
				x="310"
				y="208"
			>
				RS
			</text>

			{/* ── Hybrid D-pad Dish ── */}
			<circle
				cx="210"
				cy="205"
				fill="rgba(255, 170, 0, 0.02)"
				filter="url(#amber-glow)"
				r="21"
				stroke="#ffaa00"
				strokeWidth="1.5"
			/>
			<path
				d="M 210,188 L 210,222 M 193,205 L 227,205"
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeLinecap="round"
				strokeWidth="2.5"
			/>
			<path
				d="M 210,188 L 210,222 M 193,205 L 227,205"
				stroke="#000"
				strokeLinecap="round"
				strokeWidth="0.8"
			/>
			<circle
				cx="210"
				cy="205"
				fill="none"
				filter="url(#amber-glow)"
				r="14"
				stroke="#ffaa00"
				strokeDasharray="2,2"
				strokeWidth="0.8"
			/>

			{/* ── Face Buttons (Xbox diamond layout) ── */}
			<circle
				cx="400"
				cy="140"
				fill="none"
				filter="url(#amber-glow)"
				r="22"
				stroke="#ffaa00"
				strokeDasharray="2,2"
				strokeWidth="1"
			/>
			<circle
				cx="400"
				cy="123"
				fill="rgba(255, 170, 0, 0.05)"
				filter="url(#amber-glow)"
				r="8"
				stroke="#ffaa00"
				strokeWidth="1.2"
			/>
			<text
				fill="#ffaa00"
				filter="url(#amber-glow)"
				fontSize="9"
				fontWeight="bold"
				textAnchor="middle"
				x="400"
				y="126"
			>
				Y
			</text>

			<circle
				cx="383"
				cy="140"
				fill="rgba(255, 170, 0, 0.05)"
				filter="url(#amber-glow)"
				r="8"
				stroke="#ffaa00"
				strokeWidth="1.2"
			/>
			<text
				fill="#ffaa00"
				filter="url(#amber-glow)"
				fontSize="9"
				fontWeight="bold"
				textAnchor="middle"
				x="383"
				y="143"
			>
				X
			</text>

			<circle
				cx="417"
				cy="140"
				fill="rgba(255, 170, 0, 0.05)"
				filter="url(#amber-glow)"
				r="8"
				stroke="#ffaa00"
				strokeWidth="1.2"
			/>
			<text
				fill="#ffaa00"
				filter="url(#amber-glow)"
				fontSize="9"
				fontWeight="bold"
				textAnchor="middle"
				x="417"
				y="143"
			>
				B
			</text>

			<circle
				cx="400"
				cy="157"
				fill="rgba(255, 170, 0, 0.05)"
				filter="url(#amber-glow)"
				r="8"
				stroke="#ffaa00"
				strokeWidth="1.2"
			/>
			<text
				fill="#ffaa00"
				filter="url(#amber-glow)"
				fontSize="9"
				fontWeight="bold"
				textAnchor="middle"
				x="400"
				y="160"
			>
				A
			</text>

			{/* ── Annotation Callout Lines & Text ── */}
			<line
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeDasharray="2,2"
				strokeWidth="1"
				x1="102"
				x2="40"
				y1="28"
				y2="28"
			/>
			<text
				fill="#ffaa00"
				fontSize="8"
				fontWeight="bold"
				textAnchor="end"
				x="36"
				y="31"
			>
				Zoom Out
			</text>

			<line
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeDasharray="2,2"
				strokeWidth="1"
				x1="418"
				x2="480"
				y1="28"
				y2="28"
			/>
			<text fill="#ffaa00" fontSize="8" fontWeight="bold" x="484" y="31">
				Zoom In
			</text>

			<line
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeDasharray="2,2"
				strokeWidth="1"
				x1="102"
				x2="40"
				y1="50"
				y2="50"
			/>
			<text
				fill="#ffaa00"
				fontSize="8"
				fontWeight="bold"
				textAnchor="end"
				x="36"
				y="48"
			>
				Systems [Tap]
			</text>
			<text
				fill="#ffaa00"
				fontSize="7"
				opacity="0.8"
				textAnchor="end"
				x="36"
				y="56"
			>
				Cursor [Hold]
			</text>

			<line
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeDasharray="2,2"
				strokeWidth="1"
				x1="418"
				x2="480"
				y1="50"
				y2="50"
			/>
			<text fill="#ffaa00" fontSize="8" fontWeight="bold" x="484" y="53">
				Forge Planet
			</text>

			<line
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeDasharray="2,2"
				strokeWidth="1"
				x1="310"
				x2="250"
				y1="205"
				y2="240"
			/>
			<text fill="#ffaa00" fontSize="8" textAnchor="end" x="246" y="243">
				Reset Camera
			</text>

			<line
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeDasharray="2,2"
				strokeWidth="1"
				x1="305"
				x2="350"
				y1="134"
				y2="95"
			/>
			<text fill="#ffaa00" fontSize="8" x="354" y="98">
				Telemetry
			</text>

			<line
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeDasharray="2,2"
				strokeWidth="1"
				x1="150"
				x2="40"
				y1="140"
				y2="115"
			/>
			<text
				fill="#ffaa00"
				fontSize="8"
				fontWeight="bold"
				textAnchor="end"
				x="36"
				y="118"
			>
				Skate / Pan Space
			</text>

			<line
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeDasharray="2,2"
				strokeWidth="1"
				x1="210"
				x2="40"
				y1="205"
				y2="185"
			/>
			<text
				fill="#ffaa00"
				fontSize="8"
				fontWeight="bold"
				textAnchor="end"
				x="36"
				y="182"
			>
				◀▶ Cycle Planets
			</text>
			<text
				fill="#ffaa00"
				fontSize="7"
				opacity="0.8"
				textAnchor="end"
				x="36"
				y="191"
			>
				▲▼ Navigate List
			</text>

			<line
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeDasharray="2,2"
				strokeWidth="1"
				x1="310"
				x2="480"
				y1="205"
				y2="205"
			/>
			<text fill="#ffaa00" fontSize="8" fontWeight="bold" x="484" y="208">
				Orbit Camera
			</text>

			<line
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeDasharray="2,2"
				strokeWidth="1"
				x1="408"
				x2="480"
				y1="123"
				y2="123"
			/>
			<text fill="#ffaa00" fontSize="8" fontWeight="bold" x="484" y="126">
				Disintegrate Body
			</text>

			<line
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeDasharray="2,2"
				strokeWidth="1"
				x1="425"
				x2="480"
				y1="140"
				y2="140"
			/>
			<text fill="#ffaa00" fontSize="8" fontWeight="bold" x="484" y="143">
				Strike Comet
			</text>

			<line
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeDasharray="2,2"
				strokeWidth="1"
				x1="408"
				x2="480"
				y1="157"
				y2="157"
			/>
			<text fill="#ffaa00" fontSize="8" fontWeight="bold" x="484" y="160">
				Warp / Confirm
			</text>

			{/* LS Click / Controls callout */}
			<line
				filter="url(#amber-glow)"
				stroke="#ffaa00"
				strokeDasharray="2,2"
				strokeWidth="1"
				x1="150"
				x2="70"
				y1="140"
				y2="235"
			/>
			<text
				fill="#ffaa00"
				fontSize="8"
				fontWeight="bold"
				textAnchor="end"
				x="66"
				y="238"
			>
				LS Click: Toggle Controls
			</text>
		</svg>
	);
}

// ─── Action reference table ───────────────────────────────────────────────────

const PS5_ACTIONS = [
	{
		input: "Left Stick",
		symbol: "↔↕",
		color: "#ffaa00",
		action: "Skate / Pan camera through space",
	},
	{
		input: "Right Stick",
		symbol: "↔↕",
		color: "#ffaa00",
		action: "Orbit camera around target",
	},
	{ input: "L2", symbol: "L2", color: "#ffaa00", action: "Zoom out (analog)" },
	{ input: "R2", symbol: "R2", color: "#ffaa00", action: "Zoom in (analog)" },
	{
		input: "D-pad ◀▶",
		symbol: "◀▶",
		color: "#ffaa00",
		action: "Slide / cycle planets in current system",
	},
	{
		input: "L1 [Tap]",
		symbol: "L1",
		color: "#ffaa00",
		action: "Open / close solar systems list",
	},
	{
		input: "D-pad ▲▼",
		symbol: "▲▼",
		color: "#ffaa00",
		action: "Navigate solar systems list (when open)",
	},
	{
		input: "Cross ✕",
		symbol: "✕",
		color: "#ffaa00",
		action: "Warp / Enter highlighted system (when open)",
	},
	{
		input: "L3 Click",
		symbol: "L3",
		color: "#ffaa00",
		action: "Toggle this controls reference dialog",
	},
	{ input: "R1", symbol: "R1", color: "#ffaa00", action: "Forge planet" },
	{
		input: "Square □",
		symbol: "□",
		color: "#ffaa00",
		action: "Strike with comet",
	},
	{
		input: "Triangle △",
		symbol: "△",
		color: "#ffaa00",
		action: "Disintegrate body",
	},
	{
		input: "Options",
		symbol: "OPT",
		color: "#ffaa00",
		action: "Toggle telemetry",
	},
	{ input: "R3 Click", symbol: "R3", color: "#ffaa00", action: "Reset camera" },
	{
		input: "L1 [Hold]",
		symbol: "L1",
		color: "#ffaa00",
		action: "Enable virtual cursor mode (select with ✕)",
	},
	{
		input: "L2 + R2",
		symbol: "L2+R2",
		color: "#ffaa00",
		action: "Toggle galaxy / local view",
	},
];

const XBOX_ACTIONS = [
	{
		input: "Left Stick",
		symbol: "↔↕",
		color: "#ffaa00",
		action: "Skate / Pan camera through space",
	},
	{
		input: "Right Stick",
		symbol: "↔↕",
		color: "#ffaa00",
		action: "Orbit camera around target",
	},
	{ input: "LT", symbol: "LT", color: "#ffaa00", action: "Zoom out (analog)" },
	{ input: "RT", symbol: "RT", color: "#ffaa00", action: "Zoom in (analog)" },
	{
		input: "D-pad ◀▶",
		symbol: "◀▶",
		color: "#ffaa00",
		action: "Slide / cycle planets in current system",
	},
	{
		input: "LB [Tap]",
		symbol: "LB",
		color: "#ffaa00",
		action: "Open / close solar systems list",
	},
	{
		input: "D-pad ▲▼",
		symbol: "▲▼",
		color: "#ffaa00",
		action: "Navigate solar systems list (when open)",
	},
	{
		input: "A Button",
		symbol: "A",
		color: "#ffaa00",
		action: "Warp / Enter highlighted system (when open)",
	},
	{
		input: "LS Click",
		symbol: "LS",
		color: "#ffaa00",
		action: "Toggle this controls reference dialog",
	},
	{ input: "RB", symbol: "RB", color: "#ffaa00", action: "Forge planet" },
	{ input: "X", symbol: "X", color: "#ffaa00", action: "Strike with comet" },
	{ input: "Y", symbol: "Y", color: "#ffaa00", action: "Disintegrate body" },
	{
		input: "Menu",
		symbol: "MENU",
		color: "#ffaa00",
		action: "Toggle telemetry",
	},
	{ input: "RS Click", symbol: "RS", color: "#ffaa00", action: "Reset camera" },
	{
		input: "LB [Hold]",
		symbol: "LB",
		color: "#ffaa00",
		action: "Enable virtual cursor mode (select with A)",
	},
	{
		input: "LT + RT",
		symbol: "LT+RT",
		color: "#ffaa00",
		action: "Toggle galaxy / local view",
	},
];

function ActionTable({ actions }: { actions: typeof PS5_ACTIONS }) {
	return (
		<div className="flex flex-col gap-1.5">
			{actions.map(({ input, symbol, color, action }) => (
				<div
					className="flex items-center gap-2 border-white/5 border-b pb-1.5"
					key={input}
				>
					<span
						className="inline-flex w-14 shrink-0 items-center justify-center rounded-md px-1.5 py-0.5 font-bold font-mono text-[10px]"
						style={{
							background: "rgba(255, 170, 0, 0.1)",
							color,
							border: "1px solid rgba(255, 170, 0, 0.3)",
						}}
					>
						{symbol}
					</span>
					<span className="text-muted-foreground text-xs">{input}</span>
					<span className="ml-auto text-right font-medium text-foreground/80 text-xs">
						{action}
					</span>
				</div>
			))}
		</div>
	);
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

const BRAND_LABELS: Record<ControllerBrand, string> = {
	ps5: "PS5 DualSense",
	xbox: "Xbox Controller",
	generic: "Controller",
};

export function ControllerButtonMapDialog({ open, onOpenChange }: Props) {
	const brand = useGamepadStore((s) => s.brand) ?? "generic";
	const actions = brand === "xbox" ? XBOX_ACTIONS : PS5_ACTIONS;

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent
				className="glass w-[calc(100vw-2rem)] max-w-5xl gap-0 overflow-hidden p-0 sm:max-w-5xl"
				data-interactive
				showCloseButton={false}
			>
				<DialogHeader className="border-b px-6 py-4">
					<div className="flex items-center gap-2 text-[10px] text-primary uppercase tracking-[0.28em]">
						<span className="size-1.5 rounded-full bg-primary" />
						{BRAND_LABELS[brand as ControllerBrand]}
					</div>
					<DialogTitle className="font-mono text-lg tracking-[0.1em]">
						CONTROLLER REFERENCE
					</DialogTitle>
				</DialogHeader>

				<div className="grid max-h-[88vh] min-h-[640px] grid-cols-[1fr_360px] gap-0">
					{/* Left: schematic diagram */}
					<div className="flex items-center justify-center bg-black/50 p-8">
						{brand === "xbox" ? <XboxSchematic /> : <PS5Schematic />}
					</div>

					{/* Right: action table */}
					<div className="overflow-y-auto border-l bg-black/40 p-5">
						<p className="mb-3 font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
							Button Mapping
						</p>
						<ActionTable actions={actions} />

						<div className="mt-5 flex items-center justify-between gap-3">
							<button
								className="flex-1 border border-foreground/20 py-1.5 font-mono text-[10px] text-muted-foreground uppercase tracking-widest transition-colors hover:border-foreground/40 hover:text-foreground"
								onClick={() => onOpenChange(false)}
								type="button"
							>
								Close [ ESC ]
							</button>
							<ControllerButtonHint action="cancel" className="scale-100" />
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
