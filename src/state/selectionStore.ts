import { create } from 'zustand'

import type { BodyId } from '../ephemeris/types'

export interface SelectionState {
  /** Body the user asked to view. Camera flights chase this. */
  focusedBody: BodyId
  /**
   * Body currently used as the floating render origin. Lags focusedBody:
   * the flight rig rebases it when the camera transition completes.
   */
  originBody: BodyId
  /** True when the user asked for the full-system overview framing. */
  systemView: boolean
  /**
   * Bumped on every focus/overview request. The flight rig compares it with
   * the last sequence it completed, so re-framing the already-focused body
   * (e.g. "System view" while on the Sun) still triggers a flight.
   */
  flightSeq: number

  /** Body info side sheet. Opens on focus, dismissible. */
  infoPanelOpen: boolean

  focusBody: (body: BodyId) => void
  frameSystem: () => void
  /** Called by the flight rig once the camera has arrived. */
  rebaseOrigin: (body: BodyId) => void
  closeInfoPanel: () => void
}

export const useSelectionStore = create<SelectionState>((set) => ({
  focusedBody: 'sun',
  originBody: 'sun',
  systemView: false,
  flightSeq: 0,
  infoPanelOpen: false,

  focusBody: (focusedBody) =>
    set((s) => ({
      focusedBody,
      systemView: false,
      flightSeq: s.flightSeq + 1,
      infoPanelOpen: true,
    })),
  frameSystem: () =>
    set((s) => ({ focusedBody: 'sun', systemView: true, flightSeq: s.flightSeq + 1 })),
  rebaseOrigin: (originBody) => set({ originBody }),
  closeInfoPanel: () => set({ infoPanelOpen: false }),
}))
