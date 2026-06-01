export type PlanetType =
	| "terran"
	| "ocean"
	| "desert"
	| "ice"
	| "lava"
	| "gas"
	| "comet";

export type Climate = "frozen" | "temperate" | "tropical" | "scorched";

export type AtmosphereMix = Record<string, number>;

export interface PlanetStats {
	atmo: AtmosphereMix;
	day: number;
	gravity: number;
	habitability: number;
	life: string;
	magnetosphere: boolean;
	mass: number;
	moons: number;
	radiation: string;
	radiusKm: number;
	temp: number;
	tempProfile: string;
}

export interface PlanetConfig {
	atmosphere: number;
	climate: Climate;
	clouds: boolean;
	eccentricity?: number;
	moons?: number;
	name?: string;
	orbitRadius?: number;
	radius: number;
	rings: boolean;
	tilt?: number;
	type: PlanetType;
}

export interface CelestialBody {
	config: PlanetConfig;
	id: string;
	name: string;
	position: [number, number, number];
	stats: PlanetStats;
	type: PlanetType;
}

export interface SystemStats {
	count: number;
	habitability: number;
	mass: number;
}

export interface StarInfo {
	color: string;
	id: string;
	luminosity: number;
	mass: number;
	name: string;
	radius: number;
}

export interface SystemInfo {
	id: string;
	name: string;
	planetsCount: number;
	star: StarInfo;
	stats: SystemStats;
}

export type SimEventType =
	| "collision"
	| "disintegrate"
	| "impact"
	| "impact_star"
	| "remnant"
	| "supernova";

export interface SimEventBodyRef {
	radius: number;
	type: PlanetType;
}

export interface SimEvent {
	data: {
		baseRadius?: number;
		bodies?: SimEventBodyRef[];
		color?: string;
		duration?: number;
		energy?: number;
		radius?: number;
		shockSpeed?: number;
		target?: string;
	};
	pos: [number, number, number];
	type: SimEventType;
}

export interface EphemeralBody {
	id: string;
	radius: number;
	type: PlanetType;
}

export interface PlanetTypeMeta {
	atmo: [number, number, number];
	atmoStr: number;
	banded: 0 | 1;
	baseTemp: number;
	clouds: number;
	color: string;
	emissive: number;
	ice: number;
	label: string;
	land1: [number, number, number];
	land2: [number, number, number];
	life: string;
	ocean: [number, number, number];
	water: number;
}
