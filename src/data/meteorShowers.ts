/**
 * The eight major annual meteor showers, with activity windows, peak dates,
 * zenithal hourly rates and parent bodies. Windows use month/day pairs and
 * apply to any year (peaks drift by less than a day across our 1900–2100
 * range, which is well within the "activity window" resolution).
 */
import type { BodyId } from '../ephemeris/types'

export interface MeteorShower {
  name: string
  /** Activity window, inclusive: [month, day] (1-based months). */
  start: [number, number]
  end: [number, number]
  peak: [number, number]
  /** Zenithal hourly rate at peak under ideal skies. */
  zhr: number
  parentName: string
  /** Set when the parent body exists in the simulation (focusable). */
  parentBody?: BodyId
  /** Radiant position (J2000), degrees: where the meteors appear to stream from. */
  radiantRaDeg: number
  radiantDecDeg: number
}

export const METEOR_SHOWERS: MeteorShower[] = [
  {
    name: 'Quadrantids',
    start: [12, 28],
    end: [1, 12],
    peak: [1, 3],
    zhr: 110,
    parentName: 'Asteroid 2003 EH1',
    radiantRaDeg: 230,
    radiantDecDeg: 49,
  },
  {
    name: 'Lyrids',
    start: [4, 14],
    end: [4, 30],
    peak: [4, 22],
    zhr: 18,
    parentName: 'Comet C/1861 G1 (Thatcher)',
    radiantRaDeg: 271,
    radiantDecDeg: 34,
  },
  {
    name: 'Eta Aquariids',
    start: [4, 19],
    end: [5, 28],
    peak: [5, 6],
    zhr: 50,
    parentName: '1P/Halley',
    parentBody: 'halley',
    radiantRaDeg: 338,
    radiantDecDeg: -1,
  },
  {
    name: 'Perseids',
    start: [7, 17],
    end: [8, 24],
    peak: [8, 12],
    zhr: 100,
    parentName: 'Comet 109P/Swift–Tuttle',
    radiantRaDeg: 48,
    radiantDecDeg: 58,
  },
  {
    name: 'Orionids',
    start: [10, 2],
    end: [11, 7],
    peak: [10, 21],
    zhr: 20,
    parentName: '1P/Halley',
    parentBody: 'halley',
    radiantRaDeg: 95,
    radiantDecDeg: 16,
  },
  {
    name: 'Leonids',
    start: [11, 6],
    end: [11, 30],
    peak: [11, 17],
    zhr: 15,
    parentName: 'Comet 55P/Tempel–Tuttle',
    radiantRaDeg: 152,
    radiantDecDeg: 22,
  },
  {
    name: 'Geminids',
    start: [12, 4],
    end: [12, 17],
    peak: [12, 14],
    zhr: 150,
    parentName: 'Asteroid 3200 Phaethon',
    radiantRaDeg: 112,
    radiantDecDeg: 33,
  },
  {
    name: 'Ursids',
    start: [12, 17],
    end: [12, 26],
    peak: [12, 22],
    zhr: 10,
    parentName: 'Comet 8P/Tuttle',
    radiantRaDeg: 217,
    radiantDecDeg: 76,
  },
]

/** Day-of-year-style comparison that tolerates windows wrapping the new year. */
export function isShowerActive(shower: MeteorShower, month: number, day: number): boolean {
  const md = month * 100 + day
  const s = shower.start[0] * 100 + shower.start[1]
  const e = shower.end[0] * 100 + shower.end[1]
  return s <= e ? md >= s && md <= e : md >= s || md <= e
}
