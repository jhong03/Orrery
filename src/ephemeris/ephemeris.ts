/**
 * astronomy-engine wrappers: the single source of truth for body positions.
 * All outputs are heliocentric, J2000 ecliptic, kilometers, as JS doubles.
 */
import {
  Body,
  GeoMoon,
  HelioVector,
  RotateVector,
  Rotation_EQJ_ECL,
  type Vector,
} from 'astronomy-engine'

import { SMALL_BODIES, elementsAt } from '../data/smallBodies'
import { keplerPositionKm } from './kepler'
import { planetMoonGeoKm } from './moons'
import { jdToAstroTime } from './time'
import {
  createSystemState,
  KM_PER_AU,
  PLANET_MOON_IDS,
  SMALL_BODY_IDS,
  type BodyId,
  type PlanetId,
  type SystemState,
  type Vec3Km,
} from './types'

export { KM_PER_AU }

/** Constant rotation from J2000 equatorial (EQJ) to J2000 ecliptic (ECL). */
const EQJ_TO_ECL = Rotation_EQJ_ECL()

const PLANET_BODY: Record<PlanetId, Body> = {
  mercury: Body.Mercury,
  venus: Body.Venus,
  earth: Body.Earth,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
  uranus: Body.Uranus,
  neptune: Body.Neptune,
}

function writeEclKm(vec: Vector, out: Vec3Km): void {
  const ecl = RotateVector(EQJ_TO_ECL, vec)
  out.x = ecl.x * KM_PER_AU
  out.y = ecl.y * KM_PER_AU
  out.z = ecl.z * KM_PER_AU
}

/**
 * Heliocentric position of one planet at the given Julian Date.
 * Writes into `out` and returns it.
 */
export function helioPlanetKm(planet: PlanetId, jd: number, out: Vec3Km): Vec3Km {
  const time = jdToAstroTime(jd)
  writeEclKm(HelioVector(PLANET_BODY[planet], time), out)
  return out
}

/**
 * Geocentric position of the Moon (J2000 ecliptic, km).
 * Writes into `out` and returns it.
 */
export function geoMoonKm(jd: number, out: Vec3Km): Vec3Km {
  const time = jdToAstroTime(jd)
  writeEclKm(GeoMoon(time), out)
  return out
}

/**
 * Compute heliocentric states for the Sun, all eight planets and the Moon.
 * Pass a reused `out` (from createSystemState) to avoid per-frame allocation.
 */
export function computeSystemState(jd: number, out: SystemState = createSystemState()): SystemState {
  const time = jdToAstroTime(jd)

  out.sun.x = 0
  out.sun.y = 0
  out.sun.z = 0

  for (const planet of Object.keys(PLANET_BODY) as PlanetId[]) {
    writeEclKm(HelioVector(PLANET_BODY[planet], time), out[planet])
  }

  // Moon: geocentric vector added to Earth's heliocentric position.
  const moonGeo = out.moon
  writeEclKm(GeoMoon(time), moonGeo)
  moonGeo.x += out.earth.x
  moonGeo.y += out.earth.y
  moonGeo.z += out.earth.z

  // Planet moons: planetocentric circular-orbit model + parent position.
  for (const id of PLANET_MOON_IDS) {
    const v = out[id]
    planetMoonGeoKm(id, jd, v)
    const parent = id === 'titan' ? out.saturn : out.jupiter
    v.x += parent.x
    v.y += parent.y
    v.z += parent.z
  }

  // Comets and named asteroids: two-body Kepler propagation.
  for (const id of SMALL_BODY_IDS) {
    keplerPositionKm(elementsAt(SMALL_BODIES[id], jd), jd, out[id])
  }

  return out
}

/** Heliocentric ecliptic longitude in degrees, [0, 360). */
export function helioLongitudeDeg(pos: Vec3Km): number {
  const deg = (Math.atan2(pos.y, pos.x) * 180) / Math.PI
  return ((deg % 360) + 360) % 360
}

export type { BodyId, PlanetId, SystemState, Vec3Km }
