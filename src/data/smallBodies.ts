/**
 * Orbital elements for comets and named asteroids, from the JPL Small-Body
 * Database (full precision, fetched 2026-06-11) and JPL Horizons.
 * Heliocentric ecliptic J2000.
 *
 * Two-body propagation drifts across apparitions (planetary perturbations),
 * so a body may carry several element sets, each valid for a JD window.
 * Halley is the prominent case: the 1968-epoch solution serves history, and
 * a Horizons-integrated osculating set at 2060-Dec-07 serves the 2061
 * apparition (Tp = JD 2474034.196 = 2061-Jul-28, matching predictions).
 */
import type { KeplerElements } from '../ephemeris/kepler'
import type { SmallBodyId } from '../ephemeris/types'

export const COMET_IDS = ['halley', 'encke', 'cg67p', 'neowise'] as const
export type CometId = (typeof COMET_IDS)[number]

export interface ElementSet {
  /** Element set used while validFromJd <= jd < validToJd. */
  validFromJd: number
  validToJd: number
  el: KeplerElements
}

export interface SmallBodySpec {
  id: SmallBodyId
  kind: 'comet' | 'asteroid'
  sets: ElementSet[]
}

/** Element set covering a body's full supported time range. */
function always(el: KeplerElements): ElementSet[] {
  return [{ validFromJd: -Infinity, validToJd: Infinity, el }]
}

export const SMALL_BODIES: Record<SmallBodyId, SmallBodySpec> = {
  halley: {
    id: 'halley',
    kind: 'comet',
    sets: [
      {
        // SBDB solution, epoch 1968: correct for the 1986 apparition.
        validFromJd: -Infinity,
        validToJd: 2460252, // ~2023-Nov, near aphelion between apparitions
        el: {
          a: 17.92863504856923,
          e: 0.9679359956953211,
          i: 162.1905300439129,
          om: 59.09894720612437,
          w: 112.2414314637764,
          tp: 2446469.97361615, // 1986-Feb-08
          periodDays: 27728.04608790421,
        },
      },
      {
        // Horizons osculating elements at 2060-Dec-07 (perturbed trajectory):
        // correct for the 2061 apparition.
        validFromJd: 2460252,
        validToJd: Infinity,
        el: {
          a: 17.85488858222049,
          e: 0.9667755256728296,
          i: 161.9822163471797,
          om: 59.37450332385821,
          w: 111.9996293817165,
          tp: 2474034.1961175, // 2061-Jul-28
          periodDays: 27557.14006087326,
        },
      },
    ],
  },
  encke: {
    id: 'encke',
    kind: 'comet',
    sets: always({
      a: 2.219688710074586,
      e: 0.8477496967533629,
      i: 11.41227811179314,
      om: 334.1935846036774,
      w: 187.1342463695676,
      tp: 2460239.64951855, // 2023-Oct-22
      periodDays: 1207.915450927171,
    }),
  },
  cg67p: {
    id: 'cg67p',
    kind: 'comet',
    sets: always({
      a: 3.462249489765068,
      e: 0.6409081306555051,
      i: 7.040294906760007,
      om: 50.13557380441372,
      w: 12.79824973415729,
      tp: 2457247.58865786, // 2015-Aug-13
      periodDays: 2353.076067532089,
    }),
  },
  neowise: {
    id: 'neowise',
    kind: 'comet',
    sets: always({
      a: 358.4679565529321,
      e: 0.9991780262531292,
      i: 128.9375027594809,
      om: 61.01042818536988,
      w: 37.2786584481257,
      tp: 2459034.17889804, // 2020-Jul-03
      periodDays: 2478985.217997125,
    }),
  },
  ceres: {
    id: 'ceres',
    kind: 'asteroid',
    sets: always({
      a: 2.765552595034094,
      e: 0.07969229514816586,
      i: 10.58802780183462,
      om: 80.24862682043221,
      w: 73.29421453021587,
      tp: 2461599.84146661,
      periodDays: 1679.853119758983,
    }),
  },
  vesta: {
    id: 'vesta',
    kind: 'asteroid',
    sets: always({
      a: 2.361365965127599,
      e: 0.09020374382834395,
      i: 7.143925545058711,
      om: 103.701293265032,
      w: 151.4686478221564,
      tp: 2460901.58737984,
      periodDays: 1325.389042911101,
    }),
  },
}

/** Element set in effect at the given JD. */
export function elementsAt(spec: SmallBodySpec, jd: number): KeplerElements {
  for (const s of spec.sets) {
    if (jd >= s.validFromJd && jd < s.validToJd) return s.el
  }
  return spec.sets[spec.sets.length - 1].el
}
