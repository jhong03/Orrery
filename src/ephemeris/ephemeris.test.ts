import { describe, expect, it } from 'vitest'

import { nextTotalSolarEclipse } from './eclipses'
import {
  computeSystemState,
  geoMoonKm,
  helioLongitudeDeg,
  helioPlanetKm,
  KM_PER_AU,
} from './ephemeris'
import { dateToJd, jdToDate, J2000_JD, jdToAstroTime } from './time'
import { vecDistance, vecLength } from './types'

describe('time conversions', () => {
  it('J2000 epoch round-trips: 2000-01-01 12:00 UTC = JD 2451545.0', () => {
    const jd = dateToJd(new Date(Date.UTC(2000, 0, 1, 12, 0, 0)))
    expect(jd).toBeCloseTo(J2000_JD, 9)
    expect(jdToDate(jd).toISOString()).toBe('2000-01-01T12:00:00.000Z')
  })

  it('jdToAstroTime produces ut days since J2000', () => {
    const time = jdToAstroTime(J2000_JD + 1)
    expect(time.ut).toBeCloseTo(1, 9)
  })
})

describe('planet positions (heliocentric, J2000 ecliptic)', () => {
  it('Earth-Sun distance at 2026 perihelion (2026-01-03) is about 0.983 AU', () => {
    const jd = dateToJd(new Date(Date.UTC(2026, 0, 3, 12, 0, 0)))
    const earth = helioPlanetKm('earth', jd, { x: 0, y: 0, z: 0 })
    const au = vecLength(earth) / KM_PER_AU
    expect(au).toBeGreaterThan(0.982)
    expect(au).toBeLessThan(0.9845)
  })

  it('matches JPL Horizons for Mars on 2026-01-01 (within 0.1 deg, 5e-4 AU)', () => {
    // Reference: JPL Horizons vector ephemeris, heliocentric, ecliptic J2000,
    // 2026-Jan-01 00:00 TDB (TDB-UTC ~ 69 s is far below the tolerance):
    //   X =  3.405796768622151e-01 AU
    //   Y = -1.387002015945254e+00 AU
    //   Z = -3.741722678770108e-02 AU
    const refX = 0.3405796768622151
    const refY = -1.387002015945254
    const refZ = -0.03741722678770108
    const refLonDeg = ((Math.atan2(refY, refX) * 180) / Math.PI + 360) % 360
    const refAu = Math.hypot(refX, refY, refZ)

    const jd = dateToJd(new Date(Date.UTC(2026, 0, 1, 0, 0, 0)))
    const mars = helioPlanetKm('mars', jd, { x: 0, y: 0, z: 0 })

    const lonDeg = helioLongitudeDeg(mars)
    const au = vecLength(mars) / KM_PER_AU

    expect(Math.abs(lonDeg - refLonDeg)).toBeLessThan(0.1)
    expect(Math.abs(au - refAu)).toBeLessThan(5e-4)
  })

  it('Mars stays within its true heliocentric distance range over a full orbit', () => {
    const start = dateToJd(new Date(Date.UTC(2020, 0, 1)))
    const v = { x: 0, y: 0, z: 0 }
    for (let d = 0; d < 687; d += 20) {
      const au = vecLength(helioPlanetKm('mars', start + d, v)) / KM_PER_AU
      expect(au).toBeGreaterThan(1.381)
      expect(au).toBeLessThan(1.667)
    }
  })
})

describe('Moon', () => {
  it('geocentric distance stays within the true perigee/apogee range', () => {
    const start = dateToJd(new Date(Date.UTC(2026, 0, 1)))
    const v = { x: 0, y: 0, z: 0 }
    for (let d = 0; d < 60; d += 1) {
      const km = vecLength(geoMoonKm(start + d, v))
      expect(km).toBeGreaterThan(356_000)
      expect(km).toBeLessThan(407_000)
    }
  })

  it('system state places the Moon near Earth, not near the Sun', () => {
    const jd = dateToJd(new Date(Date.UTC(2026, 5, 10)))
    const state = computeSystemState(jd)
    const moonToEarthKm = vecDistance(state.moon, state.earth)
    expect(moonToEarthKm).toBeGreaterThan(356_000)
    expect(moonToEarthKm).toBeLessThan(407_000)
    // Heliocentric Moon distance is within ~0.3% of Earth's.
    const ratio = vecLength(state.moon) / vecLength(state.earth)
    expect(ratio).toBeGreaterThan(0.99)
    expect(ratio).toBeLessThan(1.01)
  })
})

describe('eclipses (computed, not looked up)', () => {
  it('next total solar eclipse after 2026-01-01 peaks on 2026-08-12', () => {
    const jd = dateToJd(new Date(Date.UTC(2026, 0, 1)))
    const eclipse = nextTotalSolarEclipse(jd)
    const peak = jdToDate(eclipse.peakJd)
    expect(peak.toISOString().slice(0, 10)).toBe('2026-08-12')
    expect(eclipse.kind).toBe('total')
  })
})
