from __future__ import annotations

from typing import Any
from .system import SolarSystem

class Galaxy:
    """Manages multiple solar systems and coordinates simulation ticks."""

    def __init__(self) -> None:
        self.systems: dict[str, SolarSystem] = {}

    def add_system(self, system_id: str, system: SolarSystem) -> None:
        self.systems[system_id] = system

    def get_system(self, system_id: str) -> SolarSystem | None:
        return self.systems.get(system_id)

    def step(self, dt: float) -> None:
        for system in self.systems.values():
            system.step(dt)

    def drain_events(self) -> list[dict]:
        """Collect and clear queued cataclysm events from every system."""
        events: list[dict] = []
        for system in self.systems.values():
            if system.events:
                events.extend(system.events)
                system.events = []
        return events

    def stats(self) -> dict[str, Any]:
        """Consolidated stats for all systems in the galaxy."""
        total_systems = len(self.systems)
        total_planets = sum(len(sys.planets) for sys in self.systems.values())
        total_mass = sum(sum(p.derive_stats()["mass"] for p in sys.planets) for sys in self.systems.values())
        
        # Weighted habitability average
        all_planets = [p for sys in self.systems.values() for p in sys.planets]
        avg_hab = sum(p.derive_stats()["habitability"] for p in all_planets) / len(all_planets) if all_planets else 0.0

        return {
            "systems_count": total_systems,
            "planets_count": total_planets,
            "total_mass": round(total_mass, 2),
            "habitability": round(avg_hab, 1),
        }
