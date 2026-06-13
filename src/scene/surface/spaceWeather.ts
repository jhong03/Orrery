/**
 * Live geomagnetic activity from NOAA SWPC, used to drive aurora visibility.
 * The planetary Kp index (0–9) sets how far toward the equator the auroral
 * oval reaches. Live data only describes the present, so the value is applied
 * only when sim time is near real "now"; for other dates we fall back to a
 * mild climatological Kp so the poles still glow on a clear night.
 */
const KP_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'

let cachedKp: number | null = null
let fetchedAtMs = 0
let inFlight: Promise<number> | null = null

const CLIMATOLOGICAL_KP = 3 // quiet-to-unsettled; auroras only at high latitude
const STALE_MS = 30 * 60 * 1000

/** Most recent live Kp, fetched once (then cached for 30 min). Never throws. */
export async function fetchKp(nowMs: number): Promise<number> {
  if (cachedKp !== null && nowMs - fetchedAtMs < STALE_MS) return cachedKp
  if (inFlight) return inFlight
  inFlight = (async () => {
    try {
      const res = await fetch(KP_URL)
      const rows: string[][] = await res.json()
      // First row is headers; columns: time_tag, Kp, a_running, station_count.
      const last = rows[rows.length - 1]
      const kp = Number(last[1])
      cachedKp = Number.isFinite(kp) ? kp : CLIMATOLOGICAL_KP
      fetchedAtMs = nowMs
      return cachedKp
    } catch {
      cachedKp = CLIMATOLOGICAL_KP
      fetchedAtMs = nowMs
      return cachedKp
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}

/**
 * Effective Kp to drive the visuals at a given sim instant. Live Kp applies
 * within ~12 h of real now; further out we use the climatological baseline
 * (the live snapshot does not describe arbitrary past/future dates).
 */
export function effectiveKp(simMs: number, nowMs: number): number {
  const live = cachedKp ?? CLIMATOLOGICAL_KP
  const nearNow = Math.abs(simMs - nowMs) < 12 * 60 * 60 * 1000
  return nearNow ? live : CLIMATOLOGICAL_KP
}

/**
 * Equatorward edge of the auroral oval (degrees geomagnetic latitude) for a
 * given Kp — the classic Kp-to-boundary relation, ~66.5° at Kp 0 dropping
 * ~2°/Kp. Auroras are visible when |geomagnetic latitude| exceeds this.
 */
export function auroralBoundaryDeg(kp: number): number {
  return 66.5 - 2 * kp
}

/**
 * Crude geomagnetic latitude from geographic, using the IGRF dipole pole
 * (~80.7°N, 72.7°W). Good enough to decide who sees auroras.
 */
export function geomagneticLatitudeDeg(latDeg: number, lonDeg: number): number {
  const D = Math.PI / 180
  const poleLat = 80.7 * D
  const poleLon = -72.7 * D
  const lat = latDeg * D
  const lon = lonDeg * D
  const sin =
    Math.sin(lat) * Math.sin(poleLat) + Math.cos(lat) * Math.cos(poleLat) * Math.cos(lon - poleLon)
  return Math.asin(Math.max(-1, Math.min(1, sin))) / D
}
