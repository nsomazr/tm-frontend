import Heatmap from 'ol/layer/Heatmap'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import VectorSource from 'ol/source/Vector'
import { fromLonLat } from 'ol/proj'
import { hexToHexAlpha, normalizeHex } from '../../lib/mineralColorUtils'

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
  points: MineralHeatmapPoint[]
  contours?: import('./mineralHeatmapContours').HeatmapContourLevel[]
  concentrationStats?: { mean: number; median: number }
  weightLegend?: MineralHeatmapWeightLegend
  /** Draw below mineral vector layers (3600 + z_index). */
  zIndex?: number
}

export function mineralHeatmapGradient(color: string): string[] {
  const hex = normalizeHex(color, '#E87722')
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  const lowAlpha = luminance < 0.2 ? 0.42 : luminance < 0.35 ? 0.3 : 0.22
  return [
    hexToHexAlpha(hex, 0),
    hexToHexAlpha(hex, lowAlpha),
    hexToHexAlpha(hex, Math.min(0.72, lowAlpha + 0.26)),
    hexToHexAlpha(hex, Math.min(0.88, lowAlpha + 0.46)),
    hexToHexAlpha(hex, 1),
  ]
}

/** Mineral vector layers start at 3600; heatmap sits between boundaries (≤3400) and data. */
export const MINERAL_HEATMAP_Z_INDEX = 3550

/** @deprecated use MINERAL_HEATMAP_Z_INDEX; kept for callers passing min layer z */
export function mineralHeatmapZIndex(_minLayerZIndex: number): number {
  return MINERAL_HEATMAP_Z_INDEX
}

const TARGET_HEATMAP_OPACITY = 0.82
const HEATMAP_FADE_IN_MS = 80
const FEATURE_CHUNK_SIZE = 3000

const DATA_LAYER_Z_INDEX = 3600

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

function featuresFromPoints(points: MineralHeatmapPoint[]): Feature[] {
  const features = new Array<Feature>(points.length)
  for (let i = 0; i < points.length; i += 1) {
    const point = points[i]
    features[i] = new Feature({
      geometry: new Point(fromLonLat([point.lng, point.lat])),
      weight: point.weight,
    })
  }
  return features
}

async function replaceHeatmapFeatures(
  source: VectorSource,
  points: MineralHeatmapPoint[],
  isCancelled?: () => boolean,
): Promise<void> {
  source.clear(true)
  if (!points.length) return

  if (points.length <= FEATURE_CHUNK_SIZE) {
    source.addFeatures(featuresFromPoints(points))
    return
  }

  for (let offset = 0; offset < points.length; offset += FEATURE_CHUNK_SIZE) {
    if (isCancelled?.()) return
    const chunk = points.slice(offset, offset + FEATURE_CHUNK_SIZE)
    source.addFeatures(featuresFromPoints(chunk))
    if (offset + FEATURE_CHUNK_SIZE < points.length) {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve())
      })
    }
  }
}

function insertLayerBelowDataLayers(map: import('ol/Map').default, layer: Heatmap, zIndex: number) {
  layer.setZIndex(zIndex)
  const collection = map.getLayers()
  let insertAt = collection.getLength()
  for (let i = 0; i < collection.getLength(); i += 1) {
    const candidate = collection.item(i)
    const z = candidate.getZIndex?.() ?? 0
    if (z >= DATA_LAYER_Z_INDEX) {
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
  const hex = normalizeHex(spec.color, '#E87722')
  layer.setBlur(mobile ? 18 : 22)
  layer.setRadius(mobile ? 12 : 16)
  layer.setGradient(mineralHeatmapGradient(hex))
  layer.setZIndex(spec.zIndex ?? MINERAL_HEATMAP_Z_INDEX)
  layer.set('mineralHeatmap', spec.slug)
}

export function createMineralHeatmapLayer(spec: MineralHeatmapSpec, mobile: boolean): Heatmap {
  const source = new VectorSource()
  if (spec.points.length <= FEATURE_CHUNK_SIZE) {
    source.addFeatures(featuresFromPoints(spec.points))
  }

  const layer = new Heatmap({
    source,
    blur: mobile ? 18 : 22,
    radius: mobile ? 12 : 16,
    weight: (feature) => Number(feature.get('weight') ?? 1),
    gradient: mineralHeatmapGradient(normalizeHex(spec.color, '#E87722')),
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
      await replaceHeatmapFeatures(source, spec.points, cancelled)
    }
    if (cancelled()) return
    return
  }

  if (cancelled()) return

  const layer = createMineralHeatmapLayer(spec, mobile)
  insertLayerBelowDataLayers(map, layer, spec.zIndex ?? MINERAL_HEATMAP_Z_INDEX)
  layerRef.current = layer

  const source = layer.getSource()
  if (source && spec.points.length > FEATURE_CHUNK_SIZE) {
    await replaceHeatmapFeatures(source, spec.points, cancelled)
    if (cancelled()) return
  }

  await animateLayerOpacity(layer, 0, TARGET_HEATMAP_OPACITY, HEATMAP_FADE_IN_MS)
}
