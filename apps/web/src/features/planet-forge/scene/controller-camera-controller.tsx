import { useFrame, useThree } from "@react-three/fiber";
import type React from "react";
import { useRef } from "react";
import type { Camera } from "three";
import { Spherical, Vector3 } from "three";
import type { CelestialBody, SystemInfo } from "../lib/types";
import { useGamepadStore } from "../lib/use-gamepad";

const DEADZONE = 0.18;
const ORBIT_SPEED = 1.8;
const PAN_SPEED_FACTOR = 0.0018;
const ZOOM_SPEED = 90;
const MIN_DISTANCE = 2;
const MAX_DISTANCE = 1200;
const MIN_PHI = 0.05;
const MAX_PHI = Math.PI - 0.05;

function dead(v: number): number {
	return Math.abs(v) < DEADZONE ? 0 : v;
}

// biome-ignore lint/suspicious/noExplicitAny: OrbitControls ref is untyped in drei
type Controls = any;

function readSticks(gp: Gamepad): { rx: number; ry: number } {
	return {
		rx: dead(gp.axes[2] ?? 0),
		ry: dead(gp.axes[3] ?? 0),
	};
}

function readSkate(gp: Gamepad): { lx: number; ly: number } {
	return {
		lx: dead(gp.axes[0] ?? 0),
		ly: dead(gp.axes[1] ?? 0),
	};
}

/** Right stick → orbit camera around its target using spherical coordinates */
function applyOrbit(
	camera: Camera,
	controls: Controls,
	rx: number,
	ry: number,
	dt: number,
	sph: Spherical,
	off: Vector3
): void {
	off.copy(camera.position).sub(controls.target);
	sph.setFromVector3(off);
	sph.theta -= rx * ORBIT_SPEED * dt;
	sph.phi = Math.max(
		MIN_PHI,
		Math.min(MAX_PHI, sph.phi + ry * ORBIT_SPEED * dt)
	);
	off.setFromSpherical(sph);
	camera.position.copy(controls.target).add(off);
	controls.autoRotate = false;
	controls.update();
}

/** Left stick → skate/pan the whole view (camera + target move together).
 *  Sets controllerPanning=true so LocalCameraController yields the frame. */
function applySkate(
	camera: Camera,
	controls: Controls,
	lx: number,
	ly: number,
	dt: number,
	panVec: Vector3,
	rightVec: Vector3
): void {
	const dist = camera.position.distanceTo(controls.target);
	const speed = dist * PAN_SPEED_FACTOR * dt * 60;
	rightVec
		.set(camera.matrixWorld.elements[0], 0, camera.matrixWorld.elements[8])
		.normalize();
	panVec.set(0, 0, 0);
	panVec.addScaledVector(rightVec, lx * speed);
	panVec.y -= ly * speed;
	controls.target.add(panVec);
	camera.position.add(panVec);
	controls.update();
	useGamepadStore.getState().setControllerPanning(true);
}

/** L2 / R2 analog triggers → smooth zoom */
function applyTriggerZoom(
	camera: Camera,
	controls: Controls,
	l2: number,
	r2: number,
	dt: number,
	sph: Spherical,
	off: Vector3
): void {
	const delta = r2 - l2; // positive = zoom in (R2), negative = zoom out (L2)
	if (Math.abs(delta) < 0.02) {
		return;
	}
	off.copy(camera.position).sub(controls.target);
	sph.setFromVector3(off);
	sph.radius = Math.max(
		MIN_DISTANCE,
		Math.min(MAX_DISTANCE, sph.radius - delta * ZOOM_SPEED * dt)
	);
	off.setFromSpherical(sph);
	camera.position.copy(controls.target).add(off);
	controls.update();
}

/** D-pad Left/Right → cycle planets in current system */
function handleDpadCycle(
	gp: Gamepad,
	prev: boolean[],
	bodies: CelestialBody[],
	selectedId: string | null,
	onSelect: (id: string) => void,
	onFocus: (id: string) => void
): void {
	const right = gp.buttons[15]?.pressed ?? false;
	const left = gp.buttons[14]?.pressed ?? false;
	if (right && !(prev[15] ?? false)) {
		stepCycle(1, bodies, selectedId, onSelect, onFocus);
	}
	if (left && !(prev[14] ?? false)) {
		stepCycle(-1, bodies, selectedId, onSelect, onFocus);
	}
}

function stepCycle(
	dir: 1 | -1,
	bodies: CelestialBody[],
	selectedId: string | null,
	onSelect: (id: string) => void,
	onFocus: (id: string) => void
): void {
	if (bodies.length === 0) {
		return;
	}
	const idx = bodies.findIndex((b) => b.id === selectedId);
	let nextIdx = 0;
	if (idx === -1) {
		nextIdx = dir === 1 ? 0 : bodies.length - 1;
	} else {
		nextIdx = (idx + dir + bodies.length) % bodies.length;
	}
	onSelect(bodies[nextIdx].id);
	onFocus(bodies[nextIdx].id);

	// Springy feedback that feels like a space jump was just done
	useGamepadStore.getState().triggerHaptic("jump");
}

interface FrameRefs {
	off: React.RefObject<Vector3>;
	panVec: React.RefObject<Vector3>;
	prevButtons: React.RefObject<boolean[]>;
	rightVec: React.RefObject<Vector3>;
	sph: React.RefObject<Spherical>;
}

interface FrameCallbacks {
	onFocus: (id: string) => void;
	onSelect: (id: string) => void;
	onSelectSystem: (id: string) => void;
}

function processInput(
	gp: Gamepad,
	camera: Camera,
	controls: Controls,
	dt: number,
	refs: FrameRefs,
	bodies: CelestialBody[],
	_systems: SystemInfo[],
	_currentSystemId: string,
	selectedId: string | null,
	cbs: FrameCallbacks
): void {
	const { rx, ry } = readSticks(gp);
	const { lx, ly } = readSkate(gp);
	const l1 = gp.buttons[4]?.pressed ?? false;

	if (rx !== 0 || ry !== 0) {
		applyOrbit(
			camera,
			controls,
			rx,
			ry,
			dt,
			refs.sph.current,
			refs.off.current
		);
	}

	if (!l1 && (lx !== 0 || ly !== 0)) {
		applySkate(
			camera,
			controls,
			lx,
			ly,
			dt,
			refs.panVec.current,
			refs.rightVec.current
		);
	} else if (lx === 0 && ly === 0) {
		// Sticks back at rest — allow LocalCameraController to resume
		useGamepadStore.getState().setControllerPanning(false);
	}

	const l2 = gp.buttons[6]?.value ?? 0;
	const r2 = gp.buttons[7]?.value ?? 0;
	if (l2 > 0.02 || r2 > 0.02) {
		applyTriggerZoom(
			camera,
			controls,
			l2,
			r2,
			dt,
			refs.sph.current,
			refs.off.current
		);
	}

	handleDpadCycle(
		gp,
		refs.prevButtons.current,
		bodies,
		selectedId,
		cbs.onSelect,
		cbs.onFocus
	);

	refs.prevButtons.current = Array.from(gp.buttons).map((b) => b.pressed);
}

interface Props {
	bodies: CelestialBody[];
	// biome-ignore lint/suspicious/noExplicitAny: OrbitControls ref is untyped in drei
	controlsRef: React.RefObject<any>;
	currentSystemId: string;
	onFocus: (id: string) => void;
	onSelect: (id: string) => void;
	onSelectSystem: (id: string) => void;
	selectedId: string | null;
	systems: SystemInfo[];
}

export function ControllerCameraController({
	bodies,
	controlsRef,
	currentSystemId,
	onFocus,
	onSelect,
	onSelectSystem,
	selectedId,
	systems,
}: Props) {
	const { camera } = useThree();
	const refs: FrameRefs = {
		sph: useRef(new Spherical()),
		off: useRef(new Vector3()),
		panVec: useRef(new Vector3()),
		rightVec: useRef(new Vector3()),
		prevButtons: useRef([]),
	};

	useFrame((_, dt) => {
		const { connected, gamepadIndex, systemsListOpen } =
			useGamepadStore.getState();
		if (!connected || gamepadIndex === null || systemsListOpen) {
			return;
		}
		const gp = navigator.getGamepads()[gamepadIndex];
		if (!(gp && controlsRef.current)) {
			return;
		}
		processInput(
			gp,
			camera,
			controlsRef.current,
			dt,
			refs,
			bodies,
			systems,
			currentSystemId,
			selectedId,
			{ onSelect, onFocus, onSelectSystem }
		);
	});

	return null;
}
