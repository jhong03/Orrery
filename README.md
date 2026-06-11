# Orrery — real-time 3D solar system

A real-time, physically-based 3D simulation of the solar system: planets, moons,
rings, the asteroid belt, and active comets with distance-scaled tails, rendered
with React Three Fiber and driven by real ephemeris (`astronomy-engine` + Kepler
propagation).

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Fetch textures (REQUIRED — see note below)
node scripts/fetch-assets.mjs

# 3. Start the dev server
npm run dev
```

Then open the URL Vite prints (default <http://localhost:5173/>).

> **⚠️ Don't skip step 2.** The planet/star textures live in `public/textures/`,
> which is **git-ignored and not committed** (they're ~22 MB and treated as a
> fetchable dependency, like `node_modules/`). A fresh clone won't have them, and
> **without the textures the app renders a blank page** — the texture loader
> throws and the 3D canvas fails to mount.
>
> `fetch-assets.mjs` is idempotent: it skips files already present, so you only
> pay the download once per machine and it's safe to re-run anytime. Source URLs
> and licenses are listed in [ASSETS.md](ASSETS.md).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Type-check (`tsc -b`) and produce a production build |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the Vitest unit tests |
| `npm run lint` | Run ESLint |
| `npm run format` | Format `src/` with Prettier |

## Notes

- Comet tails are modeled to scale with distance from the Sun: a comet is
  invisible/dormant beyond ~4.6 au and dramatic near perihelion. If a comet
  looks "tailless," scrub the timeline toward its perihelion to see the full
  effect — this is physics, not a bug.
- Built with Vite + React 19 + TypeScript, `@react-three/fiber` / `drei` /
  `postprocessing`, `three`, `zustand`, and `astronomy-engine`. GLSL shaders
  live in `src/shaders/` (loaded via `vite-plugin-glsl`).
