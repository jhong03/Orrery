import { create } from 'zustand'

import type { ScaleMode } from '../utils/scale'

export interface SettingsState {
  scaleMode: ScaleMode
  showOrbits: boolean
  showLabels: boolean
  bloomIntensity: number

  setScaleMode: (mode: ScaleMode) => void
  setShowOrbits: (show: boolean) => void
  setShowLabels: (show: boolean) => void
  setBloomIntensity: (intensity: number) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  scaleMode: 'visible',
  showOrbits: true,
  showLabels: true,
  bloomIntensity: 0.85,

  setScaleMode: (scaleMode) => set({ scaleMode }),
  setShowOrbits: (showOrbits) => set({ showOrbits }),
  setShowLabels: (showLabels) => set({ showLabels }),
  setBloomIntensity: (bloomIntensity) => set({ bloomIntensity }),
}))
