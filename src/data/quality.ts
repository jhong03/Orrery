/**
 * Quality presets. Everything they control is cheap to switch at runtime:
 * the belt geometry is built once at the Ultra count and only
 * `instanceCount` moves; comet tails rebuild their (small) particle
 * buffers; textures re-suspend through the drei cache.
 */
export type QualityPreset = 'low' | 'medium' | 'high' | 'ultra'

export const QUALITY_PRESETS: readonly QualityPreset[] = ['low', 'medium', 'high', 'ultra']

export interface QualityConfig {
  label: string
  /** Shown in the settings popover under the active preset. */
  description: string
  /** Upper bound on devicePixelRatio handed to the canvas. */
  pixelRatioCap: number
  /** Instanced rocks drawn in the asteroid belt. */
  beltCount: number
  /** Multiplier on comet tail particle counts (dust 3600, ion 2400 at 1). */
  tailParticleScale: number
  /** Swap in the 8K texture variants where available. */
  hiResTextures: boolean
}

export const QUALITY: Record<QualityPreset, QualityConfig> = {
  low: {
    label: 'Low',
    description: '4k asteroids · short tails · 1x resolution',
    pixelRatioCap: 1,
    beltCount: 4_000,
    tailParticleScale: 0.35,
    hiResTextures: false,
  },
  medium: {
    label: 'Medium',
    description: '10k asteroids · reduced tails · 1.5x resolution cap',
    pixelRatioCap: 1.5,
    beltCount: 10_000,
    tailParticleScale: 0.7,
    hiResTextures: false,
  },
  high: {
    label: 'High',
    description: '20k asteroids · full tails · 2x resolution cap',
    pixelRatioCap: 2,
    beltCount: 20_000,
    tailParticleScale: 1,
    hiResTextures: false,
  },
  ultra: {
    label: 'Ultra',
    description: '32k asteroids · dense tails · 8K Earth/Jupiter/Saturn textures',
    pixelRatioCap: 3,
    beltCount: 32_000,
    tailParticleScale: 1.5,
    hiResTextures: true,
  },
}

/** Belt geometry is allocated once at the largest preset's count. */
export const BELT_MAX_COUNT = QUALITY.ultra.beltCount

/** 8K variants shipped by scripts/fetch-assets.mjs (see ASSETS.md). */
const HI_RES_TEXTURES: Record<string, string> = {
  '/textures/earth_day.jpg': '/textures/hi/earth_day_8k.jpg',
  '/textures/earth_night.jpg': '/textures/hi/earth_night_8k.jpg',
  '/textures/jupiter.jpg': '/textures/hi/jupiter_8k.jpg',
  '/textures/saturn.jpg': '/textures/hi/saturn_8k.jpg',
}

export function texturePath(base: string, quality: QualityPreset): string {
  return QUALITY[quality].hiResTextures ? (HI_RES_TEXTURES[base] ?? base) : base
}
