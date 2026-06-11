/**
 * Bridge between the double-precision ephemeris frame and the float32 scene.
 *
 * - Ephemeris frame: J2000 ecliptic, heliocentric, km, right-handed, z = ecliptic north.
 * - Scene frame: three.js, y-up. Mapping: (x, y, z)ecl -> (x, z, -y)three
 *   (a rotation of -90 deg about x; stays right-handed).
 *
 * Floating-origin rule: nothing is ever rendered at its absolute heliocentric
 * position. Every frame the focused body's double position is subtracted on
 * the CPU *before* the result is narrowed to float32, so coordinates near the
 * camera are always small.
 */
import { Matrix4, type Quaternion, type Vector3 } from 'three'

import type { BodyAxes } from '../ephemeris/rotation'
import type { Vec3Km } from '../ephemeris/types'

/** Scene scale: 1 three.js unit = 1000 km. */
export const KM_PER_SCENE_UNIT = 1000

/**
 * Write (pos - origin), converted to scene units and axes, into `out`.
 * The subtraction happens in doubles; only the small result hits float32.
 */
export function toSceneRelative(pos: Vec3Km, origin: Vec3Km, out: Vector3): Vector3 {
  const dx = (pos.x - origin.x) / KM_PER_SCENE_UNIT
  const dy = (pos.y - origin.y) / KM_PER_SCENE_UNIT
  const dz = (pos.z - origin.z) / KM_PER_SCENE_UNIT
  return out.set(dx, dz, -dy)
}

export function kmToSceneUnits(km: number): number {
  return km / KM_PER_SCENE_UNIT
}

const basisMatrix = new Matrix4()

/**
 * Convert a body-fixed basis (ecliptic frame) into a three.js quaternion.
 *
 * three.js sphere texture convention (equirectangular): longitude 0 faces
 * local +X, the north pole is local +Y, and longitude 90E faces local -Z.
 * So the rotation maps: +X -> xAxis, +Y -> zAxis, +Z -> -yAxis, with each
 * ecliptic vector passed through the (x, z, -y) scene-axis swap.
 */
export function axesToQuaternion(axes: BodyAxes, out: Quaternion): Quaternion {
  const { xAxis: x, yAxis: y, zAxis: z } = axes
  basisMatrix.set(
    // column 1: image of +X   column 2: image of +Y   column 3: image of +Z
    x.x, z.x, -y.x, 0,
    x.z, z.z, -y.z, 0,
    -x.y, -z.y, y.y, 0,
    0, 0, 0, 1,
  )
  return out.setFromRotationMatrix(basisMatrix)
}
