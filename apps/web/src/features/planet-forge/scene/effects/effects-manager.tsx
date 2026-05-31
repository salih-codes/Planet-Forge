import { useFrame } from "@react-three/fiber";
import { useCallback, useState } from "react";
import type { SimEvent } from "../../lib/types";
import { useSimStore } from "../../lib/use-simulation-socket";
import { DebrisBurst, DyingPlanet } from "./explosion";
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
			{active.map(({ event, key }) => {
				if (event.type === "supernova") {
					return (
						<SupernovaEffect
							event={event}
							key={key}
							onDone={() => remove(key)}
						/>
					);
				}

				const burst = (
					<DebrisBurst event={event} key={key} onDone={() => remove(key)} />
				);

				// Render glowing, shrinking dying bodies for collision events
				// biome-ignore lint/suspicious/noExplicitAny: outcome & body lists are untyped custom event metadata
				const data = event.data as any;
				if (event.type === "collision" && data) {
					const outcome = data.outcome;
					const dyingList: {
						pos: [number, number, number];
						radius: number;
						type: string;
					}[] = [];
					if (outcome === "absorption" && data.absorbed) {
						dyingList.push(data.absorbed);
					} else if (outcome === "destruction" && data.destroyed) {
						dyingList.push(...data.destroyed);
					}

					if (dyingList.length > 0) {
						return (
							<group key={key}>
								{burst}
								{dyingList.map((body, idx) => (
									<DyingPlanet
										// biome-ignore lint/suspicious/noArrayIndexKey: dying list is static for this event key
										key={idx}
										onDone={() => undefined}
										pos={body.pos}
										radius={body.radius}
										type={body.type}
									/>
								))}
							</group>
						);
					}
				}

				return burst;
			})}
		</>
	);
}
