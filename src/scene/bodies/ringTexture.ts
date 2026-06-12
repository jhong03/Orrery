import { DataTexture, LinearFilter, RGBAFormat } from 'three'

/** A radial ring band: gaussian profile at `center` (0..1), alpha amplitude. */
export interface RingBand {
  center: number
  alpha: number
  sigma: number
}

/**
 * 1D radial strip texture for faint procedural ring systems (Jupiter,
 * Uranus, Neptune — Saturn uses a real photo strip).
 */
export function makeRingTexture(
  bands: RingBand[],
  rgb: [number, number, number],
  width = 256,
): DataTexture {
  const data = new Uint8Array(width * 4)
  for (let i = 0; i < width; i++) {
    const u = i / (width - 1)
    let a = 0
    for (const b of bands) {
      a += b.alpha * Math.exp(-((u - b.center) ** 2) / (2 * b.sigma * b.sigma))
    }
    data[i * 4] = rgb[0]
    data[i * 4 + 1] = rgb[1]
    data[i * 4 + 2] = rgb[2]
    data[i * 4 + 3] = Math.round(Math.min(1, a) * 255)
  }
  const tex = new DataTexture(data, width, 1, RGBAFormat)
  tex.magFilter = LinearFilter
  tex.minFilter = LinearFilter
  tex.needsUpdate = true
  return tex
}
