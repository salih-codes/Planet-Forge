import { env } from "@planet-forge/env/web";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { create } from "zustand";
import type { CelestialBody, EphemeralBody, SimEvent } from "./types";

const getSimPort = () => {
	// @ts-expect-error
	return window.__SIM_PORT__ ?? 8000;
};

// Resolved lazily (at connect time) so a port injected by the Tauri shell after
// this module first loads is always honoured.
const wsUrl = () => env.VITE_SIM_WS ?? `ws://127.0.0.1:${getSimPort()}/stream`;

interface QueuedEvent {
	event: SimEvent;
	key: number;
}

interface SimState {
	bodies: Record<string, CelestialBody>;
	connected: boolean;
	consumeEvents: () => QueuedEvent[];
	ephemerals: EphemeralBody[];
	events: QueuedEvent[];
	positions: Record<string, [number, number, number]>;
	pushEvents: (events: SimEvent[]) => void;
	removeBody: (id: string) => void;
	setConnected: (c: boolean) => void;
	setEphemerals: (e: EphemeralBody[]) => void;
	setPositions: (p: Record<string, [number, number, number]>) => void;
	upsertBody: (b: CelestialBody) => void;
}

let eventKeySeq = 0;

export const useSimStore = create<SimState>((set, get) => ({
	positions: {},
	bodies: {},
	ephemerals: [],
	events: [],
	connected: false,
	setPositions: (positions) => set({ positions }),
	setEphemerals: (ephemerals) => set({ ephemerals }),
	pushEvents: (incoming) => {
		if (incoming.length === 0) {
			return;
		}
		const queued = incoming.map((event) => ({ event, key: eventKeySeq++ }));
		set((s) => ({ events: [...s.events, ...queued] }));
	},
	consumeEvents: () => {
		const current = get().events;
		if (current.length === 0) {
			return current;
		}
		set({ events: [] });
		return current;
	},
	upsertBody: (b) => set((s) => ({ bodies: { ...s.bodies, [b.id]: b } })),
	removeBody: (id) =>
		set((s) => {
			const bodies = { ...s.bodies };
			const positions = { ...s.positions };
			delete bodies[id];
			delete positions[id];
			return { bodies, positions };
		}),
	setConnected: (connected) => set({ connected }),
}));

interface StreamMsg {
	bodies: { id: string; p: [number, number, number] }[];
	ephemerals?: EphemeralBody[];
	events?: SimEvent[];
	t: number;
}

export function useSimulationSocket() {
	const wsRef = useRef<WebSocket | null>(null);
	const retryRef = useRef(0);
	const queryClient = useQueryClient();

	useEffect(() => {
		let alive = true;
		let timer: ReturnType<typeof setTimeout>;

		const connect = () => {
			if (!alive) {
				return;
			}
			const ws = new WebSocket(wsUrl());
			wsRef.current = ws;

			ws.onopen = () => {
				retryRef.current = 0;
				useSimStore.getState().setConnected(true);
				// The socket opening is the reliable "sim is alive" signal — refetch
				// the REST-backed system/body lists in case the initial load raced
				// the sidecar startup and failed.
				queryClient.invalidateQueries({ queryKey: ["systems"] });
				queryClient.invalidateQueries({ queryKey: ["system"] });
			};

			ws.onmessage = (ev) => {
				const msg: StreamMsg = JSON.parse(ev.data as string);
				const next: Record<string, [number, number, number]> = {};
				for (const b of msg.bodies) {
					next[b.id] = b.p;
				}
				const store = useSimStore.getState();
				store.setPositions(next);
				store.setEphemerals(msg.ephemerals ?? []);
				if (msg.events && msg.events.length > 0) {
					store.pushEvents(msg.events);
				}
			};

			ws.onclose = () => {
				useSimStore.getState().setConnected(false);
				if (!alive) {
					return;
				}
				const delay = Math.min(1000 * 2 ** retryRef.current++, 8000);
				timer = setTimeout(connect, delay);
			};

			ws.onerror = () => ws.close();
		};

		connect();
		return () => {
			alive = false;
			clearTimeout(timer);
			wsRef.current?.close();
		};
	}, [queryClient]);
}
