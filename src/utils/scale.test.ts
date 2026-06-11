import { describe, expect, it } from 'vitest'

import { BODY_CONSTANTS } from '../data/bodies'
import { computeSystemState, KM_PER_AU } from '../ephemeris/ephemeris'
import { dateToJd } from '../ephemeris/time'
import { BODY_IDS, vecDistance, vecLength, type BodyId } from '../ephemeris/types'
import {
  compressDistanceKm,
  computeViewState,
  createViewState,
  mapHelioToView,
  MOON_ORBIT_VISIBLE_SCALE,
  VISIBLE_RADIUS_SCALE,
} from './scale'

const TRUE_RADII = Object.fromEntries(
  BODY_IDS.map((id) => [id, BODY_CONSTANTS[id].radiusKm]),
) as Record<BodyId, number>

const JD = dateToJd(new Date(Date.UTC(2026, 5, 10)))

describe('scale modes', () => {
  it('realistic mode is the identity on positions and radii', () => {
    const sys = computeSystemState(JD)
    const view = computeViewState(sys, 'realistic', TRUE_RADII, createViewState())
    for (const id of BODY_IDS) {
      expect(view[id].pos).toEqual(sys[id])
      expect(view[id].radiusKm).toBe(TRUE_RADII[id])
    }
  })

  it('visible mode preserves true angular position (direction from the Sun)', () => {
    const sys = computeSystemState(JD)
    const out = { x: 0, y: 0, z: 0 }
    for (const id of ['mercury', 'earth', 'neptune'] as const) {
      mapHelioToView(sys[id], 'visible', out)
      const rTrue = vecLength(sys[id])
      const rView = vecLength(out)
      // Same unit vector, compressed length.
      expect(out.x / rView).toBeCloseTo(sys[id].x / rTrue, 12)
      expect(out.y / rView).toBeCloseTo(sys[id].y / rTrue, 12)
      expect(out.z / rView).toBeCloseTo(sys[id].z / rTrue, 12)
    }
  })

  it('visible-mode compression is calibrated: 1 AU maps to 1 AU and is monotonic', () => {
    expect(compressDistanceKm(KM_PER_AU)).toBeCloseTo(KM_PER_AU, 6)
    // Neptune's 30 AU compresses to a browsable ~4.2 AU.
    const neptuneView = compressDistanceKm(30.1 * KM_PER_AU) / KM_PER_AU
    expect(neptuneView).toBeGreaterThan(3.5)
    expect(neptuneView).toBeLessThan(5)
    // Strictly increasing.
    let prev = 0
    for (let au = 0.3; au < 31; au += 0.5) {
      const v = compressDistanceKm(au * KM_PER_AU)
      expect(v).toBeGreaterThan(prev)
      prev = v
    }
  })

  it('visible mode keeps the Moon outside the exaggerated Earth', () => {
    const sys = computeSystemState(JD)
    const view = computeViewState(sys, 'visible', TRUE_RADII, createViewState())
    const gap = vecDistance(view.moon.pos, view.earth.pos)
    expect(gap).toBeGreaterThan(view.earth.radiusKm)
    // And the stretch factor is exactly the documented constant.
    expect(gap / vecDistance(sys.moon, sys.earth)).toBeCloseTo(MOON_ORBIT_VISIBLE_SCALE, 9)
  })

  it('scale mode never changes true (displayed) distances', () => {
    // UI readouts must come from SystemState, which scale mapping never touches.
    const sys = computeSystemState(JD)
    const before = vecDistance(sys.earth, sys.mars)
    computeViewState(sys, 'visible', TRUE_RADII, createViewState())
    computeViewState(sys, 'realistic', TRUE_RADII, createViewState())
    expect(vecDistance(sys.earth, sys.mars)).toBe(before)
  })

  it('every body has a visible-mode radius factor', () => {
    for (const id of BODY_IDS) {
      expect(VISIBLE_RADIUS_SCALE[id]).toBeGreaterThan(0)
    }
  })
})
