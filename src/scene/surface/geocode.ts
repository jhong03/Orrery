/**
 * Reverse geocoding for surface mode: turn a clicked lat/lon into a readable
 * place name. Uses BigDataCloud's client-side endpoint (no key, CORS-enabled,
 * generous free tier). Fail-safe — returns null on any error, and results are
 * cached by rounded coordinate so panning around doesn't spam the service.
 */
const ENDPOINT = 'https://api.bigdatacloud.net/data/reverse-geocode-client'

const cache = new Map<string, string | null>()

interface BdcResponse {
  city?: string
  locality?: string
  principalSubdivision?: string
  countryName?: string
}

/** "City, Country" / "Region, Country" / "Country" / "Open ocean" / null. */
export async function reverseGeocode(latDeg: number, lonDeg: number): Promise<string | null> {
  const key = `${latDeg.toFixed(2)},${lonDeg.toFixed(2)}`
  if (cache.has(key)) return cache.get(key)!
  try {
    const res = await fetch(`${ENDPOINT}?latitude=${latDeg}&longitude=${lonDeg}`)
    const d: BdcResponse = await res.json()
    const place = d.city || d.locality || d.principalSubdivision
    let label: string | null
    if (d.countryName)
      label = place && place !== d.countryName ? `${place}, ${d.countryName}` : d.countryName
    else label = 'Open ocean' // BigDataCloud returns no country at sea
    cache.set(key, label)
    return label
  } catch {
    cache.set(key, null)
    return null
  }
}
