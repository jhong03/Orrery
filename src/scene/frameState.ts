/**
 * Per-frame derived state, computed exactly once per frame by EphemerisDriver
 * (useFrame priority -2) and read by every other scene system afterwards.
 * Plain mutable singleton: no React state, no allocations after startup.
 */
import { BODY_CONSTANTS } from '../data/bodies'
import { computeSystemState } from '../ephemeris/ephemeris'
import { bodyAxesEcl, createBodyAxes, type BodyAxes } from '../ephemeris/rotation'
import {
  BODY_IDS,
  MAJOR_BODY_IDS,
  createSystemState,
  type BodyId,
  type SystemState,
} from '../ephemeris/types'
import { computeViewState, createViewState, type ScaleMode, type ViewState } from '../utils/scale'

export const TRUE_RADII_KM = Object.fromEntries(
  BODY_IDS.map((id) => [id, BODY_CONSTANTS[id].radiusKm]),
) as Record<BodyId, number>

export interface FrameState {
  jd: number
  mode: ScaleMode
  /** True heliocentric state (km, doubles). Source for all UI readouts. */
  sys: SystemState
  /** Render-space state for the active scale mode. */
  view: ViewState
  /** Body-fixed orientation bases (IAU pole + prime meridian), ecliptic frame. */
  axes: Record<BodyId, BodyAxes>
}

export const frame: FrameState = {
  jd: 0,
  mode: 'visible',
  sys: createSystemState(),
  view: createViewState(),
  axes: Object.fromEntries(BODY_IDS.map((id) => [id, createBodyAxes()])) as Record<
    BodyId,
    BodyAxes
  >,
}

export function updateFrame(jd: number, mode: ScaleMode): void {
  frame.jd = jd
  frame.mode = mode
  computeSystemState(jd, frame.sys)
  computeViewState(frame.sys, mode, TRUE_RADII_KM, frame.view)
  // IAU orientation only exists for the majors; small bodies keep identity.
  for (const id of MAJOR_BODY_IDS) bodyAxesEcl(id, jd, frame.axes[id])
}
