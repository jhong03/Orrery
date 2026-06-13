# Orrery — session handoff (updated 2026-06-13, end of session)

Remote: **https://github.com/jhong03/Orrery.git** (branch `main`).
After a fresh clone: `npm install`, then `node scripts/fetch-assets.mjs`
(textures are gitignored; ~30 MB from Solar System Scope, see ASSETS.md),
then `npm run dev`.

The repo is **green**: `npx tsc -b`, `npm run lint`, `npm test` (57 tests),
`npm run build` all pass; `npm run dev` serves the app at localhost:5173.
170 fps idle/scrub at last measure. Bundle 1.35 MB (M6 code-split item).

**Resume point: M6 — ship it.** Perf pass vs budget, KTX2 + progressive
textures (8K variants in public/textures/hi/ now used by the Ultra preset),
code splitting, error boundaries, README screenshots, deploy preview.
M0–M5 are all done and verified.

## M5 — Product polish: DONE, verified 2026-06-13 (57 tests, 170 fps)

- **Ctrl+K / "/" search palette** (ui/SearchPalette.tsx): fuzzy search over
  all 21 bodies, next 6 eclipses (dated, region-named), comet perihelions,
  meteor showers (deep-links the Events panel Showers tab via the new
  settingsStore.eventsTab), and actions (now/overview/scale/toggles).
  Scorer in utils/fuzzy.ts (subsequence + word-start/consecutive bonuses,
  7 tests); amber match highlighting; full combobox/listbox ARIA; Search
  button in the HUD jump group. Jump helpers shared with EventsPanel via
  ui/eventJumps.ts.
- **Quality presets Low/Medium/High/Ultra** (data/quality.ts, gear button →
  popover above the HUD): pixel-ratio cap 1/1.5/2/3, belt instances
  4k/10k/20k/32k (geometry built once at Ultra size, prefix drawn via
  instanceCount), comet tail particle scale 0.35-1.5x (geometries rebuilt +
  disposed), Ultra swaps in the 8K Earth-day/night/Jupiter/Saturn textures
  (texturePath()). Persisted in localStorage 'orrery.quality'. NOTE: swapped
  textures must be written through materialRef.current.uniforms (same R3F
  cloning rule); Planet/Earth do this in a useEffect.
- **Onboarding** (ui/Onboarding.tsx): 3 coach marks (welcome/time/search),
  Skip/Next/Done, dots, localStorage 'orrery.onboarded', never reshown.
- **Mobile** (scene/TouchTimeScrub.tsx): two-finger HORIZONTAL drag scrubs
  time (1 yr per screen width, classified vs pinch by midpoint-travel vs
  spread-change after an 18 px deadzone; OrbitControls disabled during the
  scrub, playback restored after). One finger orbits, pinch zooms (stock
  OrbitControls). Responsive CSS ≤720 px: full-width HUD with wrapped
  control rows, panels become top sheets, 36 px touch targets on coarse
  pointers. Verified with synthesized touch PointerEvents
  (scripts/dev-mobile-check.mjs; releasePointerCapture errors there are a
  synthetic-event artifact, filtered).
- **A11y**: timeline slider has arrow-key scrubbing (1 d, Shift = 30 d) +
  aria-valuenow/text; events tabs are role=tablist/tab with aria-selected;
  Escape closes panels/popover via ui/useEscapeToClose.ts (inert while the
  search palette is open — the palette stopPropagation()s its own Escape,
  zustand closes are synchronous so the guard alone is not enough);
  FlightRig already snapped instantly under prefers-reduced-motion; all
  CSS animations gated by prefers-reduced-motion; scene labels were
  already real <button>s.
- **.prettierrc added** (semi:false, singleQuote, width 100) — the repo had
  a format script but no config; `npx prettier --write src/**` is now safe.
  The whole src/ tree is formatted with it.
- Verification scripts: dev-search-check.mjs, dev-quality-check.mjs,
  dev-onboarding-check.mjs, dev-mobile-check.mjs, dev-a11y-check.mjs (all
  exit 0 with zero console errors). Screenshots in scripts/tour/
  (search-*.png, quality-popover.png, onboarding-*.png, mobile-layout.png).
- Committed 2026-06-13 in two commits: a formatting-only sweep
  (.prettierrc + reformat) and the M5 feature commit.

## Interlude (user-requested, 2026-06-12): giant-planet rings + HUD redesign
- **All four giant planets now have rings.** Jupiter (halo + main +
  gossamer, near edge-on at its 3 deg tilt) and Neptune (Galle/Le Verrier/
  Lassell/Arago/Adams) added via the shared procedural strip generator
  scene/bodies/ringTexture.ts (Uranus refactored onto it; Saturn keeps the
  photo strip). Components: bodies/Jupiter.tsx, bodies/Neptune.tsx wrap
  Planet with Rings children; radii constants in data/planetRender.ts.
  Band opacities are deliberately ~5-8x physical (real optical depth 1e-6
  is invisible) — user asked for MORE visibility twice; current values are
  user-approved. Neptune facts gained an Adams-arcs did-you-know.
- **HUD redesigned** (instrument-bar style, user-approved): clock header
  (date prominent + UTC dim), full-width timeline with quarter-major ticks
  and amber cursor, control row with hairline-divided groups — transport
  (icon direction/play/pause buttons, -/+ steppers, mono speed readout),
  jump (Now / Events / Overview — renamed from "System view"), view (scale
  select + amber pill toggles for Orbits/Labels/Shadows replacing
  checkboxes). aria-pressed/labels + focus rings in place (M5 a11y seed).
  Side panels now stop 124px above the bottom so they never cover the HUD
  (they previously overlapped its left edge).
- Note: there is NO "ui ux pro" skill in this environment — the redesign
  followed the spec's design direction directly.

- **M4 — Events: DONE, verified (50 tests, 170 fps).**
  - src/ephemeris/events.ts: merged solar+lunar eclipse timeline
    (nextEclipses), nextPlanetApsides via SearchPlanetApsis (cached per
    body+day in InfoPanel). Tests pin 2026-08-12 total solar (lat 65N) and
    2026-03-03 total lunar.
  - src/data/meteorShowers.ts: 8 major showers, wrap-aware activity windows;
    Halley parents Eta Aquariids + Orionids ("View parent" focuses it).
  - src/utils/regions.ts: coarse region names for greatest-eclipse lat/lon
    (2026-08-12 -> "Iceland and the North Atlantic").
  - Eclipse shadows are ANALYTIC IN THE SHADERS (sunOcclusion(): angular
    sun-disc coverage with annular cap): earth.frag darkens through
    penumbra->umbra (THE umbra spot crawls across Earth at 10 min/s — both
    scale modes, since exaggerations are roughly proportionate);
    planet.frag tints the Moon copper through Earth's shadow (blood moon
    verified 2026-03-03). Planet has eclipseOccluder prop (moon uses earth).
  - scene/ShadowCones.tsx: umbra/penumbra cones parametrized by span
    fraction (preserves total-vs-annular in both scale modes), fade in near
    syzygy (smooth 0.9975..0.99995 alignment), "Shadows" HUD toggle.
  - ui/EventsPanel.tsx: left panel, tabs Eclipses/Showers/Comets; jump-to
    sets peak time, focuses earth/moon (sunlit arrival = presenting angle),
    plays at 10 min/s (speedIndex 2). Comet rows: live r, incoming/outgoing,
    next perihelion, jump (tp-20d at 1 day/s).
  - **UI z-index lesson: scene labels are drei Html (z up to 10) and STEAL
    CLICKS from panels — all panels/HUD have z-index 100 now.**
  - Verification shots: scripts/tour/m4-*.png (umbra spot at two times,
    blood moon, panel tabs); scripts/dev-m4-tour.mjs is the harness (note:
    eclipse list recomputes from sim date — rewind before clicking past
    events).

Previous context: the user confirmed comet behavior (only Encke shows a
tail at the June 2026 sim date) — comets ignite within ~4.6 au; jump dates:
Encke 2027-02, 67P 2028-07, NEOWISE 2020-07 (backwards), Halley 2061-07-28.

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

## Next: M5
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
