from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

PlanetType = Literal["terran", "ocean", "desert", "ice", "lava", "gas", "comet"]
Climate = Literal["frozen", "temperate", "tropical", "scorched"]

_camel_cfg = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class PlanetConfig(BaseModel):
    """Matches TS PlanetConfig exactly — camelCase on the wire."""

    model_config = _camel_cfg

    type: PlanetType
    radius: float
    atmosphere: float
    clouds: bool
    rings: bool
    climate: Climate
    name: str | None = None
    moons: int | None = None
    tilt: float | None = None
    orbit_radius: float | None = None  # → orbitRadius on the wire
    eccentricity: float | None = None  # → eccentricity on the wire


class PlanetStats(BaseModel):
    """Matches TS PlanetStats exactly — radiusKm on the wire."""

    model_config = _camel_cfg

    radius_km: int  # → radiusKm
    mass: float
    gravity: float
    temp: float
    day: float
    moons: int
    atmo: dict[str, float]
    habitability: float
    life: str
    magnetosphere: bool
    radiation: str
    temp_profile: str  # → tempProfile


class CelestialBodyDTO(BaseModel):
    model_config = _camel_cfg

    id: str
    name: str
    type: str
    config: PlanetConfig
    stats: PlanetStats
    position: tuple[float, float, float]


class SystemStats(BaseModel):
    count: int
    mass: float
    habitability: float


class LaunchCometRequest(BaseModel):
    """Fire a comet on an intercept course with a planet."""

    model_config = _camel_cfg

    target_id: str  # → targetId
    speed: float | None = None


class HurlRequest(BaseModel):
    """Hurl one planet toward another so their orbits collide."""

    model_config = _camel_cfg

    target_id: str  # → targetId
    speed: float | None = None
