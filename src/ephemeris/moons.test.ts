import { describe, expect, it } from 'vitest'

import { computeSystemState } from './ephemeris'
import { MOON_SPECS, planetMoonGeoKm } from './moons'
import { J2000_JD } from './time'
import { PLANET_MOON_IDS, vecDistance, vecLength, type Vec3Km } from './types'

function angleBetweenDeg(a: Vec3Km, b: Vec3Km): number {
  const dot = a.x * b.x + a.y * b.y + a.z * b.z
  const cos = dot / (vecLength(a) * vecLength(b))
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI
}

describe('planet moons (circular equatorial model)', () => {
  it('reproduces the JPL Horizons reference direction at J2000', () => {
    const out = { x: 0, y: 0, z: 0 }
    for (const id of PLANET_MOON_IDS) {
      planetMoonGeoKm(id, J2000_JD, out)
      // Direction matches the calibration vector (the model is circular, so
      // only the direction is exact at the reference epoch).
      expect(angleBetweenDeg(out, MOON_SPECS[id].refVectorKm)).toBeLessThan(1.5)
      // Radius equals the published mean orbital radius.
      expect(vecLength(out)).toBeCloseTo(MOON_SPECS[id].orbitRadiusKm, 3)
    }
  })

  it('advances exactly one revolution per sidereal period', () => {
    const a = { x: 0, y: 0, z: 0 }
    const b = { x: 0, y: 0, z: 0 }
    for (const id of PLANET_MOON_IDS) {
      planetMoonGeoKm(id, J2000_JD + 100, a)
      planetMoonGeoKm(id, J2000_JD + 100 + MOON_SPECS[id].periodDays, b)
      expect(angleBetweenDeg(a, b)).toBeLessThan(0.05)
    }
  })

  it('the Laplace resonance holds: lambda_Io - 3 lambda_Europa + 2 lambda_Ganymede = 180 deg', () => {
    // A deep sanity check of the calibrated phases.
    const io = { x: 0, y: 0, z: 0 }
    const eu = { x: 0, y: 0, z: 0 }
    const ga = { x: 0, y: 0, z: 0 }
    for (const jd of [J2000_JD, J2000_JD + 1234.5, J2000_JD + 9876]) {
      planetMoonGeoKm('io', jd, io)
      planetMoonGeoKm('europa', jd, eu)
      planetMoonGeoKm('ganymede', jd, ga)
      const lon = (v: Vec3Km) => Math.atan2(v.y, v.x)
      let res = lon(io) - 3 * lon(eu) + 2 * lon(ga)
      res = ((res % (2 * Math.PI)) + 4 * Math.PI) % (2 * Math.PI)
      const resDeg = (res * 180) / Math.PI
      // 180 deg within the circular-model tolerance.
      expect(Math.abs(resDeg - 180)).toBeLessThan(12)
    }
  })

  it('moons orbit their parent in the full system state', () => {
    const sys = computeSystemState(J2000_JD + 5000)
    for (const id of PLANET_MOON_IDS) {
      const parent = id === 'titan' ? sys.saturn : sys.jupiter
      const d = vecDistance(sys[id], parent)
      expect(d).toBeCloseTo(MOON_SPECS[id].orbitRadiusKm, -1)
    }
  })
})
