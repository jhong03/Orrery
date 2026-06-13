/**
 * Web-mercator (slippy) tile math for the surface-mode ground imagery.
 * Tiles are placed on a local flat patch: ENU kilometer offsets from the
 * observer via an equirectangular approximation — fine at patch scale.
 *
 * Imagery zoom is decoupled from elevation zoom: the foreground requests very
 * sharp imagery (z17, ~1 m/px) while elevation comes from the coarser DEM the
 * provider tops out at (z15). Each imagery tile therefore covers only a
 * sub-rectangle of its elevation tile; `tileGrid` precomputes that mapping.
 */
import { TERRAIN_URL } from './terrain'

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
  /** Elevation tile + the [demSx, demSx+demScale]×[demSy, demSy+demScale]
   *  sub-rectangle (fractions from the DEM tile's west/north corner) that this
   *  imagery tile occupies. demScale === 1 when imagery and DEM zoom match. */
  demUrl: string
  demSx: number
  demSy: number
  demScale: number
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
 * An n x n grid of imagery tiles at zoom `imgZ` centered on the observer, each
 * carrying the elevation tile (at zoom `demZ` ≤ `imgZ`) and sub-rect it samples.
 */
export function tileGrid(
  latDeg: number,
  lonDeg: number,
  imgZ: number,
  demZ: number,
  n: number,
): TileSpec[] {
  const cx = Math.floor(lonToX(lonDeg, imgZ))
  const cy = Math.floor(latToY(latDeg, imgZ))
  const half = Math.floor(n / 2)
  const max = 2 ** imgZ
  const maxDem = 2 ** demZ
  const f = 2 ** (imgZ - demZ) // imagery tiles per DEM tile, per axis
  const kmPerDegLon = KM_PER_DEG_LON_EQ * Math.cos((latDeg * Math.PI) / 180)

  const out: TileSpec[] = []
  for (let dy = -half; dy <= half; dy++) {
    const ty = cy + dy
    if (ty < 0 || ty >= max) continue // beyond the poles
    for (let dx = -half; dx <= half; dx++) {
      const tx = (((cx + dx) % max) + max) % max // wrap the antimeridian
      const w = xToLon(cx + dx, imgZ)
      const e = xToLon(cx + dx + 1, imgZ)
      const nLat = yToLat(ty, imgZ)
      const sLat = yToLat(ty + 1, imgZ)
      const midLon = (w + e) / 2
      const midLat = (nLat + sLat) / 2
      // Which DEM tile holds this imagery tile, and where within it.
      const demTx = (((Math.floor(tx / f) % maxDem) + maxDem) % maxDem)
      const demTy = Math.floor(ty / f)
      out.push({
        url: TILE_URL(imgZ, ty, tx),
        key: `${imgZ}/${ty}/${tx}`,
        eKm: (midLon - lonDeg) * kmPerDegLon,
        nKm: (midLat - latDeg) * KM_PER_DEG_LAT,
        wKm: (e - w) * kmPerDegLon,
        hKm: (nLat - sLat) * KM_PER_DEG_LAT,
        demUrl: TERRAIN_URL(demZ, demTy, demTx),
        demSx: (tx - Math.floor(tx / f) * f) / f,
        demSy: (ty - demTy * f) / f,
        demScale: 1 / f,
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
