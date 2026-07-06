import proj4 from 'proj4'
import { register } from 'ol/proj/proj4'
import { transform } from 'ol/proj'

export type CoordinateSystemId =
  | 'arc1960'
  | 'arc1960-utm35s'
  | 'arc1960-utm36s'
  | 'arc1960-utm37s'
  | 'wgs84'
  | 'webmercator'

export interface CoordinateSystemOption {
  id: CoordinateSystemId
  label: string
  epsg: string
  kind: 'geographic' | 'projected'
}

export const COORDINATE_SYSTEMS: CoordinateSystemOption[] = [
  { id: 'arc1960-utm35s', label: 'Arc 1960 UTM Zone 35S', epsg: 'EPSG:21035', kind: 'projected' },
  { id: 'arc1960-utm36s', label: 'Arc 1960 UTM Zone 36S', epsg: 'EPSG:21036', kind: 'projected' },
  { id: 'arc1960-utm37s', label: 'Arc 1960 UTM Zone 37S', epsg: 'EPSG:21037', kind: 'projected' },
  { id: 'arc1960', label: 'GCS ARC 1960', epsg: 'EPSG:4210', kind: 'geographic' },
  { id: 'wgs84', label: 'GCS WGS 1984', epsg: 'EPSG:4326', kind: 'geographic' },
  {
    id: 'webmercator',
    label: 'WGS 1984 Web Mercator (auxiliary sphere)',
    epsg: 'EPSG:3857',
    kind: 'projected',
  },
]

export const DEFAULT_COORDINATE_SYSTEM: CoordinateSystemId = 'arc1960'
export const COORDINATE_SYSTEM_STORAGE_KEY = 'terra-map-crs'
export const COORDINATE_SYSTEM_CHANGE_EVENT = 'terra-map-crs-change'

const PROJ4_DEFS: Record<string, string> = {
  'EPSG:4210': '+proj=longlat +ellps=clrk80 +towgs84=-160,-6,-302,0,0,0,0 +no_defs +type=crs',
  'EPSG:21035': '+proj=utm +zone=35 +south +ellps=clrk80 +towgs84=-160,-6,-302,0,0,0,0 +units=m +no_defs +type=crs',
  'EPSG:21036': '+proj=utm +zone=36 +south +ellps=clrk80 +towgs84=-160,-6,-302,0,0,0,0 +units=m +no_defs +type=crs',
  'EPSG:21037': '+proj=utm +zone=37 +south +ellps=clrk80 +towgs84=-160,-6,-302,0,0,0,0 +units=m +no_defs +type=crs',
}

let registered = false

export function registerCoordinateProjections() {
  if (registered) return
  for (const [code, def] of Object.entries(PROJ4_DEFS)) {
    proj4.defs(code, def)
  }
  register(proj4)
  registered = true
}

export function coordinateSystemById(id: CoordinateSystemId): CoordinateSystemOption {
  return COORDINATE_SYSTEMS.find((c) => c.id === id) ?? COORDINATE_SYSTEMS[3]
}

export function readStoredCoordinateSystem(): CoordinateSystemId {
  if (typeof window === 'undefined') return DEFAULT_COORDINATE_SYSTEM
  const stored = localStorage.getItem(COORDINATE_SYSTEM_STORAGE_KEY)
  if (stored && COORDINATE_SYSTEMS.some((c) => c.id === stored)) {
    return stored as CoordinateSystemId
  }
  return DEFAULT_COORDINATE_SYSTEM
}

export function storeCoordinateSystem(id: CoordinateSystemId) {
  if (typeof window === 'undefined') return
  localStorage.setItem(COORDINATE_SYSTEM_STORAGE_KEY, id)
  window.dispatchEvent(new CustomEvent(COORDINATE_SYSTEM_CHANGE_EVENT, { detail: id }))
}

export interface TransformedCoordinate {
  x: number
  y: number
  kind: 'geographic' | 'projected'
}

export function transformMapCoordinate(
  mapCoordinate: number[],
  systemId: CoordinateSystemId
): TransformedCoordinate {
  registerCoordinateProjections()
  const system = coordinateSystemById(systemId)

  if (system.epsg === 'EPSG:3857') {
    const [x, y] = mapCoordinate
    return { x, y, kind: 'projected' }
  }

  const wgs84 =
    system.epsg === 'EPSG:4326'
      ? transform(mapCoordinate, 'EPSG:3857', 'EPSG:4326')
      : transform(mapCoordinate, 'EPSG:3857', 'EPSG:4326')

  if (system.epsg === 'EPSG:4326') {
    return { x: wgs84[0], y: wgs84[1], kind: 'geographic' }
  }

  const [x, y] = transform(wgs84, 'EPSG:4326', system.epsg)
  return { x, y, kind: system.kind }
}

/**
 * Convert a coordinate expressed in a chosen CRS back to WGS84 lon/lat.
 *
 * For geographic systems pass ``(x, y) = (lon, lat)`` in that datum; for
 * projected systems pass ``(x, y) = (easting, northing)`` in metres.
 * Returns ``[lng, lat]`` in WGS84 (EPSG:4326), the order OpenLayers/GeoJSON use.
 */
export function lonLatFromCrs(
  x: number,
  y: number,
  systemId: CoordinateSystemId
): [number, number] {
  registerCoordinateProjections()
  const system = coordinateSystemById(systemId)
  if (system.epsg === 'EPSG:4326') {
    return [x, y]
  }
  if (system.epsg === 'EPSG:3857') {
    const [lng, lat] = transform([x, y], 'EPSG:3857', 'EPSG:4326')
    return [lng, lat]
  }
  const [lng, lat] = transform([x, y], system.epsg, 'EPSG:4326')
  return [lng, lat]
}

/** Convert WGS84 lon/lat into the chosen CRS for display in a coordinate list. */
export function lonLatToCrs(
  lng: number,
  lat: number,
  systemId: CoordinateSystemId
): TransformedCoordinate {
  registerCoordinateProjections()
  const system = coordinateSystemById(systemId)
  if (system.epsg === 'EPSG:4326') {
    return { x: lng, y: lat, kind: 'geographic' }
  }
  if (system.epsg === 'EPSG:3857') {
    const [x, y] = transform([lng, lat], 'EPSG:4326', 'EPSG:3857')
    return { x, y, kind: 'projected' }
  }
  const [x, y] = transform([lng, lat], 'EPSG:4326', system.epsg)
  return { x, y, kind: system.kind }
}

export function formatCoordinate(
  coord: TransformedCoordinate,
  kind: 'geographic' | 'projected'
): string {
  if (kind === 'geographic') {
    const lon = coord.x.toFixed(6)
    const lat = coord.y.toFixed(6)
    return `${lat}°, ${lon}°`
  }
  const easting = Math.round(coord.x).toLocaleString()
  const northing = Math.round(coord.y).toLocaleString()
  return `E ${easting}  N ${northing}`
}
