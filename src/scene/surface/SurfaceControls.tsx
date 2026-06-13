import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { MathUtils, type PerspectiveCamera } from 'three'

import { azAltDeg, createEnuBasis, enuBasisEcl } from '../../ephemeris/topocentric'
import { useSurfaceStore } from '../../state/surfaceStore'
import { frame } from '../frameState'

const MIN_FOV = 4
const MAX_FOV = 80

/**
 * Ground-view look controls: drag (mouse or one finger) pans the view in
 * azimuth/altitude, wheel zooms the FOV. The camera stays at the origin.
 */
export function SurfaceControls() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera) as PerspectiveCamera

  // Start looking where the action is; re-aimed per entry via enterSeq.
  const view = useRef({ azDeg: 180, altDeg: 25, fov: 55, aimedSeq: -1 })

  useEffect(() => {
    const el = gl.domElement
    const v = view.current
    let dragging = false
    let lastX = 0
    let lastY = 0

    const onDown = (e: PointerEvent) => {
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
      el.setPointerCapture(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      if (!dragging) return
      // Grab-the-sky: content follows the pointer. Degrees per pixel scale
      // with FOV so zoomed-in panning stays gentle.
      const scale = v.fov / el.clientHeight
      v.azDeg = (v.azDeg + (lastX - e.clientX) * scale + 360) % 360
      v.altDeg = MathUtils.clamp(v.altDeg + (e.clientY - lastY) * scale, -20, 89)
      lastX = e.clientX
      lastY = e.clientY
    }
    const onUp = (e: PointerEvent) => {
      dragging = false
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      v.fov = MathUtils.clamp(v.fov * Math.exp(e.deltaY * 0.001), MIN_FOV, MAX_FOV)
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      el.removeEventListener('wheel', onWheel)
    }
  }, [gl])

  useFrame(() => {
    const v = view.current

    // Re-aim whenever a new entry requests it (frame state is ready by now).
    const s = useSurfaceStore.getState()
    if (v.aimedSeq !== s.enterSeq) {
      v.aimedSeq = s.enterSeq
      const basis = enuBasisEcl(s.latDeg, s.lonDeg, frame.axes.earth, createEnuBasis())
      // 'sun-az' aims at the Sun's compass bearing; a body id aims at that body.
      const target = s.lookAt === 'sun-az' || s.lookAt === null ? 'sun' : s.lookAt
      const d = {
        x: frame.sys[target].x - frame.sys.earth.x,
        y: frame.sys[target].y - frame.sys.earth.y,
        z: frame.sys[target].z - frame.sys.earth.z,
      }
      const enu = {
        x: d.x * basis.east.x + d.y * basis.east.y + d.z * basis.east.z,
        y: d.x * basis.north.x + d.y * basis.north.y + d.z * basis.north.z,
        z: d.x * basis.up.x + d.y * basis.up.y + d.z * basis.up.z,
      }
      const { azDeg, altDeg } = azAltDeg(enu)
      const genericEntry = s.lookAt === 'sun-az' || s.lookAt === null
      v.azDeg = azDeg
      // Aim straight at a specific body; for the generic Sun-azimuth entry keep
      // a comfortable upward tilt that still shows the horizon.
      v.altDeg = genericEntry ? MathUtils.clamp(altDeg, 8, 55) : MathUtils.clamp(altDeg, -18, 88)
      // Telephoto when targeting a body so its ~0.5 deg disc reads as a disc.
      v.fov = genericEntry ? 55 : 14
    }

    camera.rotation.set((v.altDeg * Math.PI) / 180, (-v.azDeg * Math.PI) / 180, 0, 'YXZ')
    if (camera.fov !== v.fov) {
      camera.fov = v.fov
      camera.updateProjectionMatrix()
    }
  })

  return null
}
