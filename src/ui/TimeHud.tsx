import { useRef, type PointerEvent, type ReactNode } from 'react'

import { useSelectionStore } from '../state/selectionStore'
import { useSettingsStore } from '../state/settingsStore'
import { currentSpeed, useTimeStore } from '../state/timeStore'
import { formatJdDate, formatJdTime, formatSpeed } from '../utils/format'
import type { ScaleMode } from '../utils/scale'

/** Days of sim time represented by one full timeline width. */
const TIMELINE_RANGE_DAYS = 365

function IconPlay() {
  return (
    <svg width="11" height="12" viewBox="0 0 11 12" aria-hidden="true">
      <path d="M1 1l9 5-9 5z" fill="currentColor" />
    </svg>
  )
}

function IconPause() {
  return (
    <svg width="11" height="12" viewBox="0 0 11 12" aria-hidden="true">
      <rect x="1" y="1" width="3.2" height="10" fill="currentColor" />
      <rect x="6.8" y="1" width="3.2" height="10" fill="currentColor" />
    </svg>
  )
}

function IconDirection({ reversed }: { reversed: boolean }) {
  return (
    <svg
      width="14"
      height="12"
      viewBox="0 0 14 12"
      aria-hidden="true"
      style={{ transform: reversed ? 'scaleX(-1)' : undefined }}
    >
      <path d="M1 1l6 5-6 5z" fill="currentColor" />
      <path d="M7 1l6 5-6 5z" fill="currentColor" />
    </svg>
  )
}

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

  // Month ticks; quarters are taller.
  const ticks = Array.from({ length: 13 }, (_, i) => ({
    left: (i / 12) * 100,
    major: i % 3 === 0,
  }))

  return (
    <div
      ref={ref}
      className="timeline"
      role="slider"
      aria-label="Drag horizontally to scrub simulation time, one year across"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {ticks.map(({ left, major }) => (
        <span
          key={left}
          className={`timeline-tick${major ? ' timeline-tick-major' : ''}`}
          style={{ left: `${left}%` }}
        />
      ))}
      <span className="timeline-cursor" />
      <span className="timeline-hint">drag to scrub · 1 year</span>
    </div>
  )
}

function Group({ children }: { children: ReactNode }) {
  return <div className="hud-group">{children}</div>
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
  const showShadowCones = useSettingsStore((s) => s.showShadowCones)
  const eventsPanelOpen = useSettingsStore((s) => s.eventsPanelOpen)
  const { setScaleMode, setShowOrbits, setShowLabels, setShowShadowCones, setEventsPanelOpen } =
    useSettingsStore.getState()

  const frameSystem = useSelectionStore((s) => s.frameSystem)

  const speed = currentSpeed({ speedIndex, direction })

  return (
    <div className="hud">
      <div className="hud-clock">
        <span className="hud-date">{formatJdDate(jd)}</span>
        <span className="hud-time">{formatJdTime(jd)}</span>
      </div>

      <Timeline />

      <div className="hud-controls">
        <Group>
          <button
            className={`hud-icon-btn${direction === -1 ? ' is-on' : ''}`}
            onClick={() => setDirection(direction === 1 ? -1 : 1)}
            title={direction === 1 ? 'Time runs forward — click to reverse' : 'Time runs backward — click to reverse'}
            aria-label="Reverse time direction"
          >
            <IconDirection reversed={direction === -1} />
          </button>
          <button className="hud-icon-btn" onClick={() => stepSpeed(-1)} aria-label="Slower" title="Slower">
            −
          </button>
          <button
            className="hud-icon-btn hud-play"
            onClick={togglePlay}
            aria-label={playing ? 'Pause' : 'Play'}
            title={playing ? 'Pause' : 'Play'}
          >
            {playing ? <IconPause /> : <IconPlay />}
          </button>
          <button className="hud-icon-btn" onClick={() => stepSpeed(1)} aria-label="Faster" title="Faster">
            +
          </button>
          <span className="hud-speed">{formatSpeed(speed)}</span>
        </Group>

        <span className="hud-divider" />

        <Group>
          <button className="hud-btn" onClick={setNow} title="Return to the present">
            Now
          </button>
          <button
            className={`hud-btn${eventsPanelOpen ? ' hud-btn-active' : ''}`}
            onClick={() => setEventsPanelOpen(!eventsPanelOpen)}
            title="Eclipses, meteor showers and comets"
          >
            Events
          </button>
          <button className="hud-btn" onClick={frameSystem} title="Zoom out to the whole system">
            Overview
          </button>
        </Group>

        <span className="hud-divider" />

        <Group>
          <select
            className="hud-select"
            value={scaleMode}
            onChange={(e) => setScaleMode(e.target.value as ScaleMode)}
            title="Scale mode — readouts always show true values"
            aria-label="Scale mode"
          >
            <option value="visible">Visible scale</option>
            <option value="realistic">Realistic scale</option>
          </select>
          <button
            className={`hud-pill${showOrbits ? ' is-on' : ''}`}
            onClick={() => setShowOrbits(!showOrbits)}
            aria-pressed={showOrbits}
          >
            Orbits
          </button>
          <button
            className={`hud-pill${showLabels ? ' is-on' : ''}`}
            onClick={() => setShowLabels(!showLabels)}
            aria-pressed={showLabels}
          >
            Labels
          </button>
          <button
            className={`hud-pill${showShadowCones ? ' is-on' : ''}`}
            onClick={() => setShowShadowCones(!showShadowCones)}
            aria-pressed={showShadowCones}
            title="Umbra and penumbra cones near eclipses"
          >
            Shadows
          </button>
        </Group>
      </div>
    </div>
  )
}
