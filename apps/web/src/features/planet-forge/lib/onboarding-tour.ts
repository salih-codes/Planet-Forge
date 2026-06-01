import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const TOUR_DONE_KEY = "pf-tour-done";

const driverObj = driver({
	animate: true,
	showProgress: true,
	showButtons: ["next", "previous", "close"],
	nextBtnText: "Next →",
	prevBtnText: "← Back",
	doneBtnText: "Let's go!",
	popoverClass: "pf-tour-popover",
	onDestroyStarted: () => {
		localStorage.setItem(TOUR_DONE_KEY, "1");
		driverObj.destroy();
	},
	steps: [
		{
			popover: {
				title: "Welcome to Planet Forge",
				description:
					"A real-time solar system simulator. Build worlds, trigger cosmic events, and watch physics unfold. This quick tour will show you around.",
				side: "over",
				align: "center",
			},
		},
		{
			element: "[data-tour='toolbar']",
			popover: {
				title: "Mission Control",
				description:
					"The toolbar is your command centre. Navigate between star systems, monitor sector stats, and access all major actions from here.",
				side: "bottom",
				align: "start",
			},
		},
		{
			element: "[data-tour='forge-button']",
			popover: {
				title: "Forge a Planet",
				description:
					"Click FORGE PLANET to open the creation wizard. Choose a planet type, configure atmosphere, rings, moons, and more across six steps.",
				side: "bottom",
				align: "center",
			},
		},
		{
			element: "[data-tour='galaxy-mode']",
			popover: {
				title: "Galaxy View",
				description:
					"Switch to GALAXY VIEW to see all star systems at once. Click any star to select its system, or double-click to jump into it.",
				side: "bottom",
				align: "center",
			},
		},
		{
			element: "[data-tour='info-panel']",
			popover: {
				title: "Planet Telemetry",
				description:
					"Select any planet in the scene to view its live stats here — temperature, gravity, habitability, atmosphere composition, and more.",
				side: "left",
				align: "start",
			},
		},
		{
			element: "[data-tour='minimap']",
			popover: {
				title: "Orbital Scan",
				description:
					"The minimap shows all bodies in the current system at a glance. The highlighted dot is your selected planet.",
				side: "top",
				align: "start",
			},
		},
		{
			popover: {
				title: "Planet Detail View",
				description:
					"Long-press any planet (hold ~0.5 s) to open it in a close-up view — it spins in isolation while your main scene stays untouched.",
				side: "over",
				align: "center",
			},
		},
		{
			popover: {
				title: "You're all set!",
				description:
					"Start by forging your first planet, or click an existing one to inspect it. Click the ? button in the toolbar anytime to replay this tour.",
				side: "over",
				align: "center",
			},
		},
	],
});

export function startTour(): void {
	driverObj.drive();
}

export function isTourDone(): boolean {
	return localStorage.getItem(TOUR_DONE_KEY) === "1";
}
