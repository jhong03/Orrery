import { MakeTime, RotateVector, Rotation_EQJ_ECL, Vector } from 'astronomy-engine'
import { describe, expect, it } from 'vitest'

import { computeSystemState } from './ephemeris'
import { bodyAxesEcl, createBodyAxes } from './rotation'
import { dateToJd } from './time'
import {
  angularRadius,
  azAltDeg,
  createEnuBasis,
  eclToEnu,
  enuBasisEcl,
  observerHelioKm,
} from './topocentric'
import { createSystemState, type Vec3Km } from './types'

function skyDirection(latDeg: number, lonDeg: number, jd: number, target: 'sun' | 'moon') {
  const sys = createSystemState()
  computeSystemState(jd, sys)
  const axes = bodyAxesEcl('earth', jd, createBodyAxes())
  const basis = enuBasisEcl(latDeg, lonDeg, axes, createEnuBasis())
  const obs = observerHelioKm(sys.earth, basis, { x: 0, y: 0, z: 0 })
  const d: Vec3Km = {
    x: sys[target].x - obs.x,
    y: sys[target].y - obs.y,
    z: sys[target].z - obs.z,
  }
  const enu = eclToEnu(d, basis, { x: 0, y: 0, z: 0 })
  return { ...azAltDeg(enu), distKm: Math.hypot(d.x, d.y, d.z), enu }
}

describe('topocentric geometry', () => {
  it('puts the Sun due south near the meridian at Greenwich solar noon', () => {
    const jd = dateToJd(new Date('2026-06-13T12:00:00Z'))
    const { azDeg, altDeg } = skyDirection(51.4779, 0, jd, 'sun')
    expect(Math.abs(azDeg - 180)).toBeLessThan(2.5)
    // ~90 - lat + declination (~23.2 deg in mid June)
    expect(altDeg).toBeGreaterThan(60)
    expect(altDeg).toBeLessThan(63.5)
  })

  it('puts Polaris at altitude ~= latitude, azimuth ~= north', () => {
    const jd = dateToJd(new Date('2026-06-13T22:00:00Z'))
    const axes = bodyAxesEcl('earth', jd, createBodyAxes())
    const basis = enuBasisEcl(51.4779, 0, axes, createEnuBasis())
    // Polaris J2000: RA 2.530h, Dec +89.264 deg -> EQJ unit vector -> ecliptic.
    const ra = (2.53 / 24) * 2 * Math.PI
    const dec = (89.264 * Math.PI) / 180
    const eqj = new Vector(
      Math.cos(dec) * Math.cos(ra),
      Math.cos(dec) * Math.sin(ra),
      Math.sin(dec),
      MakeTime(0),
    )
    const ecl = RotateVector(Rotation_EQJ_ECL(), eqj)
    const enu = eclToEnu({ x: ecl.x, y: ecl.y, z: ecl.z }, basis, { x: 0, y: 0, z: 0 })
    const { azDeg, altDeg } = azAltDeg(enu)
    expect(Math.abs(altDeg - 51.4779)).toBeLessThan(1)
    expect(Math.min(azDeg, 360 - azDeg)).toBeLessThan(1.5)
  })

  it('reproduces the 2026-08-12 total eclipse: Moon covers Sun from the path', () => {
    // Greatest eclipse ~17:46 UTC over the Iceland/North Atlantic centerline.
    const jd = dateToJd(new Date('2026-08-12T17:46:00Z'))
    const sun = skyDirection(65.2, -25.2, jd, 'sun')
    const moon = skyDirection(65.2, -25.2, jd, 'moon')

    // Angular separation between the two topocentric directions.
    const dot =
      (sun.enu.x * moon.enu.x + sun.enu.y * moon.enu.y + sun.enu.z * moon.enu.z) /
      (Math.hypot(sun.enu.x, sun.enu.y, sun.enu.z) * Math.hypot(moon.enu.x, moon.enu.y, moon.enu.z))
    const sepDeg = (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI

    const sunRadDeg = (angularRadius(695_700, sun.distKm) * 180) / Math.PI
    const moonRadDeg = (angularRadius(1_737.4, moon.distKm) * 180) / Math.PI

    // Within ~a tenth of a degree of perfect alignment, and the Moon's disc
    // is the larger one (total, not annular).
    expect(sepDeg).toBeLessThan(0.1)
    expect(moonRadDeg).toBeGreaterThan(sunRadDeg)
    // Both discs are ~quarter-degree radius.
    expect(sunRadDeg).toBeGreaterThan(0.24)
    expect(sunRadDeg).toBeLessThan(0.28)
    expect(moonRadDeg).toBeGreaterThan(0.24)
    expect(moonRadDeg).toBeLessThan(0.3)
  })

  it('Moon parallax matters: geocentric and topocentric directions differ ~1 deg', () => {
    const jd = dateToJd(new Date('2026-08-12T17:46:00Z'))
    const sys = createSystemState()
    computeSystemState(jd, sys)
    const topo = skyDirection(65.2, -25.2, jd, 'moon')
    const axes = bodyAxesEcl('earth', jd, createBodyAxes())
    const basis = enuBasisEcl(65.2, -25.2, axes, createEnuBasis())
    const geo: Vec3Km = {
      x: sys.moon.x - sys.earth.x,
      y: sys.moon.y - sys.earth.y,
      z: sys.moon.z - sys.earth.z,
    }
    const geoEnu = eclToEnu(geo, basis, { x: 0, y: 0, z: 0 })
    const { altDeg: geoAlt } = azAltDeg(geoEnu)
    expect(Math.abs(geoAlt - topo.altDeg)).toBeGreaterThan(0.2)
    expect(Math.abs(geoAlt - topo.altDeg)).toBeLessThan(1.2)
  })
})
