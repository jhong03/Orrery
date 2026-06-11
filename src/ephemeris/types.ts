/**
 * Pure data types for the ephemeris layer.
 * Positions are heliocentric, J2000 ecliptic frame, in kilometers,
 * stored as JS doubles. No three.js types may appear in this layer.
 */

export const KM_PER_AU = 149597870.7

export const PLANET_IDS = [
  'mercury',
  'venus',
  'earth',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
] as const

export type PlanetId = (typeof PLANET_IDS)[number]

/** Bodies whose ephemeris comes from astronomy-engine. */
export type MajorBodyId = PlanetId | 'sun' | 'moon'

export const MAJOR_BODY_IDS: readonly MajorBodyId[] = ['sun', ...PLANET_IDS, 'moon']

/** Major planet satellites propagated by the circular-orbit moon model. */
export const PLANET_MOON_IDS = ['io', 'europa', 'ganymede', 'callisto', 'titan'] as const
export type PlanetMoonId = (typeof PLANET_MOON_IDS)[number]

/** Comets and named asteroids propagated by the Kepler solver. */
export const SMALL_BODY_IDS = ['halley', 'encke', 'cg67p', 'neowise', 'ceres', 'vesta'] as const
export type SmallBodyId = (typeof SMALL_BODY_IDS)[number]

export type BodyId = MajorBodyId | PlanetMoonId | SmallBodyId

export const BODY_IDS: readonly BodyId[] = [
  ...MAJOR_BODY_IDS,
  ...PLANET_MOON_IDS,
  ...SMALL_BODY_IDS,
]

/** Mutable 3-vector in km, J2000 ecliptic, heliocentric. */
export interface Vec3Km {
  x: number
  y: number
  z: number
}

/** One entry per body; reused frame-to-frame to avoid allocation churn. */
export type SystemState = Record<BodyId, Vec3Km>

export function createSystemState(): SystemState {
  const out = {} as SystemState
  for (const id of BODY_IDS) out[id] = { x: 0, y: 0, z: 0 }
  return out
}

export function vecLength(v: Vec3Km): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
}

export function vecDistance(a: Vec3Km, b: Vec3Km): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}
