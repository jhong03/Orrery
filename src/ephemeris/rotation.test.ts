import { describe, expect, it } from 'vitest'

import { geoMoonKm, helioPlanetKm } from './ephemeris'
import { obliquityToEclipticDeg, spinAngleDeg, subSolarPoint } from './rotation'
import { dateToJd } from './time'

function earthSubSolar(date: Date) {
  const jd = dateToJd(date)
  const earth = helioPlanetKm('earth', jd, { x: 0, y: 0, z: 0 })
  return subSolarPoint('earth', jd, earth)
}

describe('Earth rotation phasing (terminator must match real UTC)', () => {
  it('sub-solar latitude at the June 2026 solstice is +23.43 deg', () => {
    const { latDeg } = earthSubSolar(new Date(Date.UTC(2026, 5, 21, 12, 0)))
    expect(latDeg).toBeGreaterThan(23.3)
    expect(latDeg).toBeLessThan(23.55)
  })

  it('sub-solar longitude at 12:00 UTC is near Greenwich (within 1 deg, 2026-06-10)', () => {
    // Equation of time on June 10 is ~ +0.7 min -> ~0.2 degrees west.
    const { lonDeg } = earthSubSolar(new Date(Date.UTC(2026, 5, 10, 12, 0)))
    expect(Math.abs(lonDeg)).toBeLessThan(1)
  })

  it('sub-solar longitude at 12:00 UTC on Nov 3 reflects the equation-of-time maximum (~4.1 deg west)', () => {
    // EoT peaks at ~ +16.4 min in early November: the sun crosses the
    // Greenwich meridian ~16 min before 12:00 UTC, so by noon UTC the
    // sub-solar point sits ~4 deg west. This pins both the phase and the
    // sign convention of the rotation model.
    const { lonDeg } = earthSubSolar(new Date(Date.UTC(2026, 10, 3, 12, 0)))
    expect(lonDeg).toBeGreaterThan(-5.2)
    expect(lonDeg).toBeLessThan(-3.2)
  })

  it('at 00:00 UTC the sub-solar point is near the date line', () => {
    const { lonDeg } = earthSubSolar(new Date(Date.UTC(2026, 5, 10, 0, 0)))
    expect(Math.abs(Math.abs(lonDeg) - 180)).toBeLessThan(1)
  })

  it('Earth spins at the sidereal rate (~360.9856 deg/day, prograde)', () => {
    const jd = dateToJd(new Date(Date.UTC(2026, 0, 1)))
    const dw = spinAngleDeg('earth', jd + 1) - spinAngleDeg('earth', jd)
    const rate = ((dw % 360) + 360) % 360
    expect(rate).toBeGreaterThan(0.95)
    expect(rate).toBeLessThan(1.03) // 360.9856 mod 360
  })
})

describe('axial tilts and spin directions', () => {
  const jd = dateToJd(new Date(Date.UTC(2026, 0, 1)))

  it('Earth obliquity to the ecliptic is ~23.44 deg', () => {
    expect(obliquityToEclipticDeg('earth', jd)).toBeCloseTo(23.44, 1)
  })

  it('Uranus rolls on its side (classic 97.8 deg obliquity)', () => {
    // IAU 2015 convention (used by astronomy-engine): "north" is the pole on
    // the north side of the invariable plane, so Uranus reports a tilt of
    // 180 - 97.77 = 82.23 deg with RETROGRADE spin. Same physical orientation
    // as the familiar "97.8 deg prograde" description.
    const tilt = obliquityToEclipticDeg('uranus', jd)
    expect(tilt).toBeGreaterThan(81.7)
    expect(tilt).toBeLessThan(82.8)
    const dw = spinAngleDeg('uranus', jd + 0.1) - spinAngleDeg('uranus', jd)
    expect(dw).toBeLessThan(0) // retrograde under this pole convention
  })

  it('Venus spins retrograde (W decreases) with a ~243-day period', () => {
    const dw = spinAngleDeg('venus', jd + 1) - spinAngleDeg('venus', jd)
    expect(dw).toBeLessThan(0)
    expect(dw).toBeGreaterThan(-1.55) // 360/243.02 = 1.481 deg/day
    expect(dw).toBeLessThan(-1.4)
  })

  it('Jupiter rotates in under 10 hours', () => {
    const dw = spinAngleDeg('jupiter', jd + 0.5) - spinAngleDeg('jupiter', jd)
    expect(dw).toBeGreaterThan(360 + 65) // 870.536 deg/day * 0.5 = 435.3
    expect(dw).toBeLessThan(360 + 80)
  })

  it('Moon keeps its near side facing Earth (tidal lock)', () => {
    // subSolarPoint(id, jd, p) returns the planetographic coordinates of the
    // direction -p in the body frame. Passing the Moon's geocentric position
    // makes -p the Moon->Earth direction, i.e. the sub-Earth point, which must
    // stay near longitude 0 (within the ~8 deg libration range) all month.
    for (let d = 0; d < 27; d += 3) {
      const t = jd + d
      const moonGeo = geoMoonKm(t, { x: 0, y: 0, z: 0 })
      const { lonDeg } = subSolarPoint('moon', t, moonGeo)
      expect(Math.abs(lonDeg)).toBeLessThan(9)
    }
  })
})
