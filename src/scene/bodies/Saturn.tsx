import { useTexture } from '@react-three/drei'
import { SRGBColorSpace } from 'three'

import { SATURN_RING_INNER_KM, SATURN_RING_OUTER_KM } from '../../data/planetRender'
import { asset } from '../../utils/asset'
import { Planet } from './Planet'
import { Rings } from './Rings'

/**
 * Saturn with its main rings. Mutual shadows are analytic: the planet shader
 * projects the ring annulus toward the Sun (shadow band on the globe), and
 * the ring shader projects the planet sphere (shadow arc across the rings).
 */
export function Saturn() {
  const ringMap = useTexture(asset('/textures/saturn_rings.png'), (t) => {
    t.colorSpace = SRGBColorSpace
    t.anisotropy = 8
  })

  return (
    <Planet
      id="saturn"
      ringShadow={{ map: ringMap, innerKm: SATURN_RING_INNER_KM, outerKm: SATURN_RING_OUTER_KM }}
    >
      <Rings
        planet="saturn"
        map={ringMap}
        innerKm={SATURN_RING_INNER_KM}
        outerKm={SATURN_RING_OUTER_KM}
      />
    </Planet>
  )
}
