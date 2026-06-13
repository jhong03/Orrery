/**
 * Tiny fuzzy matcher for the search palette. Query characters must appear
 * in the target in order (case-insensitive); the score rewards matches at
 * word starts and consecutive runs so "jup" ranks Jupiter above
 * "67P/Churyumov" and "tls" still finds "Total solar eclipse".
 */
export interface FuzzyMatch {
  score: number
  /** Indices into the target string, for highlight rendering. */
  indices: number[]
}

const WORD_BREAKS = ' -–—/().,'

export function fuzzyMatch(query: string, target: string): FuzzyMatch | null {
  const q = query.toLowerCase()
  const t = target.toLowerCase()
  if (q.length === 0) return { score: 0, indices: [] }
  if (q.length > t.length) return null

  const indices: number[] = []
  let score = 0
  let ti = 0
  let prevMatch = -2

  for (let qi = 0; qi < q.length; qi++) {
    const c = q[qi]
    let found = -1
    for (let i = ti; i < t.length; i++) {
      if (t[i] === c) {
        found = i
        break
      }
    }
    if (found === -1) return null

    if (found === 0) score += 4
    else if (WORD_BREAKS.includes(t[found - 1])) score += 3
    else if (found === prevMatch + 1) score += 2
    else score += 0.5

    indices.push(found)
    prevMatch = found
    ti = found + 1
  }

  // Prefer shorter targets when raw scores tie (exacter matches win).
  return { score: score - t.length * 0.01, indices }
}
