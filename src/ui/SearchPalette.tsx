import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'

import { BODY_CONSTANTS } from '../data/bodies'
import { CITIES } from '../data/cities'
import { BODY_FACTS } from '../data/facts'
import { LANDMARKS } from '../data/landmarks'
import { METEOR_SHOWERS } from '../data/meteorShowers'
import { COMET_IDS, SMALL_BODIES, elementsAt } from '../data/smallBodies'
import { nextEclipses } from '../ephemeris/events'
import { nextPerihelionJd } from '../ephemeris/kepler'
import { BODY_IDS } from '../ephemeris/types'
import { useSelectionStore } from '../state/selectionStore'
import { useSettingsStore } from '../state/settingsStore'
import { useSurfaceStore } from '../state/surfaceStore'
import { useTimeStore } from '../state/timeStore'
import { formatJdDate } from '../utils/format'
import { fuzzyMatch } from '../utils/fuzzy'
import { regionName } from '../utils/regions'

import { eclipseTitle, jumpToEclipse, jumpToPerihelion } from './eventJumps'

interface PaletteItem {
  key: string
  title: string
  subtitle: string
  badge: 'body' | 'event' | 'shower' | 'action' | 'place'
  /** Extra search text matched after the title (id, aliases, category). */
  keywords: string
  run: () => void
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Built once per open (and per sim day) — eclipse/perihelion search is not free. */
function buildItems(jd: number): PaletteItem[] {
  const { focusBody, frameSystem } = useSelectionStore.getState()
  const settings = useSettingsStore.getState()
  const items: PaletteItem[] = []

  for (const id of BODY_IDS) {
    items.push({
      key: `body-${id}`,
      title: BODY_CONSTANTS[id].name,
      subtitle: BODY_FACTS[id].classification,
      badge: 'body',
      keywords: `${id} ${BODY_FACTS[id].classification}`,
      run: () => focusBody(id),
    })
  }

  for (const e of nextEclipses(jd, 6)) {
    const where =
      e.type === 'solar' && e.latitude !== undefined
        ? ` · ${regionName(e.latitude, e.longitude!)}`
        : ''
    items.push({
      key: `eclipse-${e.type}-${e.peakJd}`,
      title: eclipseTitle(e),
      subtitle: `${formatJdDate(e.peakJd)}${where}`,
      badge: 'event',
      keywords: 'eclipse sun moon shadow',
      run: () => jumpToEclipse(e),
    })
  }

  for (const id of COMET_IDS) {
    const tp = nextPerihelionJd(elementsAt(SMALL_BODIES[id], jd), jd)
    items.push({
      key: `peri-${id}`,
      title: `${BODY_CONSTANTS[id].name} perihelion`,
      subtitle: `Closest to the Sun ${formatJdDate(tp)}`,
      badge: 'event',
      keywords: 'comet perihelion closest approach',
      run: () => jumpToPerihelion(id, tp),
    })
  }

  for (const s of METEOR_SHOWERS) {
    items.push({
      key: `shower-${s.name}`,
      title: s.name,
      subtitle: `Meteor shower · peak ${MONTHS[s.peak[0] - 1]} ${s.peak[1]} · ZHR ${s.zhr}`,
      badge: 'shower',
      keywords: `meteor shower ${s.parentName}`,
      run: () => {
        settings.setEventsTab('showers')
        settings.setEventsPanelOpen(true)
      },
    })
  }

  const actions: Array<[string, string, () => void]> = [
    ['Jump to now', 'Return the simulation to the present', () => useTimeStore.getState().setNow()],
    ['System overview', 'Zoom out to the whole solar system', frameSystem],
    [
      "Stand on Earth's surface",
      'Ground view of the sky from your last location',
      () => {
        const s = useSurfaceStore.getState()
        s.enter(s.latDeg, s.lonDeg, { placeName: s.placeName ?? undefined })
      },
    ],
    [
      'Open events panel',
      'Eclipses, meteor showers and comets',
      () => settings.setEventsPanelOpen(true),
    ],
    [
      settings.scaleMode === 'visible' ? 'Switch to realistic scale' : 'Switch to visible scale',
      'Readouts always show true values',
      () => settings.setScaleMode(settings.scaleMode === 'visible' ? 'realistic' : 'visible'),
    ],
    ['Toggle orbit lines', '', () => settings.setShowOrbits(!settings.showOrbits)],
    ['Toggle labels', '', () => settings.setShowLabels(!settings.showLabels)],
    [
      'Toggle eclipse shadow cones',
      '',
      () => settings.setShowShadowCones(!settings.showShadowCones),
    ],
  ]
  for (const [title, subtitle, run] of actions) {
    items.push({
      key: `action-${title}`,
      title,
      subtitle,
      badge: 'action',
      keywords: 'setting',
      run,
    })
  }

  // Special places: geographic and astronomical extremes (with a blurb).
  for (const l of LANDMARKS) {
    items.push({
      key: `landmark-${l.name}`,
      title: l.name,
      subtitle: l.note,
      badge: 'place',
      keywords: `landmark extreme special record ${l.note}`,
      run: () =>
        useSurfaceStore.getState().enter(l.latDeg, l.lonDeg, {
          placeName: l.name,
          note: l.note,
          lookAt: 'sun-az',
        }),
    })
  }

  // Cities: stand on the ground at this location and look at the sky.
  for (const c of CITIES) {
    items.push({
      key: `city-${c.name}`,
      title: c.name,
      subtitle: `Stand here · ${c.region}`,
      badge: 'place',
      keywords: `city location ground surface ${c.region}`,
      run: () =>
        useSurfaceStore
          .getState()
          .enter(c.latDeg, c.lonDeg, { placeName: c.name, lookAt: 'sun-az' }),
    })
  }

  return items
}

interface Ranked {
  item: PaletteItem
  /** Indices into title for highlight; empty when matched via keywords. */
  indices: number[]
}

function rank(items: PaletteItem[], query: string): Ranked[] {
  if (query.trim() === '') return items.map((item) => ({ item, indices: [] }))
  const out: Array<Ranked & { score: number }> = []
  for (const item of items) {
    const onTitle = fuzzyMatch(query, item.title)
    if (onTitle) {
      out.push({ item, indices: onTitle.indices, score: onTitle.score + 1 })
      continue
    }
    const onKeywords = fuzzyMatch(query, `${item.title} ${item.keywords}`)
    if (onKeywords) out.push({ item, indices: [], score: onKeywords.score * 0.5 })
  }
  out.sort((a, b) => b.score - a.score)
  return out.slice(0, 12)
}

function Highlighted({ text, indices }: { text: string; indices: number[] }) {
  if (indices.length === 0) return <>{text}</>
  const set = new Set(indices)
  return (
    <>
      {Array.from(text, (ch, i) =>
        set.has(i) ? (
          <mark key={i} className="search-mark">
            {ch}
          </mark>
        ) : (
          ch
        ),
      )}
    </>
  )
}

/** Global shortcut surface — mounted always; the dialog renders only while open. */
export function SearchPalette() {
  const open = useSettingsStore((s) => s.searchOpen)
  const setOpen = useSettingsStore((s) => s.setSearchOpen)

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(!useSettingsStore.getState().searchOpen)
        return
      }
      const tag = (e.target as HTMLElement | null)?.tagName
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setOpen])

  if (!open) return null
  return <SearchDialog onClose={() => setOpen(false)} />
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Sim day only matters for event dates; capture once per open.
  const items = useMemo(() => buildItems(useTimeStore.getState().jd), [])
  const results = useMemo(() => rank(items, query), [items, query])
  const clamped = Math.min(selected, Math.max(results.length - 1, 0))

  useEffect(() => inputRef.current?.focus(), [])
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${clamped}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [clamped, results])

  const runSelected = (i: number) => {
    const r = results[i]
    if (!r) return
    onClose()
    r.item.run()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected(Math.min(clamped + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(Math.max(clamped - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      runSelected(clamped)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      // The palette owns this Escape: the close is synchronous, so without
      // this the same event would reach the panels' window listeners too.
      e.stopPropagation()
      onClose()
    }
  }

  return (
    <div className="search-overlay" onPointerDown={onClose}>
      <div
        className="search-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Search bodies, events and actions"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          className="search-input"
          type="text"
          placeholder="Search planets, moons, comets, eclipses…"
          value={query}
          spellCheck={false}
          role="combobox"
          aria-expanded="true"
          aria-controls="search-results"
          aria-activedescendant={results[clamped] ? `search-opt-${clamped}` : undefined}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelected(0)
          }}
          onKeyDown={onKeyDown}
        />
        <ul id="search-results" className="search-results" role="listbox" ref={listRef}>
          {results.length === 0 && <li className="search-empty">No matches.</li>}
          {results.map(({ item, indices }, i) => (
            <li
              key={item.key}
              id={`search-opt-${i}`}
              data-index={i}
              role="option"
              aria-selected={i === clamped}
              className={`search-item${i === clamped ? ' search-item-active' : ''}`}
              onPointerMove={() => setSelected(i)}
              onClick={() => runSelected(i)}
            >
              <span className="search-item-main">
                <span className="search-item-title">
                  <Highlighted text={item.title} indices={indices} />
                </span>
                {item.subtitle && <span className="search-item-sub">{item.subtitle}</span>}
              </span>
              <span className={`search-badge search-badge-${item.badge}`}>{item.badge}</span>
            </li>
          ))}
        </ul>
        <footer className="search-footer">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </footer>
      </div>
    </div>
  )
}
