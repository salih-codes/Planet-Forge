import type { Climate, PlanetStats, PlanetType, PlanetTypeMeta } from "./types";

export const PLANET_TYPES: Record<PlanetType, PlanetTypeMeta> = {
	terran: {
		label: "Terran",
		ocean: [0.03, 0.18, 0.42],
		land1: [0.2, 0.42, 0.18],
		land2: [0.55, 0.5, 0.4],
		water: 0.5,
		ice: 0.82,
		banded: 0,
		emissive: 0.0,
		atmo: [0.35, 0.65, 1.0],
		clouds: 0.55,
		atmoStr: 1.1,
		life: "Abundant",
		baseTemp: 14,
		color: "#4aa3ff",
	},
	ocean: {
		label: "Ocean",
		ocean: [0.02, 0.2, 0.45],
		land1: [0.1, 0.45, 0.55],
		land2: [0.3, 0.62, 0.66],
		water: 0.72,
		ice: 0.86,
		banded: 0,
		emissive: 0.0,
		atmo: [0.3, 0.7, 0.95],
		clouds: 0.65,
		atmoStr: 1.2,
		life: "Aquatic",
		baseTemp: 18,
		color: "#33c6e0",
	},
	desert: {
		label: "Desert",
		ocean: [0.45, 0.3, 0.16],
		land1: [0.72, 0.5, 0.26],
		land2: [0.85, 0.7, 0.45],
		water: 0.3,
		ice: 0.93,
		banded: 0,
		emissive: 0.0,
		atmo: [0.95, 0.65, 0.35],
		clouds: 0.18,
		atmoStr: 0.8,
		life: "Sparse",
		baseTemp: 46,
		color: "#e0a24a",
	},
	ice: {
		label: "Ice",
		ocean: [0.3, 0.45, 0.6],
		land1: [0.7, 0.82, 0.92],
		land2: [0.92, 0.96, 1.0],
		water: 0.4,
		ice: 0.3,
		banded: 0,
		emissive: 0.0,
		atmo: [0.65, 0.85, 1.0],
		clouds: 0.45,
		atmoStr: 0.9,
		life: "Dormant",
		baseTemp: -58,
		color: "#bfe6ff",
	},
	lava: {
		label: "Volcanic",
		ocean: [0.1, 0.05, 0.05],
		land1: [0.35, 0.1, 0.06],
		land2: [0.95, 0.35, 0.08],
		water: 0.55,
		ice: 1.2,
		banded: 0,
		emissive: 0.55,
		atmo: [1.0, 0.4, 0.15],
		clouds: 0.1,
		atmoStr: 1.3,
		life: "None",
		baseTemp: 430,
		color: "#ff5a2a",
	},
	gas: {
		label: "Gas Giant",
		ocean: [0.55, 0.42, 0.28],
		land1: [0.78, 0.62, 0.4],
		land2: [0.92, 0.84, 0.66],
		water: 0.5,
		ice: 1.2,
		banded: 1,
		emissive: 0.0,
		atmo: [0.95, 0.75, 0.45],
		clouds: 0.0,
		atmoStr: 1.4,
		life: "None",
		baseTemp: -110,
		color: "#d8b070",
	},
	comet: {
		label: "Comet",
		ocean: [0.1, 0.25, 0.4],
		land1: [0.75, 0.85, 0.95],
		land2: [0.9, 0.95, 1.0],
		water: 0.1,
		ice: 0.95,
		banded: 0,
		emissive: 0.0,
		atmo: [0.5, 0.85, 1.0],
		clouds: 0.0,
		atmoStr: 0.3,
		life: "None",
		baseTemp: -180,
		color: "#7ae5ff",
	},
};

export const CLIMATE_DELTA: Record<Climate, number> = {
	frozen: -40,
	temperate: 0,
	tropical: 18,
	scorched: 60,
};

const ATMO_BY_TYPE: Record<PlanetType, Record<string, number>> = {
	terran: { N2: 74, O2: 21, CO2: 2, Ar: 3 },
	ocean: { N2: 68, O2: 24, H2O: 6, CO2: 2 },
	desert: { CO2: 71, N2: 24, Ar: 5 },
	ice: { N2: 80, CH4: 14, Ar: 6 },
	lava: { CO2: 62, SO2: 30, N2: 8 },
	gas: { H2: 82, He: 16, CH4: 2 },
	comet: { H2O: 40, CO2: 30, CO: 20, N2: 10 },
};

const BASE_HABITABILITY: Record<PlanetType, [number, number]> = {
	terran: [78, 16],
	ocean: [64, 14],
	desert: [28, 14],
	ice: [22, 12],
	lava: [3, 6],
	gas: [1, 4],
	comet: [0, 0],
};

export function deriveStats(
	type: PlanetType,
	radius: number,
	climate: Climate = "temperate",
	rng: () => number = Math.random,
	moons = 0
): PlanetStats {
	const t = PLANET_TYPES[type];
	const radiusKm = Math.round((radius / 1.5) * 6371);
	const mass = +((radius / 1.5) ** 3 * (type === "gas" ? 0.226 : 1.0)).toFixed(
		2
	);
	const gravity = +(mass / (radius / 1.5) ** 2).toFixed(2);
	const temp =
		t.baseTemp + Math.round((rng() - 0.5) * 12) + CLIMATE_DELTA[climate];
	const [hb, hv] = BASE_HABITABILITY[type];
	const habitability = Math.min(99, hb + Math.floor(rng() * hv));

	// Mirrors the authoritative Python derive_stats(); orbit/atmosphere aren't
	// known in the wizard preview, so tidal-lock and the thin-atmosphere term are
	// approximated. The HUD always displays the backend's authoritative values.
	const magnetosphere =
		type === "gas" ||
		((type === "terran" || type === "ocean") && radius >= 1.0);
	let radiationScore = magnetosphere ? 0 : 2;
	if (climate === "scorched") {
		radiationScore += 1;
	}
	if (type === "lava" || type === "comet") {
		radiationScore += 1;
	}
	let radiation = "Low";
	if (radiationScore >= 4) {
		radiation = "Extreme";
	} else if (radiationScore === 3) {
		radiation = "High";
	} else if (radiationScore === 2) {
		radiation = "Moderate";
	}

	let tempProfile = "Even, temperate distribution";
	if (type === "comet") {
		tempProfile = "Frozen nucleus; sublimates near stars";
	} else if (temp > 60) {
		tempProfile = "Hot across the entire surface";
	} else if (temp < -30) {
		tempProfile = "Frozen across the entire surface";
	}

	return {
		radiusKm,
		mass,
		gravity,
		temp,
		day: +(8 + rng() * 30).toFixed(1),
		moons,
		atmo: { ...ATMO_BY_TYPE[type] },
		habitability,
		life: t.life,
		magnetosphere,
		radiation,
		tempProfile,
	};
}

const NAMES = [
	"Caelum",
	"Erebos",
	"Helia",
	"Maris",
	"Orin",
	"Tessara",
	"Vox",
	"Lumen",
	"Kael",
	"Astrea",
	"Nyx",
	"Pyxis",
	"Zephyr",
	"Corvus",
	"Drael",
];

export function randomName(rng: () => number = Math.random): string {
	return `${NAMES[Math.floor(rng() * NAMES.length)]}-${100 + Math.floor(rng() * 899)}`;
}
