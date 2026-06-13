import { Canvas } from '@react-three/fiber'
import { lazy, Suspense, useEffect } from 'react'

import { QUALITY } from './data/quality'
import { Effects } from './scene/Effects'
import { SystemScene } from './scene/SystemScene'
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
    <div className="app">
      <Canvas
        // `flat`: tone mapping happens in the postprocessing chain (ACES).
        flat
        gl={{ logarithmicDepthBuffer: true, antialias: true }}
        camera={{ fov: 50, near: 0.1, far: 1e8, position: [1800, 1200, 4000] }}
        dpr={[1, pixelRatioCap]}
      >
        <SystemScene />
        <Suspense fallback={null}>{surfaceActive && <SurfaceScene />}</Suspense>
        <Effects />
      </Canvas>
      <TimeHud />
      <Suspense fallback={null}>{surfaceActive && <SurfaceHud />}</Suspense>
      <InfoPanel />
      <EventsPanel />
      <SearchPalette />
      <Onboarding />
    </div>
  )
}
