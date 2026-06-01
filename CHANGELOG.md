# Changelog

All notable changes to Planet Forge are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The release workflow publishes the section matching the pushed tag (e.g. `v0.1.3`
→ the `## [0.1.3]` block) as the GitHub Release notes.

## [0.1.5] - 2026-06-01

### Added
- **Full Gamepad / Controller Integration**: Implemented robust low-latency polling via the standard Web Gamepad API, dynamically mapping controls for **PS5 DualSense**, **Xbox Series X/S**, and generic gamepads.
- **Stellar System Navigation Overlay**: Integrated a slide-out systems listing selector toggled by **L1 / LB**. Supports navigating with **D-pad Up / Down** and loading systems with **Cross (○) / A**.
- **Dynamic Controller Camera Skating**: Mapped standard analog stick controls with Left Stick driving free skating/panning and Right Stick driving target orbiting and camera rotation.
- **Virtual Gamepad Cursor & Focus System**: Built a virtual cursor that activates automatically upon detecting controller input, allowing users to hover and click all HUD elements, dials, and detail panels.
- **Space-Jump Gamepad Haptics**: Mapped a dedicated, springy space-rumble pattern (`jump` profile) that triggers satisfying vibration feedback every time players jump between orbiting planets using **D-pad Left / Right**.
- **High-Fidelity Glowing Amber Schematics**: Traced actual physical layouts of both **PS5 DualSense** and **Xbox Series X/S** controllers inside the control reference overlay. Styled using thin-stroke vector paths in the primary amber `#ffaa00` with a glowing blueprint filter, toggled by pressing **Left Stick / L3**.
- **Double-Tap Solar System Zoom Out**: Double-tapping the deselect key (**ESC** on keyboard, **Circle / B** on gamepad) sweeps the camera backward to a highly reasonable distance of `220` units to provide a beautiful, wide, orbiting overview of star and planetary orbits.
- **Double-Tap Planet Details Trigger**: Double-tapping the controller primary confirm button (**Cross (✕)** on PS5, **A** on Xbox) triggers the high-fidelity planet details dialog for the currently selected body, mirroring the mouse click-and-hold behavior.
- **Interactive Close Button Hints**: Integrated adjacent shortcut badges (showing `[ ESC ]` and `○` / `B` cancel icons) on close buttons across all active HUD dialogs and step wizards.
- **Left Stick / L3 Trigger Discoverability**: Expanded the controls indicator HUD label to explicitly show **"Show Controls (Press Left Stick)"** and scaled the badge by `scale-110`.
- **True Deselect & D-pad Select**: Replaced system defaults to allow users to completely deselect targets (closing details and fading highlights). Pushing **D-pad Left / Right** automatically reactivates selection on the first/last orbit body.
- **Interactive Onboarding Tour**: Added a guided visual tour powered by `driver.js` that teaches users about camera, time, and stellar forge controls.
- **Isolated Target Detail Viewer**: Created a dedicated, detailed orbital observer component displaying high-fidelity rendered close-ups of selected celestial bodies.

### Fixed
- **Locked Camera origin lerping**: Added an active drag/pan listener (`"start"` event) on `OrbitControls` to seamlessly interrupt camera resetting, giving users 100% unlocked free-panning movement.
- **TypeScript Compile Type Inference Warning**: Fixed type-checking `Property 'id' does not exist on type '"" | CelestialBody'` on line 221 of `planet-forge.tsx` by replacing logical AND check with a strict ternary condition.

---

## [0.1.4] - 2026-05-31

### Added
- Realistic planetary and solar sizing with physically proportional radii and
  orbit distances.
- Elliptical orbit support with eccentricity-driven trajectories for planets and
  comets.
- Planetary moons that orbit their parent bodies in the 3D scene.
- Aligned rings and debris angles matching each planet's axial tilt.
- Custom collision absorption and destruction animations: larger bodies absorb
  smaller ones (gaining volume and conserving momentum), while comparably sized
  bodies shatter with debris dispersal effects.

### Fixed
- **Type errors in collision system.** Added explicit `dict[str, Any]` type
  annotation (with `Any` imported from `typing`) to the heterogeneous `event_data` dict in
  `_resolve_collision()`, fully resolving Pyright/Pylance inference errors on dynamically
  assigned keys (`outcome`, `absorber`, `absorbed`, `destroyed`).

---

## [0.1.3] - 2026-05-31

### Fixed
- **macOS "is damaged and can't be opened" on Apple Silicon.** The bundle and the
  embedded Python sidecar are now ad-hoc code-signed, so Gatekeeper no longer hard-
  blocks the app on quarantined (downloaded) installs. (Without a paid Apple
  Developer ID + notarization it still shows a one-time "unidentified developer"
  prompt — see the install notes.)

### Changed
- Release notes are now sourced from this changelog by the CI workflow.

## [0.1.2] - 2026-05-30

### Added
- Connection-status overlay: shows "Initializing simulation core…" while the sim
  starts and a retryable "engine unavailable" state if it never responds, instead
  of a silent blank screen.

### Changed
- Sidecar spawn outcome is now logged (logging enabled in release builds) to aid
  diagnosing packaged-app issues.
- Simulation host/port is resolved lazily so a shell-injected port is always used.
- API queries retry with backoff and refetch when the WebSocket connects — fixes
  the system appearing empty on launch in packaged builds.

## [0.1.1] - 2026-05-30

### Added
- Collision & cataclysm engine: planet–planet collisions with debris dispersal,
  supernova sequence, comet "strike" and planet "hurl" intercept tools, and random
  ambient fly-by comets.
- Custom GLSL shaders for the star surface and comet nuclei; particle-driven
  explosion and supernova effects.
- HUD controls for triggering cataclysms.

### Changed
- Planets are laid out with guaranteed non-overlapping orbital spacing.
- Richer dual ion/dust comet trails and tuned camera controls.

## [0.1.0] - 2026-05-30

### Added
- Initial release: solar-system simulation (FastAPI physics core with WebSocket
  telemetry), interactive React + Three.js scene, and a multi-system galaxy view,
  packaged as a desktop app with Tauri.
