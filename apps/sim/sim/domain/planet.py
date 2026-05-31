from __future__ import annotations

from .base import CelestialBody
from .presets import ATMO_BY_TYPE, BASE_HABITABILITY, CLIMATE_DELTA, PLANET_TYPES

# Orbit (semi-major axis) below which a close-in planet is treated as tidally
# locked — one hemisphere permanently faces its star.
TIDAL_LOCK_ORBIT = 14.0


class Planet(CelestialBody):
    """Orbits under gravity. derive_stats() mirrors the TS deriveStats() exactly."""

    def __init__(
        self,
        body_id: str,
        name: str,
        planet_type: str,
        radius: float,
        atmosphere: float = 1.0,
        clouds: bool = True,
        rings: bool = False,
        climate: str = "temperate",
        moons: int = 0,
        tilt: float = 0.0,
        orbit_radius: float = 5.0,
        eccentricity: float = 0.0,
        position: tuple[float, float, float] | None = None,
        velocity: tuple[float, float, float] | None = None,
    ) -> None:
        meta = PLANET_TYPES[planet_type]

        # Physics mass is normalized to 1.0 — orbital acceleration is mass-independent
        # (gravitational and inertial mass cancel, Galileo).  Earth-mass stats are
        # derived separately in derive_stats() from scene_radius.
        if position is None:
            position = (orbit_radius, 0.0, 0.0)
        if velocity is None:
            velocity = (0.0, 0.0, 0.0)

        super().__init__(
            body_id=body_id,
            name=name,
            mass=1.0,
            radius=radius,
            position=position,
            velocity=velocity,
            body_type=planet_type,
        )

        self.planet_type = planet_type
        self.scene_radius = radius
        self.atmosphere = atmosphere
        self.clouds = clouds
        self.rings = rings
        self.climate = climate
        self.num_moons = moons
        self.tilt = tilt
        self.orbit_radius = orbit_radius
        self.eccentricity = eccentricity
        self._meta = meta

    # The rng_seed=0.5 matches deriveStats() with a fixed midpoint — the Python
    # sim is the authoritative source so we use deterministic values from the config.
    def derive_stats(self) -> dict:
        t = self._meta
        r = self.scene_radius
        radius_km = round((r / 1.5) * 6371)
        mass_earth = round((r / 1.5) ** 3 * (0.226 if self.planet_type == "gas" else 1.0), 2)
        gravity = round(mass_earth / (r / 1.5) ** 2, 2)
        temp = int(t["base_temp"] + CLIMATE_DELTA[self.climate])
        hb, hv = BASE_HABITABILITY[self.planet_type]
        habitability = min(99, hb + hv // 2)

        magnetosphere = self._has_magnetosphere()

        return {
            "radius_km": radius_km,
            "mass": mass_earth,
            "gravity": gravity,
            "temp": temp,
            "day": round(8 + 0.5 * 30, 1),
            "moons": self.num_moons,
            "atmo": dict(ATMO_BY_TYPE[self.planet_type]),
            "habitability": habitability,
            "life": t["life"],
            "magnetosphere": magnetosphere,
            "radiation": self._radiation_level(magnetosphere),
            "temp_profile": self._temp_profile(temp),
        }

    def _has_magnetosphere(self) -> bool:
        """A molten-core dynamo: gas giants always; sizeable rocky worlds too."""
        if self.planet_type == "gas":
            return True
        if self.planet_type in ("terran", "ocean") and self.scene_radius >= 2.0:
            return True
        return False

    def _radiation_level(self, has_field: bool) -> str:
        """Cosmic/stellar radiation exposure, mitigated by a field + atmosphere."""
        score = 0
        if not has_field:
            score += 2
        if self.atmosphere < 0.5:
            score += 1
        if self.climate == "scorched":
            score += 1
        if self.planet_type in ("lava", "comet"):
            score += 1
        if score <= 1:
            return "Low"
        if score == 2:
            return "Moderate"
        if score == 3:
            return "High"
        return "Extreme"

    def _temp_profile(self, temp: int) -> str:
        """How heat is distributed across the surface."""
        if self.planet_type == "comet":
            return "Frozen nucleus; sublimates near stars"
        if self.orbit_radius < TIDAL_LOCK_ORBIT:
            return "Tidally locked — scorched dayside, frozen nightside"
        if temp > 60:
            return "Hot across the entire surface"
        if temp < -30:
            return "Frozen across the entire surface"
        return "Even, temperate distribution"

    def to_config(self) -> dict:
        return {
            "type": self.planet_type,
            "radius": self.scene_radius,
            "atmosphere": self.atmosphere,
            "clouds": self.clouds,
            "rings": self.rings,
            "climate": self.climate,
            "name": self.name,
            "moons": self.num_moons,
            "tilt": self.tilt,
            "orbit_radius": self.orbit_radius,
            "eccentricity": self.eccentricity,
        }
