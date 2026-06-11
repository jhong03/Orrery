import { Color, type Vector3 } from 'three'

import { KM_PER_AU } from '../ephemeris/ephemeris'
import { vecLength, type BodyId } from '../ephemeris/types'
import { useSelectionStore } from '../state/selectionStore'
import { toSceneRelative } from '../utils/frame'
import { frame } from './frameState'

const SUN_TINT = new Color(1.0, 0.975, 0.93)

/**
 * "Auto exposure" sun color for a body: direction and terminator are exact,
 * but absolute intensity follows a gentle d^-0.3 falloff instead of the true
 * inverse square, like a camera adjusting exposure per subject. Neptune would
 * otherwise be 900x darker than Mercury.
 */
export function updateSunColor(id: BodyId, out: Color): Color {
  const dKm = Math.max(vecLength(frame.sys[id]), 1)
  const intensity = Math.min(3.2, Math.max(0.7, 2.3 * Math.pow(KM_PER_AU / dKm, 0.3)))
  return out.copy(SUN_TINT).multiplyScalar(intensity)
}

/** Writes the Sun's camera-relative scene position into `out`. */
export function updateSunPosition(out: Vector3): Vector3 {
  const { originBody } = useSelectionStore.getState()
  return toSceneRelative(frame.view.sun.pos, frame.view[originBody].pos, out)
}
