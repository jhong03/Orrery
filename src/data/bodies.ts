import type { BodyId } from '../ephemeris/types'

/** Static per-body constants. Grows into the full facts sheet in later milestones. */
export interface BodyConstants {
  name: string
  /** Mean radius, km (true values; never scaled here). */
  radiusKm: number
  /** Placeholder albedo color until textures land in M2. */
  color: string
}

export const BODY_CONSTANTS: Record<BodyId, BodyConstants> = {
  sun: { name: 'Sun', radiusKm: 695_700, color: '#ffd27d' },
  mercury: { name: 'Mercury', radiusKm: 2_439.7, color: '#9c8e84' },
  venus: { name: 'Venus', radiusKm: 6_051.8, color: '#e6c89c' },
  earth: { name: 'Earth', radiusKm: 6_371, color: '#4a7bd0' },
  moon: { name: 'Moon', radiusKm: 1_737.4, color: '#b8b8b8' },
  mars: { name: 'Mars', radiusKm: 3_389.5, color: '#c1653f' },
  jupiter: { name: 'Jupiter', radiusKm: 69_911, color: '#c8a878' },
  saturn: { name: 'Saturn', radiusKm: 58_232, color: '#e0cda6' },
  uranus: { name: 'Uranus', radiusKm: 25_362, color: '#9fd6dc' },
  neptune: { name: 'Neptune', radiusKm: 24_622, color: '#4762d8' },
  // Planet moons (circular-orbit model).
  io: { name: 'Io', radiusKm: 1_821.6, color: '#d8c161' },
  europa: { name: 'Europa', radiusKm: 1_560.8, color: '#d8cfc0' },
  ganymede: { name: 'Ganymede', radiusKm: 2_634.1, color: '#9b8d7d' },
  callisto: { name: 'Callisto', radiusKm: 2_410.3, color: '#6f655a' },
  titan: { name: 'Titan', radiusKm: 2_574.7, color: '#c8973f' },
  // Comets (nucleus radii) and named asteroids.
  halley: { name: '1P/Halley', radiusKm: 5.5, color: '#bcd4e6' },
  encke: { name: '2P/Encke', radiusKm: 2.4, color: '#bcd4e6' },
  cg67p: { name: '67P/Churyumov–Gerasimenko', radiusKm: 2.0, color: '#bcd4e6' },
  neowise: { name: 'C/2020 F3 (NEOWISE)', radiusKm: 2.5, color: '#bcd4e6' },
  ceres: { name: 'Ceres', radiusKm: 469.7, color: '#8d877f' },
  vesta: { name: 'Vesta', radiusKm: 262.7, color: '#a89a85' },
}
