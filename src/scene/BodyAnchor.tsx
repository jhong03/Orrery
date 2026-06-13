import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useRef, useState, type ReactNode } from 'react'
import { Group, Vector3 } from 'three'

import { BODY_CONSTANTS } from '../data/bodies'
import type { BodyId } from '../ephemeris/types'
import { useSelectionStore } from '../state/selectionStore'
import { useSettingsStore } from '../state/settingsStore'
import { axesToQuaternion, kmToSceneUnits, toSceneRelative } from '../utils/frame'
import { frame } from './frameState'

export interface BodyAnchorProps {
  id: BodyId
  /** Hide the label when this body sits within N px of `declutterAgainst`. */
  declutterAgainst?: BodyId
  declutterPx?: number
  children: ReactNode
}

/**
 * Positions a body group camera-relative every frame: double-precision view
 * position minus the floating origin, plus IAU orientation and view-radius
 * scale. Children render in unit-radius local space. Also owns the label.
 */
export function BodyAnchor({ id, declutterAgainst, declutterPx = 36, children }: BodyAnchorProps) {
  const group = useRef<Group>(null)
  const showLabels = useSettingsStore((s) => s.showLabels)
  const focusBody = useSelectionStore((s) => s.focusBody)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const [labelVisible, setLabelVisible] = useState(true)
  const proj = useRef({ a: new Vector3(), b: new Vector3() })

  const rotor = useRef<Group>(null)

  useFrame(() => {
    const g = group.current
    if (!g) return
    const { originBody } = useSelectionStore.getState()
    const origin = frame.view[originBody].pos
    toSceneRelative(frame.view[id].pos, origin, g.position)
    g.scale.setScalar(kmToSceneUnits(frame.view[id].radiusKm))
    // Rotation goes on an inner group so the label stays screen-upright.
    if (rotor.current) axesToQuaternion(frame.axes[id], rotor.current.quaternion)

    if (declutterAgainst) {
      const { a, b } = proj.current
      toSceneRelative(frame.view[id].pos, origin, a).project(camera)
      toSceneRelative(frame.view[declutterAgainst].pos, origin, b).project(camera)
      const sepPx = Math.hypot(((a.x - b.x) * size.width) / 2, ((a.y - b.y) * size.height) / 2)
      const visible = sepPx > declutterPx
      if (visible !== labelVisible) setLabelVisible(visible)
    }
  })

  return (
    <group
      ref={group}
      onClick={(e) => {
        e.stopPropagation()
        focusBody(id)
      }}
    >
      <group ref={rotor}>{children}</group>
      {showLabels && labelVisible && (
        <Html center position={[0, 1.6, 0]} zIndexRange={[10, 0]}>
          <button
            className="body-label"
            onClick={(e) => {
              e.stopPropagation()
              focusBody(id)
            }}
          >
            {BODY_CONSTANTS[id].name}
          </button>
        </Html>
      )}
    </group>
  )
}
