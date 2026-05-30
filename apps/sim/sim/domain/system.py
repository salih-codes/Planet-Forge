from __future__ import annotations

import math
import random
import uuid

import numpy as np

from .base import CelestialBody
from .planet import Planet
from .star import Star

# Game-scaled gravitational constant: T ≈ 60 s for a circular orbit at r = 4
# scene-units when M_star_norm = 1.  Derived from Kepler's 3rd law:
#   G = 4π² r³ / T²   with r=4, T=60 → G ≈ 0.7018
G = 4 * math.pi ** 2 * 4 ** 3 / 60 ** 2  # ≈ 0.7018  scene-unit³ / (norm_mass · s²)
M_STAR_NORM = 1.0  # normalized stellar mass (all planet masses also set to 1.0)
EPSILON = 0.1  # softening radius (scene units) — prevents r=0 singularity

# Orbit layout — guarantees visible gaps between adjacent bodies.
ORBIT_PADDING = 2.4  # extra scene-units of clear space between body surfaces
MIN_ORBIT = 3.5  # innermost orbit, clears the (enlarged) star

# Ambient fly-through comets
AMBIENT_BOUNDS = 72.0  # spawn shell radius / cull distance
MAX_AMBIENT = 3
AMBIENT_MIN_GAP = 8.0
AMBIENT_MAX_GAP = 20.0

# Supernova
SHOCK_SPEED = 9.0  # scene-units / s the blast front travels outward
EXPAND_DURATION = 2.6  # seconds the shell expands before the star collapses
BLAST_IMPULSE = 36.0  # outward acceleration applied to ejected planets


def _circular_speed(orbit_radius: float, star_mass_norm: float = 1.0) -> float:
    """Tangential speed for a circular orbit at orbit_radius (scene-units/s)."""
    return math.sqrt(G * star_mass_norm / orbit_radius)


def _elliptical_speed(a: float, e: float, star_mass_norm: float = 1.0) -> float:
    """Speed at perihelion for an elliptical orbit (semi-major axis a, eccentricity e)."""
    r_p = a * (1.0 - e)
    return math.sqrt(G * star_mass_norm * (1.0 + e) / max(r_p, 0.1))


def _unit(vec: np.ndarray) -> np.ndarray:
    n = float(np.linalg.norm(vec))
    return vec / n if n > 1e-9 else np.array([1.0, 0.0, 0.0])


class SolarSystem:
    """Manages the star + planets and drives the physics loop."""

    def __init__(self, star: Star) -> None:
        self.star = star
        self.planets: list[Planet] = []
        # Transient bodies (ambient fly-bys + launched comets) — simulated and
        # broadcast, but kept out of the REST body list / stats so the HUD stays clean.
        self.transients: list[Planet] = []
        self.sim_time: float = 0.0
        # Cataclysm events drained by the broadcaster each tick.
        self.events: list[dict] = []
        # Periodic background comets — disabled in deterministic tests.
        self.ambient_enabled: bool = True
        self._ambient_timer: float = random.uniform(AMBIENT_MIN_GAP, AMBIENT_MAX_GAP)

    # ------------------------------------------------------------------ bodies

    def _get_star_mass_norm(self) -> float:
        return self.star.mass / 1.989e30 if self.star.mass > 1e10 else self.star.mass

    def add_planet(self, config: dict) -> Planet:
        planet_id = str(uuid.uuid4())[:8]
        new_radius = float(config.get("radius", 3.0))
        raw = config.get("orbit_radius") or self._next_orbit_radius(new_radius)
        orbit_radius: float = float(raw)

        star_mass_norm = self._get_star_mass_norm()
        is_comet = config.get("type") == "comet"
        ecc = float(config.get("eccentricity") or (0.82 if is_comet else 0.0))
        phase = float(config.get("phase") or random.uniform(0.0, math.tau))

        if is_comet:
            # Highly elliptical orbit starting at perihelion (closest to sun).
            r_p = orbit_radius * (1.0 - ecc)
            speed = _elliptical_speed(orbit_radius, ecc, star_mass_norm)
            pos = (r_p * math.cos(phase), 0.0, r_p * math.sin(phase))
        else:
            speed = _circular_speed(orbit_radius, star_mass_norm)
            pos = (orbit_radius * math.cos(phase), 0.0, orbit_radius * math.sin(phase))

        # Tangential velocity (counter-clockwise in the X-Z plane).
        vel = (-speed * math.sin(phase), 0.0, speed * math.cos(phase))

        planet = Planet(
            body_id=planet_id,
            name=config.get("name") or f"Planet-{planet_id}",
            planet_type=config["type"],
            radius=new_radius,
            atmosphere=float(config.get("atmosphere", 1.0)),
            clouds=bool(config.get("clouds", True)),
            rings=bool(config.get("rings", False)),
            climate=config.get("climate", "temperate"),
            moons=int(config.get("moons") or 0),
            tilt=float(config.get("tilt") or 0.0),
            orbit_radius=orbit_radius,
            eccentricity=ecc,
            position=pos,
            velocity=vel,
        )
        self.planets.append(planet)
        return planet

    def remove_planet(self, planet_id: str) -> None:
        self.planets = [p for p in self.planets if p.id != planet_id]

    def bodies(self) -> list[CelestialBody]:
        return [self.star, *self.planets]

    def stats(self) -> dict:
        if not self.planets:
            return {"count": 0, "mass": 0.0, "habitability": 0.0}
        total_mass = sum(p.derive_stats()["mass"] for p in self.planets)
        avg_hab = sum(p.derive_stats()["habitability"] for p in self.planets) / len(self.planets)
        return {
            "count": len(self.planets),
            "mass": round(total_mass, 2),
            "habitability": round(avg_hab, 1),
        }

    # --------------------------------------------------------------- physics

    def _gravitate(self, body: Planet, dt: float) -> None:
        """Symplectic (semi-implicit) Euler step under the star's gravity."""
        sep = self.star.position - body.position
        r_bare = float(np.linalg.norm(sep))
        r_soft = r_bare + EPSILON
        unit_vec = sep / max(r_bare, 1e-9)
        a = (G * self._get_star_mass_norm() / r_soft ** 2) * unit_vec
        body.velocity += a * dt
        body.position += body.velocity * dt

    def step(self, dt: float) -> None:
        """Fixed-timestep physics tick: gravity, supernova, collisions, ambient spawns."""
        self._update_supernova(dt)

        for planet in self.planets:
            self._gravitate(planet, dt)
        for comet in self.transients:
            self._gravitate(comet, dt)

        self._detect_collisions()
        self._cull_transients()
        self._spawn_ambient(dt)

        self.sim_time += dt

    # ------------------------------------------------------------ collisions

    def _detect_collisions(self) -> None:
        bodies: list[Planet] = [*self.planets, *self.transients]
        removed: set[str] = set()
        n = len(bodies)

        for i in range(n):
            a = bodies[i]
            if a.id in removed:
                continue
            for j in range(i + 1, n):
                b = bodies[j]
                if b.id in removed:
                    continue
                dist = float(np.linalg.norm(a.position - b.position))
                if dist < a.scene_radius + b.scene_radius:
                    self._resolve_collision(a, b, removed)

        # Bodies plunging into the star (destroyed once roughly half-submerged,
        # so a large planet on a tight-but-valid orbit can still graze it).
        for body in bodies:
            if body.id in removed:
                continue
            dist = float(np.linalg.norm(body.position - self.star.position))
            if dist < self.star.radius + body.scene_radius * 0.5:
                self._emit_star_impact(body)
                removed.add(body.id)

        if removed:
            self.planets = [p for p in self.planets if p.id not in removed]
            self.transients = [t for t in self.transients if t.id not in removed]

    def _resolve_collision(self, a: Planet, b: Planet, removed: set[str]) -> None:
        rel_speed = float(np.linalg.norm(a.velocity - b.velocity))
        midpoint = (a.position + b.position) * 0.5
        ratio = a.scene_radius / max(b.scene_radius, 1e-6)

        self.events.append({
            "type": "collision",
            "pos": [float(midpoint[0]), float(midpoint[1]), float(midpoint[2])],
            "data": {
                "energy": round(rel_speed, 2),
                "bodies": [
                    {"type": a.planet_type, "radius": a.scene_radius},
                    {"type": b.planet_type, "radius": b.scene_radius},
                ],
            },
        })

        # Massive body absorbs the smaller one; comparable bodies annihilate each other.
        if ratio > 2.0:
            a.scene_radius = (a.scene_radius ** 3 + b.scene_radius ** 3) ** (1 / 3)
            a.radius = a.scene_radius
            removed.add(b.id)
        elif ratio < 0.5:
            b.scene_radius = (a.scene_radius ** 3 + b.scene_radius ** 3) ** (1 / 3)
            b.radius = b.scene_radius
            removed.add(a.id)
        else:
            removed.add(a.id)
            removed.add(b.id)

    def _emit_star_impact(self, body: Planet) -> None:
        self.events.append({
            "type": "impact_star",
            "pos": [float(body.position[0]), float(body.position[1]), float(body.position[2])],
            "data": {"bodies": [{"type": body.planet_type, "radius": body.scene_radius}]},
        })

    # ------------------------------------------------------------- supernova

    def trigger_supernova(self) -> bool:
        return self.star.trigger_supernova()

    def _update_supernova(self, dt: float) -> None:
        star = self.star
        if star.phase == "stable":
            return

        if star.phase == "expanding":
            if star.phase_time == 0.0:
                self.events.append({
                    "type": "supernova",
                    "pos": [0.0, 0.0, 0.0],
                    "data": {
                        "baseRadius": star.base_radius,
                        "color": star.color,
                        "shockSpeed": SHOCK_SPEED,
                        "duration": EXPAND_DURATION,
                    },
                })

            star.phase_time += dt
            shock_r = star.phase_time * SHOCK_SPEED
            vaporize_r = star.base_radius * 2.6
            removed: set[str] = set()

            for body in [*self.planets, *self.transients]:
                r = float(np.linalg.norm(body.position))
                if r > shock_r:
                    continue
                if r < vaporize_r:
                    removed.add(body.id)
                else:
                    # Eject outward on the blast front.
                    body.velocity += _unit(body.position) * BLAST_IMPULSE * dt

            if removed:
                self.planets = [p for p in self.planets if p.id not in removed]
                self.transients = [t for t in self.transients if t.id not in removed]

            if star.phase_time >= EXPAND_DURATION:
                star.collapse_to_remnant()
                self.events.append({
                    "type": "remnant",
                    "pos": [0.0, 0.0, 0.0],
                    "data": {"radius": star.radius, "color": star.color},
                })

    # ------------------------------------------------------- comet / hurl

    def launch_comet(self, target_id: str, speed: float = 14.0) -> Planet | None:
        target = next((p for p in self.planets if p.id == target_id), None)
        if target is None:
            return None

        # Approach from a random direction well outside the target's orbit.
        approach = _unit(np.array([
            random.uniform(-1.0, 1.0),
            random.uniform(-0.25, 0.25),
            random.uniform(-1.0, 1.0),
        ]))
        start = target.position - approach * 26.0
        vel = _unit(target.position - start) * speed

        comet = Planet(
            body_id=f"c{uuid.uuid4().hex[:6]}",
            name="Impactor",
            planet_type="comet",
            radius=random.uniform(0.5, 0.9),
            atmosphere=0.3,
            clouds=False,
            rings=False,
            climate="frozen",
            position=(float(start[0]), float(start[1]), float(start[2])),
            velocity=(float(vel[0]), float(vel[1]), float(vel[2])),
        )
        self.transients.append(comet)
        return comet

    def hurl_planet(self, planet_id: str, target_id: str, speed: float = 6.0) -> bool:
        mover = next((p for p in self.planets if p.id == planet_id), None)
        target = next((p for p in self.planets if p.id == target_id), None)
        if mover is None or target is None or mover.id == target.id:
            return False
        mover.velocity = _unit(target.position - mover.position) * speed
        return True

    # --------------------------------------------------------- ambient comets

    def _spawn_ambient(self, dt: float) -> None:
        if not self.ambient_enabled:
            return
        self._ambient_timer -= dt
        if self._ambient_timer > 0 or len(self.transients) >= MAX_AMBIENT:
            return
        self._ambient_timer = random.uniform(AMBIENT_MIN_GAP, AMBIENT_MAX_GAP)
        self._spawn_flythrough_comet()

    def _spawn_flythrough_comet(self) -> None:
        theta = random.uniform(0.0, math.tau)
        entry = np.array([
            AMBIENT_BOUNDS * math.cos(theta),
            random.uniform(-10.0, 10.0),
            AMBIENT_BOUNDS * math.sin(theta),
        ])
        # Aim near (but not exactly at) the star so it sweeps through the system.
        aim = np.array([
            random.uniform(-8.0, 8.0),
            random.uniform(-3.0, 3.0),
            random.uniform(-8.0, 8.0),
        ])
        vel = _unit(aim - entry) * random.uniform(6.5, 10.0)

        comet = Planet(
            body_id=f"a{uuid.uuid4().hex[:6]}",
            name="Wanderer",
            planet_type="comet",
            radius=random.uniform(0.35, 0.7),
            atmosphere=0.25,
            clouds=False,
            rings=False,
            climate="frozen",
            position=(float(entry[0]), float(entry[1]), float(entry[2])),
            velocity=(float(vel[0]), float(vel[1]), float(vel[2])),
        )
        self.transients.append(comet)

    def _cull_transients(self) -> None:
        self.transients = [
            t for t in self.transients
            if float(np.linalg.norm(t.position)) < AMBIENT_BOUNDS * 1.6
        ]

    # ----------------------------------------------------------- orbit layout

    def _next_orbit_radius(self, new_radius: float) -> float:
        if not self.planets:
            return MIN_ORBIT

        ordered = sorted(self.planets, key=lambda p: p.orbit_radius)

        # Space before the innermost planet.
        first = ordered[0]
        if first.orbit_radius - MIN_ORBIT >= new_radius + first.scene_radius + ORBIT_PADDING:
            return MIN_ORBIT

        # Gaps between successive planets.
        for curr, nxt in zip(ordered, ordered[1:]):
            candidate = curr.orbit_radius + curr.scene_radius + new_radius + ORBIT_PADDING
            if nxt.orbit_radius - candidate >= new_radius + nxt.scene_radius + ORBIT_PADDING:
                return round(candidate, 2)

        # Otherwise append beyond the outermost planet.
        last = ordered[-1]
        return round(last.orbit_radius + last.scene_radius + new_radius + ORBIT_PADDING, 2)
