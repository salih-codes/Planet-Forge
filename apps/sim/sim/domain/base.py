from __future__ import annotations

from abc import ABC, abstractmethod

import numpy as np


class CelestialBody(ABC):
    """Abstract base for all simulated bodies."""

    def __init__(
        self,
        body_id: str,
        name: str,
        mass: float,
        radius: float,
        position: tuple[float, float, float] = (0.0, 0.0, 0.0),
        velocity: tuple[float, float, float] = (0.0, 0.0, 0.0),
        body_type: str = "unknown",
    ) -> None:
        self.id = body_id
        self.name = name
        self.mass = mass
        self.radius = radius
        self.position: np.ndarray = np.array(position, dtype=float)
        self.velocity: np.ndarray = np.array(velocity, dtype=float)
        self.body_type = body_type

    def apply_force(self, force: np.ndarray, dt: float) -> None:
        """Semi-implicit Euler: update velocity from acceleration."""
        acceleration = force / self.mass
        self.velocity += acceleration * dt

    def integrate(self, dt: float) -> None:
        """Update position using the already-updated velocity."""
        self.position += self.velocity * dt

    @abstractmethod
    def derive_stats(self) -> dict:
        """Return a dict matching the PlanetStats wire shape."""
