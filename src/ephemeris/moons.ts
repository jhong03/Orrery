/**
 * Galilean moons + Titan: circular orbits in the parent's equatorial plane
 * with exact sidereal periods (spec-sanctioned approximation; real
 * eccentricities are < 0.03 so phase error stays within a few degrees).
 *
 * Orbital phase is calibrated against JPL Horizons planetocentric vectors at
 * J2000 (ecliptic frame): the reference vector pins the mean longitude in
 * our node frame, and the exact period carries it to any date.
 *
 * Pure TS — no three.js imports.
 */
import { Body, RotationAxis } from 'astronomy-engine'

import { jdToAstroTime, J2000_JD } from './time'
import type { PlanetMoonId, Vec3Km } from './types'

interface MoonSpec {
  parent: 'jupiter' | 'saturn'
  parentBody: Body
  /** Mean orbital radius, km. */
  orbitRadiusKm: number
  /** Sidereal period, days (exact, published). */
  periodDays: number
  /** JPL Horizons planetocentric position at J2000, ecliptic J2000, km. */
  refVectorKm: Vec3Km
}

export const MOON_SPECS: Record<PlanetMoonId, MoonSpec> = {
  io: {
    parent: 'jupiter',
    parentBody: Body.Jupiter,
    orbitRadiusKm: 421_800,
    periodDays: 1.769137786,
    refVectorKm: { x: 3.99714236329573e5, y: 1.292666509466162e5, z: 1.066325607327993e4 },
  },
  europa: {
    parent: 'jupiter',
    parentBody: Body.Jupiter,
    orbitRadiusKm: 671_100,
    periodDays: 3.551181041,
    refVectorKm: { x: -5.612444737473305e5, y: -3.560130586113582e5, z: -1.795409763917836e4 },
  },
  ganymede: {
    parent: 'jupiter',
    parentBody: Body.Jupiter,
    orbitRadiusKm: 1_070_400,
    periodDays: 7.15455296,
    refVectorKm: { x: -8.213450948603005e5, y: -6.853888243299203e5, z: -3.455773734835535e4 },
  },
  callisto: {
    parent: 'jupiter',
    parentBody: Body.Jupiter,
    orbitRadiusKm: 1_882_700,
    periodDays: 16.6890184,
    refVectorKm: { x: 3.250797306331359e5, y: 1.85226003370172e6, z: 6.47547663980982e4 },
  },
  titan: {
    parent: 'saturn',
    parentBody: Body.Saturn,
    orbitRadiusKm: 1_221_870,
    periodDays: 15.945421,
    refVectorKm: { x: -9.468029384488795e5, y: 7.668680317005697e5, z: -3.029599876766361e5 },
  },
}

const DEG = Math.PI / 180

/**
 * Orthonormal basis of the parent's equatorial plane in ecliptic J2000:
 * e1 along the IAU node, e2 = pole x e1, pole = IAU north.
 * Wobbles negligibly over 1900-2100, so callers may cache per frame.
 */
function equatorBasis(body: Body, jd: number, e1: Vec3Km, e2: Vec3Km): void {
  const axis = RotationAxis(body, jdToAstroTime(jd))
  // Pole in EQJ.
  const zx = axis.north.x
  const zy = axis.north.y
  const zz = axis.north.z
  // IAU node in the ICRF equator plane.
  const alpha = axis.ra * 15 * DEG
  const qx = -Math.sin(alpha)
  const qy = Math.cos(alpha)
  // e2 = pole x node (in EQJ).
  const cx = zy * 0 - zz * qy
  const cy = zz * qx - zx * 0
  const cz = zx * qy - zy * qx
  // Rotate EQJ -> ecliptic J2000 (fixed tilt about the x axis).
  const EPS = 23.43928 * DEG
  const ce = Math.cos(EPS)
  const se = Math.sin(EPS)
  e1.x = qx
  e1.y = qy * ce + 0 * se
  e1.z = -qy * se + 0 * ce
  e2.x = cx
  e2.y = cy * ce + cz * se
  e2.z = -cy * se + cz * ce
}

const tmpE1: Vec3Km = { x: 0, y: 0, z: 0 }
const tmpE2: Vec3Km = { x: 0, y: 0, z: 0 }

/** Calibrated mean longitude at J2000, computed lazily per moon. */
const lambda0: Partial<Record<PlanetMoonId, number>> = {}

function refLongitude(id: PlanetMoonId): number {
  const cached = lambda0[id]
  if (cached !== undefined) return cached
  const spec = MOON_SPECS[id]
  equatorBasis(spec.parentBody, J2000_JD, tmpE1, tmpE2)
  const v = spec.refVectorKm
  const l = Math.atan2(
    v.x * tmpE2.x + v.y * tmpE2.y + v.z * tmpE2.z,
    v.x * tmpE1.x + v.y * tmpE1.y + v.z * tmpE1.z,
  )
  lambda0[id] = l
  return l
}

/**
 * Planetocentric position (km, ecliptic J2000) of a moon at the given JD.
 * Writes into `out` and returns it.
 */
export function planetMoonGeoKm(id: PlanetMoonId, jd: number, out: Vec3Km): Vec3Km {
  const spec = MOON_SPECS[id]
  equatorBasis(spec.parentBody, jd, tmpE1, tmpE2)
  const n = (2 * Math.PI) / spec.periodDays
  const l = refLongitude(id) + n * (jd - J2000_JD)
  const c = Math.cos(l) * spec.orbitRadiusKm
  const s = Math.sin(l) * spec.orbitRadiusKm
  out.x = c * tmpE1.x + s * tmpE2.x
  out.y = c * tmpE1.y + s * tmpE2.y
  out.z = c * tmpE1.z + s * tmpE2.z
  return out
}
