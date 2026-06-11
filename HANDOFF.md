# Orrery — session handoff (updated 2026-06-11, end of session)

Remote: **https://github.com/jhong03/Orrery.git** (branch `main`).
After a fresh clone: `npm install`, then `node scripts/fetch-assets.mjs`
(textures are gitignored; ~30 MB from Solar System Scope, see ASSETS.md),
then `npm run dev`.

The repo is **green**: `npx tsc -b`, `npm run lint`, `npm test` (43 tests),
`npm run build` all pass; `npm run dev` serves the app at localhost:5173.
170 fps idle/scrub at last measure.

**Resume point: start M4** (see "Next: M4" below). M0–M3 are done and
verified, plus the user-requested facts/comet interlude. The user confirmed
the comet behavior (only Encke shows a tail at the June 2026 sim date) and
accepted it as correct — comets ignite within ~4.6 au; jump dates: Encke
2027-02, 67P 2028-07, NEOWISE 2020-07 (backwards), Halley 2061-07-28.

## Where we are

Building milestone-by-milestone per the original spec (M0–M6).

- **M0 — Skeleton: DONE, verified.**
- **M1 — The system moves: DONE, verified.**
- **M3 — Small bodies: DONE, verified 2026-06-11.** 167 fps. Kepler solver
  (Newton+bisection, tested to e=0.999) in src/ephemeris/kepler.ts; comet/
  asteroid elements from JPL SBDB full-precision in src/data/smallBodies.ts —
  **Halley is piecewise**: 1968-epoch set for history, Horizons-integrated
  2060 osculating set for the 2061 apparition (Tp JD 2474034.196 =
  2061-Jul-28; test pins the date). Galilean moons + Titan: circular orbits
  in the parent's IAU equator plane, phases calibrated against Horizons
  J2000 vectors (src/ephemeris/moons.ts); Laplace-resonance test passes.
  BodyId extended: majors + io/europa/ganymede/callisto/titan +
  halley/encke/cg67p/neowise/ceres/vesta, all first-class (focusable,
  labeled, orbit lines; satellites stretch-anchored in visible mode via
  SATELLITES table in utils/scale.ts). Comets: dark nucleus + coma sprite +
  dust (curved, warm) and ion (straight, blue) GPU particle tails; activity
  ((4-r)/3.7)^1.8; camera frames the full tail (scene/cometView.ts).
  Asteroid belt: 20k InstancedBufferGeometry rocks, ONE draw call, per-rock
  Keplerian circles evaluated in belt.vert (correct speeds from true a,
  Kirkwood gaps carved out), deterministic mulberry32 layout.
  **CRITICAL R3F LESSON (cost an hour of debugging): the `uniforms` prop is
  cloned per-descriptor by R3F — scalar uniform writes to the useMemo'd
  object NEVER reach the GPU (in-place Vector3/Color mutations do, which
  masks the bug). ALWAYS write per-frame uniforms through
  materialRef.current.uniforms.** All scene components now follow this.
  Verification shots: scripts/tour/m3-*.png (Halley 2061, NEOWISE 2020 with
  visibly split tails, Jupiter+moons, Saturn+Titan, Ceres in the belt).
  Debug helpers: window.__scene/__gl + __orrery.frame (dev only);
  scripts/dev-debug-tails*.mjs show the uniform-inspection pattern.
- **M2 — It looks real: DONE, verified 2026-06-11.** 168 fps idle/scrub.
  Sun granulation shader + restrained corona + bloom/ACES; all planets
  textured with IAU tilts/rotation; Earth day/night/clouds/atmosphere stack;
  Saturn rings with analytic mutual shadows (both directions); Uranus
  procedural faint rings; Milky Way skybox (BackSide + negative-x scale —
  three flips winding for negative determinants, so BackSide stays correct;
  HDR color multiplier ~2.6 because the source map is dark) + 24 bright
  named stars as points; GRS calibrated via textureLonOffsetRad (-14.8 deg,
  texture GRS at u=0.366 = lon -48, target System III 63 W in 2026).
  vite-plugin-glsl passes three's #include chunks through untouched — no
  workaround needed. Labels live outside the per-body rotation group so they
  stay screen-upright (Uranus!). Tour screenshots: scripts/tour/*.png via
  `node scripts/dev-tour.mjs`; window.__orrery dev hook exposes stores for
  scripts (main.tsx, DEV only).

## What was done today

### M0+M1 (full detail in git-less repo — see file list below)
- Ephemeris layer (`src/ephemeris/`): astronomy-engine wrappers, J2000
  ecliptic km doubles, JD helpers, eclipse search wrappers. Unit-tested
  against JPL Horizons (Mars), the 2026 perihelion, and the 2026-08-12 total
  solar eclipse.
- Time store (JD double, play/reverse/speeds to 5 yr/s), selection store
  (focusedBody / originBody / flightSeq), settings store (scale mode, orbit
  and label toggles).
- Camera-relative rendering: `src/scene/frameState.ts` singleton computed
  once per frame (priority -20); subtraction in doubles in
  `src/utils/frame.ts` (1 scene unit = 1000 km); log depth buffer on.
- Scale modes in `src/utils/scale.ts` (visible = r^0.42 compression
  calibrated so 1 AU→1 AU; per-body radius exaggeration; Moon orbit ×40).
- FlightRig (eased fly-to, origin rebase on arrival), OrbitLines (epoch
  resampling), HUD with draggable timeline (1 yr across), labels with
  screen-space declutter.

### M2 progress (today)
- **Assets**: `node scripts/fetch-assets.mjs` downloaded 18 textures
  (Solar System Scope, CC BY 4.0) into `public/textures/` (gitignored-style,
  re-run after clone). `ASSETS.md` has URLs/licenses + tracked deviations.
- **Rotation model DONE + tested** (`src/ephemeris/rotation.ts`): IAU 2015
  pole/prime-meridian via astronomy-engine `RotationAxis`; body-fixed bases
  in ecliptic frame; `frame.axes` updated per frame;
  `axesToQuaternion` in `src/utils/frame.ts` (texture convention: +X = lon 0,
  +Y = north, -Z = 90E). 10 tests pass: **Earth sub-solar longitude matches
  UTC within 1°** (incl. equation-of-time at Nov 3), solstice latitude,
  Uranus 82.2°-retrograde (= classic 97.8°), Venus retrograde, Moon tidal lock.
- **Shaders written** (`src/shaders/`): `body.vert`, `planet.frag` (terminator
  band, limb darkening, rim atmosphere, analytic ring shadow),
  `earth.frag` (day/night/twilight band, ocean glint from day-map mask,
  projected cloud shadows, city lights), `clouds.frag`, `atmosphere.frag`
  (Fresnel rim, sunset-orange terminator ring, backlit halo), `sun.frag`
  (simplex fbm granulation + limb darkening, HDR output), `corona.vert/frag`,
  `rings.frag` (radial strip texture, both-side lighting + transmission,
  analytic planet shadow with soft penumbra).
- **Components written** (compile, NOT wired): `scene/BodyAnchor.tsx`
  (position/scale/IAU-quaternion per frame + label + declutter),
  `scene/sunLight.ts` (auto-exposure sun color d^-0.3 + camera-relative sun
  position helpers), `scene/bodies/Sun.tsx`, `scene/bodies/Planet.tsx`
  (generic, with optional ring-shadow uniforms), `scene/bodies/Earth.tsx`
  (surface + cloud sphere ×1.012 + atmosphere shell ×1.035 BackSide additive).
- **Data**: `data/planetRender.ts` (per-planet shader params, ring radii
  constants), `data/stars.ts` (24 brightest stars RA/Dec/mag/color).

## Next steps (M2 remainder, in order)

1. **SaturnRings component**: custom ring BufferGeometry in the local XZ
   plane, radial UV (u = 0 inner → 1 outer), local radii
   `SATURN_RING_INNER_KM/OUTER_KM ÷ 58232` (≈1.279→2.408 planet radii),
   `rings.frag`, per-frame uniforms (uSunPos, uSunColor, uPlanetCenter =
   anchor world pos, uPlanetRadius = scene view radius). Mount inside
   Saturn's `BodyAnchor` (anchor quaternion already maps +Y to the pole).
   Saturn = `<Planet id="saturn" ringShadow={{map, innerKm, outerKm}}>` +
   rings child. Uranus: same shader with a procedural 1D DataTexture
   (faint epsilon ring; constants already in planetRender.ts).
2. **Starfield component**: sky sphere r≈2e7 units, BackSide
   meshBasicMaterial with `stars_milky_way.jpg`, depthWrite off, oriented by
   the EQJ→ecliptic quaternion (build BodyAxes from Rotation_EQJ_ECL unit
   vectors → axesToQuaternion). Bright-star Points (custom shader, per-point
   size/color from data/stars.ts, RA/Dec → EQJ vector as children of the same
   oriented group). Polaris is in the data set as an orientation sanity check.
3. **Effects component**: `@react-three/postprocessing` EffectComposer:
   Bloom (mipmapBlur, luminanceThreshold ~1.0, intensity ~0.85), Vignette,
   ToneMapping (ACES_FILMIC from 'postprocessing'). Set `<Canvas flat>` so
   the composer owns tone mapping. Sun shader outputs ~×5 HDR for bloom.
4. **Wire SystemScene**: replace `BodyMeshes` with Suspense-wrapped
   `<Starfield/><Sun/><Earth/>` + `<Planet>` for mercury/venus/mars/jupiter/
   uranus/neptune + saturn-with-rings + `<Planet id="moon"
   declutterAgainst="earth"/>`. Keep TimeTicker/EphemerisDriver/FlightRig/
   OrbitLines/OrbitControls. Remove the old hemisphere light (custom shaders
   use uAmbient). Delete the now-unused BodyMeshes.
5. **CRITICAL UNVERIFIED RISK**: the shaders use three.js chunk includes
   (`#include <common>`, `<logdepthbuf_*>`). **vite-plugin-glsl may try to
   resolve those at bundle time and fail.** If dev server errors on shader
   import: either configure the plugin to ignore angle-bracket includes, or
   convert `src/shaders/*` to exported TS template strings (drop the plugin).
   Three itself resolves those chunks at program build; non-raw ShaderMaterial
   on WebGL2 gets the 300-es prefix so gl_FragDepth works.
6. **Screenshot every planet and self-critique** (spec requirement):
   `node scripts/dev-smoke.mjs` is the pattern — extend it to focus each body
   and screenshot (pause playback before clicking labels; use the Focus
   flow via `.body-label` clicks or store access). Compare against reference
   photos: check Saturn ring shadow band, Earth terminator/city lights,
   Jupiter band orientation + limb darkening, Uranus pole orientation.
7. **Verify M2**: `npm test`, `npm run lint`, `npm run build`,
   `node scripts/dev-fps.mjs` (budget: 60 fps; M1 baseline was 170).

## Interlude (user-requested, done 2026-06-11 late): comet visibility + facts
- Dormant comets now always show a faint coma (comaActivity floor 0.22 in
  scene/cometView.ts), nucleus darkened, activity ramp starts at 4.6 au —
  at today's date all four comets are 3-35 au out, which is why tails were
  "missing" (physically correct, visually confusing; now self-explanatory).
- Educational facts layer: src/data/facts.ts (all 21 bodies — atmosphere
  composition with bars, mass/gravity/day/year/tilt/temps/moon counts,
  curated did-you-know) + src/ui/InfoPanel.tsx side sheet (opens on focus,
  keyed remount per body, 2 Hz live readouts: TRUE distance from Sun/Earth,
  orbital speed via finite difference, next perihelion for small bodies).
  Tests guard completeness (data/facts.test.ts). 43 tests total.

## Next: M4
- **M4**: eclipse list UI + jump-to + umbra/penumbra shadow cones (the
  signature moment: umbra spot crossing Earth on 2026-08-12), meteor showers,
  comet status, apsis events (SearchPlanetApsis).
- **M5**: full UI polish per design direction, search (cmd-K), settings/
  quality presets, onboarding, mobile gestures, a11y.
- **M6**: perf budget, KTX2 + progressive textures (8K variants already in
  public/textures/hi/), code splitting (bundle is 1.17 MB — needs work),
  error boundaries, README screenshots, deploy preview.

## Key decisions / gotchas
- React 19 + R3F v9 (spec said React 18; R3F v9 requires 19 — flagged, accepted).
- ESLint: react-hooks immutability/refs rules OFF for `src/scene/**` only
  (R3F imperative per-frame mutation is the architecture).
- Browser automation: playwright-core + system Edge (`channel: 'msedge'`),
  no downloaded browsers. Scripts: `dev-smoke.mjs`, `dev-fps.mjs`.
- Pause playback before Playwright-clicking scene labels (they move).
- "Auto exposure" lighting decision: terminator/direction exact, intensity
  d^-0.3 not d^-2 (documented in scene/sunLight.ts).
- Earth normal/specular maps skipped (SSS ships TIFF) — ocean mask derived
  from day map in-shader; tracked in ASSETS.md for M6.
- Test reference values: fetch JPL Horizons API (vectors, ecliptic J2000)
  rather than trusting memory.
- No git repo here — consider `git init` + first commit when resuming.
