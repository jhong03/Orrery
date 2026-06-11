/**
 * Educational facts for every body in the simulation.
 * Values follow NASA planetary fact sheets and mission references.
 * Temperatures in °C; gravity in m/s²; atmosphere percentages by volume.
 */
import type { BodyId } from '../ephemeris/types'

export interface AtmosphereGas {
  gas: string
  pct: number
}

export interface BodyFacts {
  classification: string
  /** Formatted with proper exponent, e.g. "5.97 × 10²⁴ kg". */
  mass: string
  /** Surface gravity (or at the 1-bar level for giants), m/s². */
  gravityMs2: number
  /** Sidereal rotation, human-formatted; notes retrograde / tidal lock. */
  dayLength: string
  /** Orbital period, human-formatted. */
  yearLength: string
  /** Axial tilt in degrees, null where it isn't meaningful. */
  axialTiltDeg: number | null
  meanTempC: number
  /** [coldest, hottest] where extremes are notable. */
  tempRangeC?: [number, number]
  atmosphere: AtmosphereGas[]
  atmosphereNote?: string
  moonCount?: number
  didYouKnow: string[]
}

export const BODY_FACTS: Record<BodyId, BodyFacts> = {
  sun: {
    classification: 'G-type main-sequence star',
    mass: '1.989 × 10³⁰ kg',
    gravityMs2: 274,
    dayLength: '25.4 days at the equator (34 days near the poles)',
    yearLength: '230 million years around the galaxy',
    axialTiltDeg: 7.25,
    meanTempC: 5505,
    tempRangeC: [5505, 15_000_000],
    atmosphere: [
      { gas: 'Hydrogen', pct: 73 },
      { gas: 'Helium', pct: 25 },
    ],
    atmosphereNote: 'Photosphere composition by mass; the corona reaches millions of degrees.',
    didYouKnow: [
      'The Sun holds 99.86% of the solar system’s mass — about 333,000 Earths.',
      'Light from the surface takes 8 minutes 20 seconds to reach Earth, but a photon can take over 100,000 years to escape the core.',
      'Every second the Sun fuses about 600 million tonnes of hydrogen into helium.',
    ],
  },
  mercury: {
    classification: 'Terrestrial planet',
    mass: '3.30 × 10²³ kg',
    gravityMs2: 3.7,
    dayLength: '58.6 Earth days (one solar day lasts 176 Earth days)',
    yearLength: '88 Earth days',
    axialTiltDeg: 0.034,
    meanTempC: 167,
    tempRangeC: [-173, 427],
    atmosphere: [
      { gas: 'Oxygen', pct: 42 },
      { gas: 'Sodium', pct: 29 },
      { gas: 'Hydrogen', pct: 22 },
    ],
    atmosphereNote: 'Only a trace exosphere — atoms blasted off the surface by the solar wind.',
    moonCount: 0,
    didYouKnow: [
      'A single Mercury solar day (sunrise to sunrise) lasts two Mercury years.',
      'Despite being closest to the Sun, its shadowed polar craters hold water ice.',
      'It is the fastest planet, orbiting at 47 km per second.',
    ],
  },
  venus: {
    classification: 'Terrestrial planet',
    mass: '4.87 × 10²⁴ kg',
    gravityMs2: 8.87,
    dayLength: '243 Earth days, retrograde (the Sun rises in the west)',
    yearLength: '224.7 Earth days',
    axialTiltDeg: 177.4,
    meanTempC: 464,
    atmosphere: [
      { gas: 'Carbon dioxide', pct: 96.5 },
      { gas: 'Nitrogen', pct: 3.5 },
    ],
    atmosphereNote:
      'Surface pressure is 92 bar — like 900 m underwater — under clouds of sulfuric acid.',
    moonCount: 0,
    didYouKnow: [
      'Venus is the hottest planet, even though Mercury is closer to the Sun — a runaway greenhouse effect.',
      'Its day is longer than its year, and it spins backwards compared to most planets.',
      'Surface conditions melt lead; the Soviet Venera landers survived only about an hour.',
    ],
  },
  earth: {
    classification: 'Terrestrial planet',
    mass: '5.97 × 10²⁴ kg',
    gravityMs2: 9.81,
    dayLength: '23 h 56 m 4 s (sidereal)',
    yearLength: '365.25 days',
    axialTiltDeg: 23.44,
    meanTempC: 15,
    tempRangeC: [-89, 57],
    atmosphere: [
      { gas: 'Nitrogen', pct: 78.08 },
      { gas: 'Oxygen', pct: 20.95 },
      { gas: 'Argon', pct: 0.93 },
      { gas: 'Carbon dioxide', pct: 0.04 },
    ],
    moonCount: 1,
    didYouKnow: [
      'The only world known to harbor life; oceans cover 71% of its surface.',
      'Earth’s rotation is slowing by about 1.8 milliseconds per century as the Moon drifts away.',
      'The planet is not a perfect sphere — it bulges 21 km at the equator from its spin.',
    ],
  },
  moon: {
    classification: 'Natural satellite of Earth',
    mass: '7.34 × 10²² kg',
    gravityMs2: 1.62,
    dayLength: '27.3 Earth days (tidally locked to Earth)',
    yearLength: '27.3 days around Earth',
    axialTiltDeg: 6.68,
    meanTempC: -23,
    tempRangeC: [-173, 127],
    atmosphere: [],
    atmosphereNote: 'Essentially none — a vanishingly thin exosphere.',
    didYouKnow: [
      'The same face always points at Earth, but libration lets us peek at 59% of the surface over time.',
      'It is drifting away from Earth at 3.8 cm per year — measured by laser reflectors left by Apollo.',
      'With no wind or rain, astronaut footprints could last millions of years.',
    ],
  },
  mars: {
    classification: 'Terrestrial planet',
    mass: '6.42 × 10²³ kg',
    gravityMs2: 3.71,
    dayLength: '24 h 37 m',
    yearLength: '687 Earth days',
    axialTiltDeg: 25.19,
    meanTempC: -63,
    tempRangeC: [-153, 20],
    atmosphere: [
      { gas: 'Carbon dioxide', pct: 95.3 },
      { gas: 'Nitrogen', pct: 2.7 },
      { gas: 'Argon', pct: 1.6 },
    ],
    atmosphereNote: 'Surface pressure under 1% of Earth’s.',
    moonCount: 2,
    didYouKnow: [
      'Olympus Mons is the tallest volcano in the solar system — about 22 km high, nearly three Everests.',
      'Valles Marineris is a canyon system as long as the United States is wide.',
      'Martian sunsets are blue: fine dust scatters red light and lets blue through.',
    ],
  },
  jupiter: {
    classification: 'Gas giant',
    mass: '1.898 × 10²⁷ kg',
    gravityMs2: 24.79,
    dayLength: '9 h 56 m — the fastest spin of any planet',
    yearLength: '11.86 Earth years',
    axialTiltDeg: 3.13,
    meanTempC: -108,
    atmosphere: [
      { gas: 'Hydrogen', pct: 89.8 },
      { gas: 'Helium', pct: 10.2 },
    ],
    atmosphereNote: 'Traces of methane, ammonia and water make the colored bands.',
    moonCount: 95,
    didYouKnow: [
      'The Great Red Spot is a storm wider than Earth that has raged for at least 350 years.',
      'Jupiter is more than twice as massive as all the other planets combined.',
      'Its magnetic field is the strongest of any planet — 20,000 times Earth’s.',
    ],
  },
  saturn: {
    classification: 'Gas giant',
    mass: '5.68 × 10²⁶ kg',
    gravityMs2: 10.44,
    dayLength: '10 h 33 m',
    yearLength: '29.45 Earth years',
    axialTiltDeg: 26.73,
    meanTempC: -139,
    atmosphere: [
      { gas: 'Hydrogen', pct: 96.3 },
      { gas: 'Helium', pct: 3.25 },
    ],
    moonCount: 274,
    didYouKnow: [
      'Saturn’s average density is less than water — it would float, given a big enough bathtub.',
      'The rings span 280,000 km yet are typically only about 10 metres thick.',
      'A bizarre hexagonal jet stream, wider than two Earths, circles its north pole.',
    ],
  },
  uranus: {
    classification: 'Ice giant',
    mass: '8.68 × 10²⁵ kg',
    gravityMs2: 8.87,
    dayLength: '17 h 14 m, retrograde',
    yearLength: '84 Earth years',
    axialTiltDeg: 97.77,
    meanTempC: -195,
    atmosphere: [
      { gas: 'Hydrogen', pct: 82.5 },
      { gas: 'Helium', pct: 15.2 },
      { gas: 'Methane', pct: 2.3 },
    ],
    atmosphereNote: 'Methane absorbs red light, giving the pale cyan color.',
    moonCount: 28,
    didYouKnow: [
      'Uranus rolls around the Sun on its side — each pole gets 42 years of daylight, then 42 of night.',
      'It holds the record for the coldest planetary atmosphere measured: −224 °C.',
      'It was the first planet found with a telescope (William Herschel, 1781).',
    ],
  },
  neptune: {
    classification: 'Ice giant',
    mass: '1.02 × 10²⁶ kg',
    gravityMs2: 11.15,
    dayLength: '16 h 7 m',
    yearLength: '164.8 Earth years',
    axialTiltDeg: 28.32,
    meanTempC: -201,
    atmosphere: [
      { gas: 'Hydrogen', pct: 80 },
      { gas: 'Helium', pct: 19 },
      { gas: 'Methane', pct: 1.5 },
    ],
    moonCount: 16,
    didYouKnow: [
      'Neptune was discovered by mathematics: its position was predicted from Uranus’ orbit before it was seen (1846).',
      'It has the fastest winds in the solar system — up to 2,100 km/h.',
      'Since its discovery it has completed just one full orbit (in 2011).',
    ],
  },
  io: {
    classification: 'Moon of Jupiter (Galilean)',
    mass: '8.93 × 10²² kg',
    gravityMs2: 1.8,
    dayLength: '1.77 Earth days (tidally locked)',
    yearLength: '1.77 days around Jupiter',
    axialTiltDeg: null,
    meanTempC: -130,
    tempRangeC: [-183, 1600],
    atmosphere: [{ gas: 'Sulfur dioxide', pct: 90 }],
    atmosphereNote: 'A thin, patchy SO₂ atmosphere fed by volcanoes.',
    didYouKnow: [
      'The most volcanically active world known — over 400 active volcanoes, powered by Jupiter’s tides.',
      'Its surface is painted yellow, orange and red by sulfur compounds.',
      'Io, Europa and Ganymede orbit in a 4:2:1 resonance — visible if you speed up time here.',
    ],
  },
  europa: {
    classification: 'Moon of Jupiter (Galilean)',
    mass: '4.80 × 10²² kg',
    gravityMs2: 1.31,
    dayLength: '3.55 Earth days (tidally locked)',
    yearLength: '3.55 days around Jupiter',
    axialTiltDeg: null,
    meanTempC: -160,
    atmosphere: [{ gas: 'Oxygen', pct: 100 }],
    atmosphereNote: 'An extremely tenuous oxygen exosphere.',
    didYouKnow: [
      'Beneath its cracked ice shell lies a salty ocean holding about twice the water of all Earth’s oceans.',
      'It is one of the smoothest objects in the solar system — few craters, young ice.',
      'NASA’s Europa Clipper is en route to study whether it could support life.',
    ],
  },
  ganymede: {
    classification: 'Moon of Jupiter (Galilean)',
    mass: '1.48 × 10²³ kg',
    gravityMs2: 1.43,
    dayLength: '7.15 Earth days (tidally locked)',
    yearLength: '7.15 days around Jupiter',
    axialTiltDeg: null,
    meanTempC: -163,
    atmosphere: [{ gas: 'Oxygen', pct: 100 }],
    atmosphereNote: 'Trace oxygen only.',
    didYouKnow: [
      'The largest moon in the solar system — bigger than the planet Mercury.',
      'The only moon known to generate its own magnetic field.',
      'It likely hides a subsurface saltwater ocean sandwiched between ice layers.',
    ],
  },
  callisto: {
    classification: 'Moon of Jupiter (Galilean)',
    mass: '1.08 × 10²³ kg',
    gravityMs2: 1.24,
    dayLength: '16.7 Earth days (tidally locked)',
    yearLength: '16.7 days around Jupiter',
    axialTiltDeg: null,
    meanTempC: -139,
    atmosphere: [{ gas: 'Carbon dioxide', pct: 100 }],
    atmosphereNote: 'Extremely thin CO₂ exosphere.',
    didYouKnow: [
      'The most heavily cratered object known — its surface is about 4 billion years old.',
      'It orbits outside Jupiter’s worst radiation belts, making it a candidate site for a future crewed base.',
      'Like its siblings, it may conceal a deep subsurface ocean.',
    ],
  },
  titan: {
    classification: 'Moon of Saturn',
    mass: '1.35 × 10²³ kg',
    gravityMs2: 1.35,
    dayLength: '15.9 Earth days (tidally locked)',
    yearLength: '15.9 days around Saturn',
    axialTiltDeg: null,
    meanTempC: -179,
    atmosphere: [
      { gas: 'Nitrogen', pct: 94.2 },
      { gas: 'Methane', pct: 5.7 },
    ],
    atmosphereNote:
      'The only moon with a dense atmosphere — surface pressure 1.45× Earth’s, in a thick orange haze.',
    didYouKnow: [
      'Titan has rain, rivers and seas — but of liquid methane and ethane, not water.',
      'ESA’s Huygens probe landed here in 2005, the most distant landing ever made.',
      'In its low gravity and thick air, a human could fly by flapping strapped-on wings.',
    ],
  },
  halley: {
    classification: 'Periodic comet (1P)',
    mass: '≈ 2.2 × 10¹⁴ kg',
    gravityMs2: 0.0004,
    dayLength: '≈ 2.2 days (nucleus rotation)',
    yearLength: '75–76 years',
    axialTiltDeg: null,
    meanTempC: -70,
    atmosphere: [],
    atmosphereNote:
      'No atmosphere — but within ~4 au of the Sun, ices sublimate into a coma and twin tails.',
    didYouKnow: [
      'Recorded by astronomers since at least 240 BC; it appears stitched into the Bayeux Tapestry (1066).',
      'Edmond Halley realized in 1705 that several historic comets were one object returning every ~76 years.',
      'Its debris stream causes two meteor showers each year: the Eta Aquariids and the Orionids.',
      'Next perihelion: 28 July 2061 — scrub the timeline forward to watch it swing in.',
    ],
  },
  encke: {
    classification: 'Periodic comet (2P)',
    mass: '≈ 9 × 10¹³ kg',
    gravityMs2: 0.0003,
    dayLength: '≈ 11 hours (nucleus rotation)',
    yearLength: '3.3 years — the shortest period of any bright comet',
    axialTiltDeg: null,
    meanTempC: -60,
    atmosphere: [],
    atmosphereNote: 'Activity is weak: after thousands of orbits much of its ice is spent.',
    didYouKnow: [
      'Named for Johann Encke, who computed its orbit — not for its discoverer.',
      'Its debris produces the Taurid meteor showers, including occasional bright fireballs.',
      'It has been observed at more returns than any other comet.',
    ],
  },
  cg67p: {
    classification: 'Periodic comet (67P)',
    mass: '≈ 1.0 × 10¹³ kg',
    gravityMs2: 0.0002,
    dayLength: '≈ 12.4 hours (nucleus rotation)',
    yearLength: '6.4 years',
    axialTiltDeg: null,
    meanTempC: -70,
    atmosphere: [],
    atmosphereNote: 'Rosetta watched its coma switch on as it approached the Sun.',
    didYouKnow: [
      'ESA’s Rosetta orbited this duck-shaped comet for two years (2014–2016); Philae made the first-ever comet landing.',
      'Its two lobes were probably separate bodies that gently merged long ago.',
      'The nucleus is so porous it would float — its density is about half that of water ice.',
    ],
  },
  neowise: {
    classification: 'Long-period comet (C/2020 F3)',
    mass: '≈ 10¹³ kg',
    gravityMs2: 0.0003,
    dayLength: '≈ 7.6 hours (nucleus rotation)',
    yearLength: '≈ 6,800 years',
    axialTiltDeg: null,
    meanTempC: -70,
    atmosphere: [],
    atmosphereNote: 'In July 2020 its tails stretched tens of degrees across Earth’s night sky.',
    didYouKnow: [
      'The brightest comet seen from the northern hemisphere since Hale-Bopp in 1997.',
      'Discovered in March 2020 by the NEOWISE space telescope, just four months before its show.',
      'Set the date to July 2020 here to see it near perihelion — it will not return for millennia.',
    ],
  },
  ceres: {
    classification: 'Dwarf planet (asteroid belt)',
    mass: '9.38 × 10²⁰ kg',
    gravityMs2: 0.28,
    dayLength: '9 h 4 m',
    yearLength: '4.6 Earth years',
    axialTiltDeg: 4,
    meanTempC: -105,
    atmosphere: [],
    atmosphereNote: 'Transient traces of water vapor have been detected.',
    didYouKnow: [
      'The first asteroid ever discovered (Giuseppe Piazzi, 1801) — and the largest object in the belt, holding about a quarter of its mass.',
      'The bright spots in Occator crater are salt deposits left by briny water seeping up from below.',
      'NASA’s Dawn spacecraft orbited Ceres from 2015 to 2018.',
    ],
  },
  vesta: {
    classification: 'Asteroid (4 Vesta)',
    mass: '2.59 × 10²⁰ kg',
    gravityMs2: 0.25,
    dayLength: '5 h 21 m',
    yearLength: '3.6 Earth years',
    axialTiltDeg: 29,
    meanTempC: -100,
    atmosphere: [],
    didYouKnow: [
      'The brightest asteroid — occasionally visible to the naked eye from Earth.',
      'A giant impact basin, Rheasilvia, is nearly as wide as Vesta itself; its central peak rivals Olympus Mons.',
      'Pieces blasted off Vesta fall to Earth as HED meteorites — we have samples without ever landing there.',
    ],
  },
}
