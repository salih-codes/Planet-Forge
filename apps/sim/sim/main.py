from __future__ import annotations

import asyncio
import os
import time
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from sim.domain.galaxy import Galaxy
from sim.domain.planet import Planet
from sim.domain.star import Star
from sim.domain.system import SolarSystem
from sim.models import (
    CelestialBodyDTO,
    HurlRequest,
    LaunchCometRequest,
    PlanetConfig,
    PlanetStats,
    SystemStats,
)

SIM_HOST = os.environ.get("SIM_HOST", "127.0.0.1")
SIM_PORT = int(os.environ.get("SIM_PORT", "8000"))

FIXED_DT = 1 / 60
BROADCAST_HZ = 30


# ---------------------------------------------------------------------------
# Galaxy Seeder
# ---------------------------------------------------------------------------

# Golden angle — distributes seeded planets around their orbits so they don't
# all start lined up on the +X axis (which looked like a single conjunction).
_GOLDEN_ANGLE = 2.399963229728653


def _planet(
    type_: str,
    radius: float,
    atmosphere: float,
    clouds: bool,
    rings: bool,
    climate: str,
    name: str,
    moons: int = 0,
    orbit_radius: float | None = None,
    tilt: float = 0.0,
) -> dict:
    res = {
        "type": type_,
        "radius": radius,
        "atmosphere": atmosphere,
        "clouds": clouds,
        "rings": rings,
        "climate": climate,
        "name": name,
        "moons": moons,
        "tilt": tilt,
    }
    if orbit_radius is not None:
        res["orbit_radius"] = orbit_radius
    return res


def _comet(
    radius: float,
    atmosphere: float,
    orbit_radius: float,
    eccentricity: float,
    name: str,
) -> dict:
    return {
        "type": "comet",
        "radius": radius,
        "atmosphere": atmosphere,
        "clouds": False,
        "rings": False,
        "climate": "frozen",
        "orbit_radius": orbit_radius,
        "eccentricity": eccentricity,
        "name": name,
    }


def _seed_system(star: Star, planets: list[dict], comets: list[dict]) -> SolarSystem:
    """Build a system, auto-spacing the planets and appending eccentric comets.

    Planets omit ``orbit_radius`` so ``SolarSystem`` lays them out with guaranteed
    non-overlapping gaps (see ``_next_orbit_radius``). Comets keep an explicit
    semi-major axis + eccentricity so they sweep across the inner system.
    """
    sys = SolarSystem(star)
    for index, cfg in enumerate(planets):
        sys.add_planet({**cfg, "phase": index * _GOLDEN_ANGLE})
    for cfg in comets:
        sys.add_planet(cfg)
    return sys


def _seed_galaxy() -> Galaxy:
    galaxy = Galaxy()

    # 1. Sol System. Radii are Earth-relative (Earth = 1.5 units). Orbits use a
    # √(AU) compression: true distances (Neptune at 30× Earth) would put the outer
    # planets kilometres off-screen, so we preserve the *ordering and ratios* while
    # keeping the system flyable. Earth now sits well clear of the (dominant) Sun.
    # Axial tilts are the real values, in radians (Earth 23°, Uranus 98°, …).
    sys_sol = _seed_system(
        Star(
            body_id="sol", name="Sol", mass=1.989e30,
            radius=3.0, luminosity=1.0, color="#ffaa00",
        ),
        [
            _planet("desert", 0.57, 0.0, False, False, "scorched", "Mercury", 0, 70.0, 0.0),
            _planet("lava", 1.43, 1.4, True, False, "scorched", "Venus", 0, 82.0, 0.05),
            _planet("terran", 1.50, 1.0, True, False, "temperate", "Earth", 1, 90.0, 0.41),
            _planet("desert", 0.80, 0.4, False, False, "frozen", "Mars", 2, 103.0, 0.44),
            _planet("gas", 16.80, 1.3, True, True, "frozen", "Jupiter", 79, 159.0, 0.05),
            _planet("gas", 14.18, 1.2, True, True, "frozen", "Saturn", 82, 202.0, 0.47),
            _planet("ice", 6.00, 1.1, True, True, "frozen", "Uranus", 27, 271.0, 1.71),
            _planet("ocean", 5.82, 1.1, True, True, "frozen", "Neptune", 14, 330.0, 0.49),
        ],
        [_comet(0.6, 0.2, 200.0, 0.62, "Halley")],
    )
    galaxy.add_system("sol", sys_sol)

    # 2. Kepler-186 System (M-dwarf — really a very compact system; kept compact
    # here too, just spaced clear of its small red star).
    sys_kepler = _seed_system(
        Star(
            body_id="kepler_star", name="Kepler-186", mass=1.074e30,
            radius=1.56, luminosity=0.055, color="#ff3300",
        ),
        [
            _planet("desert", 1.65, 0.2, False, False, "scorched", "Kepler-186b", 0, 32.0, 0.05),
            _planet("desert", 1.80, 0.4, False, False, "temperate", "Kepler-186c", 0, 42.0, 0.2),
            _planet("ocean", 1.95, 0.9, True, False, "temperate", "Kepler-186d", 0, 54.0, 0.3),
            _planet("ice", 1.80, 0.7, True, False, "frozen", "Kepler-186e", 0, 68.0, 0.15),
            _planet("terran", 1.75, 1.0, True, False, "frozen", "Kepler-186f", 0, 84.0, 0.4),
        ],
        [_comet(0.7, 0.3, 95.0, 0.6, "Swift-Tuttle")],
    )
    galaxy.add_system("kepler", sys_kepler)

    # 3. Alpha Centauri System (bright primary — orbits start outside its larger disc).
    sys_alpha = _seed_system(
        Star(
            body_id="alpha_star", name="Alpha Centauri A", mass=2.188e30,
            radius=3.6, luminosity=1.5, color="#ffea88",
        ),
        [
            _planet("lava", 2.70, 0.8, True, False, "scorched", "Rigel-a", 0, 64.0, 0.1),
            _planet("terran", 3.45, 1.2, True, False, "temperate", "Rigel-b", 1, 78.0, 0.38),
            _planet("gas", 6.30, 1.4, True, True, "frozen", "Rigel-c", 4, 110.0, 0.05),
        ],
        [],
    )
    galaxy.add_system("alpha", sys_alpha)

    return galaxy


galaxy = _seed_galaxy()
connections: set[WebSocket] = set()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _planet_to_dto(planet: Planet) -> CelestialBodyDTO:
    p = planet.position
    return CelestialBodyDTO(
        id=planet.id,
        name=planet.name,
        type=planet.planet_type,
        config=PlanetConfig(**planet.to_config()),
        stats=PlanetStats(**planet.derive_stats()),
        position=(float(p[0]), float(p[1]), float(p[2])),
    )


def _position_snapshot() -> dict[str, Any]:
    # Flatten all body positions in the galaxy for simple client-side mapping.
    # Transient bodies (ambient fly-bys + launched comets) are streamed too, plus
    # an `ephemerals` descriptor list so the client knows how to render them
    # (they are intentionally absent from the cached REST body list / stats).
    bodies: list[dict[str, Any]] = []
    ephemerals: list[dict[str, Any]] = []
    for sys in galaxy.systems.values():
        for p in sys.planets:
            bodies.append({
                "id": p.id,
                "p": [float(p.position[0]), float(p.position[1]), float(p.position[2])],
            })
        for t in sys.transients:
            bodies.append({
                "id": t.id,
                "p": [float(t.position[0]), float(t.position[1]), float(t.position[2])],
            })
            ephemerals.append({
                "id": t.id,
                "type": t.planet_type,
                "radius": t.scene_radius,
            })
    return {
        "t": next(iter(galaxy.systems.values())).sim_time,
        "bodies": bodies,
        "ephemerals": ephemerals,
        "events": [],
    }


# ---------------------------------------------------------------------------
# Background tasks
# ---------------------------------------------------------------------------

async def _sim_loop() -> None:
    last = time.monotonic()
    while True:
        await asyncio.sleep(FIXED_DT)
        now = time.monotonic()
        galaxy.step(now - last)
        last = now


async def _broadcast_loop() -> None:
    interval = 1 / BROADCAST_HZ
    while True:
        await asyncio.sleep(interval)
        events = galaxy.drain_events()
        if not connections:
            continue
        payload = _position_snapshot()
        payload["events"] = events
        dead: set[WebSocket] = set()
        for ws in list(connections):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.add(ws)
        connections.difference_update(dead)


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(_: FastAPI):
    asyncio.create_task(_sim_loop())
    asyncio.create_task(_broadcast_loop())
    yield


app = FastAPI(title="Planet Forge Simulation", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "tauri://localhost",
        "http://tauri.localhost",
        "https://tauri.localhost",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# REST endpoints
# ---------------------------------------------------------------------------

@app.get("/systems")
async def get_systems() -> dict[str, Any]:
    return {
        "systems": [
            {
                "id": sys_id,
                "name": f"{sys.star.name} System",
                "star": {
                    "id": sys.star.id,
                    "name": sys.star.name,
                    "mass": sys.star.mass,
                    "radius": sys.star.radius,
                    "luminosity": sys.star.luminosity,
                    "color": sys.star.color,
                },
                "planetsCount": len(sys.planets),
                "stats": sys.stats()
            }
            for sys_id, sys in galaxy.systems.items()
        ]
    }


@app.get("/systems/{system_id}")
async def get_system_bodies(system_id: str) -> dict[str, Any]:
    sys = galaxy.get_system(system_id)
    if not sys:
        raise HTTPException(status_code=404, detail="System not found")
    bodies = [_planet_to_dto(p).model_dump(by_alias=True) for p in sys.planets]
    return {"bodies": bodies}


@app.get("/systems/{system_id}/stats", response_model=SystemStats)
async def get_system_stats(system_id: str) -> SystemStats:
    sys = galaxy.get_system(system_id)
    if not sys:
        raise HTTPException(status_code=404, detail="System not found")
    return SystemStats(**sys.stats())


@app.post("/systems/{system_id}/planets")
async def create_system_planet(system_id: str, config: PlanetConfig) -> dict[str, Any]:
    sys = galaxy.get_system(system_id)
    if not sys:
        raise HTTPException(status_code=404, detail="System not found")
    planet = sys.add_planet(config.model_dump(by_alias=False))
    return _planet_to_dto(planet).model_dump(by_alias=True)


@app.delete("/systems/{system_id}/planets/{planet_id}")
async def delete_system_planet(system_id: str, planet_id: str) -> dict[str, bool]:
    sys = galaxy.get_system(system_id)
    if not sys:
        raise HTTPException(status_code=404, detail="System not found")
    sys.remove_planet(planet_id)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Cataclysm endpoints
# ---------------------------------------------------------------------------

@app.post("/systems/{system_id}/supernova")
async def trigger_supernova(system_id: str) -> dict[str, bool]:
    sys = galaxy.get_system(system_id)
    if not sys:
        raise HTTPException(status_code=404, detail="System not found")
    return {"ok": True, "triggered": sys.trigger_supernova()}


@app.post("/systems/{system_id}/comets/launch")
async def launch_comet(system_id: str, req: LaunchCometRequest) -> dict[str, Any]:
    sys = galaxy.get_system(system_id)
    if not sys:
        raise HTTPException(status_code=404, detail="System not found")
    comet = sys.launch_comet(req.target_id, req.speed if req.speed is not None else 14.0)
    if comet is None:
        raise HTTPException(status_code=404, detail="Target planet not found")
    return {"ok": True, "id": comet.id}


@app.post("/systems/{system_id}/planets/{planet_id}/hurl")
async def hurl_planet(system_id: str, planet_id: str, req: HurlRequest) -> dict[str, bool]:
    sys = galaxy.get_system(system_id)
    if not sys:
        raise HTTPException(status_code=404, detail="System not found")
    ok = sys.hurl_planet(planet_id, req.target_id, req.speed if req.speed is not None else 6.0)
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid planet or target")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Legacy REST endpoints (for backward compatibility)
# ---------------------------------------------------------------------------

@app.get("/system")
async def get_legacy_system() -> dict[str, Any]:
    sys = galaxy.get_system("sol")
    if not sys:
        raise HTTPException(status_code=404, detail="System not found")
    bodies = [_planet_to_dto(p).model_dump(by_alias=True) for p in sys.planets]
    return {"bodies": bodies}


@app.get("/system/stats", response_model=SystemStats)
async def get_legacy_system_stats() -> SystemStats:
    sys = galaxy.get_system("sol")
    if not sys:
        raise HTTPException(status_code=404, detail="System not found")
    return SystemStats(**sys.stats())


@app.post("/planets")
async def create_legacy_planet(config: PlanetConfig) -> dict[str, Any]:
    sys = galaxy.get_system("sol")
    if not sys:
        raise HTTPException(status_code=404, detail="System not found")
    planet = sys.add_planet(config.model_dump(by_alias=False))
    return _planet_to_dto(planet).model_dump(by_alias=True)


@app.delete("/planets/{planet_id}")
async def delete_legacy_planet(planet_id: str) -> dict[str, bool]:
    for sys in galaxy.systems.values():
        for p in sys.planets:
            if p.id == planet_id:
                sys.remove_planet(planet_id)
                return {"ok": True}
    raise HTTPException(status_code=404, detail="Planet not found")


# ---------------------------------------------------------------------------
# WebSocket
# ---------------------------------------------------------------------------

@app.websocket("/stream")
async def websocket_stream(websocket: WebSocket) -> None:
    await websocket.accept()
    connections.add(websocket)
    try:
        await websocket.send_json(_position_snapshot())
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        connections.discard(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=SIM_HOST, port=SIM_PORT)
