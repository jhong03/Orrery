import { describe, expect, it } from 'vitest'

import { SMALL_BODIES, elementsAt } from '../data/smallBodies'
import {
  keplerDistanceAu,
  keplerPositionKm,
  nextPerihelionJd,
  solveKepler,
} from './kepler'
import { dateToJd, jdToDate } from './time'
import { KM_PER_AU, vecLength } from './types'

describe('Kepler solver', () => {
  it('satisfies M = E - e sinE to machine precision across the (M, e) space', () => {
    for (let e = 0; e <= 0.999; e += 0.111) {
      for (let M = -9; M <= 9; M += 0.37) {
        const E = solveKepler(M, e)
        const M2 = E - e * Math.sin(E)
        // Compare against M normalized to [-pi, pi].
        let m = M % (2 * Math.PI)
        if (m > Math.PI) m -= 2 * Math.PI
        if (m < -Math.PI) m += 2 * Math.PI
        expect(Math.abs(M2 - m)).toBeLessThan(1e-11)
      }
    }
  })

  it('handles near-parabolic NEOWISE (e = 0.99918) near perihelion', () => {
    const el = elementsAt(SMALL_BODIES.neowise, 2459034)
    for (let d = -30; d <= 30; d += 1) {
      const r = keplerDistanceAu(el, el.tp + d)
      expect(r).toBeGreaterThan(0.29)
      expect(r).toBeLessThan(1.5)
    }
  })
})

describe('comet propagation', () => {
  it('every body sits at its perihelion distance at tp', () => {
    for (const spec of Object.values(SMALL_BODIES)) {
      for (const set of spec.sets) {
        const r = keplerDistanceAu(set.el, set.el.tp)
        const q = set.el.a * (1 - set.el.e)
        expect(Math.abs(r - q)).toBeLessThan(1e-9)
      }
    }
  })

  it("Halley's next perihelion after 2026 lands in 2061 (Jul 28)", () => {
    const jd2026 = dateToJd(new Date(Date.UTC(2026, 0, 1)))
    const el = elementsAt(SMALL_BODIES.halley, jd2026)
    const tp = nextPerihelionJd(el, jd2026)
    const date = jdToDate(tp)
    expect(date.getUTCFullYear()).toBe(2061)
    expect(date.toISOString().slice(0, 10)).toBe('2061-07-28')
    // And the minimum distance there is Halley's q ~ 0.59 au.
    expect(keplerDistanceAu(el, tp)).toBeCloseTo(0.5932, 3)
  })

  it('uses the historical element set for the 1986 apparition', () => {
    const jd1986 = dateToJd(new Date(Date.UTC(1986, 1, 9)))
    const el = elementsAt(SMALL_BODIES.halley, jd1986)
    expect(Math.abs(jd1986 - el.tp)).toBeLessThan(2) // Tp 1986-Feb-08
    expect(keplerDistanceAu(el, el.tp)).toBeCloseTo(0.5749, 3)
  })

  it('NEOWISE peaked at q = 0.2947 au on 2020-Jul-03', () => {
    const el = elementsAt(SMALL_BODIES.neowise, 2459034)
    expect(jdToDate(el.tp).toISOString().slice(0, 10)).toBe('2020-07-03')
    expect(keplerDistanceAu(el, el.tp)).toBeCloseTo(0.29465, 4)
  })

  it('Ceres stays within its true heliocentric range', () => {
    const el = elementsAt(SMALL_BODIES.ceres, 2461000)
    const out = { x: 0, y: 0, z: 0 }
    for (let d = 0; d < 1680; d += 40) {
      const rAu = vecLength(keplerPositionKm(el, 2461000 + d, out)) / KM_PER_AU
      expect(rAu).toBeGreaterThan(2.54) // q = a(1-e) = 2.545
      expect(rAu).toBeLessThan(2.99) // Q = a(1+e) = 2.986
    }
  })
})
