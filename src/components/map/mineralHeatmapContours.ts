import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import Feature from 'ol/Feature'
import Circle from 'ol/geom/Circle'
import LineString from 'ol/geom/LineString'
import { fromLonLat } from 'ol/proj'
import { Stroke, Style } from 'ol/style'

export interface HeatmapContourLevel {
  level: 'mean' | 'median' | 'concentration' | string
  threshold: number
  coordinates?: number[][][]
  center?: { lat: number; lng: number }
  radius_km?: number
}

export interface HeatmapContourSpec {
  slug: string
  color: string
  contours: HeatmapContourLevel[]
}

export const MINERAL_HEATMAP_CONTOUR_Z_INDEX = 3555

const CONCENTRATION_STROKE = '#64748b'
const CONTOUR_DASH = [7, 5] as number[]

const concentrationCircleStyle = new Style({
  stroke: new Stroke({
    color: CONCENTRATION_STROKE,
    width: 1.75,
    lineDash: CONTOUR_DASH,
  }),
})

function populateContourSource(source: VectorSource, contours: HeatmapContourLevel[]) {
  source.clear(true)
  for (const contour of contours) {
    if (contour.center && contour.radius_km != null && contour.radius_km > 0) {
      const radiusM = contour.radius_km * 1000
      const feature = new Feature({
        geometry: new Circle(
          fromLonLat([contour.center.lng, contour.center.lat]),
          radiusM,
        ),
        contourLevel: contour.level,
      })
      feature.setStyle(concentrationCircleStyle)
      source.addFeature(feature)
      continue
    }

    for (const path of contour.coordinates ?? []) {
      if (path.length < 2) continue
      const coords = path.map(([lng, lat]) => fromLonLat([lng, lat]))
      const feature = new Feature({
        geometry: new LineString(coords),
        contourLevel: contour.level,
      })
      feature.setStyle(concentrationCircleStyle)
      source.addFeature(feature)
    }
  }
}

export function createHeatmapContourLayer(spec: HeatmapContourSpec): VectorLayer<VectorSource> {
  const source = new VectorSource()
  populateContourSource(source, spec.contours)

  return new VectorLayer({
    source,
    zIndex: MINERAL_HEATMAP_CONTOUR_Z_INDEX,
    opacity: 0.92,
    properties: { mineralHeatmapContours: spec.slug },
  })
}

export async function syncMineralHeatmapContours(
  map: import('ol/Map').default,
  layerRef: { current: VectorLayer<VectorSource> | null },
  spec: HeatmapContourSpec | null | undefined,
  isCancelled?: () => boolean,
): Promise<void> {
  const cancelled = () => isCancelled?.() === true

  if (!spec?.contours?.length) {
    if (layerRef.current) {
      map.removeLayer(layerRef.current)
      layerRef.current = null
    }
    return
  }

  const existing = layerRef.current
  if (existing) {
    existing.set('mineralHeatmapContours', spec.slug)
    const source = existing.getSource()
    if (source) populateContourSource(source, spec.contours)
    if (cancelled()) return
    return
  }

  if (cancelled()) return

  const layer = createHeatmapContourLayer(spec)
  map.addLayer(layer)
  layerRef.current = layer
}
