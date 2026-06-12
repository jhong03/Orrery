import { useMemo } from 'react'

import { URANUS_RING_INNER_KM, URANUS_RING_OUTER_KM } from '../../data/planetRender'
import { Planet } from './Planet'
import { Rings } from './Rings'
import { makeRingTexture } from './ringTexture'

/**
 * Uranus with its faint ring system, generated procedurally as a 1D radial
 * strip (narrow dark rings; the epsilon ring dominates at the outer edge).
 */
export function Uranus() {
  const ringMap = useMemo(
    () =>
      makeRingTexture(
        [
          { center: 0.08, alpha: 0.14, sigma: 0.012 }, // 6, 5, 4 group
          { center: 0.36, alpha: 0.2, sigma: 0.012 }, // alpha/beta
          { center: 0.62, alpha: 0.24, sigma: 0.012 }, // eta/gamma/delta
          { center: 0.97, alpha: 0.6, sigma: 0.016 }, // epsilon
        ],
        [172, 176, 184],
      ),
    [],
  )

  return (
    <Planet id="uranus">
      <Rings
        planet="uranus"
        map={ringMap}
        innerKm={URANUS_RING_INNER_KM}
        outerKm={URANUS_RING_OUTER_KM}
      />
    </Planet>
  )
}
