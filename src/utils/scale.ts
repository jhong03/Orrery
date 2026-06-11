/**
 * Scale-mode mapping between true heliocentric positions and view positions.
 *
 * - realistic: identity. True distances, true radii.
 * - visible: true angular positions, distances compressed with a power law
 *   r_view = K * r_true^0.42 (calibrated so 1 AU maps to 1 AU), radii scaled
 *   up per body so everything is browsable.
 *
 * THE CONTRACT: this mapping is for rendering only. All numeric readouts in
 * the UI must derive from the true SystemState, never from a ViewState, so
 * toggling scale modes can never change a displayed number.
 *
 * Pure TS — no three.js imports.
 */
import { KM_PER_AU } from '../ephemeris/ephemeris'
import { BODY_IDS, type BodyId, type SystemState, type Vec3Km } from '../ephemeris/types'

export type ScaleMode = 'realistic' | 'visible'

export const DISTANCE_EXPONENT = 0.42

/** Chosen so a body at exactly 1 AU renders at 1 AU in visible mode. */
export const K_VISIBLE = Math.pow(KM_PER_AU, 1 - DISTANCE_EXPONENT)

/** Per-body radius exaggeration in visible mode. */
export const VISIBLE_RADIUS_SCALE: Record<BodyId, number> = {
  sun: 25,
  mercury: 1500,
  venus: 1200,
  earth: 1200,
  moon: 1200,
  mars: 1500,
  jupiter: 150,
  saturn: 150,
  uranus: 250,
  neptune: 250,
  io: 500,
  europa: 500,
  ganymede: 500,
  callisto: 500,
  titan: 500,
  // Comet nuclei are km-sized; the coma sprite carries visibility, the
  // sphere just needs to be clickable.
  halley: 2500,
  encke: 2500,
  cg67p: 2500,
  neowise: 2500,
  ceres: 1500,
  vesta: 1500,
}

/**
 * Satellites whose visible-mode position anchors to the parent's view
 * position with a stretched planetocentric offset, so they clear the
 * parent's exaggerated radius.
 */
export const SATELLITES: Partial<Record<BodyId, { parent: BodyId; stretch: number }>> = {
  moon: { parent: 'earth', stretch: 40 },
  io: { parent: 'jupiter', stretch: 30 },
  europa: { parent: 'jupiter', stretch: 30 },
  ganymede: { parent: 'jupiter', stretch: 30 },
  callisto: { parent: 'jupiter', stretch: 30 },
  titan: { parent: 'saturn', stretch: 30 },
}

/** @deprecated kept for tests; equals SATELLITES.moon.stretch */
export const MOON_ORBIT_VISIBLE_SCALE = 40

export interface BodyView {
  pos: Vec3Km
  radiusKm: number
}

export type ViewState = Record<BodyId, BodyView>

export function createViewState(): ViewState {
  const out = {} as ViewState
  for (const id of BODY_IDS) out[id] = { pos: { x: 0, y: 0, z: 0 }, radiusKm: 1 }
  return out
}

/** Compressed heliocentric distance for visible mode, km in / km out. */
export function compressDistanceKm(rKm: number): number {
  return K_VISIBLE * Math.pow(rKm, DISTANCE_EXPONENT)
}

/**
 * Map a true heliocentric position to its view position for the given mode.
 * Not valid for the Moon in visible mode (it anchors to Earth instead).
 */
export function mapHelioToView(pos: Vec3Km, mode: ScaleMode, out: Vec3Km): Vec3Km {
  if (mode === 'realistic') {
    out.x = pos.x
    out.y = pos.y
    out.z = pos.z
    return out
  }
  const r = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z)
  if (r < 1) {
    out.x = 0
    out.y = 0
    out.z = 0
    return out
  }
  const s = compressDistanceKm(r) / r
  out.x = pos.x * s
  out.y = pos.y * s
  out.z = pos.z * s
  return out
}

/** Radii used by the renderer for the given mode (true radii in realistic). */
export function viewRadiusKm(id: BodyId, trueRadiusKm: number, mode: ScaleMode): number {
  return mode === 'realistic' ? trueRadiusKm : trueRadiusKm * VISIBLE_RADIUS_SCALE[id]
}

/**
 * Compute view positions and radii for every body.
 * `trueRadii` provides each body's true mean radius in km.
 */
export function computeViewState(
  sys: SystemState,
  mode: ScaleMode,
  trueRadii: Record<BodyId, number>,
  out: ViewState,
): ViewState {
  for (const id of BODY_IDS) {
    out[id].radiusKm = viewRadiusKm(id, trueRadii[id], mode)
    if (mode === 'visible' && SATELLITES[id]) continue // anchored below, parents first
    mapHelioToView(sys[id], mode, out[id].pos)
  }
  if (mode === 'visible') {
    // Satellites: parent's view position plus a stretched planetocentric offset.
    for (const id of BODY_IDS) {
      const sat = SATELLITES[id]
      if (!sat) continue
      const m = out[id].pos
      const p = out[sat.parent].pos
      m.x = p.x + (sys[id].x - sys[sat.parent].x) * sat.stretch
      m.y = p.y + (sys[id].y - sys[sat.parent].y) * sat.stretch
      m.z = p.z + (sys[id].z - sys[sat.parent].z) * sat.stretch
    }
  }
  return out
}
