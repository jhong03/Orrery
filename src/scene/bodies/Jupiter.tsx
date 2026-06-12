import { useMemo } from 'react'

import { JUPITER_RING_INNER_KM, JUPITER_RING_OUTER_KM } from '../../data/planetRender'
import { Planet } from './Planet'
import { Rings } from './Rings'
import { makeRingTexture } from './ringTexture'

/**
 * Jupiter with its tenuous dust rings (discovered by Voyager 1, 1979):
 * an inner halo, the narrow main ring, and the broad gossamer rings shed
 * by Amalthea and Thebe. Real optical depth is ~1e-6, so they are rendered
 * just barely visible.
 */
export function Jupiter() {
  const ringMap = useMemo(
    () =>
      makeRingTexture(
        [
          { center: 0.18, alpha: 0.26, sigma: 0.1 }, // halo
          { center: 0.39, alpha: 0.72, sigma: 0.03 }, // main ring (122.5-129k km)
          { center: 0.55, alpha: 0.22, sigma: 0.09 }, // Amalthea gossamer
          { center: 0.82, alpha: 0.16, sigma: 0.12 }, // Thebe gossamer
        ],
        [222, 204, 176],
      ),
    [],
  )

  return (
    <Planet id="jupiter">
      <Rings
        planet="jupiter"
        map={ringMap}
        innerKm={JUPITER_RING_INNER_KM}
        outerKm={JUPITER_RING_OUTER_KM}
      />
    </Planet>
  )
}
