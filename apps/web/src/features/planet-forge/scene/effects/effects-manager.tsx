import { useFrame } from "@react-three/fiber";
import { useCallback, useState } from "react";
import type { SimEvent } from "../../lib/types";
import { useSimStore } from "../../lib/use-simulation-socket";
import { DebrisBurst } from "./explosion";
import { SupernovaEffect } from "./supernova";

interface ActiveEffect {
	event: SimEvent;
	key: number;
}

/**
 * Drains cataclysm events from the sim store each frame and mounts a keyed,
 * self-expiring visual for each. `remnant` events carry no visual (the star
 * collapse is reflected via a systems refetch) so they are ignored here.
 */
export function EffectsManager() {
	const [active, setActive] = useState<ActiveEffect[]>([]);

	const remove = useCallback((key: number) => {
		setActive((list) => list.filter((e) => e.key !== key));
	}, []);

	useFrame(() => {
		const incoming = useSimStore.getState().consumeEvents();
		if (incoming.length === 0) {
			return;
		}
		const visuals = incoming
			.filter((q) => q.event.type !== "remnant")
			.map((q) => ({ event: q.event, key: q.key }));
		if (visuals.length > 0) {
			setActive((list) => [...list, ...visuals]);
		}
	});

	return (
		<>
			{active.map(({ event, key }) =>
				event.type === "supernova" ? (
					<SupernovaEffect event={event} key={key} onDone={() => remove(key)} />
				) : (
					<DebrisBurst event={event} key={key} onDone={() => remove(key)} />
				)
			)}
		</>
	);
}
