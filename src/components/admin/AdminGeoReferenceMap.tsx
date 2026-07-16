import { useEffect, useRef } from 'react'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import OSM from 'ol/source/OSM'
import GeoJSON from 'ol/format/GeoJSON'
import { Fill, Stroke, Style, Circle as CircleStyle } from 'ol/style'
import { fromLonLat } from 'ol/proj'
import { defaults as defaultControls } from 'ol/control'
import 'ol/ol.css'
import { DEFAULT_COUNTRY_FOCUS } from '../map/countryFocus'

type Bounds = { west?: number; south?: number; east?: number; north?: number }

interface AdminGeoReferenceMapProps {
  geojson: { type: string; features: unknown[] } | null | undefined
  bounds?: Bounds | null
  className?: string
}

const featureStyle = new Style({
  fill: new Fill({ color: 'rgba(5, 150, 105, 0.28)' }),
  stroke: new Stroke({ color: '#047857', width: 1.5 }),
  image: new CircleStyle({
    radius: 5,
    fill: new Fill({ color: '#047857' }),
    stroke: new Stroke({ color: '#ecfdf5', width: 1 }),
  }),
})

export default function AdminGeoReferenceMap({
  geojson,
  bounds,
  className,
}: AdminGeoReferenceMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const sourceRef = useRef(new VectorSource())

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new Map({
      target: containerRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        new VectorLayer({
          source: sourceRef.current,
          style: featureStyle,
          zIndex: 10,
        }),
      ],
      view: new View({
        center: fromLonLat([
          DEFAULT_COUNTRY_FOCUS.center.lng,
          DEFAULT_COUNTRY_FOCUS.center.lat,
        ]),
        zoom: 6,
      }),
      controls: defaultControls({ attribution: false, zoom: true }),
    })
    mapRef.current = map
    return () => {
      map.setTarget(undefined)
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const source = sourceRef.current
    const map = mapRef.current
    source.clear()
    if (!geojson?.features?.length || !map) return

    const features = new GeoJSON().readFeatures(geojson, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857',
    })
    source.addFeatures(features)

    const extent = source.getExtent()
    if (extent && extent.every((v) => Number.isFinite(v))) {
      map.getView().fit(extent, { padding: [40, 40, 40, 40], maxZoom: 12, duration: 250 })
      return
    }
    if (bounds?.west != null && bounds.south != null && bounds.east != null && bounds.north != null) {
      const from = fromLonLat([bounds.west, bounds.south])
      const to = fromLonLat([bounds.east, bounds.north])
      map.getView().fit([from[0], from[1], to[0], to[1]], {
        padding: [40, 40, 40, 40],
        maxZoom: 12,
        duration: 250,
      })
    }
  }, [geojson, bounds])

  return (
    <div
      ref={containerRef}
      className={`h-[min(52vh,28rem)] w-full overflow-hidden rounded-xl border border-app-border bg-slate-200 ${className ?? ''}`}
    />
  )
}
