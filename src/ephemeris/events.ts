/**
 * Event computations for the events panel: merged eclipse timeline and
 * planet perihelion/aphelion searches. Computed, never a lookup table.
 */
import { ApsisKind, Body, SearchPlanetApsis, NextPlanetApsis } from 'astronomy-engine'

import {
  nextLunarEclipses,
  nextSolarEclipses,
  type LunarEclipseEvent,
  type SolarEclipseEvent,
} from './eclipses'
import { astroTimeToJd, jdToAstroTime } from './time'
import type { PlanetId } from './types'

export type EclipseEvent = SolarEclipseEvent | LunarEclipseEvent

/** The next `count` eclipses of either kind, sorted by peak time. */
export function nextEclipses(jd: number, count: number): EclipseEvent[] {
  // Over-fetch each kind so the merged head is always complete.
  const solar = nextSolarEclipses(jd, count)
  const lunar = nextLunarEclipses(jd, count)
  return [...solar, ...lunar].sort((a, b) => a.peakJd - b.peakJd).slice(0, count)
}

const PLANET_BODY: Record<PlanetId, Body> = {
  mercury: Body.Mercury,
  venus: Body.Venus,
  earth: Body.Earth,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
  uranus: Body.Uranus,
  neptune: Body.Neptune,
}

export interface PlanetApsides {
  nextPerihelionJd: number
  nextPerihelionAu: number
  nextAphelionJd: number
  nextAphelionAu: number
}

/** Next perihelion AND aphelion for a planet after the given JD. */
export function nextPlanetApsides(planet: PlanetId, jd: number): PlanetApsides {
  let apsis = SearchPlanetApsis(PLANET_BODY[planet], jdToAstroTime(jd))
  const out: Partial<PlanetApsides> = {}
  for (let i = 0; i < 3 && (!out.nextPerihelionJd || !out.nextAphelionJd); i++) {
    if (apsis.kind === ApsisKind.Pericenter && out.nextPerihelionJd === undefined) {
      out.nextPerihelionJd = astroTimeToJd(apsis.time)
      out.nextPerihelionAu = apsis.dist_au
    }
    if (apsis.kind === ApsisKind.Apocenter && out.nextAphelionJd === undefined) {
      out.nextAphelionJd = astroTimeToJd(apsis.time)
      out.nextAphelionAu = apsis.dist_au
    }
    apsis = NextPlanetApsis(PLANET_BODY[planet], apsis)
  }
  return out as PlanetApsides
}
