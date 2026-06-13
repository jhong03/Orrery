/**
 * Places for the search palette — curated toward scenic viewpoints so the 3D
 * terrain reads, plus dark-sky and auroral spots. Coordinates pick a good
 * vantage (a summit, rim or shoreline) rather than a flat city centre.
 */
export interface City {
  name: string
  latDeg: number
  lonDeg: number
  /** For search keywords (country/region/why it's worth standing here). */
  region: string
}

export const CITIES: City[] = [
  // Dramatic terrain
  { name: 'Grand Canyon', latDeg: 36.06, lonDeg: -112.14, region: 'Arizona · canyon rim' },
  { name: 'Mount Fuji', latDeg: 35.36, lonDeg: 138.73, region: 'Japan · volcano' },
  { name: 'Matterhorn', latDeg: 45.98, lonDeg: 7.66, region: 'Zermatt · Alps' },
  { name: 'Everest Base Camp', latDeg: 28.0, lonDeg: 86.86, region: 'Himalaya · 5,300 m' },
  { name: 'Queenstown', latDeg: -45.03, lonDeg: 168.66, region: 'New Zealand · Remarkables' },
  { name: 'Table Mountain', latDeg: -33.96, lonDeg: 18.41, region: 'Cape Town · clifftop' },
  { name: 'Rio de Janeiro', latDeg: -22.95, lonDeg: -43.16, region: 'Brazil · Sugarloaf' },
  { name: 'Mauna Kea', latDeg: 19.82, lonDeg: -155.47, region: 'Hawaii · 4,200 m observatory' },
  // Dark skies
  { name: 'Atacama Desert', latDeg: -24.5, lonDeg: -69.25, region: 'Chile · clearest skies' },
  { name: 'Reykjavík', latDeg: 64.13, lonDeg: -21.9, region: 'Iceland · volcanic' },
  // Auroral latitudes
  { name: 'Tromsø', latDeg: 69.65, lonDeg: 18.96, region: 'Norway · northern lights' },
  { name: 'Fairbanks', latDeg: 64.84, lonDeg: -147.72, region: 'Alaska · northern lights' },
  { name: 'Svalbard', latDeg: 78.22, lonDeg: 15.65, region: 'Norway · high Arctic' },
  { name: 'Ushuaia', latDeg: -54.8, lonDeg: -68.3, region: 'Argentina · southern lights' },
  // Great cities
  { name: 'London', latDeg: 51.51, lonDeg: -0.13, region: 'United Kingdom' },
  { name: 'New York', latDeg: 40.71, lonDeg: -74.01, region: 'United States' },
  { name: 'Tokyo', latDeg: 35.68, lonDeg: 139.69, region: 'Japan' },
  { name: 'Sydney', latDeg: -33.86, lonDeg: 151.21, region: 'Australia · harbour' },
  { name: 'Cairo', latDeg: 29.98, lonDeg: 31.13, region: 'Egypt · pyramids' },
  { name: 'Singapore', latDeg: 1.35, lonDeg: 103.82, region: 'equator' },
]
