import { env } from "@planet-forge/env/web";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
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

interface Impact {
	pos: [number, number, number];
	size: number;
}

interface SimState {
	addImpact: (id: string, pos: [number, number, number], size: number) => void;
	bodies: Record<string, CelestialBody>;
	connected: boolean;
	consumeEvents: () => QueuedEvent[];
	ephemerals: EphemeralBody[];
	events: QueuedEvent[];
	lastMsg: StreamMsg | null;
	// World-space comet impacts awaiting a planet to turn them into surface craters.
	pendingImpacts: Record<string, Impact[]>;
	positions: Record<string, [number, number, number]>;
	pushEvents: (events: SimEvent[]) => void;
	removeBody: (id: string) => void;
	setConnected: (c: boolean) => void;
	setEphemerals: (e: EphemeralBody[]) => void;
	setLastMsg: (msg: StreamMsg) => void;
	setPositions: (p: Record<string, [number, number, number]>) => void;
	takeImpacts: (id: string) => Impact[];
	upsertBody: (b: CelestialBody) => void;
}

let eventKeySeq = 0;

export const useSimStore = create<SimState>((set, get) => ({
	positions: {},
	bodies: {},
	ephemerals: [],
	events: [],
	pendingImpacts: {},
	connected: false,
	lastMsg: null,
	setLastMsg: (lastMsg) => set({ lastMsg }),
	addImpact: (id, pos, size) =>
		set((s) => ({
			pendingImpacts: {
				...s.pendingImpacts,
				[id]: [...(s.pendingImpacts[id] ?? []), { pos, size }],
			},
		})),
	takeImpacts: (id) => {
		const list = get().pendingImpacts[id];
		if (!list || list.length === 0) {
			return [];
		}
		set((s) => {
			const next = { ...s.pendingImpacts };
			delete next[id];
			return { pendingImpacts: next };
		});
		return list;
	},
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

// Route streamed events: queue them for visual effects, register comet impacts as
// pending craters, and refetch the REST body lists when a body was destroyed/grew.
function applyEvents(events: SimEvent[], queryClient: QueryClient): void {
	const store = useSimStore.getState();
	store.pushEvents(events);

	let bodiesChanged = false;
	for (const event of events) {
		if (
			event.type === "collision" ||
			event.type === "impact_star" ||
			event.type === "remnant"
		) {
			bodiesChanged = true;
		} else if (event.type === "impact" && event.data.target) {
			store.addImpact(
				event.data.target,
				event.pos,
				event.data.bodies?.[0]?.radius ?? 0.6
			);
		}
	}

	if (bodiesChanged) {
		queryClient.invalidateQueries({ queryKey: ["system"] });
		queryClient.invalidateQueries({ queryKey: ["systems"] });
	}
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
				store.setLastMsg(msg);
				store.setPositions(next);
				store.setEphemerals(msg.ephemerals ?? []);
				if (msg.events && msg.events.length > 0) {
					applyEvents(msg.events, queryClient);
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
