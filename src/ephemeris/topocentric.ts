/**
 * Topocentric geometry for surface mode: an observer standing at a
 * geographic lat/lon sees bodies along directions computed from TRUE
 * positions (km doubles), so parallax is exact — during a solar eclipse
 * the Moon's disc really covers the Sun's.
 *
 * Pure TS — no three.js imports. The local frame is ENU (east, north, up);
 * the scene layer maps it to render axes.
 */
import type { BodyAxes } from './rotation'
import type { Vec3Km } from './types'

export const EARTH_RADIUS_KM = 6371

const DEG = Math.PI / 180

/** East/north/up unit vectors in the J2000 ecliptic frame. */
export interface EnuBasis {
  east: Vec3Km
  north: Vec3Km
  up: Vec3Km
}

export function createEnuBasis(): EnuBasis {
  return {
    east: { x: 0, y: 1, z: 0 },
    north: { x: 0, y: 0, z: 1 },
    up: { x: 1, y: 0, z: 0 },
  }
}

/** Body-fixed vector -> ecliptic frame through the body's IAU axes. */
function bfToEcl(bx: number, by: number, bz: number, axes: BodyAxes, out: Vec3Km): Vec3Km {
  out.x = bx * axes.xAxis.x + by * axes.yAxis.x + bz * axes.zAxis.x
  out.y = bx * axes.xAxis.y + by * axes.yAxis.y + bz * axes.zAxis.y
  out.z = bx * axes.xAxis.z + by * axes.yAxis.z + bz * axes.zAxis.z
  return out
}

/**
 * ENU basis at a geographic location, in the ecliptic frame.
 * `axes` must be Earth's body-fixed basis for the same instant.
 */
export function enuBasisEcl(
  latDeg: number,
  lonDeg: number,
  axes: BodyAxes,
  out: EnuBasis,
): EnuBasis {
  const lat = latDeg * DEG
  const lon = lonDeg * DEG
  const cLat = Math.cos(lat)
  const sLat = Math.sin(lat)
  const cLon = Math.cos(lon)
  const sLon = Math.sin(lon)
  // Body-fixed: up is radial, north points along the meridian, east = n x u.
  bfToEcl(cLat * cLon, cLat * sLon, sLat, axes, out.up)
  bfToEcl(-sLat * cLon, -sLat * sLon, cLat, axes, out.north)
  bfToEcl(-sLon, cLon, 0, axes, out.east)
  return out
}

/** Observer's heliocentric position (km): Earth's center + surface radial. */
export function observerHelioKm(
  earthHelio: Vec3Km,
  basis: EnuBasis,
  out: Vec3Km,
  heightKm = 0,
): Vec3Km {
  const r = EARTH_RADIUS_KM + heightKm
  out.x = earthHelio.x + basis.up.x * r
  out.y = earthHelio.y + basis.up.y * r
  out.z = earthHelio.z + basis.up.z * r
  return out
}

/** ENU components of an (un-normalized) ecliptic direction. */
export function eclToEnu(d: Vec3Km, basis: EnuBasis, out: Vec3Km): Vec3Km {
  out.x = d.x * basis.east.x + d.y * basis.east.y + d.z * basis.east.z
  out.y = d.x * basis.north.x + d.y * basis.north.y + d.z * basis.north.z
  out.z = d.x * basis.up.x + d.y * basis.up.y + d.z * basis.up.z
  return out
}

/** Azimuth (degrees from north, clockwise through east) and altitude. */
export function azAltDeg(enu: Vec3Km): { azDeg: number; altDeg: number } {
  const len = Math.hypot(enu.x, enu.y, enu.z)
  const azDeg = (Math.atan2(enu.x, enu.y) / DEG + 360) % 360
  const altDeg = Math.asin(Math.max(-1, Math.min(1, enu.z / len))) / DEG
  return { azDeg, altDeg }
}

/** Apparent angular radius (radians) of a body of radius r at distance d. */
export function angularRadius(radiusKm: number, distanceKm: number): number {
  return Math.asin(Math.min(1, radiusKm / distanceKm))
}
