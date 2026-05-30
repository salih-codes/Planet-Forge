import { env } from "@planet-forge/env/web";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
	CelestialBody,
	PlanetConfig,
	SystemInfo,
	SystemStats,
} from "./types";

const getSimPort = () => {
	// @ts-expect-error
	return window.__SIM_PORT__ ?? 8000;
};

// Resolved lazily (per request) so a port injected by the Tauri shell after this
// module first loads is always honoured, rather than captured once at import time.
const simBase = () => env.VITE_SIM_HTTP ?? `http://127.0.0.1:${getSimPort()}`;

async function http<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(`${simBase()}${path}`, {
		headers: { "Content-Type": "application/json" },
		...init,
	});
	if (!res.ok) {
		throw new Error(`${res.status} ${res.statusText}`);
	}
	return res.json() as Promise<T>;
}

// The sim runs as a sidecar that may not be ready at first paint — retry with
// a capped backoff so the system/body lists populate as soon as it comes up.
const RETRY_LIMIT = 8;
const retryDelay = (attempt: number) => Math.min(400 * 2 ** attempt, 4000);

export function useSystems() {
	return useQuery({
		queryKey: ["systems"],
		queryFn: () => http<{ systems: SystemInfo[] }>("/systems"),
		staleTime: Number.POSITIVE_INFINITY,
		retry: RETRY_LIMIT,
		retryDelay,
	});
}

export function useSystem(systemId: string) {
	return useQuery({
		queryKey: ["system", systemId],
		queryFn: () => http<{ bodies: CelestialBody[] }>(`/systems/${systemId}`),
		staleTime: Number.POSITIVE_INFINITY,
		retry: RETRY_LIMIT,
		retryDelay,
	});
}

export function useSystemStats(systemId: string) {
	return useQuery({
		queryKey: ["system", "stats", systemId],
		queryFn: () => http<SystemStats>(`/systems/${systemId}/stats`),
		refetchInterval: 2000,
		retry: false,
	});
}

export function useCreatePlanet(systemId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (config: PlanetConfig) =>
			http<CelestialBody>(`/systems/${systemId}/planets`, {
				method: "POST",
				body: JSON.stringify(config),
			}),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["system", systemId] });
			qc.invalidateQueries({ queryKey: ["systems"] });
		},
	});
}

export function useDeletePlanet(systemId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			http<{ ok: true }>(`/systems/${systemId}/planets/${id}`, {
				method: "DELETE",
			}),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["system", systemId] });
			qc.invalidateQueries({ queryKey: ["systems"] });
		},
	});
}

export function useSupernova(systemId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () =>
			http<{ ok: true; triggered: boolean }>(`/systems/${systemId}/supernova`, {
				method: "POST",
			}),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["systems"] });
			// Pick up the collapsed remnant (smaller radius, blue-white colour)
			// once the explosion sequence has finished server-side.
			setTimeout(() => {
				qc.invalidateQueries({ queryKey: ["systems"] });
			}, 3200);
		},
	});
}

export function useLaunchComet(systemId: string) {
	return useMutation({
		mutationFn: (targetId: string) =>
			http<{ ok: true; id: string }>(`/systems/${systemId}/comets/launch`, {
				method: "POST",
				body: JSON.stringify({ targetId }),
			}),
	});
}

export function useHurlPlanet(systemId: string) {
	return useMutation({
		mutationFn: ({
			planetId,
			targetId,
		}: {
			planetId: string;
			targetId: string;
		}) =>
			http<{ ok: true }>(`/systems/${systemId}/planets/${planetId}/hurl`, {
				method: "POST",
				body: JSON.stringify({ targetId }),
			}),
	});
}
