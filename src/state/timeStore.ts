import { create } from 'zustand'

import { clampJd, jdNow, SECONDS_PER_DAY } from '../ephemeris/time'

/**
 * Playback speeds in simulated seconds per real second.
 * Index 0 is real time; the last step is 5 years/second (spec maximum).
 */
export const SPEED_STEPS: readonly number[] = [
  1,
  60,
  600,
  3600,
  6 * 3600,
  SECONDS_PER_DAY,
  7 * SECONDS_PER_DAY,
  30 * SECONDS_PER_DAY,
  182.625 * SECONDS_PER_DAY,
  365.25 * SECONDS_PER_DAY,
  5 * 365.25 * SECONDS_PER_DAY,
]

export interface TimeState {
  /** Simulation time as a UTC Julian Date (double). Single source of truth. */
  jd: number
  playing: boolean
  /** Index into SPEED_STEPS. */
  speedIndex: number
  /** +1 forwards, -1 backwards. */
  direction: 1 | -1

  setJd: (jd: number) => void
  setNow: () => void
  togglePlay: () => void
  setPlaying: (playing: boolean) => void
  stepSpeed: (delta: 1 | -1) => void
  setDirection: (direction: 1 | -1) => void
  /** Advance the clock by real elapsed seconds. Called once per frame. */
  advance: (dtRealSeconds: number) => void
}

/** Signed simulated seconds per real second for the current settings. */
export function currentSpeed(state: Pick<TimeState, 'speedIndex' | 'direction'>): number {
  return SPEED_STEPS[state.speedIndex] * state.direction
}

export const useTimeStore = create<TimeState>((set) => ({
  jd: clampJd(jdNow()),
  playing: true,
  speedIndex: 5, // 1 day/second: motion is visible immediately on load
  direction: 1,

  setJd: (jd) => set({ jd: clampJd(jd) }),
  setNow: () => set({ jd: clampJd(jdNow()) }),
  togglePlay: () => set((s) => ({ playing: !s.playing })),
  setPlaying: (playing) => set({ playing }),
  stepSpeed: (delta) =>
    set((s) => ({
      speedIndex: Math.min(SPEED_STEPS.length - 1, Math.max(0, s.speedIndex + delta)),
    })),
  setDirection: (direction) => set({ direction }),
  advance: (dtRealSeconds) =>
    set((s) => {
      if (!s.playing) return s
      const dJd = (dtRealSeconds * currentSpeed(s)) / SECONDS_PER_DAY
      return { jd: clampJd(s.jd + dJd) }
    }),
}))
