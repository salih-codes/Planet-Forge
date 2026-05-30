import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import type { EphemeralBody } from "../lib/types";
import { useSimStore } from "../lib/use-simulation-socket";
import { CometNucleus } from "./comet-body";
import { CometTrail } from "./comet-trail";

function AmbientComet({ body }: { body: EphemeralBody }) {
	const group = useRef<Group>(null);

	useFrame(() => {
		const p = useSimStore.getState().positions[body.id];
		if (p && group.current) {
			group.current.position.set(p[0], p[1], p[2]);
		}
	});

	return (
		<>
			<group ref={group}>
				<CometNucleus radius={body.radius} />
			</group>
			<CometTrail cometId={body.id} nucleusRadius={body.radius} />
		</>
	);
}

/**
 * Renders sim-spawned transient comets (random fly-bys + launched impactors)
 * streamed over the socket as ephemerals. They are visual-only — not selectable
 * and absent from the REST body list — but fully positioned by the sim.
 */
export function AmbientComets() {
	const ephemerals = useSimStore((s) => s.ephemerals);
	return (
		<>
			{ephemerals.map((body) => (
				<AmbientComet body={body} key={body.id} />
			))}
		</>
	);
}
