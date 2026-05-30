"""Verify derive_stats() matches the TypeScript deriveStats() output for each type."""
from __future__ import annotations

from sim.domain.presets import ATMO_BY_TYPE, PLANET_TYPES, derive_stats


def test_terran_temperate_stats() -> None:
    s = derive_stats("terran", 3.4, "temperate", rng_seed=0.5)
    assert s["radius_km"] == 6290
    assert s["mass"] == 1.0
    assert s["gravity"] == 1.0
    assert s["temp"] == 14  # base_temp + 0 climate delta + 0 rng offset
    assert s["habitability"] == 86  # 78 + int(0.5 * 16)
    assert s["life"] == "Abundant"
    assert s["atmo"] == ATMO_BY_TYPE["terran"]
    assert s["moons"] == 0


def test_gas_giant_frozen_stats() -> None:
    s = derive_stats("gas", 5.5, "frozen", rng_seed=0.5)
    # mass_earth = (5.5/3.4)^3 * 95
    expected_mass = round((5.5 / 3.4) ** 3 * 95, 2)
    assert s["mass"] == expected_mass
    assert s["temp"] == -110 + (-40)  # base_temp + climate_delta, rng_seed=0.5 → offset=0
    assert s["life"] == "None"
    assert s["atmo"] == ATMO_BY_TYPE["gas"]


def test_ice_world_stats() -> None:
    s = derive_stats("ice", 2.2, "frozen", rng_seed=0.5)
    assert s["radius_km"] == 2200 * 1850 // 1000  # 2.2 * 1850 = 4070
    assert s["radius_km"] == round(2.2 * 1850)
    assert s["temp"] == -58 + (-40)  # -98°C
    assert s["life"] == "Dormant"


def test_all_types_have_stats() -> None:
    for planet_type in PLANET_TYPES:
        s = derive_stats(planet_type, 3.0, "temperate", rng_seed=0.5)
        required = {"radius_km", "mass", "gravity", "temp", "day", "moons", "atmo", "habitability", "life"}
        assert required <= s.keys(), f"Missing keys for {planet_type}: {required - s.keys()}"
        assert s["habitability"] >= 0
        assert s["habitability"] <= 99
        assert isinstance(s["atmo"], dict)
        assert len(s["atmo"]) > 0


def test_climate_deltas() -> None:
    base = derive_stats("terran", 3.4, "temperate", rng_seed=0.5)["temp"]
    assert derive_stats("terran", 3.4, "frozen", rng_seed=0.5)["temp"] == base - 40
    assert derive_stats("terran", 3.4, "tropical", rng_seed=0.5)["temp"] == base + 18
    assert derive_stats("terran", 3.4, "scorched", rng_seed=0.5)["temp"] == base + 60
