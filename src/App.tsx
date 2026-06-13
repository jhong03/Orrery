import { Canvas } from '@react-three/fiber'
import { lazy, Suspense, useEffect } from 'react'

import { QUALITY } from './data/quality'
import { Effects } from './scene/Effects'
import { SystemScene } from './scene/SystemScene'
import { AppCrash, ErrorBoundary } from './ui/ErrorBoundary'
import { EventsPanel } from './ui/EventsPanel'
import { InfoPanel } from './ui/InfoPanel'
import { Onboarding } from './ui/Onboarding'
import { SearchPalette } from './ui/SearchPalette'
import { TimeHud } from './ui/TimeHud'
import { useSettingsStore } from './state/settingsStore'
import { useSurfaceStore } from './state/surfaceStore'

// Code-split the surface (ground-view) subtree — the largest chunk of app
// code that isn't on the first-paint critical path. It loads on demand when
// the user stands on Earth, and entering surface mode flips `active` + mounts
// a whole scene, so the Suspense boundary reliably resolves the cold chunk.
// (EventsPanel etc. stay eager: too small to split, and a cold `{cond &&
// <Lazy/>}` boundary with no follow-up re-render won't retry on resolve.)
const SurfaceScene = lazy(() =>
  import('./scene/surface/SurfaceScene').then((m) => ({ default: m.SurfaceScene })),
)
const SurfaceHud = lazy(() => import('./ui/SurfaceHud').then((m) => ({ default: m.SurfaceHud })))

export default function App() {
  const pixelRatioCap = useSettingsStore((s) => QUALITY[s.quality].pixelRatioCap)
  const surfaceActive = useSurfaceStore((s) => s.active)

  // Warm the surface chunks shortly after first paint: keeps their code off
  // the initial parse/eval path while making the first "stand on the surface"
  // instant (no network wait).
  useEffect(() => {
    const prefetch = () => {
      void import('./scene/surface/SurfaceScene')
      void import('./ui/SurfaceHud')
    }
    // Note: requestIdleCallback alone is unreliable here — the R3F render loop
    // keeps the main thread busy so "idle" rarely arrives. Use its `timeout`
    // option (or a plain setTimeout) to guarantee the prefetch fires shortly
    // after first paint.
    const w = window as typeof window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
    }
    if (w.requestIdleCallback) w.requestIdleCallback(prefetch, { timeout: 800 })
    else setTimeout(prefetch, 600)
  }, [])

  return (
    // Top-level net: catches UI-panel render errors and a failed WebGL/Canvas
    // init (which throw in the DOM tree) → full-screen recover/reload card.
    <ErrorBoundary label="app" fallback={(reset) => <AppCrash reset={reset} />}>
      <div className="app">
        <Canvas
          // `flat`: tone mapping happens in the postprocessing chain (ACES).
          flat
          gl={{ logarithmicDepthBuffer: true, antialias: true }}
          camera={{ fov: 50, near: 0.1, far: 1e8, position: [1800, 1200, 4000] }}
          dpr={[1, pixelRatioCap]}
        >
          {/* Scene errors propagate inside R3F's own reconciler, so the net for
              them has to live inside the Canvas. Null fallback keeps the shell
              + HUD alive (and logs) if the core scene ever throws. */}
          <ErrorBoundary label="scene" fallback={null}>
            <SystemScene />
            {/* Surface is recoverable: a chunk-load failure or surface render
                error drops back to orbit instead of taking down the scene. */}
            <ErrorBoundary
              label="surface-scene"
              fallback={null}
              onError={() => useSurfaceStore.getState().exit()}
              resetKeys={[surfaceActive]}
            >
              <Suspense fallback={null}>{surfaceActive && <SurfaceScene />}</Suspense>
            </ErrorBoundary>
            <Effects />
          </ErrorBoundary>
        </Canvas>
        <TimeHud />
        <ErrorBoundary label="surface-hud" fallback={null} resetKeys={[surfaceActive]}>
          <Suspense fallback={null}>{surfaceActive && <SurfaceHud />}</Suspense>
        </ErrorBoundary>
        <InfoPanel />
        <EventsPanel />
        <SearchPalette />
        <Onboarding />
      </div>
    </ErrorBoundary>
  )
}
