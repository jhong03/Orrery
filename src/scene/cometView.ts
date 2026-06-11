/**
 * Shared comet activity/tail math used by the Comet renderer and the camera
 * rig (so flights frame the whole tail, not just the km-scale nucleus).
 */
import type { CometId } from '../data/smallBodies'
import { KM_PER_AU, vecLength, type Vec3Km } from '../ephemeris/types'
import { mapHelioToView } from '../utils/scale'
import { frame } from './frameState'

/** Ion tail length at full activity, au. */
export const ION_TAIL_AU = 0.5

/** Activity ramps in inside ~4.6 au, saturating near perihelion. */
export function cometActivity(rAu: number): number {
  return Math.pow(Math.max(0, Math.min(1, (4.6 - rAu) / 4.2)), 1.6)
}

/**
 * Coma visibility never quite reaches zero: a dormant comet still renders as
 * a faint fuzzy star so it reads as a comet, not a dead gray ball.
 */
export function comaActivity(rAu: number): number {
  return Math.max(cometActivity(rAu), 0.22)
}

const tmpTip: Vec3Km = { x: 0, y: 0, z: 0 }
const tmpView: Vec3Km = { x: 0, y: 0, z: 0 }
const tmpSelf: Vec3Km = { x: 0, y: 0, z: 0 }

/**
 * Current ion-tail length in view-space km (the scale-mode compression of
 * the active mode applied), measured from the nucleus.
 */
export function cometTailViewKm(id: CometId): number {
  const helio = frame.sys[id]
  const rKm = Math.max(vecLength(helio), 1)
  const act = cometActivity(rKm / KM_PER_AU)
  if (act <= 0) return 0
  const lenKm = act * ION_TAIL_AU * KM_PER_AU
  const s = 1 + lenKm / rKm
  tmpTip.x = helio.x * s
  tmpTip.y = helio.y * s
  tmpTip.z = helio.z * s
  mapHelioToView(tmpTip, frame.mode, tmpView)
  mapHelioToView(helio, frame.mode, tmpSelf)
  const dx = tmpView.x - tmpSelf.x
  const dy = tmpView.y - tmpSelf.y
  const dz = tmpView.z - tmpSelf.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}
