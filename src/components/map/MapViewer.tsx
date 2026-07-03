import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import OlMap from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import GeoJSON from 'ol/format/GeoJSON'
import Feature from 'ol/Feature'
import { fromLonLat, toLonLat, transformExtent } from 'ol/proj'
import ScaleLine from 'ol/control/ScaleLine'
import { defaults as defaultControls } from 'ol/control'
import { defaults as defaultInteractions } from 'ol/interaction'
import 'ol/ol.css'
import type { MapLayer } from '../../types'
import { mapsApi } from '../../api'
import WatermarkOverlay from './WatermarkOverlay'
import LayerPanel from './LayerPanel'
import MapRightDock from './MapRightDock'
import MapBottomControls from './MapBottomControls'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useBasemapState } from './useBasemapState'
import {
  type BasemapId,
  createLabelsSource,
  getBasemap,
} from './basemaps'
import { buildHighlightStyle, buildLayerStyleFunction } from './mapStyles'
import { useTheme } from '../../theme/ThemeContext'
import { pickFeatureAtPixel } from './mapHitUtils'
import { loadLayerGeojson } from './mapGeojsonCache'
import { useTranslation } from '../../i18n/LocaleContext'

export interface MapFocusTarget {
  lat: number
  lng: number
  zoom?: number
  /** Bumps when the same coordinates should re-trigger fly-to */
  key?: number
}

interface MapViewerProps {
  layers: MapLayer[]
  visibleLayers?: Set<number>
  onToggleLayer?: (id: number) => void
  onToggleLayerType?: (type: string, visible: boolean) => void
  showLayerPanel?: boolean
  showWatermark?: boolean
  editable?: boolean
  allowReorder?: boolean
  onFeatureClick?: (props: Record<string, unknown>) => void
  onAreaInspect?: (lat: number, lng: number, zoom: number, featureIds?: number[]) => void
  continuousInspect?: boolean
  mapFocus?: MapFocusTarget | null
  className?: string
  fullScreen?: boolean
  onOpenAssistant?: () => void
  assistantActive?: boolean
  /** Hide layer panel, legend, and basemap dock (admin embeds, previews) */
  minimalChrome?: boolean
}

const TANZANIA_CENTER = fromLonLat([34.8, -6.5])
const TANZANIA_EXTENT = transformExtent([29.34, -11.75, 40.44, -0.99], 'EPSG:4326', 'EPSG:3857')

function layerOlZIndex(layer: MapLayer) {
  const offsets: Record<string, number> = { polygon: 100, line: 1100, point: 2100 }
  return (offsets[layer.layer_type] ?? 100) + layer.z_index
}

function readGeojsonFeatures(data: unknown) {
  return new GeoJSON().readFeatures(data, {
    dataProjection: 'EPSG:4326',
    featureProjection: 'EPSG:3857',
  })
}

function layerIsOnMap(map: OlMap, layer: VectorLayer<VectorSource>) {
  return map.getLayers().getArray().includes(layer)
}

function isMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
}

function fitTanzaniaView(map: OlMap, mobile: boolean, animated = false) {
  const view = map.getView()
  const duration = animated ? (mobile ? 500 : 800) : 0
  if (mobile) {
    view.fit(TANZANIA_EXTENT, {
      padding: [72, 16, 88, 16],
      maxZoom: 5,
      duration,
    })
  } else {
    view.animate({
      center: TANZANIA_CENTER,
      zoom: 6,
      duration,
    })
  }
}

export default function MapViewer({
  layers: initialLayers,
  visibleLayers: externalVisible,
  onToggleLayer,
  onToggleLayerType,
  showLayerPanel = true,
  showWatermark = false,
  editable = false,
  allowReorder = false,
  onFeatureClick,
  onAreaInspect,
  continuousInspect = false,
  mapFocus,
  className = 'h-[500px] w-full',
  fullScreen = false,
  onOpenAssistant,
  assistantActive = false,
  minimalChrome = false,
}: MapViewerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<OlMap | null>(null)
  const baseLayerRef = useRef<TileLayer | null>(null)
  const labelsLayerRef = useRef<TileLayer | null>(null)
  const vectorLayersRef = useRef(new Map<number, VectorLayer<VectorSource>>())
  const layerMetaRef = useRef(new Map<number, MapLayer>())
  const inspectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const continuousInspectRef = useRef(continuousInspect)
  const programmaticMoveRef = useRef(false)
  continuousInspectRef.current = continuousInspect
  const hoverLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const hadMapFocusRef = useRef(false)
  const basemapRef = useRef<BasemapId>('light')
  const [mapEpoch, setMapEpoch] = useState(0)
  const [basemap, setBasemap] = useBasemapState()
  const { theme } = useTheme()
  const themeRef = useRef(theme)
  const [layers, setLayers] = useState(initialLayers)
  const [internalVisible, setInternalVisible] = useState<Set<number>>(
    () => new Set(initialLayers.map((l) => l.id))
  )
  const visibleLayers = externalVisible ?? internalVisible
  const isMobile = useMediaQuery('(max-width: 767px)')
  const { locale } = useTranslation()
  const prevLocaleRef = useRef(locale)
  const isMobileRef = useRef(isMobile)
  isMobileRef.current = isMobile

  basemapRef.current = basemap
  themeRef.current = theme

  const layersSignature = useMemo(
    () =>
      [...layers]
        .sort((a, b) => a.id - b.id)
        .map((layer) => `${layer.id}:${layer.slug}:${layer.z_index}`)
        .join('|'),
    [layers]
  )

  const styleFn = useCallback(
    (layer: MapLayer) => buildLayerStyleFunction(layer, basemapRef.current, themeRef.current),
    []
  )

  const restyleVectorLayers = useCallback(() => {
    vectorLayersRef.current.forEach((vl, id) => {
      const meta = layerMetaRef.current.get(id)
      if (meta) vl.setStyle(styleFn(meta))
    })
    hoverLayerRef.current?.getSource()?.clear()
  }, [styleFn])

  const populateLayerSource = useCallback((layerId: number, layer: MapLayer, source: VectorSource, force = false) => {
    loadLayerGeojson(layer.slug, force)
      .then((data) => {
        if (!vectorLayersRef.current.has(layerId)) return
        source.clear()
        source.addFeatures(readGeojsonFeatures(data))
      })
      .catch(() => {
        window.setTimeout(() => {
          if (!vectorLayersRef.current.has(layerId)) return
          if (source.getFeatures().length > 0) return
          populateLayerSource(layerId, layer, source, true)
        }, 1500)
      })
  }, [])

  const inspectAt = useCallback(
    (coordinate: number[], featureIds?: number[]) => {
      if (!onAreaInspect || !mapInstance.current) return
      const [lng, lat] = toLonLat(coordinate)
      const zoom = Math.round(mapInstance.current.getView().getZoom() ?? 8)
      onAreaInspect(lat, lng, zoom, featureIds)
    },
    [onAreaInspect]
  )

  useEffect(() => {
    setLayers(initialLayers)
    if (!externalVisible) {
      setInternalVisible(new Set(initialLayers.map((l) => l.id)))
    }
  }, [initialLayers, externalVisible])

  // Init map once
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const bm = getBasemap(basemapRef.current)
    const baseLayer = new TileLayer({ source: bm.createSource(), zIndex: 0 })
    baseLayerRef.current = baseLayer

    const labelsLayer = new TileLayer({
      source: createLabelsSource(),
      zIndex: 1,
      visible: basemapRef.current === 'topo',
      opacity: 0.95,
    })
    labelsLayerRef.current = labelsLayer

    const hoverSource = new VectorSource()
    const hoverLayer = new VectorLayer({
      source: hoverSource,
      zIndex: 5000,
      style: () => undefined,
    })
    hoverLayerRef.current = hoverLayer

    const mobile = isMobileViewport()

    const map = new OlMap({
      target: mapRef.current,
      layers: [baseLayer, labelsLayer, hoverLayer],
      view: new View({
        center: TANZANIA_CENTER,
        zoom: mobile ? 5 : 6,
        minZoom: mobile ? 4 : 5,
        maxZoom: 18,
        extent: TANZANIA_EXTENT,
        constrainOnlyCenter: true,
      }),
      controls: defaultControls({ zoom: !mobile, attribution: false }).extend([
        new ScaleLine({ units: 'metric', bar: true, text: true, minWidth: 120 }),
      ]),
      interactions: defaultInteractions({ doubleClickZoom: !mobile }),
    })

    fitTanzaniaView(map, mobile)

    const handleMapInspect = (evt: { coordinate: number[]; pixel: number[] }) => {
      const picked = pickFeatureAtPixel(
        map,
        evt.pixel,
        layerMetaRef.current,
        hoverLayerRef.current
      )
      if (picked) {
        if (onFeatureClick) onFeatureClick(picked.feature.getProperties())
        const ids = picked.featureId != null ? [picked.featureId] : undefined
        inspectAt(evt.coordinate, ids)
        return
      }
      inspectAt(evt.coordinate)
    }

    map.on('singleclick', handleMapInspect)

    map.on('pointermove', (evt) => {
      if (evt.dragging) return
      const hoverSource = hoverLayer.getSource()
      if (!hoverSource) return
      hoverSource.clear()

      const picked = pickFeatureAtPixel(
        map,
        evt.pixel,
        layerMetaRef.current,
        hoverLayer
      )

      if (picked) {
        hoverSource.addFeature(picked.feature.clone() as Feature)
        const meta = layerMetaRef.current.get(picked.layerId)
        if (meta) {
          hoverLayer.setStyle(buildHighlightStyle(meta, basemapRef.current))
        }
        map.getTargetElement().style.cursor = 'pointer'
      } else {
        map.getTargetElement().style.cursor = ''
      }
    })

    map.on('moveend', () => {
      if (!onAreaInspect || !continuousInspectRef.current || programmaticMoveRef.current) return
      if (inspectTimer.current) clearTimeout(inspectTimer.current)
      inspectTimer.current = setTimeout(() => {
        const center = map.getView().getCenter()
        if (center) inspectAt(center)
      }, 700)
    })

    mapInstance.current = map
    requestAnimationFrame(() => map.updateSize())
    setMapEpoch((epoch) => epoch + 1)
    return () => {
      if (inspectTimer.current) clearTimeout(inspectTimer.current)
      map.setTarget(undefined)
      mapInstance.current = null
      baseLayerRef.current = null
      labelsLayerRef.current = null
      hoverLayerRef.current = null
      vectorLayersRef.current.clear()
      layerMetaRef.current.clear()
    }
  }, [inspectAt, onAreaInspect, onFeatureClick])

  // Keep OpenLayers canvas in sync with flex layout (mobile toolbars, orientation, etc.)
  useEffect(() => {
    const map = mapInstance.current
    const el = mapRef.current
    if (!map || !el) return

    const syncSize = () => map.updateSize()

    syncSize()
    const raf = requestAnimationFrame(syncSize)
    const ro = new ResizeObserver(syncSize)
    ro.observe(el)
    window.addEventListener('orientationchange', syncSize)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('orientationchange', syncSize)
    }
  }, [mapEpoch])

  useEffect(() => {
    const map = mapInstance.current
    if (!map) return
    map.updateSize()
  }, [isMobile, mapEpoch])

  useEffect(() => {
    const map = mapInstance.current
    if (!map) return

    if (!mapFocus) {
      if (!hadMapFocusRef.current) return
      hadMapFocusRef.current = false
      programmaticMoveRef.current = true
      const mobile = isMobileRef.current
      fitTanzaniaView(map, mobile, true)
      window.setTimeout(() => {
        programmaticMoveRef.current = false
      }, mobile ? 600 : 900)
      return
    }

    hadMapFocusRef.current = true

    const { lat, lng, zoom = 11 } = mapFocus
    const center = fromLonLat([lng, lat])

    programmaticMoveRef.current = true
    const view = map.getView()
    const mobile = isMobileRef.current
    const currentZoom = view.getZoom() ?? (mobile ? 5 : 6)
    const targetZoom = mobile
      ? Math.min(Math.max(currentZoom, Math.min(zoom, 7)), 7)
      : Math.max(currentZoom, zoom)

    view.animate(
      {
        center,
        zoom: targetZoom,
        duration: mobile ? 500 : 800,
      },
      () => {
        window.setTimeout(() => {
          programmaticMoveRef.current = false
        }, 200)
      }
    )
  }, [mapFocus])

  // Switch basemap
  useEffect(() => {
    const base = baseLayerRef.current
    const labels = labelsLayerRef.current
    if (!base) return

    const bm = getBasemap(basemap)
    base.setSource(bm.createSource())
    if (labels) {
      labels.setVisible(basemap === 'topo')
    }

    // Restyle vector layers for new basemap
    restyleVectorLayers()
  }, [basemap, restyleVectorLayers])

  useEffect(() => {
    restyleVectorLayers()
  }, [theme, restyleVectorLayers])

  // Data layers — sync incrementally; cache GeoJSON per slug
  useEffect(() => {
    const map = mapInstance.current
    if (!map || mapEpoch === 0) return

    const sorted = [...layers].sort((a, b) => a.z_index - b.z_index)
    const nextIds = new Set(sorted.map((layer) => layer.id))

    vectorLayersRef.current.forEach((vectorLayer, id) => {
      if (!nextIds.has(id) || !layerIsOnMap(map, vectorLayer)) {
        if (layerIsOnMap(map, vectorLayer)) {
          map.removeLayer(vectorLayer)
        }
        vectorLayersRef.current.delete(id)
        layerMetaRef.current.delete(id)
      }
    })

    sorted.forEach((layer) => {
      layerMetaRef.current.set(layer.id, layer)
      const existing = vectorLayersRef.current.get(layer.id)

      if (existing && layerIsOnMap(map, existing)) {
        existing.setStyle(styleFn(layer))
        existing.setVisible(visibleLayers.has(layer.id))
        existing.setZIndex(layerOlZIndex(layer))
        const source = existing.getSource()
        if (source && source.getFeatures().length === 0) {
          populateLayerSource(layer.id, layer, source)
        }
        return
      }

      if (existing) {
        vectorLayersRef.current.delete(layer.id)
        layerMetaRef.current.delete(layer.id)
      }

      const source = new VectorSource()
      const vectorLayer = new VectorLayer({
        source,
        style: styleFn(layer),
        visible: visibleLayers.has(layer.id),
        zIndex: layerOlZIndex(layer),
        properties: { layerId: layer.id },
        declutter: layer.layer_type === 'point',
      })
      map.addLayer(vectorLayer)
      vectorLayersRef.current.set(layer.id, vectorLayer)
      populateLayerSource(layer.id, layer, source)
    })
  }, [layersSignature, layers, styleFn, mapEpoch, populateLayerSource, visibleLayers])

  // Reload cached GeoJSON when locale changes (labels are localized server-side).
  useEffect(() => {
    if (prevLocaleRef.current === locale) return
    prevLocaleRef.current = locale

    vectorLayersRef.current.forEach((vectorLayer, id) => {
      const meta = layerMetaRef.current.get(id)
      const source = vectorLayer.getSource()
      if (!meta || !source) return
      populateLayerSource(id, meta, source, true)
    })
  }, [locale, populateLayerSource])

  // Update visibility without full rebuild
  useEffect(() => {
    vectorLayersRef.current.forEach((vl, id) => {
      vl.setVisible(visibleLayers.has(id))
    })
  }, [visibleLayers])

  const toggleLayer = (id: number) => {
    if (onToggleLayer) {
      onToggleLayer(id)
      return
    }
    if (externalVisible) return
    setInternalVisible((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleLayerType = (type: string, visible: boolean) => {
    if (onToggleLayerType) {
      onToggleLayerType(type, visible)
      return
    }
    const ids = layers.filter((l) => l.layer_type === type).map((l) => l.id)
    if (externalVisible) return
    setInternalVisible((prev) => {
      const next = new Set(prev)
      for (const id of ids) {
        if (visible) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  const reorderLayers = async (ordered: MapLayer[]) => {
    setLayers(ordered)
    if (!allowReorder) return
    const bottomToTop = [...ordered].sort((a, b) => a.z_index - b.z_index)
    try {
      await mapsApi.reorder(bottomToTop.map((l) => l.id))
    } catch {
      /* non-managers */
    }
  }

  const zoomMap = useCallback((delta: number) => {
    const map = mapInstance.current
    if (!map) return
    const view = map.getView()
    view.animate({ zoom: (view.getZoom() ?? 6) + delta, duration: 200 })
  }, [])

  const legendLayers = [...layers]
    .sort((a, b) => a.z_index - b.z_index)
    .filter((l) => visibleLayers.has(l.id))

  return (
    <div className={`relative map-viewer w-full min-w-0 overflow-hidden ${isMobile ? 'map-viewer--mobile' : ''} ${className}`}>
      <div ref={mapRef} className="h-full w-full min-w-0 overflow-hidden bg-slate-200" />
      {showWatermark && <WatermarkOverlay />}
      {showLayerPanel && !minimalChrome && !isMobile && (
        <LayerPanel
          layers={layers}
          visibleLayers={visibleLayers}
          onToggle={toggleLayer}
          onToggleType={toggleLayerType}
          onReorder={reorderLayers}
          allowReorder={allowReorder || editable}
        />
      )}
      {!minimalChrome && !isMobile && (
        <MapRightDock
          basemap={basemap}
          onBasemapChange={setBasemap}
          layers={legendLayers}
        />
      )}
      {isMobile && showLayerPanel && !minimalChrome && (
        <MapBottomControls
          layers={layers}
          visibleLayers={visibleLayers}
          onToggleLayer={toggleLayer}
          onToggleLayerType={toggleLayerType}
          basemap={basemap}
          onBasemapChange={setBasemap}
          legendLayers={legendLayers}
          onZoomIn={() => zoomMap(1)}
          onZoomOut={() => zoomMap(-1)}
          onOpenAssistant={onOpenAssistant}
          assistantActive={assistantActive}
        />
      )}
    </div>
  )
}
