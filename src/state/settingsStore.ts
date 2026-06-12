import { create } from 'zustand'

import type { ScaleMode } from '../utils/scale'

export interface SettingsState {
  scaleMode: ScaleMode
  showOrbits: boolean
  showLabels: boolean
  showShadowCones: boolean
  bloomIntensity: number
  eventsPanelOpen: boolean

  setScaleMode: (mode: ScaleMode) => void
  setShowOrbits: (show: boolean) => void
  setShowLabels: (show: boolean) => void
  setShowShadowCones: (show: boolean) => void
  setBloomIntensity: (intensity: number) => void
  setEventsPanelOpen: (open: boolean) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  scaleMode: 'visible',
  showOrbits: true,
  showLabels: true,
  showShadowCones: true,
  bloomIntensity: 0.85,
  eventsPanelOpen: false,

  setScaleMode: (scaleMode) => set({ scaleMode }),
  setShowOrbits: (showOrbits) => set({ showOrbits }),
  setShowLabels: (showLabels) => set({ showLabels }),
  setShowShadowCones: (showShadowCones) => set({ showShadowCones }),
  setBloomIntensity: (bloomIntensity) => set({ bloomIntensity }),
  setEventsPanelOpen: (eventsPanelOpen) => set({ eventsPanelOpen }),
}))
