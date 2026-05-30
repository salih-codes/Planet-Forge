import { createFileRoute } from "@tanstack/react-router";
import { PlanetForge } from "@/features/planet-forge/planet-forge";

export const Route = createFileRoute("/")({
	component: PlanetForge,
});
