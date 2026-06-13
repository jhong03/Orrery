/**
 * Terrain elevation for the 3D ground, from the keyless, CORS-enabled AWS
 * "Terrarium" DEM tiles (same slippy z/x/y scheme as the imagery). Each pixel
 * encodes metres as height = R*256 + G + B/256 − 32768.
 */
export const TERRAIN_URL = (z: number, y: number, x: number) =>
  `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`

/**
 * Decoded elevation grid at the tile's NATIVE resolution (typically 256×256),
 * row 0 = north edge, metres. Kept full-res so the displacement mesh can
 * sample it bilinearly at any tessellation — nearest-resampling onto a coarse
 * grid is what produced the stair-stepped facets.
 */
export interface HeightGrid {
  size: number
  data: Float32Array
}

const cache = new Map<string, Promise<HeightGrid | null>>()

/** Load + decode a Terrarium tile to its native-resolution height grid.
 *  Cached per URL; never rejects (missing/tainted tile -> null -> flat). */
export function loadHeightGrid(url: string): Promise<HeightGrid | null> {
  const hit = cache.get(url)
  if (hit) return hit
  const p = new Promise<HeightGrid | null>((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const w = img.width
        const h = img.height
        const c = document.createElement('canvas')
        c.width = w
        c.height = h
        const ctx = c.getContext('2d', { willReadFrequently: true })!
        ctx.drawImage(img, 0, 0)
        const px = ctx.getImageData(0, 0, w, h).data
        const size = Math.min(w, h)
        const data = new Float32Array(size * size)
        for (let r = 0; r < size; r++) {
          for (let col = 0; col < size; col++) {
            const i = (r * w + col) * 4
            data[r * size + col] = px[i] * 256 + px[i + 1] + px[i + 2] / 256 - 32768
          }
        }
        resolve({ size, data })
      } catch {
        resolve(null) // tainted canvas / decode failure -> flat fallback
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
  cache.set(url, p)
  return p
}

/**
 * Bilinearly sample a height grid at texture coords (u,v), v=0 at the bottom
 * (WebGL), matching how the imagery texture is mapped onto the plane. Smooth
 * interpolation between samples removes the stair-step facets that nearest
 * sampling produced. Out-of-range uv clamps to the edge. Metres.
 */
export function sampleHeight(grid: HeightGrid, u: number, v: number): number {
  const { size, data } = grid
  const max = size - 1
  // Texture v=0 is the bottom; grid row 0 is the north (top) edge.
  const fx = Math.min(max, Math.max(0, u * max))
  const fy = Math.min(max, Math.max(0, (1 - v) * max))
  const x0 = Math.floor(fx)
  const y0 = Math.floor(fy)
  const x1 = Math.min(max, x0 + 1)
  const y1 = Math.min(max, y0 + 1)
  const tx = fx - x0
  const ty = fy - y0
  const h00 = data[y0 * size + x0]
  const h10 = data[y0 * size + x1]
  const h01 = data[y1 * size + x0]
  const h11 = data[y1 * size + x1]
  const top = h00 + (h10 - h00) * tx
  const bot = h01 + (h11 - h01) * tx
  return top + (bot - top) * ty
}
