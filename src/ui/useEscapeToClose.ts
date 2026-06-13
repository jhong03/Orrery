import { useEffect } from 'react'

import { useSettingsStore } from '../state/settingsStore'

/**
 * Closes a panel on Escape. Inert while the search palette is open — the
 * palette owns Escape so one press never closes two surfaces.
 */
export function useEscapeToClose(active: boolean, close: () => void) {
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (useSettingsStore.getState().searchOpen) return
      close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, close])
}
