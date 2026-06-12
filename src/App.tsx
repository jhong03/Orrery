import { Canvas } from '@react-three/fiber'

import { Effects } from './scene/Effects'
import { SystemScene } from './scene/SystemScene'
import { EventsPanel } from './ui/EventsPanel'
import { InfoPanel } from './ui/InfoPanel'
import { TimeHud } from './ui/TimeHud'

export default function App() {
  return (
    <div className="app">
      <Canvas
        // `flat`: tone mapping happens in the postprocessing chain (ACES).
        flat
        gl={{ logarithmicDepthBuffer: true, antialias: true }}
        camera={{ fov: 50, near: 0.1, far: 1e8, position: [1800, 1200, 4000] }}
        dpr={[1, 2]}
      >
        <SystemScene />
        <Effects />
      </Canvas>
      <TimeHud />
      <InfoPanel />
      <EventsPanel />
    </div>
  )
}
