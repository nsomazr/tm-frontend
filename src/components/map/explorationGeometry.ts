export type ExplorationMode = 'point' | 'line' | 'polygon'

/** A user-entered exploration geometry. Points are WGS84 [lng, lat] pairs. */
export interface ExplorationDraw {
  mode: ExplorationMode
  /** Current vertices (all points in point mode, or the in-progress polygon/line). */
  points: [number, number][]
  /** Finished polygon rings when drawing multiple polygons (marketplace). */
  polygons?: [number, number][][]
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

export function allDrawPositions(draw: ExplorationDraw | null | undefined): [number, number][] {
  if (!draw) return []
  const out: [number, number][] = [...draw.points]
  for (const ring of draw.polygons || []) {
    out.push(...ring)
  }
  return out
}

export function paddedExplorationFitBounds(
  points: [number, number][],
  mode: ExplorationMode,
): Bounds | null {
  if (mode === 'point' && points.length <= 1) return null
  const bounds = explorationBounds(points)
  if (!bounds) return null
  if (bounds.east <= bounds.west && bounds.north <= bounds.south) {
    const pad = 0.05
    return {
      west: bounds.west - pad,
      south: bounds.south - pad,
      east: bounds.east + pad,
      north: bounds.north + pad,
    }
  }
  const padLng = Math.max((bounds.east - bounds.west) * 0.15, 0.02)
  const padLat = Math.max((bounds.north - bounds.south) * 0.15, 0.02)
  return {
    west: bounds.west - padLng,
    south: bounds.south - padLat,
    east: bounds.east + padLng,
    north: bounds.north + padLat,
  }
}

/** WGS84 bounds for a GeoJSON draw geometry (export / snapshot fitting). */
export function boundsFromDrawGeometry(geometry: DrawGeometry): Bounds | null {
  if (geometry.type === 'Point') {
    const [lng, lat] = geometry.coordinates as number[]
    const pad = 0.025
    return { west: lng - pad, east: lng + pad, south: lat - pad, north: lat + pad }
  }
  if (geometry.type === 'MultiPoint') {
    return explorationBounds(geometry.coordinates as [number, number][])
  }
  if (geometry.type === 'LineString') {
    return paddedExplorationFitBounds(geometry.coordinates as [number, number][], 'line')
  }
  if (geometry.type === 'Polygon') {
    const ring = (geometry.coordinates as number[][][])[0] as [number, number][]
    return paddedExplorationFitBounds(ring, 'polygon')
  }
  if (geometry.type === 'MultiPolygon') {
    const rings = (geometry.coordinates as number[][][][]).flatMap((poly) =>
      (poly[0] || []).map(([lng, lat]) => [lng, lat] as [number, number]),
    )
    return paddedExplorationFitBounds(rings, 'polygon')
  }
  return null
}

const EARTH_RADIUS_M = 6378137

/** Approximate planar area (km²) of a closed ring using shoelace on projected metres. */
export function explorationAreaKm2(points: [number, number][]): number {
  if (points.length < 3) return 0
  const toXY = ([lng, lat]: [number, number]) => {
    const x = ((lng * Math.PI) / 180) * EARTH_RADIUS_M * Math.cos((lat * Math.PI) / 180)
    const y = ((lat * Math.PI) / 180) * EARTH_RADIUS_M
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

/** Total area across finished + draft polygons. */
export function explorationTotalAreaKm2(draw: ExplorationDraw | null | undefined): number {
  if (!draw || draw.mode !== 'polygon') return 0
  let total = 0
  for (const ring of draw.polygons || []) {
    total += explorationAreaKm2(ring)
  }
  if (draw.points.length >= 3) total += explorationAreaKm2(draw.points)
  return total
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

/** Minimum geometry required for a mode to be usable. */
export function explorationReady(draw: ExplorationDraw | null): boolean {
  if (!draw) return false
  if (draw.mode === 'point') return draw.points.length >= 1
  if (draw.mode === 'line') return draw.points.length >= 2
  const finished = (draw.polygons || []).length
  if (finished > 0) return true
  return draw.points.length >= 3
}

export function layerTypeToDrawMode(layerType: string): ExplorationMode {
  if (layerType === 'line') return 'line'
  if (layerType === 'polygon') return 'polygon'
  return 'point'
}

export type DrawGeometry = {
  type: 'Point' | 'MultiPoint' | 'LineString' | 'Polygon' | 'MultiPolygon'
  coordinates: number[] | number[][] | number[][][] | number[][][][]
}

function closeRing(points: [number, number][]): [number, number][] {
  const ring = [...points]
  const first = ring[0]
  const last = ring[ring.length - 1]
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    ring.push(first)
  }
  return ring
}

function openRing(ring: [number, number][]): [number, number][] {
  const points = ring.map(([lng, lat]) => [lng, lat] as [number, number])
  if (
    points.length > 1 &&
    points[0][0] === points[points.length - 1][0] &&
    points[0][1] === points[points.length - 1][1]
  ) {
    points.pop()
  }
  return points
}

/** Build a GeoJSON geometry from WGS84 draw vertices. */
export function geometryFromDraw(draw: ExplorationDraw): DrawGeometry {
  if (draw.mode === 'point') {
    if (draw.points.length === 1) {
      return { type: 'Point', coordinates: draw.points[0] }
    }
    return { type: 'MultiPoint', coordinates: draw.points }
  }
  if (draw.mode === 'line') {
    return { type: 'LineString', coordinates: draw.points }
  }
  const rings: [number, number][][] = [...(draw.polygons || [])]
  if (draw.points.length >= 3) rings.push(draw.points)
  if (rings.length === 1) {
    return { type: 'Polygon', coordinates: [closeRing(rings[0])] }
  }
  return {
    type: 'MultiPolygon',
    coordinates: rings.map((ring) => [closeRing(ring)]),
  }
}

/** Rebuild draw state from stored GeoJSON (including Multi* types). */
export function drawFromGeometry(
  geometry:
    | DrawGeometry
    | { type?: string; coordinates?: unknown; geometries?: unknown }
    | null
    | undefined,
): ExplorationDraw | null {
  if (!geometry?.type) return null

  if (geometry.type === 'Point') {
    const coords = geometry.coordinates as number[] | undefined
    if (!coords || coords.length < 2) return null
    const [lng, lat] = coords
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
    return { mode: 'point', points: [[lng, lat]] }
  }

  if (geometry.type === 'MultiPoint') {
    const coords = geometry.coordinates as number[][] | undefined
    if (!coords?.length) return null
    const points = coords
      .filter((c) => Array.isArray(c) && c.length >= 2)
      .map(([lng, lat]) => [lng, lat] as [number, number])
      .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat))
    if (!points.length) return null
    return { mode: 'point', points }
  }

  if (geometry.type === 'Polygon') {
    const ring = (geometry.coordinates as number[][][])?.[0] as [number, number][] | undefined
    if (!ring?.length) return null
    const points = openRing(ring)
    if (points.length < 3) return null
    return { mode: 'polygon', points, polygons: [] }
  }

  if (geometry.type === 'MultiPolygon') {
    const polys = geometry.coordinates as number[][][][] | undefined
    if (!polys?.length) return null
    const rings = polys
      .map((poly) => openRing((poly?.[0] || []) as [number, number][]))
      .filter((ring) => ring.length >= 3)
    if (!rings.length) return null
    return { mode: 'polygon', points: [], polygons: rings }
  }

  if (geometry.type === 'GeometryCollection') {
    const geoms = (geometry as { geometries?: unknown }).geometries
    if (!Array.isArray(geoms) || !geoms.length) return null
    const points: [number, number][] = []
    const polygons: [number, number][][] = []
    for (const child of geoms) {
      const part = drawFromGeometry(child as DrawGeometry)
      if (!part) continue
      if (part.mode === 'point') points.push(...part.points)
      if (part.mode === 'polygon') {
        if (part.polygons?.length) polygons.push(...part.polygons)
        if (part.points.length >= 3) polygons.push(part.points)
      }
    }
    if (polygons.length && !points.length) {
      return { mode: 'polygon', points: [], polygons }
    }
    if (points.length && !polygons.length) {
      return { mode: 'point', points }
    }
    if (polygons.length) {
      return { mode: 'polygon', points: [], polygons }
    }
  }

  return null
}

export function geometryTypeLabel(geometry: { type?: string } | undefined): string {
  const type = geometry?.type
  if (type === 'Point' || type === 'MultiPoint') return 'Point'
  if (type === 'LineString' || type === 'MultiLineString') return 'Structure'
  if (type === 'Polygon' || type === 'MultiPolygon') return 'Polygon'
  return type || 'Feature'
}

export function featureVertexCount(
  geometry: { type?: string; coordinates?: unknown } | undefined,
): number | null {
  if (!geometry || !('coordinates' in geometry)) return null
  const coords = geometry.coordinates
  if (geometry.type === 'Point') return 1
  if (geometry.type === 'MultiPoint') return (coords as number[][]).length
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
  if (geometry.type === 'MultiPolygon') {
    return (coords as number[][][][]).reduce((sum, poly) => {
      const ring = poly?.[0]
      if (!ring?.length) return sum
      const closed =
        ring.length > 1 &&
        ring[0][0] === ring[ring.length - 1][0] &&
        ring[0][1] === ring[ring.length - 1][1]
      return sum + (closed ? ring.length - 1 : ring.length)
    }, 0)
  }
  return null
}

/** Seal the current draft polygon into finished polygons and clear the draft. */
export function finishDraftPolygon(draw: ExplorationDraw | null): ExplorationDraw | null {
  if (!draw || draw.mode !== 'polygon' || draw.points.length < 3) return draw
  return {
    mode: 'polygon',
    points: [],
    polygons: [...(draw.polygons || []), draw.points],
  }
}
