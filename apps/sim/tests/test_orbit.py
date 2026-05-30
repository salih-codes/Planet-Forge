"""Two-body energy conservation test.

Uses game-scaled physics (G ≈ 0.7, M_star = 1, planet mass = 1).
A planet on a circular orbit must conserve total mechanical energy
within 0.1 % over 1 000 steps at the fixed 60 Hz timestep.
"""
from __future__ import annotations

import math

import numpy as np

from sim.domain.planet import Planet
from sim.domain.star import Star
from sim.domain.system import G, M_STAR_NORM, SolarSystem

DT = 1 / 60
STEPS = 1_000
ORBIT_RADIUS = 4.0


_EPSILON = 0.1  # must match system.EPSILON


def _energy(position: np.ndarray, velocity: np.ndarray) -> float:
    """Total specific mechanical energy using the same softened potential as step()."""
    r_soft = float(np.linalg.norm(position)) + _EPSILON
    ke = 0.5 * float(np.dot(velocity, velocity))
    pe = -G * M_STAR_NORM / r_soft
    return ke + pe


def _make_system() -> tuple[SolarSystem, Planet]:
    star = Star(body_id="sol", name="Sol", mass=1.0, radius=1.0)
    system = SolarSystem(star)
    system.ambient_enabled = False
    planet = system.add_planet(
        {
            "type": "terran",
            "radius": 3.4,
            "atmosphere": 1.0,
            "clouds": True,
            "rings": False,
            "climate": "temperate",
            "orbit_radius": ORBIT_RADIUS,
            "name": "TestWorld",
        }
    )
    return system, planet


def test_two_body_energy_conservation() -> None:
    system, planet = _make_system()

    e0 = _energy(planet.position, planet.velocity)

    for _ in range(STEPS):
        system.step(DT)

    e1 = _energy(planet.position, planet.velocity)

    relative_error = abs(e1 - e0) / abs(e0)
    assert relative_error < 0.001, f"Energy drift {relative_error:.4%} exceeds 0.1 %"


def test_orbit_is_roughly_circular() -> None:
    system, planet = _make_system()

    radii: list[float] = []
    for _ in range(STEPS):
        system.step(DT)
        radii.append(float(np.linalg.norm(planet.position)))

    r_mean = sum(radii) / len(radii)
    r_std = math.sqrt(sum((r - r_mean) ** 2 for r in radii) / len(radii))

    assert r_std / r_mean < 0.05, f"Orbit too elliptical: std/mean = {r_std / r_mean:.3f}"


def test_circular_orbit_period() -> None:
    """Inner planet (r=4) completes one full orbit in 45–90 s.

    We track cumulative angle swept and assert the planet accumulates
    2π radians (one full orbit) within the expected window.
    """
    system, planet = _make_system()

    total_angle = 0.0
    prev_pos = planet.position.copy()

    # Run for 90 s — safely longer than any expected period (≈ 60–65 s)
    for _ in range(int(90 / DT)):
        system.step(DT)
        # Angle swept this step via cross-product sign trick (XZ plane)
        x0, z0 = float(prev_pos[0]), float(prev_pos[2])
        x1, z1 = float(planet.position[0]), float(planet.position[2])
        # signed angle increment (positive = counterclockwise in XZ)
        cross = x0 * z1 - z0 * x1               # sin of angle between
        dot_  = x0 * x1 + z0 * z1               # cos of angle between
        dθ = math.atan2(cross, dot_)
        total_angle += dθ
        prev_pos = planet.position.copy()

    # One complete counterclockwise orbit = +2π
    assert total_angle > 2 * math.pi, (
        f"Planet swept only {math.degrees(total_angle):.1f}° in 90 s (expected ≥ 360°)"
    )
