import { useEffect, useRef } from 'react'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import GeoJSON from 'ol/format/GeoJSON'
import { fromLonLat } from 'ol/proj'
import { Fill, Stroke, Style, RegularShape } from 'ol/style'
import type { FeatureLike } from 'ol/Feature'
import { createBasemapSource } from '../map/basemaps'
import { DEFAULT_COUNTRY_FOCUS } from '../map/countryFocus'
import type { MarketplaceGeoJson } from '../../types'

const FILL = 'rgba(15, 118, 110, 0.28)'
const STROKE = '#0f766e'
const SELECTED_FILL = 'rgba(194, 65, 12, 0.35)'
const SELECTED_STROKE = '#c2410c'

function pointImage(color: string, radius = 9) {
  return new RegularShape({
    points: 3,
    radius,
    angle: 0,
    fill: new Fill({ color }),
  })
}

function styleForFeature(feature: FeatureLike, selectedSlug: string | null) {
  const slug = String(feature.get('slug') ?? '')
  const selected = selectedSlug != null && slug === selectedSlug
  const fill = selected ? SELECTED_FILL : FILL
  const stroke = selected ? SELECTED_STROKE : STROKE
  const geom = feature.getGeometry()
  const type = geom?.getType()
  if (type === 'Point' || type === 'MultiPoint') {
    return new Style({ image: pointImage(selected ? SELECTED_STROKE : STROKE, selected ? 11 : 9) })
  }
  return new Style({
    fill: new Fill({ color: fill }),
    stroke: new Stroke({ color: stroke, width: selected ? 2.5 : 1.75 }),
  })
}

interface MarketplaceMapProps {
  geojson: MarketplaceGeoJson | null | undefined
  selectedSlug: string | null
  onSelectSlug: (slug: string | null) => void
  className?: string
}

export default function MarketplaceMap({
  geojson,
  selectedSlug,
  onSelectSlug,
  className,
}: MarketplaceMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const sourceRef = useRef(new VectorSource())
  const selectedSlugRef = useRef(selectedSlug)
  const onSelectSlugRef = useRef(onSelectSlug)
  const previousSelectedRef = useRef<string | null>(selectedSlug)
  selectedSlugRef.current = selectedSlug
  onSelectSlugRef.current = onSelectSlug

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const vectorLayer = new VectorLayer({
      source: sourceRef.current,
      style: (feature) => styleForFeature(feature, selectedSlugRef.current),
      zIndex: 20,
    })
    const map = new Map({
      target: containerRef.current,
      layers: [
        new TileLayer({ source: createBasemapSource('light'), zIndex: 0 }),
        vectorLayer,
      ],
      view: new View({
        center: fromLonLat([DEFAULT_COUNTRY_FOCUS.center.lng, DEFAULT_COUNTRY_FOCUS.center.lat]),
        zoom: DEFAULT_COUNTRY_FOCUS.default_zoom,
      }),
      controls: [],
    })
    map.on('singleclick', (evt) => {
      const hit = map.forEachFeatureAtPixel(evt.pixel, (feature) => feature)
      if (!hit) {
        onSelectSlugRef.current(null)
        return
      }
      const slug = String(hit.get('slug') ?? '')
      onSelectSlugRef.current(slug || null)
    })
    map.on('pointermove', (evt) => {
      const hit = map.hasFeatureAtPixel(evt.pixel)
      map.getTargetElement().style.cursor = hit ? 'pointer' : ''
    })
    mapRef.current = map
    return () => {
      map.setTarget(undefined)
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const source = sourceRef.current
    source.clear()
    if (!geojson?.features?.length) return
    const features = new GeoJSON().readFeatures(geojson, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857',
    })
    source.addFeatures(features)
    // Stay on the country overview until the user selects a listing.
  }, [geojson])

  useEffect(() => {
    sourceRef.current.changed()
    mapRef.current?.render()
  }, [selectedSlug])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const previous = previousSelectedRef.current
    previousSelectedRef.current = selectedSlug

    if (!selectedSlug) {
      // Only return to country overview when the user clears a selection — not on first load.
      if (previous) {
        map.getView().animate({
          center: fromLonLat([DEFAULT_COUNTRY_FOCUS.center.lng, DEFAULT_COUNTRY_FOCUS.center.lat]),
          zoom: DEFAULT_COUNTRY_FOCUS.default_zoom,
          duration: 400,
        })
      }
      return
    }

    const matches = sourceRef.current
      .getFeatures()
      .filter((feature) => String(feature.get('slug') ?? '') === selectedSlug)
    if (!matches.length) return
    let extent: number[] | null = null
    for (const feature of matches) {
      const geometry = feature.getGeometry()
      if (!geometry) continue
      const next = geometry.getExtent()
      if (!extent) {
        extent = next.slice()
      } else {
        extent[0] = Math.min(extent[0], next[0])
        extent[1] = Math.min(extent[1], next[1])
        extent[2] = Math.max(extent[2], next[2])
        extent[3] = Math.max(extent[3], next[3])
      }
    }
    if (!extent || !Number.isFinite(extent[0])) return
    const width = map.getSize()?.[0] ?? 0
    const rightPad = width >= 768 ? 420 : 48
    map.getView().fit(extent, {
      padding: [64, rightPad, 64, 64],
      maxZoom: 14,
      duration: 450,
    })
  }, [selectedSlug, geojson])

  return <div ref={containerRef} className={className ?? 'h-full w-full'} />
}
