# Changelog

All notable changes to Planet Forge are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The release workflow publishes the section matching the pushed tag (e.g. `v0.1.3`
→ the `## [0.1.3]` block) as the GitHub Release notes.

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
