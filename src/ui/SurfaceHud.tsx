import { useEffect, useState } from 'react'

import { reverseGeocode } from '../scene/surface/geocode'
import { TILE_ATTRIBUTION } from '../scene/surface/tiles'
import { useSurfaceStore } from '../state/surfaceStore'
import { useSettingsStore } from '../state/settingsStore'
import { useSelectionStore } from '../state/selectionStore'

function formatCoord(latDeg: number, lonDeg: number): string {
  const lat = `${Math.abs(latDeg).toFixed(3)}°${latDeg >= 0 ? 'N' : 'S'}`
  const lon = `${Math.abs(lonDeg).toFixed(3)}°${lonDeg >= 0 ? 'E' : 'W'}`
  return `${lat} ${lon}`
}

/** Top chip while standing on Earth: where you are + how to leave. */
export function SurfaceHud() {
  const active = useSurfaceStore((s) => s.active)
  const latDeg = useSurfaceStore((s) => s.latDeg)
  const lonDeg = useSurfaceStore((s) => s.lonDeg)
  const placeName = useSurfaceStore((s) => s.placeName)
  const note = useSurfaceStore((s) => s.note)
  const exit = useSurfaceStore((s) => s.exit)

  // Resolve the real country/city at this coordinate (reverse geocoding).
  // Keyed by coordinate so a new spot reads "Locating…" until its fetch lands,
  // without a synchronous reset inside the effect.
  const coordKey = `${latDeg.toFixed(3)},${lonDeg.toFixed(3)}`
  const [resolved, setResolved] = useState<{ key: string; name: string | null } | null>(null)
  useEffect(() => {
    if (!active) return
    let cancelled = false
    reverseGeocode(latDeg, lonDeg).then((name) => {
      if (!cancelled) setResolved({ key: coordKey, name })
    })
    return () => {
      cancelled = true
    }
  }, [active, latDeg, lonDeg, coordKey])
  const located = resolved && resolved.key === coordKey ? resolved.name : null

  // Escape leaves the surface — unless a panel is open (it closes first)
  // or the search palette owns the key.
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (useSettingsStore.getState().searchOpen) return
      if (useSettingsStore.getState().eventsPanelOpen) return
      if (useSelectionStore.getState().infoPanelOpen) return
      exit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, exit])

  if (!active) return null

  return (
    <>
      <div className="surface-hud" role="status">
        <span className="surface-pin" aria-hidden="true">
          ●
        </span>
        <span className="surface-place">
          {placeName && placeName !== located ? `${placeName} · ` : ''}
          {located ?? 'Locating…'}
        </span>
        <span className="surface-coord">{formatCoord(latDeg, lonDeg)}</span>
        <span className="surface-hint">drag to look · scroll to zoom</span>
        <button className="hud-btn" onClick={exit} title="Back to orbit (Esc)">
          Leave surface
        </button>
      </div>
      {note && <div className="surface-note">{note}</div>}
      <span className="surface-attrib">{TILE_ATTRIBUTION}</span>
    </>
  )
}
