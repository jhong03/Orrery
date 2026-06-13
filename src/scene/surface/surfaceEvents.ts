/**
 * Per-frame surface event state, computed once by SurfaceScene and read by
 * the sky dome, ground and Moon. Plain singleton, no allocations.
 *
 *  solarOcclusion — fraction of the Sun's disc covered by the Moon for THIS
 *                   observer (topocentric); drives totality dimming.
 *  lunarEclipse   — fraction of the Sun (seen from the Moon) covered by Earth;
 *                   drives the blood-moon copper tint. Observer-independent.
 */
import { angularRadius } from '../../ephemeris/topocentric'
import { vecDistance, type Vec3Km } from '../../ephemeris/types'
import { frame } from '../frameState'

export const surfaceEvents = {
  solarOcclusion: 0,
  lunarEclipse: 0,
}

/** Fraction of disc A (radius a) covered by disc B (radius b), centers `sep` apart — all radians. */
function coveredFraction(a: number, b: number, sep: number): number {
  if (sep >= a + b) return 0
  if (sep <= Math.abs(a - b)) return Math.min(1, (b * b) / (a * a)) // B engulfs A (capped)
  // Lens (intersection) area of two circles, divided by A's area.
  const a2 = a * a
  const b2 = b * b
  const x = (a2 - b2 + sep * sep) / (2 * sep)
  const y = Math.sqrt(Math.max(0, a2 - x * x))
  const lens =
    a2 * Math.acos(Math.min(1, Math.max(-1, x / a))) +
    b2 * Math.acos(Math.min(1, Math.max(-1, (sep - x) / b))) -
    sep * y
  return Math.min(1, lens / (Math.PI * a2))
}

/** Angular separation (radians) between two directions given as Vec3Km. */
function angleBetween(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
): number {
  const la = Math.hypot(ax, ay, az)
  const lb = Math.hypot(bx, by, bz)
  const c = (ax * bx + ay * by + az * bz) / (la * lb)
  return Math.acos(Math.min(1, Math.max(-1, c)))
}

const SUN_R = 695_700
const MOON_R = 1_737.4
const EARTH_R = 6_371

export function updateSurfaceEvents(observerHelio: Vec3Km): void {
  const { sun, moon, earth } = frame.sys

  // Solar eclipse: Sun and Moon directions from the observer.
  const sx = sun.x - observerHelio.x
  const sy = sun.y - observerHelio.y
  const sz = sun.z - observerHelio.z
  const mx = moon.x - observerHelio.x
  const my = moon.y - observerHelio.y
  const mz = moon.z - observerHelio.z
  const sunDist = Math.hypot(sx, sy, sz)
  const moonDist = Math.hypot(mx, my, mz)
  const aSun = angularRadius(SUN_R, sunDist)
  const aMoon = angularRadius(MOON_R, moonDist)
  const sep = angleBetween(sx, sy, sz, mx, my, mz)
  // Only when the Moon is in front of the Sun (closer) can it occlude it.
  surfaceEvents.solarOcclusion = moonDist < sunDist ? coveredFraction(aSun, aMoon, sep) : 0

  // Lunar eclipse: from the Moon, does Earth cover the Sun?
  const msx = sun.x - moon.x
  const msy = sun.y - moon.y
  const msz = sun.z - moon.z
  const mex = earth.x - moon.x
  const mey = earth.y - moon.y
  const mez = earth.z - moon.z
  const sunFromMoon = Math.hypot(msx, msy, msz)
  const earthFromMoon = vecDistance(earth, moon)
  const aSun2 = angularRadius(SUN_R, sunFromMoon)
  const aEarth = angularRadius(EARTH_R, earthFromMoon)
  const sep2 = angleBetween(msx, msy, msz, mex, mey, mez)
  surfaceEvents.lunarEclipse = coveredFraction(aSun2, aEarth, sep2)
}
