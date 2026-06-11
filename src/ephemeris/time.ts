import { AstroTime, MakeTime } from 'astronomy-engine'

/** Julian Date of the J2000 epoch (2000-01-01 12:00 UTC). */
export const J2000_JD = 2451545.0

/** Julian Date of the Unix epoch (1970-01-01 00:00 UTC). */
export const UNIX_EPOCH_JD = 2440587.5

export const SECONDS_PER_DAY = 86400

/** Supported simulation range: 1900-01-01 .. 2100-12-31 (UTC). */
export const MIN_JD = dateToJd(new Date(Date.UTC(1900, 0, 1)))
export const MAX_JD = dateToJd(new Date(Date.UTC(2100, 11, 31, 23, 59, 59)))

export function dateToJd(date: Date): number {
  return date.getTime() / (SECONDS_PER_DAY * 1000) + UNIX_EPOCH_JD
}

export function jdToDate(jd: number): Date {
  return new Date((jd - UNIX_EPOCH_JD) * SECONDS_PER_DAY * 1000)
}

export function jdNow(): number {
  return dateToJd(new Date())
}

/** astronomy-engine measures UT in days since J2000. */
export function jdToAstroTime(jd: number): AstroTime {
  return MakeTime(jd - J2000_JD)
}

export function astroTimeToJd(time: AstroTime): number {
  return time.ut + J2000_JD
}

export function clampJd(jd: number): number {
  return Math.min(MAX_JD, Math.max(MIN_JD, jd))
}
