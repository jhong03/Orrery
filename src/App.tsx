import { Canvas } from '@react-three/fiber'

import { QUALITY } from './data/quality'
import { Effects } from './scene/Effects'
import { SurfaceScene } from './scene/surface/SurfaceScene'
import { SystemScene } from './scene/SystemScene'
import { EventsPanel } from './ui/EventsPanel'
import { InfoPanel } from './ui/InfoPanel'
import { Onboarding } from './ui/Onboarding'
import { SearchPalette } from './ui/SearchPalette'
import { SurfaceHud } from './ui/SurfaceHud'
import { TimeHud } from './ui/TimeHud'
import { useSettingsStore } from './state/settingsStore'

export default function App() {
  const pixelRatioCap = useSettingsStore((s) => QUALITY[s.quality].pixelRatioCap)
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
        <SurfaceScene />
        <Effects />
      </Canvas>
      <TimeHud />
      <SurfaceHud />
      <InfoPanel />
      <EventsPanel />
      <SearchPalette />
      <Onboarding />
    </div>
  )
}
