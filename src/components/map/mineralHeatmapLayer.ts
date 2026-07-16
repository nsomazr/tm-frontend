import Heatmap from 'ol/layer/Heatmap'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import VectorSource from 'ol/source/Vector'
import { fromLonLat } from 'ol/proj'

export interface MineralHeatmapPoint {
  lat: number
  lng: number
  weight: number
}

export interface MineralHeatmapWeightLegend {
  strong: number
  medium_poly_point: number
  medium_poly_line: number
  medium_point_line: number
  light_polygon: number
  light_point: number
  light_line: number
}

export interface MineralHeatmapSpec {
  slug: string
  name?: string
  color: string
  mode?: 'single' | 'interaction'
  points: MineralHeatmapPoint[]
  contours?: import('./mineralHeatmapContours').HeatmapContourLevel[]
  concentrationStats?: {
    mean: number
    median: number
    stdev: number
    cutoff: number
  }
  weightLegend?: MineralHeatmapWeightLegend
  anomalyOnly?: boolean
  emptyReason?: string | null
  emptyDetail?: string | null
  /** Between polygon and structure/point bands (see layerOrder bands). */
  zIndex?: number
}

/**
 * Weather-radar style ramp (green → yellow → orange → red → magenta).
 * Distinct saturated stops read closer to classic scientific concentration maps.
 */
export function radarHeatmapGradient(): string[] {
  return [
    'rgba(0, 228, 0, 0)',
    'rgba(0, 228, 0, 0.55)',
    'rgba(160, 230, 0, 0.72)',
    'rgba(255, 255, 0, 0.82)',
    'rgba(255, 176, 0, 0.88)',
    'rgba(255, 126, 0, 0.92)',
    'rgba(255, 0, 0, 0.95)',
    'rgba(200, 0, 80, 0.97)',
    'rgba(192, 0, 192, 1)',
  ]
}

export function mineralHeatmapGradient(_color: string): string[] {
  return radarHeatmapGradient()
}

export function interactionHeatmapGradient(): string[] {
  return radarHeatmapGradient()
}

function heatmapGradient(spec: MineralHeatmapSpec): string[] {
  const base = radarHeatmapGradient()
  const cutoff = spec.concentrationStats?.cutoff
  if (!cutoff || !spec.points.length) return base
  const min = Math.min(...spec.points.map((point) => point.weight))
  const max = Math.max(...spec.points.map((point) => point.weight))
  if (!Number.isFinite(max) || max <= min || cutoff >= max) return base

  // Above peak-zone threshold, push into the magenta core of the radar ramp.
  const cutoffIndex = Math.min(
    7,
    Math.max(4, Math.round(((cutoff - min) / (max - min)) * 8)),
  )
  return Array.from({ length: 9 }, (_, index) => {
    if (index === 0) return 'rgba(0, 228, 0, 0)'
    if (index >= cutoffIndex) {
      const progress = (index - cutoffIndex) / Math.max(1, 8 - cutoffIndex)
      return progress > 0.5
        ? 'rgba(192, 0, 192, 1)'
        : progress > 0.2
          ? 'rgba(220, 0, 100, 0.98)'
          : 'rgba(255, 0, 0, 0.95)'
    }
    return base[Math.min(index, base.length - 1)]
  })
}

/** Heatmap sits above polygons (3600+) and below structures (3700+) / points (3800+). */
export const MINERAL_HEATMAP_Z_INDEX = 3650

/** @deprecated use MINERAL_HEATMAP_Z_INDEX; kept for callers passing min layer z */
export function mineralHeatmapZIndex(_minLayerZIndex: number): number {
  return MINERAL_HEATMAP_Z_INDEX
}

const TARGET_HEATMAP_OPACITY = 0.92
const HEATMAP_FADE_IN_MS = 160
const FEATURE_CHUNK_SIZE = 3000

const STRUCTURE_LAYER_Z_INDEX = 3700

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

function animateLayerOpacity(layer: Heatmap, from: number, to: number, durationMs: number): Promise<void> {
  if (durationMs <= 0 || from === to) {
    layer.setOpacity(to)
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      layer.setOpacity(from + (to - from) * easeOutCubic(t))
      if (t < 1) requestAnimationFrame(tick)
      else resolve()
    }
    requestAnimationFrame(tick)
  })
}

function visiblePoints(spec: MineralHeatmapSpec): MineralHeatmapPoint[] {
  if (!spec.anomalyOnly || !spec.concentrationStats?.cutoff) return spec.points
  return spec.points.filter((point) => point.weight >= spec.concentrationStats!.cutoff)
}

function featuresFromPoints(
  points: MineralHeatmapPoint[],
  minWeight: number,
  maxWeight: number,
): Feature[] {
  const features = new Array<Feature>(points.length)
  const span = maxWeight - minWeight
  for (let i = 0; i < points.length; i += 1) {
    const point = points[i]
    const normalized = span > 0 ? (point.weight - minWeight) / span : 1
    const curved = Math.pow(Math.max(0, normalized), 0.7)
    features[i] = new Feature({
      geometry: new Point(fromLonLat([point.lng, point.lat])),
      weight: point.weight > 0 ? Math.min(1, Math.max(0.12, curved)) : 0,
      rawWeight: point.weight,
    })
  }
  return features
}

async function replaceHeatmapFeatures(
  source: VectorSource,
  points: MineralHeatmapPoint[],
  rangePoints: MineralHeatmapPoint[],
  isCancelled?: () => boolean,
): Promise<void> {
  source.clear(true)
  if (!points.length) return
  const minWeight = Math.min(...rangePoints.map((point) => point.weight))
  const maxWeight = Math.max(...rangePoints.map((point) => point.weight))

  if (points.length <= FEATURE_CHUNK_SIZE) {
    source.addFeatures(featuresFromPoints(points, minWeight, maxWeight))
    return
  }

  for (let offset = 0; offset < points.length; offset += FEATURE_CHUNK_SIZE) {
    if (isCancelled?.()) return
    const chunk = points.slice(offset, offset + FEATURE_CHUNK_SIZE)
    source.addFeatures(featuresFromPoints(chunk, minWeight, maxWeight))
    if (offset + FEATURE_CHUNK_SIZE < points.length) {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve())
      })
    }
  }
}

function insertLayerBelowStructures(map: import('ol/Map').default, layer: Heatmap, zIndex: number) {
  layer.setZIndex(zIndex)
  const collection = map.getLayers()
  let insertAt = collection.getLength()
  for (let i = 0; i < collection.getLength(); i += 1) {
    const candidate = collection.item(i)
    const z = candidate.getZIndex?.() ?? 0
    if (z >= STRUCTURE_LAYER_Z_INDEX) {
      insertAt = i
      break
    }
  }
  collection.insertAt(insertAt, layer)
}

export function removeMineralHeatmapLayer(
  map: import('ol/Map').default,
  layerRef: { current: Heatmap | null },
) {
  const existing = layerRef.current
  if (!existing) return
  map.removeLayer(existing)
  layerRef.current = null
}

function applyHeatmapStyle(layer: Heatmap, spec: MineralHeatmapSpec, mobile: boolean) {
  // Larger blur/radius merges sample points into smooth radar-style lobes.
  layer.setBlur(mobile ? 22 : 32)
  layer.setRadius(mobile ? 18 : 26)
  layer.setGradient(heatmapGradient(spec))
  layer.setZIndex(spec.zIndex ?? MINERAL_HEATMAP_Z_INDEX)
  layer.set('mineralHeatmap', spec.slug)
}

export function createMineralHeatmapLayer(spec: MineralHeatmapSpec, mobile: boolean): Heatmap {
  const source = new VectorSource()
  const points = visiblePoints(spec)
  if (points.length <= FEATURE_CHUNK_SIZE) {
    const minWeight = Math.min(...spec.points.map((point) => point.weight))
    const maxWeight = Math.max(...spec.points.map((point) => point.weight))
    source.addFeatures(featuresFromPoints(points, minWeight, maxWeight))
  }

  const layer = new Heatmap({
    source,
    blur: mobile ? 22 : 32,
    radius: mobile ? 18 : 26,
    weight: (feature) => Number(feature.get('weight') ?? 1),
    gradient: heatmapGradient(spec),
    zIndex: spec.zIndex ?? MINERAL_HEATMAP_Z_INDEX,
    opacity: 0,
    properties: { mineralHeatmap: spec.slug },
  })

  return layer
}

export async function syncMineralHeatmapLayer(
  map: import('ol/Map').default,
  layerRef: { current: Heatmap | null },
  spec: MineralHeatmapSpec | null | undefined,
  mobile: boolean,
  isCancelled?: () => boolean,
): Promise<void> {
  const cancelled = () => isCancelled?.() === true

  if (!spec?.points?.length) {
    removeMineralHeatmapLayer(map, layerRef)
    return
  }

  const existing = layerRef.current
  if (existing) {
    applyHeatmapStyle(existing, spec, mobile)
    existing.setOpacity(TARGET_HEATMAP_OPACITY)
    const source = existing.getSource()
    if (source) {
      await replaceHeatmapFeatures(source, visiblePoints(spec), spec.points, cancelled)
    }
    if (cancelled()) return
    return
  }

  if (cancelled()) return

  const layer = createMineralHeatmapLayer(spec, mobile)
  insertLayerBelowStructures(map, layer, spec.zIndex ?? MINERAL_HEATMAP_Z_INDEX)
  layerRef.current = layer

  const source = layer.getSource()
  const points = visiblePoints(spec)
  if (source && points.length > FEATURE_CHUNK_SIZE) {
    await replaceHeatmapFeatures(source, points, spec.points, cancelled)
    if (cancelled()) return
  }

  await animateLayerOpacity(layer, 0, TARGET_HEATMAP_OPACITY, HEATMAP_FADE_IN_MS)
}
