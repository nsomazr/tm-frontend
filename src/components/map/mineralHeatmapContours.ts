import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import Feature from 'ol/Feature'
import LineString from 'ol/geom/LineString'
import { fromLonLat } from 'ol/proj'
import { Stroke, Style } from 'ol/style'

export interface HeatmapContourLevel {
  level: 'anomaly' | string
  threshold: number
  coordinates?: number[][][]
}

export interface HeatmapContourSpec {
  slug: string
  color: string
  contours: HeatmapContourLevel[]
}

export const MINERAL_HEATMAP_CONTOUR_Z_INDEX = 3655

/** Soft outer glow + crisp inner rim for anomaly / peak-zone threshold. */
const anomalyGlowStyle = new Style({
  stroke: new Stroke({
    color: 'rgba(251, 146, 60, 0.28)',
    width: 8,
    lineCap: 'round',
    lineJoin: 'round',
  }),
})

const anomalyRimStyle = new Style({
  stroke: new Stroke({
    color: 'rgba(249, 115, 22, 0.92)',
    width: 1.75,
    lineDash: [5, 7],
    lineCap: 'round',
    lineJoin: 'round',
  }),
})

function populateContourSource(source: VectorSource, contours: HeatmapContourLevel[]) {
  source.clear(true)
  for (const contour of contours) {
    if (contour.level !== 'anomaly') continue
    for (const path of contour.coordinates ?? []) {
      if (path.length < 2) continue
      const coords = path.map(([lng, lat]) => fromLonLat([lng, lat]))
      const feature = new Feature({
        geometry: new LineString(coords),
        contourLevel: contour.level,
      })
      feature.setStyle([anomalyGlowStyle, anomalyRimStyle])
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
    opacity: 0.95,
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

  const anomalyContours =
    spec?.contours?.filter(
      (contour) => contour.level === 'anomaly' && (contour.coordinates?.length ?? 0) > 0,
    ) ?? []

  if (!spec || anomalyContours.length === 0) {
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
    if (source) populateContourSource(source, anomalyContours)
    if (cancelled()) return
    return
  }

  if (cancelled()) return

  const layer = createHeatmapContourLayer({ ...spec, contours: anomalyContours })
  map.addLayer(layer)
  layerRef.current = layer
}
