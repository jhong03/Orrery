import { jdToDate } from '../ephemeris/time'

const DATE_FMT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'short',
  day: '2-digit',
})

function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}

/** "03 Jan 2026" */
export function formatJdDate(jd: number): string {
  return DATE_FMT.format(jdToDate(jd))
}

/** "17:32:09 UTC" */
export function formatJdTime(jd: number): string {
  const d = jdToDate(jd)
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())} UTC`
}

const KM_PER_AU = 149597870.7

/** "1.000 au · 149.6 M km" above 0.05 au, plain km below. */
export function formatDistanceKm(km: number): string {
  const au = km / KM_PER_AU
  if (au >= 0.05) {
    return `${au.toFixed(3)} au · ${(km / 1e6).toFixed(1)} M km`
  }
  return `${Math.round(km).toLocaleString('en-US')} km`
}

/** "29.8 km/s" */
export function formatSpeedKmS(kmPerS: number): string {
  return `${kmPerS.toFixed(1)} km/s`
}

/** "-89 … 57 °C" */
export function formatTempRange(range: [number, number]): string {
  return `${range[0].toLocaleString('en-US')} … ${range[1].toLocaleString('en-US')} °C`
}

/** Human label for a playback speed in sim-seconds per real second. */
export function formatSpeed(secondsPerSecond: number): string {
  const abs = Math.abs(secondsPerSecond)
  const sign = secondsPerSecond < 0 ? '-' : ''
  if (abs < 60) return `${sign}${abs.toFixed(0)} s/s`
  if (abs < 3600) return `${sign}${(abs / 60).toFixed(0)} min/s`
  if (abs < 86400) return `${sign}${(abs / 3600).toFixed(0)} h/s`
  if (abs < 86400 * 365.25) return `${sign}${(abs / 86400).toFixed(0)} d/s`
  return `${sign}${(abs / (86400 * 365.25)).toFixed(0)} yr/s`
}
