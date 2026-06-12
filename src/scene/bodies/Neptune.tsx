import { useMemo } from 'react'

import { NEPTUNE_RING_INNER_KM, NEPTUNE_RING_OUTER_KM } from '../../data/planetRender'
import { Planet } from './Planet'
import { Rings } from './Rings'
import { makeRingTexture } from './ringTexture'

/**
 * Neptune's five faint rings (Voyager 2, 1989): broad dusty Galle and
 * Lassell, narrow Le Verrier and Arago, and the outermost Adams ring —
 * famous for its clumpy arcs. Rendered subtly, true to their darkness.
 */
export function Neptune() {
  const ringMap = useMemo(
    () =>
      makeRingTexture(
        [
          { center: 0.0, alpha: 0.22, sigma: 0.05 }, // Galle (broad, faint)
          { center: 0.54, alpha: 0.46, sigma: 0.013 }, // Le Verrier
          { center: 0.63, alpha: 0.2, sigma: 0.05 }, // Lassell (broad sheet)
          { center: 0.73, alpha: 0.32, sigma: 0.012 }, // Arago
          { center: 1.0, alpha: 0.72, sigma: 0.014 }, // Adams (brightest)
        ],
        [190, 182, 175],
      ),
    [],
  )

  return (
    <Planet id="neptune">
      <Rings
        planet="neptune"
        map={ringMap}
        innerKm={NEPTUNE_RING_INNER_KM}
        outerKm={NEPTUNE_RING_OUTER_KM}
      />
    </Planet>
  )
}
