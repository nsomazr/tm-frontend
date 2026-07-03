import { useEffect, useRef, useState, useCallback } from 'react'
import OlMap from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import GeoJSON from 'ol/format/GeoJSON'
import Feature from 'ol/Feature'
import Circle from 'ol/geom/Circle'
import { fromLonLat, toLonLat, transformExtent } from 'ol/proj'
import ScaleLine from 'ol/control/ScaleLine'
import { defaults as defaultControls } from 'ol/control'
import 'ol/ol.css'
import type { MapLayer } from '../../types'
import { mapsApi } from '../../api'
import WatermarkOverlay from './WatermarkOverlay'
import LayerPanel from './LayerPanel'
import MapRightDock from './MapRightDock'
import { useBasemapState } from './useBasemapState'
import {
  type BasemapId,
  createLabelsSource,
  getBasemap,
  loadBasemapPreference,
} from './basemaps'
import { buildFocusRingStyle, buildHighlightStyle, buildLayerStyleFunction } from './mapStyles'

export interface MapFocusTarget {
  lat: number
  lng: number
  zoom?: number
  /** Radius of highlight ring in metres */
  radiusM?: number
  /** Bumps when the same coordinates should re-trigger fly + ring */
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
  onAreaInspect?: (lat: number, lng: number, zoom: number) => void
  continuousInspect?: boolean
  mapFocus?: MapFocusTarget | null
  className?: string
  fullScreen?: boolean
}

const TANZANIA_CENTER = fromLonLat([34.8, -6.5])
const TANZANIA_EXTENT = transformExtent([29.34, -11.75, 40.44, -0.99], 'EPSG:4326', 'EPSG:3857')

function layerOlZIndex(layer: MapLayer) {
  const offsets: Record<string, number> = { polygon: 100, line: 1100, point: 2100 }
  return (offsets[layer.layer_type] ?? 100) + layer.z_index
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
}: MapViewerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<OlMap | null>(null)
  const baseLayerRef = useRef<TileLayer | null>(null)
  const labelsLayerRef = useRef<TileLayer | null>(null)
  const vectorLayersRef = useRef(new Map<number, VectorLayer<VectorSource>>())
  const layerMetaRef = useRef(new Map<number, MapLayer>())
  const inspectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoverLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const focusLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const basemapRef = useRef<BasemapId>('light')
  const [basemap, setBasemap] = useBasemapState()
  const [layers, setLayers] = useState(initialLayers)
  const [internalVisible, setInternalVisible] = useState<Set<number>>(
    () => new Set(initialLayers.map((l) => l.id))
  )
  const visibleLayers = externalVisible ?? internalVisible

  basemapRef.current = basemap

  const styleFn = useCallback(
    (layer: MapLayer) => buildLayerStyleFunction(layer, basemapRef.current),
    []
  )

  const inspectAt = useCallback(
    (coordinate: number[]) => {
      if (!onAreaInspect || !mapInstance.current) return
      const [lng, lat] = toLonLat(coordinate)
      const zoom = Math.round(mapInstance.current.getView().getZoom() ?? 8)
      onAreaInspect(lat, lng, zoom)
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

    const bm = getBasemap(loadBasemapPreference())
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

    const focusSource = new VectorSource()
    const focusLayer = new VectorLayer({
      source: focusSource,
      zIndex: 4500,
      style: buildFocusRingStyle(),
    })
    focusLayerRef.current = focusLayer

    const map = new OlMap({
      target: mapRef.current,
      layers: [baseLayer, labelsLayer, hoverLayer, focusLayer],
      view: new View({
        center: TANZANIA_CENTER,
        zoom: 6,
        minZoom: 5,
        maxZoom: 18,
        extent: TANZANIA_EXTENT,
        constrainOnlyCenter: true,
      }),
      controls: defaultControls({ zoom: true, attribution: true }).extend([
        new ScaleLine({ units: 'metric', bar: true, text: true, minWidth: 120 }),
      ]),
    })

    map.on('click', (evt) => {
      map.forEachFeatureAtPixel(evt.pixel, (feature) => {
        const props = feature.getProperties()
        if (onFeatureClick) onFeatureClick(props)
        return true
      })
      inspectAt(evt.coordinate)
    })

    map.on('pointermove', (evt) => {
      if (evt.dragging) return
      const hoverSource = hoverLayer.getSource()
      if (!hoverSource) return
      hoverSource.clear()

      const hit = map.forEachFeatureAtPixel(
        evt.pixel,
        (feature, olLayer) => {
          if (olLayer === hoverLayer || olLayer === focusLayerRef.current) return false
          const layerId = olLayer?.get('layerId') as number | undefined
          const meta = layerId != null ? layerMetaRef.current.get(layerId) : undefined
          if (meta && feature instanceof Object) {
            hoverSource.addFeature(feature.clone() as Feature)
            const hl = buildHighlightStyle(meta, basemapRef.current)
            hoverLayer.setStyle(hl)
            map.getTargetElement().style.cursor = 'pointer'
          }
          return true
        },
        { hitTolerance: 4 }
      )

      if (!hit) {
        map.getTargetElement().style.cursor = ''
      }
    })

    map.on('moveend', () => {
      if (!onAreaInspect || !continuousInspect) return
      if (inspectTimer.current) clearTimeout(inspectTimer.current)
      inspectTimer.current = setTimeout(() => {
        const center = map.getView().getCenter()
        if (center) inspectAt(center)
      }, 700)
    })

    mapInstance.current = map
    return () => {
      if (inspectTimer.current) clearTimeout(inspectTimer.current)
      map.setTarget(undefined)
      mapInstance.current = null
      baseLayerRef.current = null
      labelsLayerRef.current = null
      hoverLayerRef.current = null
      focusLayerRef.current = null
    }
  }, [continuousInspect, inspectAt, onAreaInspect, onFeatureClick])

  useEffect(() => {
    const map = mapInstance.current
    const focusSource = focusLayerRef.current?.getSource()
    if (!map || !focusSource) return

    focusSource.clear()
    if (!mapFocus) return

    const { lat, lng, zoom = 11, radiusM = 12000 } = mapFocus
    const center = fromLonLat([lng, lat])
    focusSource.addFeature(new Feature(new Circle(center, radiusM)))

    const view = map.getView()
    view.animate({
      center,
      zoom: Math.max(view.getZoom() ?? 6, zoom),
      duration: 800,
    })
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
    vectorLayersRef.current.forEach((vl, id) => {
      const meta = layerMetaRef.current.get(id)
      if (meta) vl.setStyle(styleFn(meta))
    })
    if (hoverLayerRef.current) {
      hoverLayerRef.current.getSource()?.clear()
    }
  }, [basemap, styleFn])

  // Data layers
  useEffect(() => {
    const map = mapInstance.current
    if (!map) return

    vectorLayersRef.current.forEach((vl) => map.removeLayer(vl))
    vectorLayersRef.current.clear()
    layerMetaRef.current.clear()

    const sorted = [...layers].sort((a, b) => a.z_index - b.z_index)

    sorted.forEach((layer) => {
      layerMetaRef.current.set(layer.id, layer)
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

      mapsApi.geojson(layer.slug).then(({ data }) => {
        const features = new GeoJSON().readFeatures(data, {
          featureProjection: 'EPSG:3857',
        })
        source.addFeatures(features)
      }).catch(() => {})
    })
  }, [layers, styleFn])

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

  return (
    <div className={`relative ${className}`}>
      <div ref={mapRef} className="h-full w-full overflow-hidden bg-slate-200" />
      {showWatermark && <WatermarkOverlay />}
      {showLayerPanel && (
        <LayerPanel
          layers={layers}
          visibleLayers={visibleLayers}
          onToggle={toggleLayer}
          onToggleType={toggleLayerType}
          onReorder={reorderLayers}
          allowReorder={allowReorder || editable}
          className=""
        />
      )}
      <MapRightDock
        basemap={basemap}
        onBasemapChange={setBasemap}
        layers={[...layers].sort((a, b) => a.z_index - b.z_index).filter((l) => visibleLayers.has(l.id))}
      />
    </div>
  )
}
