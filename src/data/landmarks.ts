/**
 * Notable Earth locations — geographic and astronomical extremes. Many pay
 * off in surface mode at the right date: stand at the North Cape on the
 * solstice and the Sun grazes the horizon without setting; stand at the South
 * Pole in winter for months of night and auroras. `note` is the "why it's
 * special" blurb shown in the search palette and the surface HUD.
 */
export interface Landmark {
  name: string
  latDeg: number
  lonDeg: number
  note: string
}

export const LANDMARKS: Landmark[] = [
  // Astronomical curiosities
  {
    name: 'North Cape',
    latDeg: 71.17,
    lonDeg: 25.78,
    note: 'Midnight sun — above the Arctic Circle the Sun never sets near the summer solstice',
  },
  {
    name: 'North Pole',
    latDeg: 89.95,
    lonDeg: 0,
    note: 'Six months of continuous daylight, then six months of night',
  },
  {
    name: 'South Pole',
    latDeg: -89.95,
    lonDeg: 0,
    note: 'Amundsen–Scott Station — months of polar night and brilliant auroras',
  },
  {
    name: 'Equator (Mitad del Mundo)',
    latDeg: -0.0022,
    lonDeg: -78.4558,
    note: 'Latitude zero — the Sun passes straight overhead at the equinoxes',
  },
  {
    name: 'Royal Observatory, Greenwich',
    latDeg: 51.4779,
    lonDeg: -0.0015,
    note: 'The Prime Meridian — longitude zero, where mean solar time is kept',
  },
  {
    name: 'Null Island',
    latDeg: 0,
    lonDeg: 0,
    note: 'Where the Equator meets the Prime Meridian — open ocean off West Africa',
  },
  // Geographic extremes
  {
    name: 'Vatican City',
    latDeg: 41.9023,
    lonDeg: 12.4534,
    note: "The world's smallest country — just 0.49 km²",
  },
  {
    name: 'Mount Everest summit',
    latDeg: 27.9881,
    lonDeg: 86.925,
    note: "Earth's highest point, 8,849 m above sea level",
  },
  {
    name: 'Dead Sea',
    latDeg: 31.5,
    lonDeg: 35.46,
    note: "Earth's lowest land, about 430 m below sea level",
  },
  {
    name: 'Point Nemo',
    latDeg: -48.8767,
    lonDeg: -123.3933,
    note: 'The oceanic pole of inaccessibility — the most remote spot from any land',
  },
  {
    name: 'Oymyakon',
    latDeg: 63.4608,
    lonDeg: 142.7858,
    note: 'The coldest permanently inhabited place on Earth (−68 °C recorded)',
  },
  {
    name: 'Death Valley',
    latDeg: 36.5323,
    lonDeg: -116.9325,
    note: 'The hottest place on Earth — 56.7 °C at Furnace Creek',
  },
  {
    name: 'Sahara Desert',
    latDeg: 23.0,
    lonDeg: 12.0,
    note: 'The largest hot desert, roughly the size of the United States',
  },
  {
    name: 'Easter Island',
    latDeg: -27.1127,
    lonDeg: -109.3497,
    note: 'Rapa Nui — one of the most isolated inhabited islands on the planet',
  },
  {
    name: 'Angel Falls',
    latDeg: 5.9701,
    lonDeg: -62.5362,
    note: "Salto Ángel — the world's tallest waterfall, 979 m",
  },
]
