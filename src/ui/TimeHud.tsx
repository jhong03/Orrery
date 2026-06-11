import { useRef, type PointerEvent } from 'react'

import { useSelectionStore } from '../state/selectionStore'
import { useSettingsStore } from '../state/settingsStore'
import { currentSpeed, useTimeStore } from '../state/timeStore'
import { formatJdDate, formatJdTime, formatSpeed } from '../utils/format'
import type { ScaleMode } from '../utils/scale'

/** Days of sim time represented by one full timeline width. */
const TIMELINE_RANGE_DAYS = 365

/**
 * Draggable timeline strip: horizontal drag scrubs simulation time live.
 * One full strip width = one year. Playback pauses while scrubbing and
 * resumes (if it was playing) on release.
 */
function Timeline() {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef({ active: false, startX: 0, startJd: 0, wasPlaying: false })

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    el.setPointerCapture(e.pointerId)
    const s = useTimeStore.getState()
    drag.current = { active: true, startX: e.clientX, startJd: s.jd, wasPlaying: s.playing }
    s.setPlaying(false)
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!drag.current.active || !el) return
    const dx = e.clientX - drag.current.startX
    const days = (dx / el.clientWidth) * TIMELINE_RANGE_DAYS
    // Dragging right moves forward in time.
    useTimeStore.getState().setJd(drag.current.startJd + days)
  }

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!drag.current.active || !el) return
    drag.current.active = false
    el.releasePointerCapture(e.pointerId)
    if (drag.current.wasPlaying) useTimeStore.getState().setPlaying(true)
  }

  // 12 month ticks across the strip; the centre marker is "now".
  const ticks = Array.from({ length: 13 }, (_, i) => (i / 12) * 100)

  return (
    <div
      ref={ref}
      className="timeline"
      role="slider"
      aria-label="Drag horizontally to scrub simulation time"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {ticks.map((left) => (
        <span key={left} className="timeline-tick" style={{ left: `${left}%` }} />
      ))}
      <span className="timeline-cursor" />
      <span className="timeline-hint">drag to scrub · 1 year across</span>
    </div>
  )
}

export function TimeHud() {
  const jd = useTimeStore((s) => s.jd)
  const playing = useTimeStore((s) => s.playing)
  const speedIndex = useTimeStore((s) => s.speedIndex)
  const direction = useTimeStore((s) => s.direction)
  const { togglePlay, stepSpeed, setDirection, setNow } = useTimeStore.getState()

  const scaleMode = useSettingsStore((s) => s.scaleMode)
  const showOrbits = useSettingsStore((s) => s.showOrbits)
  const showLabels = useSettingsStore((s) => s.showLabels)
  const { setScaleMode, setShowOrbits, setShowLabels } = useSettingsStore.getState()

  const frameSystem = useSelectionStore((s) => s.frameSystem)

  const speed = currentSpeed({ speedIndex, direction })

  return (
    <div className="hud">
      <div className="hud-row">
        <span className="hud-date">{formatJdDate(jd)}</span>
        <span className="hud-time">{formatJdTime(jd)}</span>
      </div>
      <Timeline />
      <div className="hud-row">
        <button
          className="hud-btn"
          onClick={() => setDirection(direction === 1 ? -1 : 1)}
          title="Reverse time direction"
        >
          {direction === 1 ? '▶▶' : '◀◀'}
        </button>
        <button className="hud-btn" onClick={() => stepSpeed(-1)} title="Slower">
          −
        </button>
        <button className="hud-btn hud-play" onClick={togglePlay}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <button className="hud-btn" onClick={() => stepSpeed(1)} title="Faster">
          +
        </button>
        <span className="hud-speed">{formatSpeed(speed)}</span>
        <button className="hud-btn" onClick={setNow}>
          Now
        </button>
      </div>
      <div className="hud-row">
        <button className="hud-btn" onClick={frameSystem}>
          System view
        </button>
        <select
          className="hud-select"
          value={scaleMode}
          onChange={(e) => setScaleMode(e.target.value as ScaleMode)}
          title="Scale mode (readouts always show true values)"
        >
          <option value="visible">Visible scale</option>
          <option value="realistic">Realistic scale</option>
        </select>
        <label className="hud-check">
          <input
            type="checkbox"
            checked={showOrbits}
            onChange={(e) => setShowOrbits(e.target.checked)}
          />
          Orbits
        </label>
        <label className="hud-check">
          <input
            type="checkbox"
            checked={showLabels}
            onChange={(e) => setShowLabels(e.target.checked)}
          />
          Labels
        </label>
      </div>
    </div>
  )
}
