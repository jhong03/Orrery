import { describe, expect, it } from 'vitest'

import { fuzzyMatch } from './fuzzy'

function score(query: string, target: string): number {
  const m = fuzzyMatch(query, target)
  if (!m) throw new Error(`expected "${query}" to match "${target}"`)
  return m.score
}

describe('fuzzyMatch', () => {
  it('matches subsequences case-insensitively', () => {
    expect(fuzzyMatch('jup', 'Jupiter')).not.toBeNull()
    expect(fuzzyMatch('GANY', 'Ganymede')).not.toBeNull()
    expect(fuzzyMatch('xyz', 'Jupiter')).toBeNull()
  })

  it('requires characters in order', () => {
    expect(fuzzyMatch('retipuj', 'Jupiter')).toBeNull()
  })

  it('empty query matches everything with zero score', () => {
    expect(fuzzyMatch('', 'Saturn')).toEqual({ score: 0, indices: [] })
  })

  it('ranks prefix matches above scattered ones', () => {
    expect(score('jup', 'Jupiter')).toBeGreaterThan(score('jup', 'Jadeite cup'))
  })

  it('rewards word starts: "se" prefers "solar eclipse" initials over mid-word hits', () => {
    expect(score('se', 'Total solar eclipse')).toBeGreaterThan(score('se', 'Phases'))
  })

  it('prefers the shorter target on equal raw score', () => {
    expect(score('moon', 'Moon')).toBeGreaterThan(score('moon', 'Moon of Jupiter'))
  })

  it('returns highlight indices into the target', () => {
    const m = fuzzyMatch('hal', '1P/Halley')!
    expect(m.indices).toEqual([3, 4, 5])
  })
})
