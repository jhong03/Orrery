import { useMemo } from 'react'
import { DataTexture, LinearFilter, RGBAFormat } from 'three'

import { URANUS_RING_INNER_KM, URANUS_RING_OUTER_KM } from '../../data/planetRender'
import { Planet } from './Planet'
import { Rings } from './Rings'

/**
 * Uranus with its faint ring system, generated procedurally as a 1D radial
 * strip (narrow dark rings; the epsilon ring dominates at the outer edge).
 */
export function Uranus() {
  const ringMap = useMemo(() => {
    const W = 256
    const data = new Uint8Array(W * 4)
    // Narrow gaussian bands: [radial u, alpha]. Epsilon ring last.
    const bands: Array<[number, number, number]> = [
      [0.08, 0.025, 0.008], // 6, 5, 4 group
      [0.36, 0.035, 0.008], // alpha/beta
      [0.62, 0.04, 0.008], // eta/gamma/delta
      [0.97, 0.2, 0.012], // epsilon
    ]
    for (let i = 0; i < W; i++) {
      const u = i / (W - 1)
      let a = 0
      for (const [c, amp, sigma] of bands) {
        a += amp * Math.exp(-((u - c) ** 2) / (2 * sigma * sigma))
      }
      a = Math.min(1, a)
      data[i * 4] = 148
      data[i * 4 + 1] = 152
      data[i * 4 + 2] = 160
      data[i * 4 + 3] = Math.round(a * 255)
    }
    const tex = new DataTexture(data, W, 1, RGBAFormat)
    tex.magFilter = LinearFilter
    tex.minFilter = LinearFilter
    tex.needsUpdate = true
    return tex
  }, [])

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
