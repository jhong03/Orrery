import { useEffect, useState } from 'react'

import { BODY_CONSTANTS } from '../data/bodies'
import { BODY_FACTS } from '../data/facts'
import { SMALL_BODIES, elementsAt } from '../data/smallBodies'
import { computeSystemState } from '../ephemeris/ephemeris'
import { nextPlanetApsides, type PlanetApsides } from '../ephemeris/events'
import { nextPerihelionJd } from '../ephemeris/kepler'
import {
  createSystemState,
  vecDistance,
  vecLength,
  PLANET_IDS,
  SMALL_BODY_IDS,
} from '../ephemeris/types'
import type { BodyId, PlanetId, SmallBodyId } from '../ephemeris/types'
import { useSelectionStore } from '../state/selectionStore'
import { useTimeStore } from '../state/timeStore'
import { formatDistanceKm, formatJdDate, formatSpeedKmS, formatTempRange } from '../utils/format'

import { useEscapeToClose } from './useEscapeToClose'

interface LiveValues {
  sunKm: number
  earthKm: number
  speedKmS: number
  nextPerihelionJd: number | null
  apsides: PlanetApsides | null
}

const scratchA = createSystemState()
const scratchB = createSystemState()

// SearchPlanetApsis is too costly for the 2 Hz tick; cache per body+day.
const apsidesCache = new Map<string, PlanetApsides>()

function planetApsidesCached(id: PlanetId, jd: number): PlanetApsides {
  const key = `${id}:${Math.floor(jd)}`
  let v = apsidesCache.get(key)
  if (!v) {
    v = nextPlanetApsides(id, jd)
    apsidesCache.clear() // tiny cache: one entry is all we need
    apsidesCache.set(key, v)
  }
  return v
}

function computeLive(id: BodyId, jd: number): LiveValues {
  const dt = 0.005 // days, for the speed finite difference
  computeSystemState(jd - dt, scratchA)
  computeSystemState(jd + dt, scratchB)
  const sunKm = vecLength(scratchB[id])
  const earthKm = vecDistance(scratchB[id], scratchB.earth)
  const speedKmS = vecDistance(scratchA[id], scratchB[id]) / (2 * dt * 86400)

  let peri: number | null = null
  if ((SMALL_BODY_IDS as readonly string[]).includes(id)) {
    const el = elementsAt(SMALL_BODIES[id as SmallBodyId], jd)
    peri = nextPerihelionJd(el, jd)
  }
  const apsides = (PLANET_IDS as readonly string[]).includes(id)
    ? planetApsidesCached(id as PlanetId, jd)
    : null
  return { sunKm, earthKm, speedKmS, nextPerihelionJd: peri, apsides }
}

/**
 * Live readouts refresh at 2 Hz — always TRUE values, never view-scaled.
 * The caller keys its component by body id, so the initializer covers the
 * first paint for each body.
 */
function useLiveValues(id: BodyId): LiveValues {
  const [live, setLive] = useState<LiveValues>(() => computeLive(id, useTimeStore.getState().jd))
  useEffect(() => {
    const t = setInterval(() => {
      setLive(computeLive(id, useTimeStore.getState().jd))
    }, 500)
    return () => clearInterval(t)
  }, [id])
  return live
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  )
}

export function InfoPanel() {
  const focusedBody = useSelectionStore((s) => s.focusedBody)
  const open = useSelectionStore((s) => s.infoPanelOpen)
  const closeInfoPanel = useSelectionStore((s) => s.closeInfoPanel)
  useEscapeToClose(open, closeInfoPanel)

  if (!open) return null
  // Keyed by body so all state (incl. live values) resets per body.
  return <InfoPanelContent key={focusedBody} id={focusedBody} onClose={closeInfoPanel} />
}

function InfoPanelContent({ id, onClose }: { id: BodyId; onClose: () => void }) {
  const facts = BODY_FACTS[id]
  const live = useLiveValues(id)

  return (
    <aside className="info-panel" aria-label={`${BODY_CONSTANTS[id].name} facts`}>
      <header className="info-header">
        <div>
          <h2 className="info-name">{BODY_CONSTANTS[id].name}</h2>
          <p className="info-class">{facts.classification}</p>
        </div>
        <button className="hud-btn info-close" onClick={onClose} aria-label="Close panel">
          ×
        </button>
      </header>

      <section className="info-section">
        <h3 className="info-section-title">Right now</h3>
        {id !== 'sun' && <Row label="Distance from Sun" value={formatDistanceKm(live.sunKm)} />}
        {id !== 'earth' && (
          <Row label="Distance from Earth" value={formatDistanceKm(live.earthKm)} />
        )}
        {id !== 'sun' && <Row label="Orbital speed" value={formatSpeedKmS(live.speedKmS)} />}
        {live.nextPerihelionJd !== null && (
          <Row label="Next perihelion" value={formatJdDate(live.nextPerihelionJd)} />
        )}
        {live.apsides && (
          <>
            <Row
              label="Next perihelion"
              value={`${formatJdDate(live.apsides.nextPerihelionJd)} · ${live.apsides.nextPerihelionAu.toFixed(3)} au`}
            />
            <Row
              label="Next aphelion"
              value={`${formatJdDate(live.apsides.nextAphelionJd)} · ${live.apsides.nextAphelionAu.toFixed(3)} au`}
            />
          </>
        )}
      </section>

      <section className="info-section">
        <h3 className="info-section-title">Physical</h3>
        <Row
          label="Mean radius"
          value={`${BODY_CONSTANTS[id].radiusKm.toLocaleString('en-US')} km`}
        />
        <Row label="Mass" value={facts.mass} />
        <Row label="Gravity" value={`${facts.gravityMs2} m/s²`} />
        <Row label="Day length" value={facts.dayLength} />
        <Row label="Year length" value={facts.yearLength} />
        {facts.axialTiltDeg !== null && <Row label="Axial tilt" value={`${facts.axialTiltDeg}°`} />}
        <Row
          label="Temperature"
          value={
            facts.tempRangeC
              ? `${facts.meanTempC} °C mean (${formatTempRange(facts.tempRangeC)})`
              : `${facts.meanTempC} °C mean`
          }
        />
        {facts.moonCount !== undefined && (
          <Row label="Known moons" value={facts.moonCount.toLocaleString('en-US')} />
        )}
      </section>

      <section className="info-section">
        <h3 className="info-section-title">Atmosphere</h3>
        {facts.atmosphere.length === 0 && !facts.atmosphereNote && (
          <p className="info-note">None.</p>
        )}
        {facts.atmosphere.map(({ gas, pct }) => (
          <div className="info-gas" key={gas}>
            <span className="info-label">{gas}</span>
            <span className="info-gas-bar">
              <span className="info-gas-fill" style={{ width: `${Math.max(pct, 1.5)}%` }} />
            </span>
            <span className="info-value">{pct}%</span>
          </div>
        ))}
        {facts.atmosphereNote && <p className="info-note">{facts.atmosphereNote}</p>}
      </section>

      <section className="info-section">
        <h3 className="info-section-title">Did you know</h3>
        <ul className="info-facts">
          {facts.didYouKnow.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      </section>
    </aside>
  )
}
