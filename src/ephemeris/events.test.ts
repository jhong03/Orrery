import { describe, expect, it } from 'vitest'

import { isShowerActive, METEOR_SHOWERS } from '../data/meteorShowers'
import { regionName } from '../utils/regions'
import { nextEclipses, nextPlanetApsides } from './events'
import { dateToJd, jdToDate } from './time'

describe('merged eclipse timeline', () => {
  it('lists 2026 events in order, including the Aug 12 total solar eclipse', () => {
    const jd = dateToJd(new Date(Date.UTC(2026, 0, 1)))
    const events = nextEclipses(jd, 6)
    expect(events.length).toBe(6)
    // Sorted by time.
    for (let i = 1; i < events.length; i++) {
      expect(events[i].peakJd).toBeGreaterThanOrEqual(events[i - 1].peakJd)
    }
    const totalSolar = events.find(
      (e) => e.type === 'solar' && e.kind === 'total',
    )
    expect(totalSolar).toBeDefined()
    expect(jdToDate(totalSolar!.peakJd).toISOString().slice(0, 10)).toBe('2026-08-12')
    // Greatest eclipse occurs at high northern latitude near Iceland.
    if (totalSolar?.type === 'solar') {
      expect(totalSolar.latitude!).toBeGreaterThan(60)
      expect(totalSolar.latitude!).toBeLessThan(70)
    }
    // 2026 also has a total lunar eclipse on Mar 3.
    const lunar = events.find((e) => e.type === 'lunar' && e.kind === 'total')
    expect(lunar).toBeDefined()
    expect(jdToDate(lunar!.peakJd).toISOString().slice(0, 10)).toBe('2026-03-03')
  })
})

describe('planet apsides', () => {
  it("Earth's next perihelion after mid-2026 is 2027-01-03 at ~0.983 au", () => {
    const jd = dateToJd(new Date(Date.UTC(2026, 5, 1)))
    const a = nextPlanetApsides('earth', jd)
    expect(jdToDate(a.nextPerihelionJd).toISOString().slice(0, 10)).toBe('2027-01-03')
    expect(a.nextPerihelionAu).toBeCloseTo(0.9833, 3)
    expect(a.nextAphelionAu).toBeCloseTo(1.0167, 3)
    // Aphelion comes first from June (early July).
    expect(a.nextAphelionJd).toBeLessThan(a.nextPerihelionJd)
  })
})

describe('meteor showers', () => {
  it('has the 8 major showers with valid windows and rates', () => {
    expect(METEOR_SHOWERS.length).toBe(8)
    for (const s of METEOR_SHOWERS) {
      expect(s.zhr).toBeGreaterThan(0)
      expect(isShowerActive(s, s.peak[0], s.peak[1]), `${s.name} peak inside window`).toBe(true)
    }
  })

  it('activity windows handle the new-year wrap (Quadrantids)', () => {
    const quad = METEOR_SHOWERS.find((s) => s.name === 'Quadrantids')!
    expect(isShowerActive(quad, 12, 30)).toBe(true)
    expect(isShowerActive(quad, 1, 5)).toBe(true)
    expect(isShowerActive(quad, 6, 15)).toBe(false)
  })

  it('Halley parents two showers that link to the simulated comet', () => {
    const halleyShowers = METEOR_SHOWERS.filter((s) => s.parentBody === 'halley')
    expect(halleyShowers.map((s) => s.name).sort()).toEqual(['Eta Aquariids', 'Orionids'])
  })
})

describe('eclipse region names', () => {
  it('places the 2026-08-12 greatest eclipse near Iceland', () => {
    expect(regionName(65.2, -25.2)).toBe('Iceland and the North Atlantic')
  })
  it('spot checks', () => {
    expect(regionName(-25, 134)).toBe('Australia')
    expect(regionName(40, -100)).toBe('the United States')
    expect(regionName(48, 10)).toBe('Europe')
    expect(regionName(-75, 0)).toBe('Antarctica')
    expect(regionName(-30, -120)).toBe('the South Pacific')
  })
})
