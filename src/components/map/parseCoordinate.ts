import { parseCoordinateComponent } from './coordinateFormat'

export interface ParsedCoordinate {
  lat: number
  lng: number
}

/**
 * Parse a free-text coordinate query into WGS84 lat/lng.
 *
 * Accepts common forms:
 *   "-6.17, 35.74"      (lat, lng decimal)
 *   "6.17S, 35.74E"     (hemisphere suffixes)
 *   "3° 57' 57.9\" S, 26° 31' 0.9\" E"  (DMS)
 *   "3 57 57.9 S 26 31 0.9 E"
 * Order is assumed lat,lng but is auto-corrected when clearly swapped.
 */
export function parseCoordinateQuery(raw: string): ParsedCoordinate | null {
  if (!raw) return null
  const text = raw.trim()
  if (!/\d/.test(text)) return null

  if (/[°'′"″]/.test(text) || /\b(deg|degrees|min|minutes|sec|seconds)\b/i.test(text)) {
    const dms = parseDmsCoordinatePair(text)
    if (dms) return dms
  }

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
    lat = b.value
    lng = a.value
  } else {
    return null
  }

  if (!(lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180)) return null
  return { lat, lng }
}

function parseDmsCoordinatePair(text: string): ParsedCoordinate | null {
  const chunks = splitCoordinatePair(text)
  if (chunks.length < 2) return null

  const first = parseCoordinateComponent(chunks[0], 'lat') ?? parseCoordinateComponent(chunks[0], 'lng')
  const second =
    parseCoordinateComponent(chunks[1], 'lng') ?? parseCoordinateComponent(chunks[1], 'lat')
  if (first == null || second == null) return null

  const firstIsLat = Math.abs(first) <= 90 && /[NS]/i.test(chunks[0])
  const secondIsLng = Math.abs(second) <= 180 && /[EW]/i.test(chunks[1])
  const firstIsLng = Math.abs(first) <= 180 && /[EW]/i.test(chunks[0])
  const secondIsLat = Math.abs(second) <= 90 && /[NS]/i.test(chunks[1])

  let lat: number
  let lng: number
  if (firstIsLng && secondIsLat) {
    lng = first
    lat = second
  } else if (firstIsLat && secondIsLng) {
    lat = first
    lng = second
  } else if (Math.abs(first) <= 90 && Math.abs(second) <= 180) {
    lat = first
    lng = second
  } else if (Math.abs(second) <= 90 && Math.abs(first) <= 180) {
    lat = second
    lng = first
  } else {
    return null
  }

  if (!(lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180)) return null
  return { lat, lng }
}

function splitCoordinatePair(text: string): string[] {
  if (text.includes(',')) {
    const parts = text.split(',').map((p) => p.trim()).filter(Boolean)
    if (parts.length >= 2) return parts.slice(0, 2)
  }

  const ewSplit = text.match(
    /^(.+?[NSEWnsew])\s+(.+?[NSEWnsew])$/i
  )
  if (ewSplit) return [ewSplit[1].trim(), ewSplit[2].trim()]

  return [text]
}
