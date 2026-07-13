export type CoordinateDisplayFormat = 'decimal' | 'dms'

export const COORDINATE_FORMAT_STORAGE_KEY = 'terra-map-coordinate-format'
export const COORDINATE_FORMAT_CHANGE_EVENT = 'terra-map-coordinate-format-change'

export type LatHemisphere = 'N' | 'S'
export type LngHemisphere = 'E' | 'W'

export type DmsAxisParts = {
  degrees: string
  minutes: string
  seconds: string
  hemi: LatHemisphere | LngHemisphere
}

export function readStoredCoordinateFormat(): CoordinateDisplayFormat {
  if (typeof window === 'undefined') return 'decimal'
  const stored = localStorage.getItem(COORDINATE_FORMAT_STORAGE_KEY)
  return stored === 'dms' ? 'dms' : 'decimal'
}

export function storeCoordinateFormat(format: CoordinateDisplayFormat) {
  if (typeof window === 'undefined') return
  localStorage.setItem(COORDINATE_FORMAT_STORAGE_KEY, format)
  window.dispatchEvent(new CustomEvent(COORDINATE_FORMAT_CHANGE_EVENT, { detail: format }))
}

export function emptyDmsParts(axis: 'lat' | 'lng'): DmsAxisParts {
  return {
    degrees: '',
    minutes: '',
    seconds: '',
    hemi: axis === 'lat' ? 'S' : 'E',
  }
}

/** Convert signed decimal degrees to DMS with hemisphere label. */
export function decimalToDms(decimal: number, axis: 'lat' | 'lng'): string {
  const parts = decimalToDmsParts(decimal, axis)
  const secText = Number(parts.seconds).toFixed(1)
  return `${parts.degrees}° ${parts.minutes}' ${secText}" ${parts.hemi}`
}

export function decimalToDmsParts(decimal: number, axis: 'lat' | 'lng'): DmsAxisParts {
  const abs = Math.abs(decimal)
  const degrees = Math.floor(abs)
  const minutesTotal = (abs - degrees) * 60
  const minutes = Math.floor(minutesTotal)
  const seconds = (minutesTotal - minutes) * 60
  const hemi: LatHemisphere | LngHemisphere =
    axis === 'lat' ? (decimal >= 0 ? 'N' : 'S') : decimal >= 0 ? 'E' : 'W'
  return {
    degrees: String(degrees),
    minutes: String(minutes),
    seconds: seconds.toFixed(1),
    hemi,
  }
}

/** Build signed decimal degrees from separate DMS boxes. */
export function dmsPartsToDecimal(parts: DmsAxisParts, axis: 'lat' | 'lng'): number | null {
  const deg = parts.degrees.trim() === '' ? NaN : Number(parts.degrees)
  const min = parts.minutes.trim() === '' ? 0 : Number(parts.minutes)
  const sec = parts.seconds.trim() === '' ? 0 : Number(parts.seconds)
  if (!Number.isFinite(deg) || !Number.isFinite(min) || !Number.isFinite(sec)) return null
  if (deg < 0 || min < 0 || sec < 0) return null
  if (min >= 60 || sec >= 60) return null

  const maxDeg = axis === 'lat' ? 90 : 180
  if (deg > maxDeg) return null
  if (deg === maxDeg && (min > 0 || sec > 0)) return null

  let value = deg + min / 60 + sec / 3600
  const hemi = parts.hemi.toUpperCase()
  if (axis === 'lat') {
    if (hemi !== 'N' && hemi !== 'S') return null
    if (hemi === 'S') value = -value
  } else {
    if (hemi !== 'E' && hemi !== 'W') return null
    if (hemi === 'W') value = -value
  }
  return clampAxis(value, axis)
}

export function formatLatLngPair(
  lat: number,
  lng: number,
  format: CoordinateDisplayFormat = 'decimal'
): string {
  if (format === 'dms') {
    return `${decimalToDms(lat, 'lat')}, ${decimalToDms(lng, 'lng')}`
  }
  return `${lat.toFixed(6)}°, ${lng.toFixed(6)}°`
}

/** Parse one latitude or longitude in decimal or DMS form. */
export function parseCoordinateComponent(
  raw: string,
  axis: 'lat' | 'lng'
): number | null {
  const text = raw.trim()
  if (!text) return null

  if (/[°'′"″]/.test(text) || /\b(deg|degrees|min|minutes|sec|seconds)\b/i.test(text)) {
    const dms = parseDmsToken(text)
    if (dms == null) return null
    return clampAxis(dms, axis)
  }

  const hemiMatch = text.match(/^([NSEWnsew])\s*([+-]?\d+(?:\.\d+)?)$/)
  if (hemiMatch) {
    let value = parseFloat(hemiMatch[2])
    const hemi = hemiMatch[1].toUpperCase()
    if (hemi === 'S' || hemi === 'W') value = -Math.abs(value)
    else value = Math.abs(value)
    return clampAxis(value, axis)
  }

  const trailingHemi = text.match(/^([+-]?\d+(?:\.\d+)?)\s*([NSEWnsew])$/)
  if (trailingHemi) {
    let value = parseFloat(trailingHemi[1])
    const hemi = trailingHemi[2].toUpperCase()
    if (hemi === 'S' || hemi === 'W') value = -Math.abs(value)
    else value = Math.abs(value)
    return clampAxis(value, axis)
  }

  const value = parseFloat(text)
  if (!Number.isFinite(value)) return null
  return clampAxis(value, axis)
}

function clampAxis(value: number, axis: 'lat' | 'lng'): number | null {
  if (axis === 'lat' && value >= -90 && value <= 90) return value
  if (axis === 'lng' && value >= -180 && value <= 180) return value
  return null
}

function parseDmsToken(raw: string): number | null {
  let text = raw.trim()
  let sign = 1
  let hemi = ''

  const prefix = text.match(/^([NSEWnsew])\s*(.+)$/i)
  if (prefix) {
    hemi = prefix[1].toUpperCase()
    text = prefix[2].trim()
  }
  const suffix = text.match(/^(.+?)\s*([NSEWnsew])$/i)
  if (suffix) {
    hemi = suffix[2].toUpperCase()
    text = suffix[1].trim()
  }

  const parts = text
    .replace(/[°º]/g, ' ')
    .replace(/[''′]/g, ' ')
    .replace(/["″]/g, ' ')
  const nums = parts.match(/\d+(?:\.\d+)?/g)
  if (!nums?.length) return null

  const deg = parseFloat(nums[0])
  const min = nums[1] != null ? parseFloat(nums[1]) : 0
  const sec = nums[2] != null ? parseFloat(nums[2]) : 0
  if (![deg, min, sec].every(Number.isFinite)) return null

  let value = Math.abs(deg) + min / 60 + sec / 3600
  if (hemi === 'S' || hemi === 'W') sign = -1
  else if (hemi === 'N' || hemi === 'E') sign = 1
  else if (deg < 0) sign = -1

  return sign * value
}
