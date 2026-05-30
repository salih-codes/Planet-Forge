from __future__ import annotations

import numpy as np

from .base import CelestialBody


class Star(CelestialBody):
    """Fixed at the origin (or barycenter). Emits gravity but does not orbit."""

    def __init__(
        self,
        body_id: str,
        name: str,
        mass: float,
        radius: float,
        luminosity: float = 1.0,
        color: str = "#ffaa00",
    ) -> None:
        super().__init__(
            body_id=body_id,
            name=name,
            mass=mass,
            radius=radius,
            position=(0.0, 0.0, 0.0),
            velocity=(0.0, 0.0, 0.0),
            body_type="star",
        )
        self.luminosity = luminosity
        self.color = color

        # Supernova state machine: stable → expanding → remnant.
        self.phase: str = "stable"
        self.phase_time: float = 0.0
        self.base_radius: float = radius
        self.base_luminosity: float = luminosity

    def trigger_supernova(self) -> bool:
        """Begin the explosion. Returns False if already triggered."""
        if self.phase != "stable":
            return False
        self.phase = "expanding"
        self.phase_time = 0.0
        return True

    def collapse_to_remnant(self) -> None:
        """Collapse to a small, dim, blue-white stellar remnant."""
        self.phase = "remnant"
        self.radius = max(0.3, self.base_radius * 0.22)
        self.luminosity = self.base_luminosity * 0.12
        self.color = "#bfe0ff"

    def integrate(self, dt: float) -> None:
        """Stars are fixed — no orbital motion."""

    def apply_force(self, force: np.ndarray, dt: float) -> None:
        """Stars are fixed — ignore external forces."""

    def derive_stats(self) -> dict:
        return {
            "radius_km": int(self.radius * 109_000),
            "mass": round(self.mass / 1.989e30, 2),
            "gravity": 274.0,
            "temp": 5778,
            "day": 609.0,
            "moons": 0,
            "atmo": {"H": 74, "He": 25},
            "habitability": 0,
            "life": "None",
        }
