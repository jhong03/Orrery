import { describe, expect, it } from 'vitest'

import { BODY_IDS } from '../ephemeris/types'
import { BODY_FACTS } from './facts'

describe('body facts data', () => {
  it('every body in the simulation has a facts entry', () => {
    for (const id of BODY_IDS) {
      expect(BODY_FACTS[id], `missing facts for ${id}`).toBeDefined()
    }
  })

  it('every entry is complete enough for the info panel', () => {
    for (const id of BODY_IDS) {
      const f = BODY_FACTS[id]
      expect(f.classification.length).toBeGreaterThan(3)
      expect(f.mass).toMatch(/kg/)
      expect(f.gravityMs2).toBeGreaterThan(0)
      expect(f.dayLength.length).toBeGreaterThan(2)
      expect(f.yearLength.length).toBeGreaterThan(2)
      expect(Number.isFinite(f.meanTempC)).toBe(true)
      expect(f.didYouKnow.length, `${id} needs at least 2 fun facts`).toBeGreaterThanOrEqual(2)
    }
  })

  it('atmosphere percentages are sane', () => {
    for (const id of BODY_IDS) {
      for (const g of BODY_FACTS[id].atmosphere) {
        expect(g.pct).toBeGreaterThan(0)
        expect(g.pct).toBeLessThanOrEqual(100)
      }
    }
  })
})
