/**
 * Eclipse searches, computed (never a lookup table).
 * Thin wrappers over astronomy-engine returning plain data with Julian Dates.
 */
import {
  EclipseKind,
  NextGlobalSolarEclipse,
  NextLunarEclipse,
  SearchGlobalSolarEclipse,
  SearchLunarEclipse,
} from 'astronomy-engine'

import { astroTimeToJd, jdToAstroTime } from './time'

export type SolarEclipseKind = 'partial' | 'annular' | 'total'
export type LunarEclipseKind = 'penumbral' | 'partial' | 'total'

export interface SolarEclipseEvent {
  type: 'solar'
  kind: SolarEclipseKind
  peakJd: number
  /** Geographic point of maximum, defined for total/annular only. */
  latitude?: number
  longitude?: number
  /** Fraction of the Sun's disc obscured at peak (total/annular only). */
  obscuration?: number
}

export interface LunarEclipseEvent {
  type: 'lunar'
  kind: LunarEclipseKind
  peakJd: number
  /** Fraction of the Moon's disc inside the umbra at peak. */
  obscuration: number
  /** Semi-durations of phases, minutes. */
  sdPenum: number
  sdPartial: number
  sdTotal: number
}

export function nextSolarEclipses(jd: number, count: number): SolarEclipseEvent[] {
  const events: SolarEclipseEvent[] = []
  let info = SearchGlobalSolarEclipse(jdToAstroTime(jd))
  while (events.length < count) {
    const central = info.kind === EclipseKind.Total || info.kind === EclipseKind.Annular
    events.push({
      type: 'solar',
      kind: info.kind as SolarEclipseKind,
      peakJd: astroTimeToJd(info.peak),
      latitude: central ? info.latitude : undefined,
      longitude: central ? info.longitude : undefined,
      obscuration: central ? info.obscuration : undefined,
    })
    info = NextGlobalSolarEclipse(info.peak)
  }
  return events
}

export function nextLunarEclipses(jd: number, count: number): LunarEclipseEvent[] {
  const events: LunarEclipseEvent[] = []
  let info = SearchLunarEclipse(jdToAstroTime(jd))
  while (events.length < count) {
    events.push({
      type: 'lunar',
      kind: info.kind as LunarEclipseKind,
      peakJd: astroTimeToJd(info.peak),
      obscuration: info.obscuration,
      sdPenum: info.sd_penum,
      sdPartial: info.sd_partial,
      sdTotal: info.sd_total,
    })
    info = NextLunarEclipse(info.peak)
  }
  return events
}

/** First total solar eclipse at or after the given Julian Date. */
export function nextTotalSolarEclipse(jd: number): SolarEclipseEvent {
  let info = SearchGlobalSolarEclipse(jdToAstroTime(jd))
  while (info.kind !== EclipseKind.Total) {
    info = NextGlobalSolarEclipse(info.peak)
  }
  return {
    type: 'solar',
    kind: 'total',
    peakJd: astroTimeToJd(info.peak),
    latitude: info.latitude,
    longitude: info.longitude,
    obscuration: info.obscuration,
  }
}
