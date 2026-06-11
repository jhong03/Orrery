/**
 * Body orientation: axial tilt + sidereal rotation from the IAU 2015
 * rotational elements, via astronomy-engine's RotationAxis.
 *
 * Output is a body-fixed, right-handed basis expressed in the J2000 ecliptic
 * frame (same frame as all positions):
 *   xAxis — prime meridian (planetographic longitude 0°) on the equator
 *   yAxis — longitude 90° east on the equator
 *   zAxis — north pole (IAU: the pole north of the invariable plane,
 *           so Venus/Uranus spin retrograde with W decreasing)
 *
 * Pure TS — no three.js imports.
 */
import { Body, RotationAxis, RotateVector, Rotation_EQJ_ECL, Vector } from 'astronomy-engine'

import { jdToAstroTime } from './time'
import type { MajorBodyId, Vec3Km } from './types'

const EQJ_TO_ECL = Rotation_EQJ_ECL()

const BODY_MAP: Record<MajorBodyId, Body> = {
  sun: Body.Sun,
  mercury: Body.Mercury,
  venus: Body.Venus,
  earth: Body.Earth,
  moon: Body.Moon,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
  uranus: Body.Uranus,
  neptune: Body.Neptune,
}

export interface BodyAxes {
  xAxis: Vec3Km
  yAxis: Vec3Km
  zAxis: Vec3Km
}

export function createBodyAxes(): BodyAxes {
  return {
    xAxis: { x: 1, y: 0, z: 0 },
    yAxis: { x: 0, y: 1, z: 0 },
    zAxis: { x: 0, y: 0, z: 1 },
  }
}

const DEG = Math.PI / 180

/**
 * Body-fixed basis in the J2000 ecliptic frame at the given Julian Date.
 * Writes into `out` and returns it.
 */
export function bodyAxesEcl(id: MajorBodyId, jd: number, out: BodyAxes): BodyAxes {
  const time = jdToAstroTime(jd)
  const axis = RotationAxis(BODY_MAP[id], time)

  // North pole in EQJ (unit vector).
  const zx = axis.north.x
  const zy = axis.north.y
  const zz = axis.north.z

  // IAU node Q: where the body's equator crosses the ICRF equator, at
  // right ascension (ra + 90°). ra is reported in sidereal hours.
  const alpha = axis.ra * 15 * DEG
  const qx = -Math.sin(alpha)
  const qy = Math.cos(alpha)
  const qz = 0

  // Prime meridian: rotate Q about the pole by the spin angle W (Rodrigues;
  // Q is perpendicular to the pole, so the formula simplifies).
  const w = axis.spin * DEG
  const cw = Math.cos(w)
  const sw = Math.sin(w)
  // z × Q
  const cx = zy * qz - zz * qy
  const cy = zz * qx - zx * qz
  const cz = zx * qy - zy * qx
  const xx = qx * cw + cx * sw
  const xy = qy * cw + cy * sw
  const xz = qz * cw + cz * sw

  // y = z × x completes the right-handed basis.
  const yx = zy * xz - zz * xy
  const yy = zz * xx - zx * xz
  const yz = zx * xy - zy * xx

  // Convert all three axes EQJ -> J2000 ecliptic.
  writeRotated(xx, xy, xz, time, out.xAxis)
  writeRotated(yx, yy, yz, time, out.yAxis)
  writeRotated(zx, zy, zz, time, out.zAxis)
  return out
}

function writeRotated(
  x: number,
  y: number,
  z: number,
  time: ReturnType<typeof jdToAstroTime>,
  out: Vec3Km,
): void {
  const ecl = RotateVector(EQJ_TO_ECL, new Vector(x, y, z, time))
  out.x = ecl.x
  out.y = ecl.y
  out.z = ecl.z
}

/**
 * Planetographic sub-solar point for a body, from its heliocentric position.
 * Longitude is east-positive in [-180, 180]. The Earth value must match
 * real UTC: local solar noon at the sub-solar longitude.
 */
export function subSolarPoint(
  id: MajorBodyId,
  jd: number,
  helioPos: Vec3Km,
): { latDeg: number; lonDeg: number } {
  const axes = bodyAxesEcl(id, jd, createBodyAxes())
  // Direction from body to Sun.
  const r = Math.sqrt(helioPos.x ** 2 + helioPos.y ** 2 + helioPos.z ** 2)
  const sx = -helioPos.x / r
  const sy = -helioPos.y / r
  const sz = -helioPos.z / r
  const bx = sx * axes.xAxis.x + sy * axes.xAxis.y + sz * axes.xAxis.z
  const by = sx * axes.yAxis.x + sy * axes.yAxis.y + sz * axes.yAxis.z
  const bz = sx * axes.zAxis.x + sy * axes.zAxis.y + sz * axes.zAxis.z
  return {
    latDeg: Math.asin(Math.max(-1, Math.min(1, bz))) / DEG,
    lonDeg: Math.atan2(by, bx) / DEG,
  }
}

/** Angle in degrees between a body's north pole and the ecliptic north. */
export function obliquityToEclipticDeg(id: MajorBodyId, jd: number): number {
  const axes = bodyAxesEcl(id, jd, createBodyAxes())
  return Math.acos(Math.max(-1, Math.min(1, axes.zAxis.z))) / DEG
}

/** Raw IAU spin angle W in degrees (for spin-direction tests). */
export function spinAngleDeg(id: MajorBodyId, jd: number): number {
  return RotationAxis(BODY_MAP[id], jdToAstroTime(jd)).spin
}
