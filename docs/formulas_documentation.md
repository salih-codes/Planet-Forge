# Planet Forge — Physics & Calculations Reference

This document is the authoritative reference for every mathematical formula and
physical model used by Planet Forge's simulation engine (`apps/sim`) and its
Three.js renderer (`apps/web`). Each section identifies the source file so you
can trace a formula back to code.

---

## Table of Contents

1. [Constants & Unit System](#1-constants--unit-system)
2. [Orbital Mechanics — Initial Conditions](#2-orbital-mechanics--initial-conditions)
3. [Gravitational N-Body Integration](#3-gravitational-n-body-integration)
4. [Collision Detection](#4-collision-detection)
5. [Collision Resolution — Absorption & Destruction](#5-collision-resolution--absorption--destruction)
6. [Comet Impact Physics](#6-comet-impact-physics)
7. [Supernova Sequence](#7-supernova-sequence)
8. [Comet Launch & Planet Hurl Trajectories](#8-comet-launch--planet-hurl-trajectories)
9. [Ambient Comet Spawning & Culling](#9-ambient-comet-spawning--culling)
10. [Orbit Layout Algorithm](#10-orbit-layout-algorithm)
11. [Derived Telemetry & HUD Statistics](#11-derived-telemetry--hud-statistics)
12. [Visual & Rendering Formulas](#12-visual--rendering-formulas)

---

## 1. Constants & Unit System

> **Source:** [`system.py`](file:///home/salih/Desktop/Planet%20Forge/apps/sim/sim/domain/system.py#L13-L35)

The simulation operates in an abstract **scene-unit** coordinate system rather
than SI. All quantities are scaled so that orbits look good on screen while
still obeying Newtonian gravity.

| Constant | Symbol | Value | Meaning |
|---|---|---|---|
| Gravitational constant | $G$ | $\approx 0.7018$ | scene-unit³ / (norm-mass · s²) |
| Normalised stellar mass | $M_\star$ | $1.0$ | All bodies share this mass for orbit dynamics |
| Softening radius | $\varepsilon$ | $0.1$ | Prevents $r = 0$ singularity (scene-units) |
| Orbit padding | $\Delta_\text{pad}$ | $2.4$ | Minimum clear gap between adjacent orbits |
| Minimum orbit radius | $r_\text{min}$ | $56.0$ | Innermost allowed orbit (clears the star's visual radius) |
| Ambient bounds | $R_\text{amb}$ | $380.0$ | Spawn shell / cull radius for fly-through comets |
| Max ambient comets | — | $3$ | Concurrent fly-through comet cap |
| Ambient spawn interval | — | $[8, 20]$ s | Randomised gap between ambient comet spawns |
| Shock speed | $v_\text{shock}$ | $9.0$ | Supernova blast-front speed (scene-units / s) |
| Expand duration | $T_\text{exp}$ | $2.6$ s | How long the supernova shell expands before collapse |
| Blast impulse | $a_\text{blast}$ | $36.0$ | Outward acceleration applied to ejected planets |

### Derivation of $G$

The constant is calibrated via **Kepler's Third Law** so that a circular orbit
at $r = 4$ scene-units around a unit-mass star has an orbital period of exactly
$T = 60$ seconds:

$$G = \frac{4\pi^2 r^3}{T^2} = \frac{4\pi^2 \cdot 4^3}{60^2} \approx 0.7018$$

This gives the simulation a comfortable visual cadence — planets orbit
frequently enough for the user to see motion, but slowly enough to track
individual bodies.

---

## 2. Orbital Mechanics — Initial Conditions

> **Source:** [`system.py`](file:///home/salih/Desktop/Planet%20Forge/apps/sim/sim/domain/system.py#L38-L96)

When a body is spawned, the engine computes the exact velocity required for the
desired orbit type and places the body at the corresponding starting point.

### 2.1 Circular Orbit Speed

For a body at distance $r$ from a star of normalised mass $M_\star$, the
tangential speed that produces a perfectly circular orbit is derived from
balancing gravitational attraction against centripetal acceleration
($\frac{mv^2}{r} = \frac{GmM_\star}{r^2}$):

$$v_c = \sqrt{\frac{G \cdot M_\star}{r}}$$

### 2.2 Elliptical Orbit Speed (Vis-Viva at Perihelion)

Comets are initialised at **perihelion** (closest approach). Their speed at that
point is derived from the **Vis-Viva equation**, which gives the speed at any
point on a Keplerian ellipse as a function of the instantaneous distance $r$,
the semi-major axis $a$, and the central mass:

$$v^2 = G M_\star \left( \frac{2}{r} - \frac{1}{a} \right)$$

At perihelion $r_p = a(1 - e)$, substituting and simplifying:

$$v_p = \sqrt{\frac{G \cdot M_\star \cdot (1 + e)}{r_p}}
     = \sqrt{\frac{G \cdot M_\star \cdot (1 + e)}{a(1 - e)}}$$

A safety clamp `max(r_p, 0.1)` prevents division by zero for $e \to 1$.

### 2.3 Initial Position & Velocity Vectors

All orbits lie in the **X-Z plane** ($y = 0$). A random phase angle
$\theta \in [0, 2\pi)$ rotates the starting point around the star:

$$\vec{p}_0 = \begin{cases}
  (r_p \cos\theta, \; 0, \; r_p \sin\theta) & \text{comet (perihelion start)} \\
  (r \cos\theta, \; 0, \; r \sin\theta)       & \text{planet (circular)}
\end{cases}$$

The velocity is directed **tangentially** (counter-clockwise in X-Z):

$$\vec{v}_0 = (-v \sin\theta, \; 0, \; v \cos\theta)$$

where $v$ is $v_c$ or $v_p$ as appropriate.

---

## 3. Gravitational N-Body Integration

> **Source:** [`system.py`](file:///home/salih/Desktop/Planet%20Forge/apps/sim/sim/domain/system.py#L136-L144),
> [`base.py`](file:///home/salih/Desktop/Planet%20Forge/apps/sim/sim/domain/base.py#L29-L36)

Each physics tick ($dt$), every planet and transient body is accelerated toward
the star using a **Symplectic (Semi-Implicit) Euler** integrator. This method
is preferred over the basic Euler method because it conserves energy much better
over long time spans — orbits stay closed instead of spiralling outward.

### 3.1 Softened Gravitational Acceleration

$$\vec{a} = \frac{G \cdot M_\star}{(\lVert\vec{r}\rVert + \varepsilon)^2}
            \cdot \hat{r}$$

where:

- $\vec{r} = \vec{p}_\text{star} - \vec{p}_\text{body}$ is the separation
  vector (pointing **toward** the star).
- $\hat{r} = \vec{r} \;/\; \max(\lVert\vec{r}\rVert, 10^{-9})$ is the unit
  direction vector (with a tiny floor to avoid NaN from zero-length
  normalisation).
- $\varepsilon = 0.1$ is the **Plummer softening radius** that prevents
  infinite forces as $r \to 0$. This is a standard technique from astrophysical
  N-body codes.

### 3.2 Semi-Implicit Euler Update

The key insight is that velocity is updated **first**, and then the
**already-updated** velocity drives the position update:

$$\vec{v}_{t+dt} = \vec{v}_t + \vec{a} \cdot dt$$

$$\vec{p}_{t+dt} = \vec{p}_t + \vec{v}_{t+dt} \cdot dt$$

This ordering (velocity-first) is what makes the integrator _symplectic_ — it
preserves the Hamiltonian structure of the system, keeping orbital energy nearly
constant over thousands of ticks. A standard (explicit) Euler method would use
$\vec{v}_t$ for both updates, causing energy drift.

### 3.3 Star Mass Normalisation

> **Source:** [`system.py`](file:///home/salih/Desktop/Planet%20Forge/apps/sim/sim/domain/system.py#L72-L73)

Stars can carry either a normalised mass (small float like `1.0`) or a physical
mass (like $1.989 \times 10^{30}$ kg). The engine detects which convention is in
use and normalises:

$$M_\text{norm} = \begin{cases}
  M / 1.989 \times 10^{30} & \text{if } M > 10^{10} \\
  M                         & \text{otherwise}
\end{cases}$$

---

## 4. Collision Detection

> **Source:** [`system.py`](file:///home/salih/Desktop/Planet%20Forge/apps/sim/sim/domain/system.py#L163-L192)

### 4.1 Body-Body Collisions

Every tick, the engine checks all unique pairs of bodies (planets + transients)
using an $O(n^2)$ sweep. Two bodies $a$ and $b$ collide when their surfaces
overlap:

$$\lVert \vec{p}_a - \vec{p}_b \rVert < r_a^\text{scene} + r_b^\text{scene}$$

where $r^\text{scene}$ is the body's visual/collision radius in scene-units.

### 4.2 Star-Plunge Detection

A body is destroyed upon falling into the star when it is roughly
**half-submerged** below the star's surface. This tolerance allows large planets
on tight orbits to graze the star without being immediately annihilated:

$$\lVert \vec{p}_\text{body} - \vec{p}_\text{star} \rVert
  < r_\text{star} + 0.5 \cdot r_\text{body}^\text{scene}$$

---

## 5. Collision Resolution — Absorption & Destruction

> **Source:** [`system.py`](file:///home/salih/Desktop/Planet%20Forge/apps/sim/sim/domain/system.py#L194-L268)

When two **non-comet** bodies collide, the outcome depends on the **radius
ratio** $\rho$:

$$\rho = \frac{r_a^\text{scene}}{r_b^\text{scene}}$$

### 5.1 Mass Model

All bodies are assumed to have **uniform density**, so mass is proportional to
the volume of a sphere:

$$m \propto r^3 \quad \Rightarrow \quad m_i = (r_i^\text{scene})^3$$

### 5.2 Volume-Conserving Merge

When two bodies merge (absorption), the total volume is conserved. The resulting
radius is the cube-root of the summed volumes:

$$r_\text{merged} = \left( r_a^3 + r_b^3 \right)^{1/3}$$

### 5.3 Momentum-Conserving Velocity

The merged body's velocity is computed from **conservation of linear momentum**:

$$\vec{v}_\text{merged} = \frac{m_a \vec{v}_a + m_b \vec{v}_b}{m_a + m_b}
                        = \frac{r_a^3 \vec{v}_a + r_b^3 \vec{v}_b}{r_a^3 + r_b^3}$$

### 5.4 Outcome Decision Tree

| Condition | Outcome | Effect |
|---|---|---|
| $\rho > 1.6$ | **Absorption** | $a$ absorbs $b$: $a$ gains merged radius and velocity; $b$ is removed |
| $\rho < 0.625$ | **Absorption** | $b$ absorbs $a$: $b$ gains merged radius and velocity; $a$ is removed |
| $0.625 \le \rho \le 1.6$ | **Destruction** | Both bodies shatter and are removed; debris burst emitted |

> **Design note:** The thresholds $1.6$ and $0.625$ are reciprocals
> ($1/1.6 = 0.625$), ensuring symmetry — whether the larger body is $a$ or $b$,
> the same physical outcome occurs.

### 5.5 Collision Energy

The **relative impact speed** is broadcast as an `energy` metric to scale
client-side visual effects (flash intensity, debris count):

$$E_\text{rel} = \lVert \vec{v}_a - \vec{v}_b \rVert$$

---

## 6. Comet Impact Physics

> **Source:** [`system.py`](file:///home/salih/Desktop/Planet%20Forge/apps/sim/sim/domain/system.py#L194-L208),
> [`system.py`](file:///home/salih/Desktop/Planet%20Forge/apps/sim/sim/domain/system.py#L270-L292)

When a comet strikes a planet, the collision follows special rules that differ
from planet-planet mergers.

### 6.1 Comet vs. Solid World

If one body is a comet and the other is a solid-surface world (terran, ocean,
desert, ice, lava), the comet is **destroyed** and the target planet gains a
**crater** decal. The impact position and relative speed are broadcast for the
renderer to place the visual effect.

### 6.2 Comet vs. Gas Giant — Pass-Through

Gas giants have no solid surface. A comet encountering a gas giant **passes
straight through** with no collision registered — mimicking real-world
atmospheric plunge-through events (like Shoemaker-Levy 9 fragments that
were absorbed without a surface impact).

### 6.3 Impact Energy

$$E_\text{impact} = \lVert \vec{v}_\text{comet} - \vec{v}_\text{target} \rVert$$

This scalar is broadcast to the client to scale the visual burst (flash
radius, debris particle count and ejection speed).

---

## 7. Supernova Sequence

> **Source:** [`system.py`](file:///home/salih/Desktop/Planet%20Forge/apps/sim/sim/domain/system.py#L296-L342),
> [`star.py`](file:///home/salih/Desktop/Planet%20Forge/apps/sim/sim/domain/star.py#L38-L51)

The star's death is a three-phase state machine: **stable → expanding →
remnant**.

### 7.1 Expanding Phase — Shock Front

Once triggered, a spherical blast front races outward from the star's centre at
constant speed:

$$r_\text{shock}(t) = t \cdot v_\text{shock}$$

where $v_\text{shock} = 9.0$ scene-units/s and $t$ is the elapsed time since
the supernova began.

### 7.2 Vaporisation Radius

Bodies within the innermost danger zone are instantly vaporised (removed from the
simulation without debris). The vaporisation radius is scaled from the star's
pre-explosion size:

$$r_\text{vaporise} = 2.6 \cdot r_\text{star}^\text{base}$$

### 7.3 Blast Ejection

Bodies that lie **between** the vaporisation radius and the current shock front
are ejected outward rather than destroyed. They receive an impulsive
acceleration along their radial direction each tick:

$$\vec{v}_\text{body} \mathrel{+}= a_\text{blast} \cdot dt \cdot \hat{p}_\text{body}$$

where:

- $a_\text{blast} = 36.0$ is the blast impulse magnitude.
- $\hat{p}_\text{body} = \vec{p}_\text{body} / \lVert \vec{p}_\text{body} \rVert$
  is the unit vector pointing outward from the origin (star centre).

### 7.4 Remnant Collapse

After $T_\text{exp} = 2.6$ s, the star collapses to a compact, dim remnant:

$$r_\text{remnant} = \max(0.3, \; 0.22 \cdot r_\text{star}^\text{base})$$

$$L_\text{remnant} = 0.12 \cdot L_\text{star}^\text{base}$$

The remnant colour is hard-set to a blue-white `#bfe0ff`, representing a
hot compact object (analogous to a white dwarf or neutron star).

---

## 8. Comet Launch & Planet Hurl Trajectories

> **Source:** [`system.py`](file:///home/salih/Desktop/Planet%20Forge/apps/sim/sim/domain/system.py#L346-L381)

### 8.1 Targeted Comet Launch

When the user fires a comet at a planet, the comet spawns **26 scene-units**
behind the target along a randomised approach direction and flies straight
toward it:

$$\vec{p}_\text{start} = \vec{p}_\text{target} - 26 \cdot \hat{d}_\text{approach}$$

$$\vec{v}_\text{comet} = v_\text{launch} \cdot \hat{d}_\text{intercept}$$

where:

- $\hat{d}_\text{approach}$ is a randomised unit vector (biased toward the
  ecliptic plane with $y \in [-0.25, 0.25]$).
- $\hat{d}_\text{intercept} = \frac{\vec{p}_\text{target} - \vec{p}_\text{start}}{\lVert \vec{p}_\text{target} - \vec{p}_\text{start} \rVert}$
  is the unit vector from spawn to target.
- $v_\text{launch} = 14.0$ scene-units/s (default).

### 8.2 Planet Hurl (Intercept)

The hurl tool redirects an existing planet directly at another. The mover's
velocity is replaced wholesale with a vector aimed at the target:

$$\vec{v}_\text{mover} = v_\text{hurl} \cdot
  \frac{\vec{p}_\text{target} - \vec{p}_\text{mover}}
       {\lVert \vec{p}_\text{target} - \vec{p}_\text{mover} \rVert}$$

where $v_\text{hurl} = 6.0$ scene-units/s (default). The mover then follows
its normal gravitational trajectory, curving toward (and ideally colliding with)
the target.

---

## 9. Ambient Comet Spawning & Culling

> **Source:** [`system.py`](file:///home/salih/Desktop/Planet%20Forge/apps/sim/sim/domain/system.py#L385-L430)

### 9.1 Spawn Geometry

Ambient comets enter from the edge of the simulation volume and sweep across
the planetary region. Each comet is spawned on a **spherical shell** at
$R_\text{amb} = 380$ scene-units:

$$\vec{p}_\text{entry} = \begin{pmatrix}
  R_\text{amb} \cos\theta \\
  \text{uniform}(-10, 10) \\
  R_\text{amb} \sin\theta
\end{pmatrix}, \quad \theta \sim \text{Uniform}(0, 2\pi)$$

### 9.2 Aim Point

Rather than aiming at the star (which would cause comets to plunge straight in),
each comet targets a random point within the **planetary annulus** — a ring
between 55 and 150 scene-units from the centre:

$$\vec{p}_\text{aim} = \begin{pmatrix}
  d_\text{aim} \cos\phi \\
  \text{uniform}(-20, 20) \\
  d_\text{aim} \sin\phi
\end{pmatrix}, \quad d_\text{aim} \sim \text{Uniform}(55, 150), \; \phi \sim \text{Uniform}(0, 2\pi)$$

### 9.3 Velocity

$$\vec{v}_\text{comet} = v \cdot \frac{\vec{p}_\text{aim} - \vec{p}_\text{entry}}
                                       {\lVert \vec{p}_\text{aim} - \vec{p}_\text{entry} \rVert},
  \quad v \sim \text{Uniform}(10, 16)$$

### 9.4 Culling

Transient bodies are removed when they drift too far from the simulation centre,
preventing unbounded memory growth:

$$\text{cull if} \quad \lVert \vec{p}_\text{body} \rVert > 1.6 \cdot R_\text{amb} = 608$$

---

## 10. Orbit Layout Algorithm

> **Source:** [`system.py`](file:///home/salih/Desktop/Planet%20Forge/apps/sim/sim/domain/system.py#L434-L454)

When a new planet is added without an explicit orbit radius, the engine
auto-places it using a **first-fit gap** algorithm that guarantees no visual
overlap between adjacent orbits.

### 10.1 Required Clearance

Two adjacent bodies at orbital radii $r_i$ and $r_j$ (with $r_i < r_j$) require
a gap of at least:

$$r_j - r_i \ge r_i^\text{scene} + r_j^\text{scene} + \Delta_\text{pad}$$

where $\Delta_\text{pad} = 2.4$ scene-units is the orbit padding constant.

### 10.2 Placement Strategy

1. **Innermost slot:** If the first existing planet is far enough from
   $r_\text{min} = 56.0$, place the new body at $r_\text{min}$.
2. **Gap insertion:** Scan successive planet pairs. The first inter-orbit gap
   large enough to fit the new body (including padding on both sides) is used:
   $$r_\text{candidate} = r_i + r_i^\text{scene} + r_\text{new} + \Delta_\text{pad}$$
3. **Outermost append:** If no gap is large enough, the new body is placed
   beyond the outermost existing planet:
   $$r_\text{new orbit} = r_\text{last} + r_\text{last}^\text{scene} + r_\text{new} + \Delta_\text{pad}$$

---

## 11. Derived Telemetry & HUD Statistics

> **Source:** [`planet.py`](file:///home/salih/Desktop/Planet%20Forge/apps/sim/sim/domain/planet.py#L65-L90),
> [`star.py`](file:///home/salih/Desktop/Planet%20Forge/apps/sim/sim/domain/star.py#L59-L70),
> [`presets.py`](file:///home/salih/Desktop/Planet%20Forge/apps/sim/sim/domain/presets.py#L151-L181)

The simulation's internal scene-unit coordinates are **purely abstract** — the
HUD converts them into physically meaningful values using Earth and Solar
reference scales.

### 11.1 Reference Scales

| Quantity | Scene-units | Real-world equivalent |
|---|---|---|
| Earth radius | $r_\oplus = 1.5$ | $6{,}371$ km |
| Solar radius | $r_\odot = 3.0$ (relative) | $696{,}340$ km |
| Solar mass | — | $1.989 \times 10^{30}$ kg |

### 11.2 Planetary Stats

All planetary stats are derived from the body's **scene radius** $r$:

**Physical Radius:**

$$R_\text{km} = \text{round}\!\left( \frac{r}{1.5} \times 6371 \right) \; \text{km}$$

**Mass (in Earth masses):**

$$M_\oplus = \text{round}\!\left( \left(\frac{r}{1.5}\right)^3 \times f_\rho, \; 2 \right)$$

where $f_\rho$ is a density correction factor:

$$f_\rho = \begin{cases}
  0.226 & \text{Gas giants (primarily H/He — low mean density)} \\
  1.0   & \text{All rocky/icy worlds}
\end{cases}$$

> **Physical intuition:** Jupiter's mean density is $\approx 1.33$ g/cm³ vs.
> Earth's $5.51$ g/cm³ — a ratio of $0.241$, close to the $0.226$ factor used
> here. Gas giants are voluminous but surprisingly light.

**Surface Gravity (in Earth $g$):**

$$g = \text{round}\!\left( \frac{M_\oplus}{\left(r / 1.5\right)^2}, \; 2 \right)$$

This follows from Newton's surface-gravity formula $g = GM/R^2$ expressed in
Earth-normalised units.

**Surface Temperature:**

$$T = T_\text{base} + \Delta T_\text{climate}$$

where $T_\text{base}$ is a per-type constant (e.g. Terran = 14 °C, Lava = 430 °C)
and the climate modifier is:

| Climate | $\Delta T$ |
|---|---|
| Frozen | $-40$ °C |
| Temperate | $0$ °C |
| Tropical | $+18$ °C |
| Scorched | $+60$ °C |

**Habitability Score:**

$$H = \min\!\left(99, \; H_\text{base} + \left\lfloor \frac{H_\text{var}}{2} \right\rfloor \right)$$

| Planet Type | $H_\text{base}$ | $H_\text{var}$ |
|---|---|---|
| Terran | 78 | 16 |
| Ocean | 64 | 14 |
| Desert | 28 | 14 |
| Ice | 22 | 12 |
| Lava | 3 | 6 |
| Gas | 1 | 4 |
| Comet | 0 | 0 |

### 11.3 Stellar Stats

**Physical Radius:**

$$R_\text{star} = \text{int}\!\left( \frac{r_\text{sim}}{3.0} \times 696{,}340 \right) \; \text{km}$$

**Physical Mass:**

$$M_\odot = \text{round}\!\left( \frac{M_\text{sim}}{1.989 \times 10^{30}}, \; 2 \right)$$

### 11.4 Tidal Locking

> **Source:** [`planet.py`](file:///home/salih/Desktop/Planet%20Forge/apps/sim/sim/domain/planet.py#L8-L129)

Planets with orbits below a threshold radius are considered **tidally locked**
— one hemisphere permanently faces the star:

$$\text{tidally locked if} \quad r_\text{orbit} < 14.0 \; \text{scene-units}$$

This modifies the temperature profile description to "scorched dayside, frozen
nightside".

### 11.5 Magnetosphere

A planet has a protective magnetic field if:

- It is a **Gas giant** (always — deep convective hydrogen layers), or
- It is a **Terran or Ocean** world with $r^\text{scene} \ge 2.0$ (large enough
  for a molten-iron dynamo).

The magnetosphere status feeds into **radiation level** scoring:

$$\text{radiation score} = \sum \begin{cases}
  +2 & \text{no magnetosphere} \\
  +1 & \text{atmosphere} < 0.5 \\
  +1 & \text{climate} = \text{``scorched''} \\
  +1 & \text{type} \in \{\text{lava, comet}\}
\end{cases}$$

| Score | Level |
|---|---|
| $\le 1$ | Low |
| $2$ | Moderate |
| $3$ | High |
| $\ge 4$ | Extreme |

---

## 12. Visual & Rendering Formulas

> **Source:** [`planet.tsx`](file:///home/salih/Desktop/Planet%20Forge/apps/web/src/features/planet-forge/scene/planet.tsx),
> [`ring-debris.tsx`](file:///home/salih/Desktop/Planet%20Forge/apps/web/src/features/planet-forge/scene/ring-debris.tsx),
> [`comet-trail.tsx`](file:///home/salih/Desktop/Planet%20Forge/apps/web/src/features/planet-forge/scene/comet-trail.tsx),
> [`explosion.tsx`](file:///home/salih/Desktop/Planet%20Forge/apps/web/src/features/planet-forge/scene/effects/explosion.tsx),
> [`supernova.tsx`](file:///home/salih/Desktop/Planet%20Forge/apps/web/src/features/planet-forge/scene/effects/supernova.tsx)

These formulas run on the client (Three.js / React Three Fiber) and control how
simulation data is turned into animated 3D visuals.

### 12.1 Moon Orbital Speed

Moons orbit their parent planet with a **Keplerian-scaled** angular speed:

$$\omega_\text{moon} = \frac{0.6}{\sqrt{r_\text{orbit}}} \cdot \text{jitter}$$

where $\text{jitter} \in [0.8, 1.2]$ is a per-moon random factor for visual
variety, and $r_\text{orbit}$ is the moon's distance from the planet centre.

Moon sizes are scaled as fractions of the parent radius:

| Moon index | Scale factor |
|---|---|
| 1st (largest) | $0.20 \cdot r_\text{planet}$ |
| 2nd | $0.13 \cdot r_\text{planet}$ |
| 3rd | $0.09 \cdot r_\text{planet}$ |
| 4th | $0.07 \cdot r_\text{planet}$ |

### 12.2 Ring Debris — Keplerian Orbital Speed

Each ring particle obeys Kepler's law in miniature. The angular velocity
$\omega$ decreases with distance from the planet centre at a rate proportional
to $r^{-3/2}$:

$$\omega = 0.45 \cdot r^{-3/2} \cdot \text{jitter}, \quad
  \text{jitter} \in [0.9, 1.1]$$

Ring particle radial distribution is **biased inward** using a quadratic CDF to
produce a denser inner ring:

$$r = r_\text{inner} + (r_\text{outer} - r_\text{inner}) \cdot (0.7t^2 + 0.3t),
  \quad t \sim \text{Uniform}(0, 1)$$

### 12.3 Comet Tail — Solar Proximity Intensity

Comets only develop visible tails when near the star (solar heat sublimates the
ices). The particle spawn rate scales as an **inverse-square** law of distance,
mimicking real cometary outgassing:

$$I = \min\!\left(3.0, \; \frac{3500}{d_\odot^2 + 0.1}\right)$$

$$N_\text{spawn} = \begin{cases}
  \lfloor 7 \cdot I \rfloor & \text{if } d_\odot < 140 \\
  0                         & \text{otherwise}
\end{cases}$$

**Ion tail** particles (55% of spawns): fast ($7$–$13$ scene-units/s), narrow
dispersion, directed radially away from the star. Colour fades from cyan
`#00d0ff` to deep blue `#1a3aff`.

**Dust tail** particles (45% of spawns): slower ($3.5$–$6.5$ scene-units/s),
wider fan shaped dispersion, blending the comet's orbital velocity (inertia) with
solar radiation pressure. Colour fades from warm gold `#ffe2aa` to burnt
orange `#ff5a2a`.

### 12.4 Formation Animation — Smoothstep Easing

When a planet is forged, it scales up from a hot speck over 2.2 seconds using a
**Hermite smoothstep** curve:

$$f(t) = 3t^2 - 2t^3, \quad t \in [0, 1]$$

$$\text{scale} = 0.3 + 0.7 \cdot f(t)$$

### 12.5 Debris Burst — Particle Count & Speed

Collision and impact explosions scale their particle count and ejection speed
with the combined radii and relative velocity of the colliding bodies:

$$N_\text{debris} = \min\!\left(460, \; \text{round}(120 + R_\Sigma \cdot 60)\right)$$

$$v_\text{eject} = (2.5 + \text{rand} \cdot 7) \times (0.6 + E_\text{rel} \cdot 0.5)$$

where $R_\Sigma = \sum r_i$ is the combined radii and $E_\text{rel}$ is the
relative impact speed. A velocity-drag factor of $0.95$ per frame gradually
decelerates particles.

### 12.6 Dying Planet — Dissolve

An absorbed planet visually shrinks and fades over its duration $D$:

$$\text{scale}(t) = \max(0, \; 1 - t/D)$$

$$\alpha(t) = \max(0, \; 1 - 1.1 \cdot t/D)$$

### 12.7 Supernova Flash & Shell

**Central flash** (fast decay):

$$r_\text{flash} = r_\text{base} \cdot (4 + 6t)$$

$$\alpha_\text{flash} = \max(0, \; 1 - 1.6t)$$

**Expanding blast shell** (tracks the sim shock front):

$$r_\text{shell} = \max(0.001, \; t \cdot v_\text{shock})$$

$$\alpha_\text{shell} = \max(0, \; 0.55 \cdot (1 - t/T_\text{total}))$$

where $T_\text{total} = T_\text{exp} + 1.6$ s is the full visual duration
(explosion plus a fade-out tail).

---

*Last updated: 2026-06-01 — Planet Forge v0.1.5*
