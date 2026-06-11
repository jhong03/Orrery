/**
 * Two-body Keplerian propagation for small bodies (comets, Ceres, Vesta).
 * astronomy-engine remains the source of truth for planets and the Moon;
 * this module only covers bodies it does not.
 *
 * Pure TS — no three.js imports.
 */
import { KM_PER_AU, type Vec3Km } from './types'

export interface KeplerElements {
  /** Semi-major axis, au. */
  a: number
  /** Eccentricity (elliptical only: 0 <= e < 1). */
  e: number
  /** Inclination, deg, J2000 ecliptic. */
  i: number
  /** Longitude of the ascending node, deg. */
  om: number
  /** Argument of perihelion, deg. */
  w: number
  /** Time of perihelion passage, JD. */
  tp: number
  /** Orbital period, days. */
  periodDays: number
}

const TWO_PI = Math.PI * 2
const DEG = Math.PI / 180

/**
 * Solve Kepler's equation M = E - e sinE for the eccentric anomaly E.
 * Newton-Raphson with a guaranteed bisection fallback; robust to e = 0.999.
 */
export function solveKepler(M: number, e: number): number {
  // Normalize M to [-pi, pi].
  let m = M % TWO_PI
  if (m > Math.PI) m -= TWO_PI
  if (m < -Math.PI) m += TWO_PI

  // The root lies within [m - e, m + e] because |E - M| = e|sinE| <= e.
  let lo = m - e
  let hi = m + e

  // Newton from a high-eccentricity-safe seed.
  let E = e < 0.8 ? m : Math.sign(m) * Math.PI * 0.5 || e
  for (let iter = 0; iter < 60; iter++) {
    const f = E - e * Math.sin(E) - m
    if (Math.abs(f) < 1e-13) return E
    // Maintain the bracket for the fallback.
    if (f > 0) hi = Math.min(hi, E)
    else lo = Math.max(lo, E)
    const fp = 1 - e * Math.cos(E)
    let next = E - f / fp
    // If Newton escapes the bracket, bisect instead.
    if (next <= lo || next >= hi || !Number.isFinite(next)) {
      next = (lo + hi) / 2
    }
    if (next === E) return E
    E = next
  }
  return E
}

/**
 * Heliocentric J2000 ecliptic position (km) at the given Julian Date.
 * Writes into `out` and returns it.
 */
export function keplerPositionKm(el: KeplerElements, jd: number, out: Vec3Km): Vec3Km {
  const n = TWO_PI / el.periodDays
  const M = n * (jd - el.tp)
  const E = solveKepler(M, el.e)

  // Perifocal coordinates (x toward perihelion).
  const xp = el.a * (Math.cos(E) - el.e)
  const yp = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E)

  // Rotate perifocal -> ecliptic: Rz(om) * Rx(i) * Rz(w).
  const cw = Math.cos(el.w * DEG)
  const sw = Math.sin(el.w * DEG)
  const ci = Math.cos(el.i * DEG)
  const si = Math.sin(el.i * DEG)
  const co = Math.cos(el.om * DEG)
  const so = Math.sin(el.om * DEG)

  const x1 = xp * cw - yp * sw
  const y1 = xp * sw + yp * cw
  const x2 = x1
  const y2 = y1 * ci
  const z2 = y1 * si

  out.x = (x2 * co - y2 * so) * KM_PER_AU
  out.y = (x2 * so + y2 * co) * KM_PER_AU
  out.z = z2 * KM_PER_AU
  return out
}

/** Heliocentric distance in au at the given JD (cheap, no rotation). */
export function keplerDistanceAu(el: KeplerElements, jd: number): number {
  const n = TWO_PI / el.periodDays
  const E = solveKepler(n * (jd - el.tp), el.e)
  return el.a * (1 - el.e * Math.cos(E))
}

/** JD of the first perihelion passage at or after the given JD. */
export function nextPerihelionJd(el: KeplerElements, jd: number): number {
  const k = Math.ceil((jd - el.tp) / el.periodDays)
  return el.tp + k * el.periodDays
}

/**
 * Closed orbit polyline sampled uniformly in eccentric anomaly (which
 * naturally concentrates points near perihelion where curvature is high).
 */
export function keplerOrbitPoints(el: KeplerElements, n: number): Vec3Km[] {
  const cw = Math.cos(el.w * DEG)
  const sw = Math.sin(el.w * DEG)
  const ci = Math.cos(el.i * DEG)
  const si = Math.sin(el.i * DEG)
  const co = Math.cos(el.om * DEG)
  const so = Math.sin(el.om * DEG)
  const pts: Vec3Km[] = []
  for (let k = 0; k <= n; k++) {
    const E = -Math.PI + (2 * Math.PI * k) / n
    const xp = el.a * (Math.cos(E) - el.e)
    const yp = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E)
    const x1 = xp * cw - yp * sw
    const y1 = xp * sw + yp * cw
    const y2 = y1 * ci
    const z2 = y1 * si
    pts.push({
      x: (x1 * co - y2 * so) * KM_PER_AU,
      y: (x1 * so + y2 * co) * KM_PER_AU,
      z: z2 * KM_PER_AU,
    })
  }
  return pts
}
