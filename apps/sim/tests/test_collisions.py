"""Cataclysm + layout tests: collisions, supernova state machine, orbit spacing."""
from __future__ import annotations

import numpy as np

from sim.domain.star import Star
from sim.domain.system import EXPAND_DURATION, SolarSystem

DT = 1 / 60


def _system() -> SolarSystem:
    star = Star(body_id="sol", name="Sol", mass=1.0, radius=1.0)
    system = SolarSystem(star)
    system.ambient_enabled = False
    return system


def _planet(system: SolarSystem, name: str, radius: float, orbit: float, type_: str = "terran"):
    return system.add_planet({
        "type": type_, "radius": radius, "atmosphere": 1.0,
        "clouds": True, "rings": False, "climate": "temperate",
        "orbit_radius": orbit, "name": name,
    })


def _comet(system: SolarSystem, radius: float = 0.6):
    return system.add_planet({
        "type": "comet", "radius": radius, "atmosphere": 0.3,
        "clouds": False, "rings": False, "climate": "frozen",
        "orbit_radius": 40.0, "eccentricity": 0.7, "name": "Impactor",
    })


def test_collision_emits_event_and_removes_bodies() -> None:
    system = _system()
    a = _planet(system, "A", 2.4, 8.0)
    b = _planet(system, "B", 2.4, 16.0)

    # Force them onto the same point — comparable mass annihilates both.
    a.position = np.array([8.0, 0.0, 0.0])
    b.position = np.array([8.1, 0.0, 0.0])

    system.step(DT)

    assert len(system.planets) == 0
    events = system.events
    assert any(e["type"] == "collision" for e in events)
    collision = next(e for e in events if e["type"] == "collision")
    assert len(collision["data"]["bodies"]) == 2


def test_large_body_absorbs_small_body() -> None:
    system = _system()
    big = _planet(system, "Big", 4.0, 8.0)
    small = _planet(system, "Small", 1.0, 16.0)

    big.position = np.array([8.0, 0.0, 0.0])
    small.position = np.array([8.2, 0.0, 0.0])
    original_radius = big.scene_radius

    system.step(DT)

    surviving_ids = {p.id for p in system.planets}
    assert big.id in surviving_ids
    assert small.id not in surviving_ids
    assert big.scene_radius > original_radius  # absorbed mass → grew


def test_supernova_transitions_to_remnant() -> None:
    system = _system()
    _planet(system, "Inner", 2.0, 8.0)

    assert system.trigger_supernova() is True
    assert system.trigger_supernova() is False  # already exploding
    assert system.star.phase == "expanding"

    base_radius = system.star.base_radius
    steps = int((EXPAND_DURATION + 0.5) / DT)
    for _ in range(steps):
        system.step(DT)

    assert system.star.phase == "remnant"
    assert system.star.radius < base_radius
    types = {e["type"] for e in system.events}
    assert "supernova" in types
    assert "remnant" in types


def test_orbit_layout_never_overlaps() -> None:
    system = _system()
    radii = [1.0, 4.5, 2.2, 3.8, 1.4, 2.7]
    for index, radius in enumerate(radii):
        # No orbit_radius → SolarSystem auto-spaces the planet into a clear gap.
        system.add_planet({
            "type": "terran", "radius": radius, "atmosphere": 1.0,
            "clouds": True, "rings": False, "climate": "temperate",
            "name": f"P{index}",
        })

    ordered = sorted(system.planets, key=lambda p: p.orbit_radius)
    for curr, nxt in zip(ordered, ordered[1:]):
        gap = nxt.orbit_radius - curr.orbit_radius
        assert gap >= curr.scene_radius + nxt.scene_radius, (
            f"Orbits overlap: gap {gap:.2f} < {curr.scene_radius + nxt.scene_radius:.2f}"
        )


def test_comet_passes_through_gas_giant() -> None:
    system = _system()
    gas = _planet(system, "Jove", 4.0, 16.0, type_="gas")
    comet = _comet(system)

    gas.position = np.array([16.0, 0.0, 0.0])
    comet.position = np.array([16.2, 0.0, 0.0])

    system.step(DT)

    ids = {p.id for p in system.planets}
    assert gas.id in ids  # gas giant survives
    assert comet.id in ids  # comet plunges straight through, not destroyed
    assert not any(e["type"] == "impact" for e in system.events)


def test_comet_impact_craters_solid_planet() -> None:
    system = _system()
    land = _planet(system, "Land", 2.4, 16.0)
    comet = _comet(system)

    land.position = np.array([16.0, 0.0, 0.0])
    comet.position = np.array([16.3, 0.0, 0.0])

    system.step(DT)

    ids = {p.id for p in system.planets}
    assert land.id in ids  # planet survives the strike
    assert comet.id not in ids  # comet is destroyed
    impacts = [e for e in system.events if e["type"] == "impact"]
    assert len(impacts) == 1
    assert impacts[0]["data"]["target"] == land.id
    assert abs(land.scene_radius - 2.4) < 1e-6  # planet does not grow


def test_collision_conserves_momentum() -> None:
    system = _system()
    big = _planet(system, "Big", 4.0, 16.0)
    small = _planet(system, "Small", 1.0, 30.0)

    big.position = np.array([16.0, 0.0, 0.0])
    big.velocity = np.array([0.0, 0.0, 1.0])
    small.position = np.array([16.5, 0.0, 0.0])
    small.velocity = np.array([0.0, 0.0, -1.0])

    mass_big, mass_small = 4.0**3, 1.0**3
    momentum_before = mass_big * big.velocity + mass_small * small.velocity

    system._detect_collisions()  # direct call avoids gravity perturbing velocities

    survivor = next(p for p in system.planets if p.id == big.id)
    merged_mass = survivor.scene_radius**3
    momentum_after = merged_mass * survivor.velocity

    assert np.allclose(momentum_after, momentum_before, atol=1e-6)
