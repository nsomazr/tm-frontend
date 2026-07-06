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

export interface MineralHeatmapSpec {
  slug: string
  name?: string
  color: string
  points: MineralHeatmapPoint[]
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
const HEATMAP_FADE_MS = 320

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

function animateLayerOpacity(layer: Heatmap, from: number, to: number): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / HEATMAP_FADE_MS)
      layer.setOpacity(from + (to - from) * easeOutCubic(t))
      if (t < 1) requestAnimationFrame(tick)
      else resolve()
    }
    requestAnimationFrame(tick)
  })
}

const DATA_LAYER_Z_INDEX = 3600

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

export function createMineralHeatmapLayer(spec: MineralHeatmapSpec, mobile: boolean): Heatmap {
  const source = new VectorSource()
  for (const point of spec.points) {
    source.addFeature(
      new Feature({
        geometry: new Point(fromLonLat([point.lng, point.lat])),
        weight: point.weight,
      }),
    )
  }

  const hex = normalizeHex(spec.color, '#E87722')
  return new Heatmap({
    source,
    blur: mobile ? 20 : 26,
    radius: mobile ? 14 : 20,
    weight: (feature) => Number(feature.get('weight') ?? 1),
    gradient: mineralHeatmapGradient(hex),
    zIndex: spec.zIndex ?? MINERAL_HEATMAP_Z_INDEX,
    opacity: 0,
    properties: { mineralHeatmap: spec.slug },
  })
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
    const existing = layerRef.current
    if (!existing) return
    const from = existing.getOpacity()
    await animateLayerOpacity(existing, from, 0)
    if (cancelled()) return
    map.removeLayer(existing)
    if (layerRef.current === existing) layerRef.current = null
    return
  }

  const existing = layerRef.current
  if (existing) {
    await animateLayerOpacity(existing, existing.getOpacity(), 0)
    if (cancelled()) return
    map.removeLayer(existing)
    layerRef.current = null
  }

  if (cancelled()) return
  const layer = createMineralHeatmapLayer(spec, mobile)
  insertLayerBelowDataLayers(map, layer, spec.zIndex ?? MINERAL_HEATMAP_Z_INDEX)
  layerRef.current = layer
  await animateLayerOpacity(layer, 0, TARGET_HEATMAP_OPACITY)
}
