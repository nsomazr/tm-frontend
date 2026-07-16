import { useCallback, useEffect, useRef, useState } from 'react'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import GeoJSON from 'ol/format/GeoJSON'
import { fromLonLat } from 'ol/proj'
import { defaults as defaultControls } from 'ol/control'
import ScaleLine from 'ol/control/ScaleLine'
import { defaults as defaultInteractions } from 'ol/interaction'
import { Fill, Style, RegularShape } from 'ol/style'
import Point from 'ol/geom/Point'
import type { FeatureLike } from 'ol/Feature'
import type Feature from 'ol/Feature'
import type { Geometry } from 'ol/geom'
import 'ol/ol.css'
import { createBasemapSource, type BasemapId } from '../map/basemaps'
import {
  boundsToExtent,
  DEFAULT_COUNTRY_CODE,
  DEFAULT_COUNTRY_FOCUS,
} from '../map/countryFocus'
import MapCompass from '../map/MapCompass'
import MapCoordinateReadout from '../map/MapCoordinateReadout'
import MapCopyrightMarks from '../map/MapCopyrightMarks'
import MapZoomControls from '../map/MapZoomControls'
import { useCoordinateFormatState } from '../map/useCoordinateFormatState'
import { useCoordinateSystemState } from '../map/useCoordinateSystemState'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import type { CountryFocus, MarketplaceGeoJson } from '../../types'

/** At country overview, claim polygons are often only a few CSS pixels — expand the hit target. */
function marketplaceHitTolerance(zoom: number | undefined): number {
  const z = zoom ?? DEFAULT_COUNTRY_FOCUS.default_zoom
  if (z < 8) return 14
  if (z < 11) return 8
  return 4
}

function featureSlug(feature: FeatureLike): string | null {
  const slug = String(feature.get('slug') ?? '')
  return slug || null
}

function pickListingAtPixel(map: Map, pixel: number[], source: VectorSource<Feature<Geometry>>) {
  const zoom = map.getView().getZoom()
  const hitTolerance = marketplaceHitTolerance(zoom)

  const hit = map.forEachFeatureAtPixel(
    pixel,
    (feature) => feature,
    { hitTolerance, layerFilter: (layer) => layer.getSource() === source },
  )
  if (hit) return featureSlug(hit)

  const coordinate = map.getCoordinateFromPixel(pixel)
  if (!coordinate) return null
  const atCoord = source.getFeaturesAtCoordinate(coordinate)
  for (const feature of atCoord) {
    const slug = featureSlug(feature)
    if (slug) return slug
  }
  return null
}

const DEFAULT_STROKE = '#0f766e'
const SELECTED_STROKE = '#c2410c'
const BASE_MIN_ZOOM_MOBILE = 4.5
const BASE_MIN_ZOOM_DESKTOP = 5
const COUNTRY_CENTER = fromLonLat([DEFAULT_COUNTRY_FOCUS.center.lng, DEFAULT_COUNTRY_FOCUS.center.lat])
const COUNTRY_EXTENT = boundsToExtent(DEFAULT_COUNTRY_FOCUS.bounds)

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  if (normalized.length < 6) return `rgba(15, 118, 110, ${alpha})`
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  if ([r, g, b].some((n) => Number.isNaN(n))) return `rgba(15, 118, 110, ${alpha})`
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function featureColor(feature: FeatureLike): string {
  const raw = String(feature.get('color') ?? '').trim()
  return raw.startsWith('#') && raw.length >= 4 ? raw : DEFAULT_STROKE
}

function pointImage(color: string, radius = 9) {
  return new RegularShape({
    points: 3,
    radius,
    angle: 0,
    fill: new Fill({ color }),
  })
}

function styleForFeature(feature: FeatureLike, selectedSlug: string | null, resolution?: number) {
  const slug = String(feature.get('slug') ?? '')
  const selected = selectedSlug != null && slug === selectedSlug
  const base = featureColor(feature)
  const fill = selected ? 'rgba(194, 65, 12, 0.42)' : hexToRgba(base, 0.38)
  const geom = feature.getGeometry()
  const type = geom?.getType()
  if (type === 'Point' || type === 'MultiPoint') {
    return new Style({ image: pointImage(selected ? SELECTED_STROKE : base, selected ? 11 : 9) })
  }

  // Tiny claim polygons vanish at country overview — keep a center marker (fill only, no outline).
  const res = resolution && Number.isFinite(resolution) ? resolution : 0
  const extent = geom?.getExtent()
  const widthM = extent ? Math.max(extent[2] - extent[0], 0) : 0
  const heightM = extent ? Math.max(extent[3] - extent[1], 0) : 0
  const screenPx = res > 0 ? Math.max(widthM, heightM) / res : 20

  const polygonStyle = new Style({
    fill: new Fill({ color: fill }),
  })

  if (screenPx < 10 && geom) {
    const center = [(extent![0] + extent![2]) / 2, (extent![1] + extent![3]) / 2]
    return [
      polygonStyle,
      new Style({
        geometry: new Point(center),
        image: pointImage(selected ? SELECTED_STROKE : base, selected ? 10 : 8),
      }),
    ]
  }

  return polygonStyle
}

function countryFitPadding(mobile: boolean, detailOpen: boolean): [number, number, number, number] {
  if (mobile) {
    return detailOpen ? [112, 22, 280, 22] : [112, 22, 200, 22]
  }
  // Match landing: room for header/search (top) and right dock (basemap + legend / detail sheet).
  const top = 104
  const bottom = detailOpen ? 24 : 64
  const right = detailOpen ? 340 : 268
  const left = 48
  return [top, right, bottom, left]
}

function lockMinZoomToCurrentView(map: Map, mobile: boolean) {
  const view = map.getView()
  const zoom = view.getZoom()
  if (zoom != null && Number.isFinite(zoom)) {
    const ceiling = mobile ? 5.75 : 7.5
    view.setMinZoom(Math.min(zoom, ceiling))
  }
}

function fitCountryView(
  map: Map,
  focus: CountryFocus,
  mobile: boolean,
  animated = false,
  detailOpen = false,
) {
  const size = map.getSize()
  if (!size || size[0] === 0 || size[1] === 0) {
    requestAnimationFrame(() => fitCountryView(map, focus, mobile, animated, detailOpen))
    return
  }

  map.updateSize()
  const view = map.getView()
  const extent = boundsToExtent(focus.bounds)
  const duration = animated ? (mobile ? 500 : 800) : 0
  const padding = countryFitPadding(mobile, detailOpen)
  view.setMinZoom(mobile ? BASE_MIN_ZOOM_MOBILE : BASE_MIN_ZOOM_DESKTOP)
  view.set('extent', extent)
  view.setRotation(0)
  view.cancelAnimations()
  view.fit(extent, {
    padding,
    maxZoom: mobile ? 5.05 : Math.min(focus.default_zoom + 1.5, 7),
    duration,
    callback: () => {
      lockMinZoomToCurrentView(map, mobile)
    },
  })
  if (duration <= 0) {
    lockMinZoomToCurrentView(map, mobile)
  }
}

interface MarketplaceMapProps {
  geojson: MarketplaceGeoJson | null | undefined
  selectedSlug: string | null
  onSelectSlug: (slug: string | null) => void
  basemap?: BasemapId
  className?: string
}

export default function MarketplaceMap({
  geojson,
  selectedSlug,
  onSelectSlug,
  basemap = 'light',
  className,
}: MarketplaceMapProps) {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const wrapperRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const basemapLayerRef = useRef<TileLayer<ReturnType<typeof createBasemapSource>> | null>(null)
  const sourceRef = useRef(new VectorSource())
  const selectedSlugRef = useRef(selectedSlug)
  const onSelectSlugRef = useRef(onSelectSlug)
  const previousSelectedRef = useRef<string | null>(selectedSlug)
  const basemapRef = useRef(basemap)
  const isMobileRef = useRef(isMobile)
  selectedSlugRef.current = selectedSlug
  onSelectSlugRef.current = onSelectSlug
  basemapRef.current = basemap
  isMobileRef.current = isMobile

  const [mapEpoch, setMapEpoch] = useState(0)
  const [mapRotation, setMapRotation] = useState(0)
  const [pointerCoordinate, setPointerCoordinate] = useState<number[] | null>(null)
  const [coordinateSystem, setCoordinateSystem] = useCoordinateSystemState(DEFAULT_COUNTRY_CODE)
  const [coordinateFormat, setCoordinateFormat] = useCoordinateFormatState()

  const zoomMap = useCallback((delta: number) => {
    const map = mapRef.current
    if (!map) return
    const view = map.getView()
    const current = view.getZoom() ?? 6
    const min = view.getMinZoom() ?? 0
    const max = view.getMaxZoom() ?? 28
    const next = Math.min(max, Math.max(min, current + delta))
    if (next === current) return
    view.animate({ zoom: next, duration: 200 })
  }, [])

  const resetMapView = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    map.updateSize()
    map.getView().setRotation(0)
    onSelectSlugRef.current(null)
    fitCountryView(map, DEFAULT_COUNTRY_FOCUS, isMobileRef.current, true, false)
  }, [])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const mobile = isMobileRef.current
    const basemapLayer = new TileLayer({
      source: createBasemapSource(basemapRef.current),
      zIndex: 0,
    })
    basemapLayerRef.current = basemapLayer
    const vectorLayer = new VectorLayer({
      source: sourceRef.current,
      style: (feature, resolution) => styleForFeature(feature, selectedSlugRef.current, resolution),
      zIndex: 20,
    })
    const map = new Map({
      target: containerRef.current,
      layers: [basemapLayer, vectorLayer],
      view: new View({
        center: COUNTRY_CENTER,
        zoom: mobile ? 4.75 : 6.5,
        minZoom: mobile ? BASE_MIN_ZOOM_MOBILE : BASE_MIN_ZOOM_DESKTOP,
        maxZoom: 18,
        extent: COUNTRY_EXTENT,
        constrainOnlyCenter: !mobile,
        enableRotation: false,
        constrainRotation: true,
      }),
      controls: defaultControls({ zoom: false, attribution: false }).extend([
        new ScaleLine({ units: 'metric', bar: true, text: true, minWidth: 120 }),
      ]),
      interactions: defaultInteractions({
        doubleClickZoom: !mobile,
        pinchRotate: false,
        altShiftDragRotate: false,
      }),
    })

    const view = map.getView()
    view.setRotation(0)
    view.on('change:rotation', () => {
      const rotation = view.getRotation()
      if (rotation !== 0) view.setRotation(0)
      setMapRotation(view.getRotation())
    })

    map.on('singleclick', (evt) => {
      const slug = pickListingAtPixel(map, evt.pixel, sourceRef.current)
      onSelectSlugRef.current(slug)
    })
    map.on('pointermove', (evt) => {
      setPointerCoordinate(evt.coordinate)
      if (evt.dragging) return
      const zoom = map.getView().getZoom()
      const hit = map.hasFeatureAtPixel(evt.pixel, {
        hitTolerance: marketplaceHitTolerance(zoom),
        layerFilter: (layer) => layer.getSource() === sourceRef.current,
      })
      map.getTargetElement().style.cursor = hit ? 'pointer' : ''
    })
    mapRef.current = map
    setMapEpoch((epoch) => epoch + 1)

    const syncSize = () => {
      map.updateSize()
    }
    const ro = new ResizeObserver(syncSize)
    if (wrapperRef.current) ro.observe(wrapperRef.current)
    requestAnimationFrame(() => {
      map.updateSize()
      fitCountryView(map, DEFAULT_COUNTRY_FOCUS, mobile, false, false)
    })

    return () => {
      ro.disconnect()
      map.setTarget(undefined)
      mapRef.current = null
      basemapLayerRef.current = null
    }
  }, [])

  useEffect(() => {
    const layer = basemapLayerRef.current
    if (!layer) return
    layer.setSource(createBasemapSource(basemap))
  }, [basemap])

  useEffect(() => {
    const source = sourceRef.current
    source.clear()
    if (!geojson?.features?.length) return
    const features = new GeoJSON().readFeatures(geojson, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857',
    })
    source.addFeatures(features)
  }, [geojson])

  useEffect(() => {
    sourceRef.current.changed()
    mapRef.current?.render()
  }, [selectedSlug])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.updateSize()
    // Re-fit country overview when crossing mobile/desktop chrome breakpoints.
    if (!selectedSlugRef.current) {
      fitCountryView(map, DEFAULT_COUNTRY_FOCUS, isMobile, true, false)
    }
  }, [isMobile])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const previous = previousSelectedRef.current
    previousSelectedRef.current = selectedSlug
    const mobile = isMobileRef.current
    const detailOpen = !!selectedSlug

    if (!selectedSlug) {
      if (previous) {
        fitCountryView(map, DEFAULT_COUNTRY_FOCUS, mobile, true, false)
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
    const padding = countryFitPadding(mobile, detailOpen)
    map.getView().fit(extent, {
      padding,
      maxZoom: 14,
      duration: 450,
    })
  }, [selectedSlug, geojson])

  return (
    <div
      ref={wrapperRef}
      className={`relative map-viewer h-full w-full min-w-0 overflow-hidden ${
        isMobile ? 'map-viewer--mobile' : ''
      } ${className ?? ''}`}
    >
      <div ref={containerRef} className="h-full w-full min-w-0 overflow-hidden bg-slate-200" />
      <MapCopyrightMarks
        map={mapEpoch > 0 ? mapRef.current : null}
        bounds={DEFAULT_COUNTRY_FOCUS.bounds}
      />

      {/* Landing-style stack: compass + coordinates above the scale bar */}
      {!isMobile ? (
        <div className="map-scale-stack-tools pointer-events-none">
          <MapCompass
            rotationRad={mapRotation}
            className="map-scale-stack-tools__compass shrink-0"
            onResetNorth={() => mapRef.current?.getView().setRotation(0)}
          />
          <MapCoordinateReadout
            mapCoordinate={pointerCoordinate}
            coordinateSystem={coordinateSystem}
            coordinateFormat={coordinateFormat}
            onCoordinateFormatChange={setCoordinateFormat}
            className="map-scale-stack-tools__readout min-w-0"
          />
        </div>
      ) : (
        <div className="map-mobile-left-stack pointer-events-none absolute bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] left-3 z-20 flex max-w-[min(22rem,calc(100vw-1.25rem))]">
          <MapCoordinateReadout
            mapCoordinate={pointerCoordinate}
            coordinateSystem={coordinateSystem}
            coordinateFormat={coordinateFormat}
            onCoordinateFormatChange={setCoordinateFormat}
            className="pointer-events-auto w-full shrink-0"
          />
        </div>
      )}

      {/* Zoom / reset — separate from scale · compass · coordinates */}
      {!isMobile ? (
        <div className="pointer-events-none absolute bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))] right-3 z-20">
          <MapZoomControls
            className="shrink-0"
            onZoomIn={() => zoomMap(1)}
            onZoomOut={() => zoomMap(-1)}
            onResetView={resetMapView}
          />
        </div>
      ) : (
        <div className="pointer-events-none absolute bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))] left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 px-3">
          <MapZoomControls
            compact
            className="shrink-0"
            onZoomIn={() => zoomMap(1)}
            onZoomOut={() => zoomMap(-1)}
            onResetView={resetMapView}
          />
          <MapCompass
            rotationRad={mapRotation}
            compact
            className="pointer-events-auto shrink-0"
            onResetNorth={() => mapRef.current?.getView().setRotation(0)}
          />
        </div>
      )}
    </div>
  )
}
