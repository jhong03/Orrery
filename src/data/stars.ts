/**
 * The brightest named stars, rendered as points so they survive bloom.
 * RA in hours (J2000), Dec in degrees (J2000), V magnitude, approximate
 * linear RGB tint from spectral class.
 */
export interface BrightStar {
  name: string
  raH: number
  decDeg: number
  mag: number
  color: [number, number, number]
}

const BLUE: [number, number, number] = [0.72, 0.82, 1.0]
const WHITE: [number, number, number] = [0.92, 0.95, 1.0]
const YELLOW: [number, number, number] = [1.0, 0.92, 0.72]
const ORANGE: [number, number, number] = [1.0, 0.72, 0.5]
const RED: [number, number, number] = [1.0, 0.58, 0.38]

export const BRIGHT_STARS: BrightStar[] = [
  { name: 'Sirius', raH: 6.752, decDeg: -16.716, mag: -1.46, color: WHITE },
  { name: 'Canopus', raH: 6.4, decDeg: -52.696, mag: -0.74, color: WHITE },
  { name: 'Alpha Centauri', raH: 14.66, decDeg: -60.834, mag: -0.27, color: YELLOW },
  { name: 'Arcturus', raH: 14.261, decDeg: 19.182, mag: -0.05, color: ORANGE },
  { name: 'Vega', raH: 18.616, decDeg: 38.784, mag: 0.03, color: BLUE },
  { name: 'Capella', raH: 5.278, decDeg: 45.998, mag: 0.08, color: YELLOW },
  { name: 'Rigel', raH: 5.242, decDeg: -8.202, mag: 0.13, color: BLUE },
  { name: 'Procyon', raH: 7.655, decDeg: 5.225, mag: 0.34, color: WHITE },
  { name: 'Achernar', raH: 1.629, decDeg: -57.237, mag: 0.46, color: BLUE },
  { name: 'Betelgeuse', raH: 5.919, decDeg: 7.407, mag: 0.5, color: RED },
  { name: 'Hadar', raH: 14.064, decDeg: -60.373, mag: 0.61, color: BLUE },
  { name: 'Altair', raH: 19.846, decDeg: 8.868, mag: 0.76, color: WHITE },
  { name: 'Acrux', raH: 12.443, decDeg: -63.099, mag: 0.76, color: BLUE },
  { name: 'Aldebaran', raH: 4.599, decDeg: 16.509, mag: 0.86, color: ORANGE },
  { name: 'Spica', raH: 13.42, decDeg: -11.161, mag: 0.97, color: BLUE },
  { name: 'Antares', raH: 16.49, decDeg: -26.432, mag: 1.06, color: RED },
  { name: 'Pollux', raH: 7.755, decDeg: 28.026, mag: 1.14, color: ORANGE },
  { name: 'Fomalhaut', raH: 22.961, decDeg: -29.622, mag: 1.16, color: WHITE },
  { name: 'Deneb', raH: 20.69, decDeg: 45.28, mag: 1.25, color: WHITE },
  { name: 'Mimosa', raH: 12.795, decDeg: -59.689, mag: 1.25, color: BLUE },
  { name: 'Regulus', raH: 10.139, decDeg: 11.967, mag: 1.39, color: BLUE },
  { name: 'Adhara', raH: 6.977, decDeg: -28.972, mag: 1.5, color: BLUE },
  { name: 'Castor', raH: 7.577, decDeg: 31.888, mag: 1.62, color: WHITE },
  { name: 'Polaris', raH: 2.53, decDeg: 89.264, mag: 1.98, color: YELLOW },
]
