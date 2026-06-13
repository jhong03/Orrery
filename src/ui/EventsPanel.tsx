import { useEffect, useMemo, useState } from 'react'

import { BODY_CONSTANTS } from '../data/bodies'
import { isShowerActive, METEOR_SHOWERS } from '../data/meteorShowers'
import { COMET_IDS, SMALL_BODIES, elementsAt } from '../data/smallBodies'
import { nextEclipses } from '../ephemeris/events'
import { keplerDistanceAu, nextPerihelionJd } from '../ephemeris/kepler'
import { jdToDate } from '../ephemeris/time'
import { useSelectionStore } from '../state/selectionStore'
import { useSettingsStore } from '../state/settingsStore'
import { useTimeStore } from '../state/timeStore'
import { formatJdDate, formatJdTime } from '../utils/format'
import { regionName } from '../utils/regions'

import { eclipseTitle, jumpToEclipse, jumpToPerihelion } from './eventJumps'
import { useEscapeToClose } from './useEscapeToClose'

function EclipsesTab({ jd }: { jd: number }) {
  // Recompute only when the sim date moves by more than a day.
  const dayKey = Math.floor(jd)
  const events = useMemo(() => nextEclipses(dayKey + 0.5, 8), [dayKey])
  return (
    <ul className="events-list">
      {events.map((e) => (
        <li key={`${e.type}-${e.peakJd}`} className="event-item">
          <div className="event-main">
            <span className="event-title">{eclipseTitle(e)}</span>
            <span className="event-date">
              {formatJdDate(e.peakJd)} · {formatJdTime(e.peakJd)}
            </span>
            <span className="event-detail">
              {e.type === 'solar'
                ? e.latitude !== undefined
                  ? `Greatest eclipse over ${regionName(e.latitude, e.longitude!)}`
                  : 'Partial — no central shadow path'
                : `Moon ${Math.round(e.obscuration * 100)}% inside the umbra`}
            </span>
          </div>
          <button className="hud-btn event-jump" onClick={() => jumpToEclipse(e)}>
            Jump to peak
          </button>
        </li>
      ))}
    </ul>
  )
}

function ShowersTab({ jd }: { jd: number }) {
  const date = jdToDate(jd)
  const month = date.getUTCMonth() + 1
  const day = date.getUTCDate()
  const focusBody = useSelectionStore((s) => s.focusBody)
  return (
    <ul className="events-list">
      {METEOR_SHOWERS.map((s) => {
        const active = isShowerActive(s, month, day)
        return (
          <li key={s.name} className={`event-item${active ? ' event-active' : ''}`}>
            <div className="event-main">
              <span className="event-title">
                {s.name}
                {active && <span className="event-badge">active now</span>}
              </span>
              <span className="event-date">
                {monthDay(s.start)} – {monthDay(s.end)} · peak {monthDay(s.peak)}
              </span>
              <span className="event-detail">
                ZHR {s.zhr} · parent {s.parentName}
              </span>
            </div>
            {s.parentBody && (
              <button className="hud-btn event-jump" onClick={() => focusBody(s.parentBody!)}>
                View parent
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function monthDay([m, d]: [number, number]): string {
  return `${MONTHS[m - 1]} ${d}`
}

function CometsTab({ jd }: { jd: number }) {
  return (
    <ul className="events-list">
      {COMET_IDS.map((id) => {
        const el = elementsAt(SMALL_BODIES[id], jd)
        const rNow = keplerDistanceAu(el, jd)
        const rSoon = keplerDistanceAu(el, jd + 5)
        const incoming = rSoon < rNow
        const tp = nextPerihelionJd(el, jd)
        return (
          <li key={id} className="event-item">
            <div className="event-main">
              <span className="event-title">{BODY_CONSTANTS[id].name}</span>
              <span className="event-date">
                {rNow.toFixed(2)} au · {incoming ? 'incoming ↓' : 'outgoing ↑'}
              </span>
              <span className="event-detail">Next perihelion {formatJdDate(tp)}</span>
            </div>
            <button className="hud-btn event-jump" onClick={() => jumpToPerihelion(id, tp)}>
              Jump to perihelion
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** Sim date at 1 Hz for tab content (cheap; full panel rerender is fine). */
function useSimJd(): number {
  const [jd, setJd] = useState(() => useTimeStore.getState().jd)
  useEffect(() => {
    const t = setInterval(() => setJd(useTimeStore.getState().jd), 1000)
    return () => clearInterval(t)
  }, [])
  return jd
}

export function EventsPanel() {
  const open = useSettingsStore((s) => s.eventsPanelOpen)
  const setOpen = useSettingsStore((s) => s.setEventsPanelOpen)
  const tab = useSettingsStore((s) => s.eventsTab)
  const setTab = useSettingsStore((s) => s.setEventsTab)
  const jd = useSimJd()
  useEscapeToClose(open, () => setOpen(false))

  if (!open) return null

  return (
    <aside className="events-panel" aria-label="Astronomical events">
      <header className="events-header">
        <nav className="events-tabs" role="tablist" aria-label="Event categories">
          {(['eclipses', 'showers', 'comets'] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={`events-tab${tab === t ? ' events-tab-active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'eclipses' ? 'Eclipses' : t === 'showers' ? 'Meteor showers' : 'Comets'}
            </button>
          ))}
        </nav>
        <button className="hud-btn info-close" onClick={() => setOpen(false)} aria-label="Close">
          ×
        </button>
      </header>
      {tab === 'eclipses' && <EclipsesTab jd={jd} />}
      {tab === 'showers' && <ShowersTab jd={jd} />}
      {tab === 'comets' && <CometsTab jd={jd} />}
    </aside>
  )
}
