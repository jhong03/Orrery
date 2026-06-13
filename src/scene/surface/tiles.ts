/**
 * Web-mercator (slippy) tile math for the surface-mode ground imagery.
 * Tiles are placed on a local flat patch: ENU kilometer offsets from the
 * observer via an equirectangular approximation — fine at patch scale.
 */

/** Esri World Imagery — keyless, CORS-enabled. Attribution is required. */
export const TILE_URL = (z: number, y: number, x: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`

export const TILE_ATTRIBUTION = 'Imagery © Esri, Maxar, Earthstar Geographics'

const KM_PER_DEG_LAT = 110.574
const KM_PER_DEG_LON_EQ = 111.32

export interface TileSpec {
  url: string
  /** Center offset from the observer, local east/north km. */
  eKm: number
  nKm: number
  /** Plane size, km. */
  wKm: number
  hKm: number
  key: string
  /** Slippy tile address, for fetching the matching elevation tile. */
  z: number
  tx: number
  ty: number
}

function lonToX(lonDeg: number, z: number): number {
  return ((lonDeg + 180) / 360) * 2 ** z
}

function latToY(latDeg: number, z: number): number {
  const lat = (latDeg * Math.PI) / 180
  return ((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * 2 ** z
}

function xToLon(x: number, z: number): number {
  return (x / 2 ** z) * 360 - 180
}

function yToLat(y: number, z: number): number {
  const n = Math.PI * (1 - (2 * y) / 2 ** z)
  return (Math.atan(Math.sinh(n)) * 180) / Math.PI
}

/**
 * An n x n grid of tiles at zoom z centered on the observer.
 * Each tile is sized/positioned from its own mercator bounds.
 */
export function tileGrid(latDeg: number, lonDeg: number, z: number, n: number): TileSpec[] {
  const cx = Math.floor(lonToX(lonDeg, z))
  const cy = Math.floor(latToY(latDeg, z))
  const half = Math.floor(n / 2)
  const max = 2 ** z
  const kmPerDegLon = KM_PER_DEG_LON_EQ * Math.cos((latDeg * Math.PI) / 180)

  const out: TileSpec[] = []
  for (let dy = -half; dy <= half; dy++) {
    const ty = cy + dy
    if (ty < 0 || ty >= max) continue // beyond the poles
    for (let dx = -half; dx <= half; dx++) {
      const tx = (((cx + dx) % max) + max) % max // wrap the antimeridian
      const w = xToLon(cx + dx, z)
      const e = xToLon(cx + dx + 1, z)
      const nLat = yToLat(ty, z)
      const sLat = yToLat(ty + 1, z)
      const midLon = (w + e) / 2
      const midLat = (nLat + sLat) / 2
      out.push({
        url: TILE_URL(z, ty, tx),
        key: `${z}/${ty}/${tx}`,
        eKm: (midLon - lonDeg) * kmPerDegLon,
        nKm: (midLat - latDeg) * KM_PER_DEG_LAT,
        wKm: (e - w) * kmPerDegLon,
        hKm: (nLat - sLat) * KM_PER_DEG_LAT,
        z,
        tx,
        ty,
      })
    }
  }
  return out
}

/** The tile containing the observer at zoom `z`, with the fractional position
 * (fx, fy in [0,1], fy measured from the north edge) for elevation sampling. */
export function observerTile(
  latDeg: number,
  lonDeg: number,
  z: number,
): { z: number; tx: number; ty: number; fx: number; fy: number } {
  const fx = lonToX(lonDeg, z)
  const fy = latToY(latDeg, z)
  const tx = Math.floor(fx)
  const ty = Math.floor(fy)
  return { z, tx, ty, fx: fx - tx, fy: fy - ty }
}
