import { create } from 'zustand'

import { QUALITY_PRESETS, type QualityPreset } from '../data/quality'
import type { ScaleMode } from '../utils/scale'

export type EventsTab = 'eclipses' | 'showers' | 'comets'

const QUALITY_KEY = 'orrery.quality'

function storedQuality(): QualityPreset {
  try {
    const v = localStorage.getItem(QUALITY_KEY)
    if (v && (QUALITY_PRESETS as readonly string[]).includes(v)) return v as QualityPreset
  } catch {
    /* private mode etc. — fall through */
  }
  return 'high'
}

export interface SettingsState {
  scaleMode: ScaleMode
  showOrbits: boolean
  showLabels: boolean
  showShadowCones: boolean
  bloomIntensity: number
  eventsPanelOpen: boolean
  eventsTab: EventsTab
  searchOpen: boolean
  quality: QualityPreset

  setScaleMode: (mode: ScaleMode) => void
  setShowOrbits: (show: boolean) => void
  setShowLabels: (show: boolean) => void
  setShowShadowCones: (show: boolean) => void
  setBloomIntensity: (intensity: number) => void
  setEventsPanelOpen: (open: boolean) => void
  setEventsTab: (tab: EventsTab) => void
  setSearchOpen: (open: boolean) => void
  setQuality: (quality: QualityPreset) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  scaleMode: 'visible',
  showOrbits: true,
  showLabels: true,
  showShadowCones: true,
  bloomIntensity: 0.85,
  eventsPanelOpen: false,
  eventsTab: 'eclipses',
  searchOpen: false,
  quality: storedQuality(),

  setScaleMode: (scaleMode) => set({ scaleMode }),
  setShowOrbits: (showOrbits) => set({ showOrbits }),
  setShowLabels: (showLabels) => set({ showLabels }),
  setShowShadowCones: (showShadowCones) => set({ showShadowCones }),
  setBloomIntensity: (bloomIntensity) => set({ bloomIntensity }),
  setEventsPanelOpen: (eventsPanelOpen) => set({ eventsPanelOpen }),
  setEventsTab: (eventsTab) => set({ eventsTab }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setQuality: (quality) => {
    try {
      localStorage.setItem(QUALITY_KEY, quality)
    } catch {
      /* non-persistent context is fine */
    }
    set({ quality })
  },
}))
