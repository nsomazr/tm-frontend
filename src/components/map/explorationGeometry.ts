export type ExplorationMode = 'point' | 'line' | 'polygon'

/** A user-entered exploration geometry. Points are WGS84 [lng, lat] pairs. */
export interface ExplorationDraw {
  mode: ExplorationMode
  points: [number, number][]
}

export interface Bounds {
  west: number
  south: number
  east: number
  north: number
}

export function explorationCentroid(points: [number, number][]): { lat: number; lng: number } | null {
  if (!points.length) return null
  let sx = 0
  let sy = 0
  for (const [lng, lat] of points) {
    sx += lng
    sy += lat
  }
  return { lng: sx / points.length, lat: sy / points.length }
}

export function explorationBounds(points: [number, number][]): Bounds | null {
  if (!points.length) return null
  let west = Infinity
  let east = -Infinity
  let south = Infinity
  let north = -Infinity
  for (const [lng, lat] of points) {
    if (lng < west) west = lng
    if (lng > east) east = lng
    if (lat < south) south = lat
    if (lat > north) north = lat
  }
  return { west, south, east, north }
}

const EARTH_RADIUS_M = 6378137

/** Approximate planar area (km²) of a closed ring using the spherical excess / shoelace on projected metres. */
export function explorationAreaKm2(points: [number, number][]): number {
  if (points.length < 3) return 0
  const toXY = ([lng, lat]: [number, number]) => {
    const x = (lng * Math.PI) / 180 * EARTH_RADIUS_M * Math.cos((lat * Math.PI) / 180)
    const y = (lat * Math.PI) / 180 * EARTH_RADIUS_M
    return [x, y]
  }
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = toXY(points[i])
    const [x2, y2] = toXY(points[(i + 1) % points.length])
    area += x1 * y2 - x2 * y1
  }
  return Math.abs(area) / 2 / 1_000_000
}

/** Rough great-circle length (km) of a polyline. */
export function explorationLengthKm(points: [number, number][]): number {
  if (points.length < 2) return 0
  const rad = (d: number) => (d * Math.PI) / 180
  let total = 0
  for (let i = 0; i < points.length - 1; i++) {
    const [lng1, lat1] = points[i]
    const [lng2, lat2] = points[i + 1]
    const dLat = rad(lat2 - lat1)
    const dLng = rad(lng2 - lng1)
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2
    total += 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a))
  }
  return total / 1000
}

/** Minimum points required for a mode to be explorable. */
export function explorationReady(draw: ExplorationDraw | null): boolean {
  if (!draw) return false
  if (draw.mode === 'point') return draw.points.length >= 1
  if (draw.mode === 'line') return draw.points.length >= 2
  return draw.points.length >= 3
}

export function layerTypeToDrawMode(layerType: string): ExplorationMode {
  if (layerType === 'line') return 'line'
  if (layerType === 'polygon') return 'polygon'
  return 'point'
}

export type DrawGeometry = {
  type: 'Point' | 'LineString' | 'Polygon'
  coordinates: number[] | number[][] | number[][][]
}

/** Build a GeoJSON geometry from WGS84 draw vertices. */
export function geometryFromDraw(draw: ExplorationDraw): DrawGeometry {
  if (draw.mode === 'point') {
    return { type: 'Point', coordinates: draw.points[0] }
  }
  if (draw.mode === 'line') {
    return { type: 'LineString', coordinates: draw.points }
  }
  const ring = [...draw.points]
  const first = ring[0]
  const last = ring[ring.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push(first)
  }
  return { type: 'Polygon', coordinates: [ring] }
}

export function geometryTypeLabel(geometry: { type?: string } | undefined): string {
  const type = geometry?.type
  if (type === 'Point' || type === 'MultiPoint') return 'Point'
  if (type === 'LineString' || type === 'MultiLineString') return 'Structure'
  if (type === 'Polygon' || type === 'MultiPolygon') return 'Polygon'
  return type || 'Feature'
}

export function featureVertexCount(geometry: { type?: string; coordinates?: unknown } | undefined): number | null {
  if (!geometry || !('coordinates' in geometry)) return null
  const coords = geometry.coordinates
  if (geometry.type === 'Point') return 1
  if (geometry.type === 'LineString') return (coords as number[][]).length
  if (geometry.type === 'Polygon') {
    const ring = (coords as number[][][])[0]
    if (!ring?.length) return 0
    const closed =
      ring.length > 1 &&
      ring[0][0] === ring[ring.length - 1][0] &&
      ring[0][1] === ring[ring.length - 1][1]
    return closed ? ring.length - 1 : ring.length
  }
  return null
}
