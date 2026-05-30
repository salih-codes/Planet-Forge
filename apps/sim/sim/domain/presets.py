from __future__ import annotations

from typing import Literal

PlanetType = Literal["terran", "ocean", "desert", "ice", "lava", "gas", "comet"]
Climate = Literal["frozen", "temperate", "tropical", "scorched"]

PLANET_TYPES: dict[str, dict] = {
    "terran": {
        "label": "Terran",
        "ocean": (0.03, 0.18, 0.42),
        "land1": (0.2, 0.42, 0.18),
        "land2": (0.55, 0.5, 0.4),
        "water": 0.5,
        "ice": 0.82,
        "banded": 0,
        "emissive": 0.0,
        "atmo": (0.35, 0.65, 1.0),
        "clouds": 0.55,
        "atmo_str": 1.1,
        "life": "Abundant",
        "base_temp": 14,
        "color": "#4aa3ff",
    },
    "ocean": {
        "label": "Ocean",
        "ocean": (0.02, 0.2, 0.45),
        "land1": (0.1, 0.45, 0.55),
        "land2": (0.3, 0.62, 0.66),
        "water": 0.72,
        "ice": 0.86,
        "banded": 0,
        "emissive": 0.0,
        "atmo": (0.3, 0.7, 0.95),
        "clouds": 0.65,
        "atmo_str": 1.2,
        "life": "Aquatic",
        "base_temp": 18,
        "color": "#33c6e0",
    },
    "desert": {
        "label": "Desert",
        "ocean": (0.45, 0.3, 0.16),
        "land1": (0.72, 0.5, 0.26),
        "land2": (0.85, 0.7, 0.45),
        "water": 0.3,
        "ice": 0.93,
        "banded": 0,
        "emissive": 0.0,
        "atmo": (0.95, 0.65, 0.35),
        "clouds": 0.18,
        "atmo_str": 0.8,
        "life": "Sparse",
        "base_temp": 46,
        "color": "#e0a24a",
    },
    "ice": {
        "label": "Ice",
        "ocean": (0.3, 0.45, 0.6),
        "land1": (0.7, 0.82, 0.92),
        "land2": (0.92, 0.96, 1.0),
        "water": 0.4,
        "ice": 0.3,
        "banded": 0,
        "emissive": 0.0,
        "atmo": (0.65, 0.85, 1.0),
        "clouds": 0.45,
        "atmo_str": 0.9,
        "life": "Dormant",
        "base_temp": -58,
        "color": "#bfe6ff",
    },
    "lava": {
        "label": "Volcanic",
        "ocean": (0.1, 0.05, 0.05),
        "land1": (0.35, 0.1, 0.06),
        "land2": (0.95, 0.35, 0.08),
        "water": 0.55,
        "ice": 1.2,
        "banded": 0,
        "emissive": 0.55,
        "atmo": (1.0, 0.4, 0.15),
        "clouds": 0.1,
        "atmo_str": 1.3,
        "life": "None",
        "base_temp": 430,
        "color": "#ff5a2a",
    },
    "gas": {
        "label": "Gas Giant",
        "ocean": (0.55, 0.42, 0.28),
        "land1": (0.78, 0.62, 0.4),
        "land2": (0.92, 0.84, 0.66),
        "water": 0.5,
        "ice": 1.2,
        "banded": 1,
        "emissive": 0.0,
        "atmo": (0.95, 0.75, 0.45),
        "clouds": 0.0,
        "atmo_str": 1.4,
        "life": "None",
        "base_temp": -110,
        "color": "#d8b070",
    },
    "comet": {
        "label": "Comet",
        "ocean": (0.1, 0.25, 0.4),
        "land1": (0.75, 0.85, 0.95),
        "land2": (0.9, 0.95, 1.0),
        "water": 0.1,
        "ice": 0.95,
        "banded": 0,
        "emissive": 0.0,
        "atmo": (0.5, 0.85, 1.0),
        "clouds": 0.0,
        "atmo_str": 0.3,
        "life": "None",
        "base_temp": -180,
        "color": "#7ae5ff",
    },
}

CLIMATE_DELTA: dict[str, int] = {
    "frozen": -40,
    "temperate": 0,
    "tropical": 18,
    "scorched": 60,
}

ATMO_BY_TYPE: dict[str, dict[str, float]] = {
    "terran": {"N2": 74, "O2": 21, "CO2": 2, "Ar": 3},
    "ocean": {"N2": 68, "O2": 24, "H2O": 6, "CO2": 2},
    "desert": {"CO2": 71, "N2": 24, "Ar": 5},
    "ice": {"N2": 80, "CH4": 14, "Ar": 6},
    "lava": {"CO2": 62, "SO2": 30, "N2": 8},
    "gas": {"H2": 82, "He": 16, "CH4": 2},
    "comet": {"H2O": 40, "CO2": 30, "CO": 20, "N2": 10},
}

BASE_HABITABILITY: dict[str, tuple[int, int]] = {
    "terran": (78, 16),
    "ocean": (64, 14),
    "desert": (28, 14),
    "ice": (22, 12),
    "lava": (3, 6),
    "gas": (1, 4),
    "comet": (0, 0),
}


def derive_stats(
    planet_type: str,
    radius: float,
    climate: str = "temperate",
    rng_seed: float = 0.5,
) -> dict:
    """
    Client-side stat preview — mirrors deriveStats() in planet-presets.ts exactly.
    rng_seed replaces Math.random(); pass 0.5 for deterministic output.
    """
    t = PLANET_TYPES[planet_type]
    radius_km = round(radius * 1850)
    mass = round((radius / 3.4) ** 3 * (95 if planet_type == "gas" else 1), 2)
    gravity = round(mass / (radius / 3.4) ** 2, 2)
    temp = int(t["base_temp"] + round((rng_seed - 0.5) * 12) + CLIMATE_DELTA[climate])
    hb, hv = BASE_HABITABILITY[planet_type]
    habitability = min(99, hb + int(rng_seed * hv))
    day = round(8 + rng_seed * 30, 1)

    return {
        "radius_km": radius_km,
        "mass": mass,
        "gravity": gravity,
        "temp": temp,
        "day": day,
        "moons": 0,
        "atmo": dict(ATMO_BY_TYPE[planet_type]),
        "habitability": habitability,
        "life": t["life"],
    }
