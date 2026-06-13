import { create } from 'zustand'

import type { BodyId } from '../ephemeris/types'

/** What the look controls should aim at when surface mode opens. */
export type LookTarget = BodyId | 'sun-az' | null

export interface EnterOptions {
  placeName?: string
  /** Aim the initial view at this body (e.g. 'moon' for a lunar eclipse). */
  lookAt?: LookTarget
  /** Short "why this spot is special" blurb shown in the surface HUD. */
  note?: string
}

/**
 * Surface (ground-view) mode: standing at a geographic location on Earth,
 * looking at the sky. Entered from orbit mode by double-clicking Earth or
 * via UI; the orbit scene hides while active.
 */
export interface SurfaceState {
  active: boolean
  latDeg: number
  lonDeg: number
  /** Display name when entered via a known place; null for free picks. */
  placeName: string | null
  /** "Why this spot is special" blurb, shown in the HUD; null for plain picks. */
  note: string | null
  /** Consumed once by SurfaceControls on entry, then cleared. */
  lookAt: LookTarget
  /** Bumped on each enter() so the controls re-aim even at the same spot. */
  enterSeq: number

  enter: (latDeg: number, lonDeg: number, opts?: EnterOptions) => void
  exit: () => void
}

export const useSurfaceStore = create<SurfaceState>((set) => ({
  active: false,
  latDeg: 51.4779, // Greenwich, until the first pick
  lonDeg: -0.0015,
  placeName: 'Greenwich',
  note: null,
  lookAt: 'sun-az',
  enterSeq: 0,

  enter: (latDeg, lonDeg, opts) =>
    set((s) => ({
      active: true,
      latDeg,
      lonDeg,
      placeName: opts?.placeName ?? null,
      note: opts?.note ?? null,
      lookAt: opts?.lookAt ?? 'sun-az',
      enterSeq: s.enterSeq + 1,
    })),
  exit: () => set({ active: false }),
}))
