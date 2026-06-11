import type { BodyId } from '../ephemeris/types'

/** Per-body parameters for the generic planet shader. */
export interface PlanetRenderConfig {
  texture: string
  /** Half-width of the terminator blend in mu. Airless bodies are sharp. */
  terminatorSoft: number
  /** Limb-darkening coefficient (gas giants are strong). */
  limbDarken: number
  rimColor: [number, number, number]
  rimStrength: number
  /**
   * Rotation (radians, about the spin axis) applied to the texture so that a
   * known feature sits at its true planetographic longitude (e.g. Jupiter's
   * Great Red Spot vs the IAU System III prime meridian).
   */
  textureLonOffsetRad?: number
}

/** Bodies rendered by the generic textured-planet shader. */
export type TexturedPlanetId = Extract<
  BodyId,
  'mercury' | 'venus' | 'moon' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune'
>

export const PLANET_RENDER: Record<TexturedPlanetId, PlanetRenderConfig> = {
  mercury: {
    texture: '/textures/mercury.jpg',
    terminatorSoft: 0.008,
    limbDarken: 0.15,
    rimColor: [0, 0, 0],
    rimStrength: 0,
  },
  venus: {
    // Opaque cloud deck; thick bright limb haze.
    texture: '/textures/venus.jpg',
    terminatorSoft: 0.09,
    limbDarken: 0.45,
    rimColor: [1.0, 0.93, 0.78],
    rimStrength: 0.5,
  },
  moon: {
    texture: '/textures/moon.jpg',
    terminatorSoft: 0.006,
    limbDarken: 0.06,
    rimColor: [0, 0, 0],
    rimStrength: 0,
  },
  mars: {
    // Thin dusty atmosphere: faint orange rim.
    texture: '/textures/mars.jpg',
    terminatorSoft: 0.025,
    limbDarken: 0.12,
    rimColor: [0.95, 0.55, 0.3],
    rimStrength: 0.18,
  },
  jupiter: {
    texture: '/textures/jupiter.jpg',
    terminatorSoft: 0.05,
    limbDarken: 0.55,
    rimColor: [0.85, 0.8, 0.72],
    rimStrength: 0.08,
    // The texture paints the Great Red Spot at lon -48 deg (u = 0.366); the
    // GRS sits near System III lon 63 deg W (2026 est., drifts ~1.5 deg/yr).
    textureLonOffsetRad: (-14.8 * Math.PI) / 180,
  },
  saturn: {
    texture: '/textures/saturn.jpg',
    terminatorSoft: 0.05,
    limbDarken: 0.5,
    rimColor: [0.9, 0.86, 0.72],
    rimStrength: 0.07,
  },
  uranus: {
    // Methane-tinted ice giant.
    texture: '/textures/uranus.jpg',
    terminatorSoft: 0.06,
    limbDarken: 0.5,
    rimColor: [0.62, 0.87, 0.92],
    rimStrength: 0.14,
  },
  neptune: {
    texture: '/textures/neptune.jpg',
    terminatorSoft: 0.06,
    limbDarken: 0.5,
    rimColor: [0.35, 0.5, 1.0],
    rimStrength: 0.16,
  },
}

/** Saturn's main rings: true radial extent in km (C ring inner to A/F outer). */
export const SATURN_RING_INNER_KM = 74_500
export const SATURN_RING_OUTER_KM = 140_220

/** Uranus' faint ring system (epsilon ring dominates), km. */
export const URANUS_RING_INNER_KM = 41_837
export const URANUS_RING_OUTER_KM = 51_149
