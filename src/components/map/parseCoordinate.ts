export interface ParsedCoordinate {
  lat: number
  lng: number
}

/**
 * Parse a free-text coordinate query into WGS84 lat/lng.
 *
 * Accepts common forms:
 *   "-6.17, 35.74"      (lat, lng)
 *   "-6.17 35.74"
 *   "6.17S, 35.74E"     (hemisphere suffixes/prefixes)
 *   "lat: -6.17 lng: 35.74"
 * Order is assumed lat,lng but is auto-corrected when clearly swapped.
 * Returns null when the text isn't a coordinate pair.
 */
export function parseCoordinateQuery(raw: string): ParsedCoordinate | null {
  if (!raw) return null
  const text = raw.trim()
  // Require at least one digit and a separator/hemisphere to avoid matching names.
  if (!/\d/.test(text)) return null

  // Pull signed decimal numbers, each with an optional hemisphere letter.
  const matches = [...text.matchAll(/([+-]?\d+(?:\.\d+)?)\s*([NSEWnsew])?/g)].filter(
    (mm) => mm[1] !== undefined && mm[0].trim() !== ''
  )
  if (matches.length < 2) return null

  const nums = matches.slice(0, 2).map((mm) => {
    let value = parseFloat(mm[1])
    const hemi = mm[2]?.toUpperCase()
    if (hemi === 'S' || hemi === 'W') value = -Math.abs(value)
    else if (hemi === 'N' || hemi === 'E') value = Math.abs(value)
    return { value, hemi }
  })

  const [a, b] = nums
  if (!Number.isFinite(a.value) || !Number.isFinite(b.value)) return null

  // Use hemisphere hints when present to decide which is lat vs lng.
  const aIsLat = a.hemi === 'N' || a.hemi === 'S'
  const bIsLng = b.hemi === 'E' || b.hemi === 'W'
  const aIsLng = a.hemi === 'E' || a.hemi === 'W'
  const bIsLat = b.hemi === 'N' || b.hemi === 'S'

  let lat: number
  let lng: number
  if (aIsLng || bIsLat) {
    lat = b.value
    lng = a.value
  } else if (aIsLat || bIsLng) {
    lat = a.value
    lng = b.value
  } else if (Math.abs(a.value) <= 90 && Math.abs(b.value) <= 180) {
    lat = a.value
    lng = b.value
  } else if (Math.abs(b.value) <= 90 && Math.abs(a.value) <= 180) {
    // Looks swapped (lng, lat)
    lat = b.value
    lng = a.value
  } else {
    return null
  }

  if (!(lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180)) return null
  return { lat, lng }
}
