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
  return [
    hexToHexAlpha(hex, 0),
    hexToHexAlpha(hex, 0.22),
    hexToHexAlpha(hex, 0.48),
    hexToHexAlpha(hex, 0.74),
    hexToHexAlpha(hex, 1),
  ]
}

/** Place heatmap just beneath the selected mineral's lowest vector layer. */
export function mineralHeatmapZIndex(minLayerZIndex: number): number {
  return 3590 + minLayerZIndex
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
    blur: mobile ? 18 : 22,
    radius: mobile ? 12 : 16,
    weight: (feature) => Number(feature.get('weight') ?? 1),
    gradient: mineralHeatmapGradient(hex),
    zIndex: spec.zIndex ?? 3580,
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
  map.addLayer(layer)
  layerRef.current = layer
  await animateLayerOpacity(layer, 0, TARGET_HEATMAP_OPACITY)
}
