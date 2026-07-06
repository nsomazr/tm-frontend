import Heatmap from 'ol/layer/Heatmap'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import VectorSource from 'ol/source/Vector'
import { fromLonLat } from 'ol/proj'
import { hexToRgba } from '../../lib/mineralColorUtils'

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
}

export function mineralHeatmapGradient(color: string): string[] {
  return [
    'rgba(0,0,0,0)',
    hexToRgba(color, 0.14),
    hexToRgba(color, 0.38),
    hexToRgba(color, 0.65),
    hexToRgba(color, 0.95),
  ]
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

  return new Heatmap({
    source,
    blur: mobile ? 20 : 26,
    radius: mobile ? 14 : 18,
    weight: (feature) => Number(feature.get('weight') ?? 1),
    gradient: mineralHeatmapGradient(spec.color),
    zIndex: 4520,
    opacity: 0.92,
    properties: { mineralHeatmap: spec.slug },
  })
}

export function syncMineralHeatmapLayer(
  map: import('ol/Map').default,
  layerRef: { current: Heatmap | null },
  spec: MineralHeatmapSpec | null | undefined,
  mobile: boolean,
) {
  if (layerRef.current) {
    map.removeLayer(layerRef.current)
    layerRef.current = null
  }
  if (!spec?.points?.length) return

  const layer = createMineralHeatmapLayer(spec, mobile)
  map.addLayer(layer)
  layerRef.current = layer
}
