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


def _planet(system: SolarSystem, name: str, radius: float, orbit: float):
    return system.add_planet({
        "type": "terran", "radius": radius, "atmosphere": 1.0,
        "clouds": True, "rings": False, "climate": "temperate",
        "orbit_radius": orbit, "name": name,
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
