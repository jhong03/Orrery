/**
 * Terrain elevation for the 3D ground, from the keyless, CORS-enabled AWS
 * "Terrarium" DEM tiles (same slippy z/x/y scheme as the imagery). Each pixel
 * encodes metres as height = R*256 + G + B/256 − 32768.
 */
export const TERRAIN_URL = (z: number, y: number, x: number) =>
  `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`

/** Decoded elevation grid: `size`×`size` samples, row 0 = north edge, metres. */
export interface HeightGrid {
  size: number
  data: Float32Array
}

const cache = new Map<string, Promise<HeightGrid | null>>()

/** Load + decode a Terrarium tile to an N×N height grid. Never rejects. */
export function loadHeightGrid(url: string, size: number): Promise<HeightGrid | null> {
  const key = `${size}|${url}`
  const hit = cache.get(key)
  if (hit) return hit
  const p = new Promise<HeightGrid | null>((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const c = document.createElement('canvas')
        c.width = img.width
        c.height = img.height
        const ctx = c.getContext('2d', { willReadFrequently: true })!
        ctx.drawImage(img, 0, 0)
        const px = ctx.getImageData(0, 0, img.width, img.height).data
        const data = new Float32Array(size * size)
        // Bilinear-free nearest sampling onto the coarser grid is plenty here.
        for (let r = 0; r < size; r++) {
          const sy = Math.min(img.height - 1, Math.round((r / (size - 1)) * (img.height - 1)))
          for (let col = 0; col < size; col++) {
            const sx = Math.min(img.width - 1, Math.round((col / (size - 1)) * (img.width - 1)))
            const i = (sy * img.width + sx) * 4
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
  cache.set(key, p)
  return p
}

/**
 * Sample a height grid at texture coords (u,v), v=0 at the bottom (WebGL),
 * matching how the imagery texture is mapped onto the plane. Metres.
 */
export function sampleHeight(grid: HeightGrid, u: number, v: number): number {
  const { size, data } = grid
  const col = Math.min(size - 1, Math.max(0, Math.round(u * (size - 1))))
  // Texture v=0 is the bottom; grid row 0 is the north (top) edge.
  const row = Math.min(size - 1, Math.max(0, Math.round((1 - v) * (size - 1))))
  return data[row * size + col]
}
