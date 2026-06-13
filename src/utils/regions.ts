/**
 * Coarse geographic region names for eclipse "point of greatest eclipse"
 * coordinates. Deliberately approximate: boxes are checked in order and the
 * first match wins; oceans catch everything left over.
 */

interface RegionBox {
  name: string
  latMin: number
  latMax: number
  lonMin: number
  lonMax: number
}

const BOXES: RegionBox[] = [
  // Polar
  { name: 'Antarctica', latMin: -90, latMax: -62, lonMin: -180, lonMax: 180 },
  { name: 'the Arctic', latMin: 78, latMax: 90, lonMin: -180, lonMax: 180 },
  // Specific land regions (checked before the broad ocean boxes)
  { name: 'Greenland', latMin: 60, latMax: 78, lonMin: -55, lonMax: -30 },
  { name: 'Iceland and the North Atlantic', latMin: 58, latMax: 70, lonMin: -30, lonMax: -10 },
  { name: 'Scandinavia', latMin: 55, latMax: 72, lonMin: 4, lonMax: 32 },
  { name: 'Europe', latMin: 36, latMax: 60, lonMin: -10, lonMax: 40 },
  { name: 'the Iberian Peninsula', latMin: 35, latMax: 44, lonMin: -10, lonMax: 4 },
  { name: 'North Africa', latMin: 12, latMax: 36, lonMin: -18, lonMax: 35 },
  { name: 'southern Africa', latMin: -36, latMax: -12, lonMin: 10, lonMax: 42 },
  { name: 'central Africa', latMin: -12, latMax: 12, lonMin: -18, lonMax: 50 },
  { name: 'the Middle East', latMin: 12, latMax: 42, lonMin: 35, lonMax: 63 },
  { name: 'Central Asia', latMin: 35, latMax: 55, lonMin: 46, lonMax: 90 },
  { name: 'Siberia', latMin: 50, latMax: 78, lonMin: 60, lonMax: 180 },
  { name: 'South Asia', latMin: 5, latMax: 35, lonMin: 63, lonMax: 92 },
  { name: 'East Asia', latMin: 18, latMax: 50, lonMin: 92, lonMax: 145 },
  { name: 'Southeast Asia', latMin: -10, latMax: 18, lonMin: 92, lonMax: 141 },
  { name: 'Australia', latMin: -44, latMax: -10, lonMin: 112, lonMax: 154 },
  { name: 'New Zealand', latMin: -48, latMax: -34, lonMin: 166, lonMax: 179 },
  { name: 'Alaska', latMin: 55, latMax: 72, lonMin: -170, lonMax: -130 },
  { name: 'Canada', latMin: 48, latMax: 78, lonMin: -130, lonMax: -55 },
  { name: 'the United States', latMin: 25, latMax: 48, lonMin: -125, lonMax: -67 },
  { name: 'Mexico and Central America', latMin: 7, latMax: 25, lonMin: -118, lonMax: -77 },
  { name: 'South America', latMin: -56, latMax: 12, lonMin: -82, lonMax: -34 },
  // Oceans (broad fallbacks)
  { name: 'the North Atlantic', latMin: 0, latMax: 78, lonMin: -70, lonMax: -8 },
  { name: 'the South Atlantic', latMin: -62, latMax: 0, lonMin: -55, lonMax: 18 },
  { name: 'the Indian Ocean', latMin: -62, latMax: 25, lonMin: 40, lonMax: 112 },
  { name: 'the North Pacific', latMin: 0, latMax: 65, lonMin: 145, lonMax: 180 },
  { name: 'the North Pacific', latMin: 0, latMax: 65, lonMin: -180, lonMax: -118 },
  { name: 'the South Pacific', latMin: -62, latMax: 0, lonMin: 141, lonMax: 180 },
  { name: 'the South Pacific', latMin: -62, latMax: 0, lonMin: -180, lonMax: -82 },
]

/** Approximate region for a latitude/longitude (degrees, east-positive). */
export function regionName(latDeg: number, lonDeg: number): string {
  // Normalize longitude to [-180, 180].
  const lon = (((lonDeg % 360) + 540) % 360) - 180
  for (const b of BOXES) {
    if (latDeg >= b.latMin && latDeg <= b.latMax && lon >= b.lonMin && lon <= b.lonMax) {
      return b.name
    }
  }
  return 'the open ocean'
}
