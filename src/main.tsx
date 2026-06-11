import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { frame } from './scene/frameState.ts'
import { useSelectionStore } from './state/selectionStore.ts'
import { useSettingsStore } from './state/settingsStore.ts'
import { useTimeStore } from './state/timeStore.ts'

if (import.meta.env.DEV) {
  // Dev-only hook for the headless smoke/tour scripts.
  Object.assign(window, {
    __orrery: { useTimeStore, useSelectionStore, useSettingsStore, frame },
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
