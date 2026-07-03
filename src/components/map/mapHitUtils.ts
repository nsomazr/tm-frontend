import type OlMap from 'ol/Map'
import type Feature from 'ol/Feature'
import type VectorLayer from 'ol/layer/Vector'
import type VectorSource from 'ol/source/Vector'
import type { MapLayer } from '../../types'

export type PickedFeature = {
  feature: Feature
  layerId: number
  layerType: MapLayer['layer_type']
  featureId?: number
}

/** Pixel tolerance: exact for polygons, wider for thin lines and small points. */
export function hitToleranceForLayerType(
  layerType: MapLayer['layer_type'],
  zoom: number
): number {
  if (layerType === 'polygon') return 0
  if (layerType === 'line') return Math.max(6, Math.min(14, 18 - zoom))
  return Math.max(8, Math.min(16, 20 - zoom))
}

function featureDbId(feature: Feature): number | undefined {
  const props = feature.getProperties()
  const raw = props.id ?? feature.getId()
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string') {
    const parsed = Number.parseInt(raw, 10)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function pickTopForLayerType(
  map: OlMap,
  pixel: number[],
  layerType: MapLayer['layer_type'],
  layerMeta: Map<number, MapLayer>,
  hoverLayer: VectorLayer<VectorSource> | null,
  zoom: number
): PickedFeature | null {
  const tolerance = hitToleranceForLayerType(layerType, zoom)
  let picked: PickedFeature | null = null

  map.forEachFeatureAtPixel(
    pixel,
    (feature, olLayer) => {
      if (olLayer === hoverLayer) return false
      const layerId = olLayer?.get('layerId') as number | undefined
      if (layerId == null) return false
      const meta = layerMeta.get(layerId)
      if (!meta || meta.layer_type !== layerType) return false
      picked = {
        feature: feature as Feature,
        layerId,
        layerType: meta.layer_type,
        featureId: featureDbId(feature as Feature),
      }
      return true
    },
    {
      hitTolerance: tolerance,
      layerFilter: (layer) => layer !== hoverLayer,
    }
  )

  return picked
}

/** Prefer the most specific geometry: point, then line, then polygon. */
export function pickFeatureAtPixel(
  map: OlMap,
  pixel: number[],
  layerMeta: Map<number, MapLayer>,
  hoverLayer: VectorLayer<VectorSource> | null
): PickedFeature | null {
  const zoom = Math.round(map.getView().getZoom() ?? 8)

  return (
    pickTopForLayerType(map, pixel, 'point', layerMeta, hoverLayer, zoom) ??
    pickTopForLayerType(map, pixel, 'line', layerMeta, hoverLayer, zoom) ??
    pickTopForLayerType(map, pixel, 'polygon', layerMeta, hoverLayer, zoom)
  )
}
