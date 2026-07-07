import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import OlMap from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import GeoJSON from 'ol/format/GeoJSON'
import Feature from 'ol/Feature'
import Circle from 'ol/geom/Circle'
import Point from 'ol/geom/Point'
import LineString from 'ol/geom/LineString'
import Polygon from 'ol/geom/Polygon'
import { fromLonLat, toLonLat, transformExtent } from 'ol/proj'
import ScaleLine from 'ol/control/ScaleLine'
import { defaults as defaultControls } from 'ol/control'
import { defaults as defaultInteractions } from 'ol/interaction'
import 'ol/ol.css'
import type { AreaInsight, Country, CountryFocus, MapLayer, MineralHighlightSpec } from '../../types'
import { mapsApi } from '../../api'
import WatermarkOverlay from './WatermarkOverlay'
import LayerPanel from './LayerPanel'
import BoundaryVisibilityToggles from './BoundaryVisibilityToggles'
import MapRightDock from './MapRightDock'
import MapBottomControls from './MapBottomControls'
import MapZoomControls from './MapZoomControls'
import MapCompass from './MapCompass'
import MapCoordinateReadout from './MapCoordinateReadout'
import MineralHeatmapColorbar from './MineralHeatmapColorbar'
import AdPlacementSlot from '../ads/AdPlacementSlot'
import { registerCoordinateProjections } from './coordinateSystems'
import { useCoordinateSystemState } from './useCoordinateSystemState'
import { useCoordinateFormatState } from './useCoordinateFormatState'
import { Fill, RegularShape, Stroke, Style } from 'ol/style'
import {
  boundsFromDrawGeometry,
  explorationBounds,
  explorationReady,
  paddedExplorationFitBounds,
  type ExplorationDraw,
} from './explorationGeometry'
import { analysisZoneRadiusKm, recommendedZoomForAnalysisZone, type AnalysisZoneSpec } from './analysisZoneGeometry'
import { compositeInsightSnapshot } from './mapSnapshotComposite'
import { mountMapFreezeOverlay } from './mapSnapshotFreeze'
import type { InsightSnapshotContext } from './insightSnapshot'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useBasemapState } from './useBasemapState'
import { useMapLabelState } from './usePlaceNamesState'
import {
  type BasemapId,
  basemapLabelOverlayVisible,
  createBasemapSource,
  createLabelsSource,
} from './basemaps'
import { buildHighlightStyle, buildLayerStyleFunction } from './mapStyles'
import { useTheme } from '../../theme/ThemeContext'
import { pickFeatureAtPixel } from './mapHitUtils'
import Heatmap from 'ol/layer/Heatmap'
import { loadLayerGeojson } from './mapGeojsonCache'
import { syncMineralHeatmapLayer, MINERAL_HEATMAP_Z_INDEX, type MineralHeatmapSpec } from './mineralHeatmapLayer'
import { syncMineralHeatmapContours } from './mineralHeatmapContours'
import { useTranslation } from '../../i18n/LocaleContext'
import {
  boundaryLabelZoom,
  boundaryMinZoom,
  boundaryLevelsFromGeoJson,
  countryBoundaryStyle,
  districtBoundaryStyle,
  regionBoundaryStyle,
  wardBoundaryStyle,
  villageBoundaryStyle,
  villageBoundaryLabelStyle,
  type BoundaryLevelKey,
  type BoundaryVisibility,
  DEFAULT_BOUNDARY_VISIBILITY,
} from './adminBoundaryStyles'
import {
  boundsToExtent,
  DEFAULT_COUNTRY_FOCUS,
} from './countryFocus'
import type { BoundaryFocus } from './boundaryFocus'

export type { AnalysisZoneSpec } from './analysisZoneGeometry'
export type { MapViewMetrics } from './mapViewportUtils'
export interface MapControls {
  zoomIn: () => void
  zoomOut: () => void
  resetView: () => void
  captureSnapshot: () => Promise<string | null>
  captureMapFrame: () => Promise<string | null>
  captureInsightSnapshot: (ctx: InsightSnapshotContext) => Promise<string | null>
}
export interface MapFocusTarget {
  lat: number
  lng: number
  zoom?: number
  /** Bumps when the same coordinates should re-trigger fly-to */
  key?: number
}

export interface AdminFitBounds {
  west: number
  south: number
  east: number
  north: number
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
  onAreaInspect?: (
    lat: number,
    lng: number,
    zoom: number,
    featureIds?: number[]
  ) => void
  continuousInspect?: boolean
  mapFocus?: MapFocusTarget | null
  assistantOpen?: boolean
  onAssistantToggle?: () => void
  onAssistantClose?: () => void
  areaInsight?: AreaInsight | null
  insightLoading?: boolean
  hasPaidAccess?: boolean
  assistantMapContext?: import('../assistant/TerraAssistantPanel').TerraAssistantMapContext | null
  mapSnapshot?: string | null
  getMapSnapshot?: (ctx: InsightSnapshotContext) => Promise<string | null>
  onRefreshInsight?: () => void
  refreshInsightPending?: boolean
  insightLoadingTerrainView?: boolean
  onExploreSimilarArea?: (lat: number, lng: number, boundaryId?: number) => void
  analysisZone?: AnalysisZoneSpec | null
  countryFocus?: CountryFocus | null
  countries?: Country[]
  countryCode?: string
  onCountryChange?: (code: string) => void
  boundariesGeoJson?: { type: string; features: unknown[] } | null
  villagesGeoJson?: { type: string; features: unknown[] } | null
  boundaryVisibility?: BoundaryVisibility
  onBoundaryVisibilityChange?: (next: BoundaryVisibility) => void
  boundaryFocus?: BoundaryFocus | null
  onClearBoundaryFocus?: () => void
  villagesLoading?: boolean
  villagesError?: boolean
  adminFitBounds?: AdminFitBounds | null
  onMapControlsReady?: (controls: MapControls) => void
  onViewReset?: () => void
  className?: string
  fullScreen?: boolean
  /** Hide layer panel, legend, and basemap dock (admin embeds, previews) */
  minimalChrome?: boolean
  /** Show region/district toggles even when minimalChrome is set */
  showBoundaryControls?: boolean
  /** When false, boundary toggles are omitted from the map surface (render them elsewhere). */
  boundaryControlsOnMap?: boolean
  /** Limit which boundary toggles appear (defaults to all levels in GeoJSON) */
  boundaryControlLevels?: BoundaryLevelKey[]
  /** Unpaid preview: mineral layers always on; boundary toggles are user-controlled. */
  staticMap?: boolean
  mineralHighlight?: MineralHighlightSpec | null
  mineralHeatmap?: MineralHeatmapSpec | null
  mineralHeatmapLoading?: boolean
  /** Show the coordinate-system (CRS) picker. Reserved for admin/editor contexts. */
  showCoordinateSystem?: boolean
  showCoordinateReadout?: boolean
  showBasemapLabels?: boolean
  onShowBasemapLabelsChange?: (next: boolean) => void
  showBoundaryLabels?: boolean
  onShowBoundaryLabelsChange?: (next: boolean) => void
  /** User-entered exploration geometry to draw/mark (WGS84 [lng,lat] points). */
  explorationDraw?: ExplorationDraw | null
  /** When true, a map click appends a vertex to the exploration draw (paid tool). */
  drawActive?: boolean
  onDrawPoint?: (lng: number, lat: number) => void
  /** Sponsored carousel in the map left dock (and mobile overlay). */
  showMapAds?: boolean
  onBasemapChange?: (id: import('./basemaps').BasemapId) => void
}

function mineralTintForFeature(
  feature: import('ol/Feature').FeatureLike,
  level: number,
  highlight: MineralHighlightSpec | null | undefined,
): string | null {
  if (!highlight) return null
  const id = Number(feature.get('id') ?? -1)
  if (id < 0) return null
  if (level === 1 && highlight.regionIds.includes(id)) return highlight.color
  if (level === 2 && highlight.districtIds.includes(id)) return highlight.color
  if (level === 4 && highlight.villageIds.includes(id)) return highlight.color
  return null
}

const TANZANIA_CENTER = fromLonLat([DEFAULT_COUNTRY_FOCUS.center.lng, DEFAULT_COUNTRY_FOCUS.center.lat])
const TANZANIA_EXTENT = boundsToExtent(DEFAULT_COUNTRY_FOCUS.bounds)

function fitAdminBounds(
  map: OlMap,
  bounds: AdminFitBounds,
  mobile: boolean,
  duration?: number,
) {
  const size = map.getSize()
  if (!size || size[0] === 0 || size[1] === 0) {
    requestAnimationFrame(() => fitAdminBounds(map, bounds, mobile, duration))
    return
  }

  map.updateSize()
  const extent = boundsToExtent(bounds)
  map.getView().fit(extent, {
    // Extra bottom padding on mobile clears the stacked bottom controls
    // (Country panel + Ask Terra + dock) so the target isn't hidden behind them.
    padding: mobile ? [96, 16, 220, 16] : [116, 48, 120, 48],
    maxZoom: 12,
    duration: duration ?? (mobile ? 500 : 700),
  })
}

/** Pan/zoom so staged draw vertices are visible while editing (coordinates admin). */
function fitDrawPoints(map: OlMap, points: [number, number][], mobile: boolean) {
  const bounds = explorationBounds(points)
  if (!bounds) return

  const minSpan = 0.04
  let { west, east, south, north } = bounds
  if (east - west < minSpan) {
    const center = (west + east) / 2
    west = center - minSpan / 2
    east = center + minSpan / 2
  }
  if (north - south < minSpan) {
    const center = (south + north) / 2
    south = center - minSpan / 2
    north = center + minSpan / 2
  }

  fitAdminBounds(map, { west, south, east, north }, mobile)
}

interface CountryFitChrome {
  leftPanel?: boolean
  rightDock?: boolean
}

/** Padding [top, right, bottom, left] that keeps the country centered in the visible map area. */
function countryFitPadding(mobile: boolean, chrome: CountryFitChrome = {}): [number, number, number, number] {
  if (mobile) {
    return [96, 12, 176, 12]
  }

  const top = 104
  const bottom = 64
  const right = chrome.rightDock === false ? 48 : 268
  const left = chrome.leftPanel ? 288 : 48
  return [top, right, bottom, left]
}

function lockMinZoomToCurrentView(map: OlMap, duration: number) {
  const view = map.getView()
  const apply = () => {
    const zoom = view.getZoom()
    if (zoom != null && Number.isFinite(zoom)) {
      view.setMinZoom(zoom)
    }
  }
  if (duration <= 0) {
    apply()
    return
  }
  map.once('moveend', apply)
}

function fitCountryView(
  map: OlMap,
  focus: CountryFocus,
  mobile: boolean,
  animated = false,
  chrome: CountryFitChrome = {},
) {
  const size = map.getSize()
  if (!size || size[0] === 0 || size[1] === 0) {
    requestAnimationFrame(() => fitCountryView(map, focus, mobile, animated, chrome))
    return
  }

  map.updateSize()
  const view = map.getView()
  const extent = boundsToExtent(focus.bounds)
  const duration = animated ? (mobile ? 500 : 800) : 0
  const padding = countryFitPadding(mobile, chrome)
  view.set('extent', extent)
  view.fit(extent, {
    padding,
    maxZoom: mobile ? 6 : Math.min(focus.default_zoom + 1.5, 7),
    duration,
  })
  lockMinZoomToCurrentView(map, duration)
}

function layerOlZIndex(layer: MapLayer) {
  // Above admin boundary overlays (3100–3400), below analysis/hover (4500+).
  return 3600 + layer.z_index
}

function villageLabelsVisible(
  vis: BoundaryVisibility,
  showBoundaryLabels: boolean,
  zoom: number,
) {
  return (
    vis.villages &&
    showBoundaryLabels &&
    zoom >= boundaryLabelZoom(4)
  )
}

function readGeojsonFeatures(data: unknown) {
  return new GeoJSON().readFeatures(data, {
    dataProjection: 'EPSG:4326',
    featureProjection: 'EPSG:3857',
  })
}

const USER_DRAW_COLOR = '#0d9488'
const USER_DRAW_POINT_COLOR = '#dc2626'

function userDrawStyles(role: string): Style {
  if (role === 'polygon') {
    return new Style({
      stroke: new Stroke({ color: USER_DRAW_COLOR, width: 2.5 }),
      fill: new Fill({ color: 'rgba(13, 148, 136, 0.15)' }),
    })
  }
  if (role === 'line' || role === 'edge') {
    return new Style({
      stroke: new Stroke({
        color: USER_DRAW_COLOR,
        width: role === 'edge' ? 2.5 : 3,
        lineDash: role === 'edge' ? [8, 6] : undefined,
      }),
    })
  }
  if (role === 'point') {
    return new Style({
      image: new RegularShape({
        points: 3,
        radius: 10,
        angle: 0,
        fill: new Fill({ color: USER_DRAW_POINT_COLOR }),
        stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
      }),
    })
  }
  return new Style({
    image: new RegularShape({
      points: 3,
      radius: 7,
      angle: 0,
      fill: new Fill({ color: USER_DRAW_COLOR }),
      stroke: new Stroke({ color: '#ffffff', width: 2 }),
    }),
  })
}

/** Build OL features (WGS84 -> map projection) for a user exploration draw. */
function buildUserDrawFeatures(draw: ExplorationDraw): Feature[] {
  const coords = draw.points.map(([lng, lat]) => fromLonLat([lng, lat]))
  const features: Feature[] = []

  if (draw.mode === 'polygon' && coords.length >= 3) {
    const ring = [...coords, coords[0]]
    features.push(new Feature({ geometry: new Polygon([ring]), role: 'polygon' }))
  } else if (draw.mode === 'polygon' && coords.length >= 2) {
    features.push(new Feature({ geometry: new LineString(coords), role: 'edge' }))
  } else if (draw.mode === 'line' && coords.length >= 2) {
    features.push(new Feature({ geometry: new LineString(coords), role: 'line' }))
  }

  const vertexRole = draw.mode === 'point' ? 'point' : 'vertex'
  for (const c of coords) {
    features.push(new Feature({ geometry: new Point(c), role: vertexRole }))
  }
  return features
}

function addFeaturesInBatches(
  source: VectorSource,
  features: Feature[],
  batchSize = 400,
  onDone?: () => void,
) {
  let index = 0
  let cancelled = false

  function step() {
    if (cancelled) return
    const end = Math.min(index + batchSize, features.length)
    source.addFeatures(features.slice(index, end))
    index = end
    if (index < features.length) {
      requestAnimationFrame(step)
    } else {
      onDone?.()
    }
  }

  step()
  return () => {
    cancelled = true
  }
}

function layerIsOnMap(map: OlMap, layer: VectorLayer<VectorSource>) {
  return map.getLayers().getArray().includes(layer)
}

function isMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
}

function fitTanzaniaView(map: OlMap, mobile: boolean, animated = false) {
  fitCountryView(map, DEFAULT_COUNTRY_FOCUS, mobile, animated)
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
  assistantOpen = false,
  onAssistantToggle = () => {},
  onAssistantClose = () => {},
  areaInsight = null,
  insightLoading = false,
  hasPaidAccess = false,
  assistantMapContext = null,
  mapSnapshot = null,
  getMapSnapshot,
  onRefreshInsight,
  refreshInsightPending = false,
  insightLoadingTerrainView = false,
  onExploreSimilarArea,
  analysisZone = null,
  countryFocus = null,
  countries = [],
  countryCode = 'TZ',
  onCountryChange,
  boundariesGeoJson = null,
  villagesGeoJson = null,
  boundaryVisibility = DEFAULT_BOUNDARY_VISIBILITY,
  onBoundaryVisibilityChange,
  boundaryFocus = null,
  onClearBoundaryFocus,
  villagesLoading = false,
  villagesError = false,
  adminFitBounds = null,
  onMapControlsReady,
  onViewReset,
  className = 'h-[500px] w-full',
  fullScreen = false,
  minimalChrome = false,
  showBoundaryControls = false,
  boundaryControlsOnMap = true,
  boundaryControlLevels,
  staticMap = false,
  mineralHighlight = null,
  mineralHeatmap = null,
  mineralHeatmapLoading = false,
  showCoordinateSystem = false,
  showCoordinateReadout = false,
  showBasemapLabels: showBasemapLabelsProp,
  onShowBasemapLabelsChange: onShowBasemapLabelsChangeProp,
  showBoundaryLabels: showBoundaryLabelsProp,
  onShowBoundaryLabelsChange: onShowBoundaryLabelsChangeProp,
  explorationDraw = null,
  drawActive = false,
  onDrawPoint,
  showMapAds = true,
  onBasemapChange,
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
  const analysisFitKeyRef = useRef('')
  const analysisZoneLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const userDrawLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const drawActiveRef = useRef(drawActive)
  drawActiveRef.current = drawActive
  const onDrawPointRef = useRef(onDrawPoint)
  onDrawPointRef.current = onDrawPoint
  const onAreaInspectRef = useRef(onAreaInspect)
  onAreaInspectRef.current = onAreaInspect
  const onFeatureClickRef = useRef(onFeatureClick)
  onFeatureClickRef.current = onFeatureClick
  const onMapControlsReadyRef = useRef(onMapControlsReady)
  onMapControlsReadyRef.current = onMapControlsReady
  const countryLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const regionLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const districtLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const wardLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const villageLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const villageLabelLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const heatmapLayerRef = useRef<Heatmap | null>(null)
  const heatmapContourLayerRef = useRef<VectorLayer<VectorSource> | null>(null)
  const villageBatchCancelRef = useRef<(() => void) | null>(null)
  const boundaryVisibilityRef = useRef(boundaryVisibility)
  const boundaryFocusRef = useRef(boundaryFocus)
  const mineralHighlightRef = useRef(mineralHighlight)
  const mapZoomRef = useRef(6)
  const showBasemapLabelsRef = useRef(true)
  const showBoundaryLabelsRef = useRef(true)
  boundaryFocusRef.current = boundaryFocus
  mineralHighlightRef.current = mineralHighlight
  const countryFocusRef = useRef<CountryFocus>(DEFAULT_COUNTRY_FOCUS)
  countryFocusRef.current = countryFocus ?? DEFAULT_COUNTRY_FOCUS
  const countryFitChromeRef = useRef<CountryFitChrome>({})
  const hadMapFocusRef = useRef(false)
  const basemapRef = useRef<BasemapId>('light')
  const [mapEpoch, setMapEpoch] = useState(0)
  const [mapRotation, setMapRotation] = useState(0)
  const [basemap, setBasemapState] = useBasemapState()

  const handleBasemapChange = useCallback(
    (id: import('./basemaps').BasemapId) => {
      setBasemapState(id)
    },
    [setBasemapState],
  )

  useEffect(() => {
    onBasemapChange?.(basemap)
  }, [basemap, onBasemapChange])
  const internalLabelState = useMapLabelState()
  const showBasemapLabels = showBasemapLabelsProp ?? internalLabelState.showBasemapLabels
  const setShowBasemapLabels = onShowBasemapLabelsChangeProp ?? internalLabelState.setShowBasemapLabels
  const showBoundaryLabels = showBoundaryLabelsProp ?? internalLabelState.showBoundaryLabels
  const setShowBoundaryLabels = onShowBoundaryLabelsChangeProp ?? internalLabelState.setShowBoundaryLabels
  const [internalBoundaryVisibility, setInternalBoundaryVisibility] = useState(boundaryVisibility)
  const isBoundaryControlled = onBoundaryVisibilityChange != null
  const activeBoundaryVisibility = isBoundaryControlled ? boundaryVisibility : internalBoundaryVisibility
  const handleBoundaryVisibilityChange = useCallback(
    (next: BoundaryVisibility) => {
      if (isBoundaryControlled) {
        onBoundaryVisibilityChange?.(next)
      } else {
        setInternalBoundaryVisibility(next)
      }
    },
    [isBoundaryControlled, onBoundaryVisibilityChange],
  )
  boundaryVisibilityRef.current = activeBoundaryVisibility
  const [coordinateSystem, setCoordinateSystem] = useCoordinateSystemState(countryCode)
  const [coordinateFormat, setCoordinateFormat] = useCoordinateFormatState()
  const [pointerCoordinate, setPointerCoordinate] = useState<number[] | null>(null)
  const { theme } = useTheme()
  const themeRef = useRef(theme)
  const [layers, setLayers] = useState(initialLayers)
  const [internalVisible, setInternalVisible] = useState<Set<number>>(
    () => new Set(initialLayers.map((l) => l.id))
  )
  const visibleLayers = externalVisible ?? internalVisible
  const isMobile = useMediaQuery('(max-width: 767px)')
  countryFitChromeRef.current = {
    leftPanel: Boolean(
      hasPaidAccess &&
        !minimalChrome &&
        !isMobile &&
        ((showLayerPanel && layers.length > 0) || !!mineralHeatmap?.points?.length || mineralHeatmapLoading),
    ),
    rightDock: !minimalChrome,
  }
  const { locale, m } = useTranslation()
  const prevLocaleRef = useRef(locale)
  const isMobileRef = useRef(isMobile)
  isMobileRef.current = isMobile

  basemapRef.current = basemap
  showBasemapLabelsRef.current = showBasemapLabels
  showBoundaryLabelsRef.current = showBoundaryLabels
  themeRef.current = theme

  useEffect(() => {
    registerCoordinateProjections()
  }, [])

  const layersSignature = useMemo(
    () =>
      [...layers]
        .sort((a, b) => a.id - b.id)
        .map((layer) => `${layer.id}:${layer.slug}:${layer.z_index}`)
        .join('|'),
    [layers]
  )

  const availableBoundaryLevels = useMemo(
    () => boundaryLevelsFromGeoJson(boundariesGeoJson, countryFocus?.boundary_levels ?? []),
    [boundariesGeoJson, countryFocus?.boundary_levels]
  )

  const boundaryToggleLevels = useMemo(
    () => boundaryControlLevels ?? availableBoundaryLevels,
    [boundaryControlLevels, availableBoundaryLevels]
  )

  const boundaryUiLevels = boundaryToggleLevels

  const lockedBoundaryLevels = useMemo(() => [] as BoundaryLevelKey[], [])

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

  const syncVillageLayers = useCallback((zoom?: number) => {
    const map = mapInstance.current
    const villageLayer = villageLayerRef.current
    const villageLabelLayer = villageLabelLayerRef.current
    if (!villageLayer) return
    const z = zoom ?? map?.getView().getZoom() ?? mapZoomRef.current ?? 6
    mapZoomRef.current = z
    const vis = boundaryVisibilityRef.current
    const showStrokes = vis.villages && z >= boundaryMinZoom(4)
    villageLayer.setVisible(showStrokes)
    if (villageLabelLayer) {
      villageLabelLayer.setVisible(villageLabelsVisible(vis, showBoundaryLabelsRef.current, z))
      villageLabelLayer.changed()
    }
    villageLayer.changed()
  }, [])

  const populateLayerSource = useCallback((layerId: number, layer: MapLayer, source: VectorSource, force = false) => {
    loadLayerGeojson(layer.slug, force, layer.mineral_slug)
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

  const inspectAtCoordinate = useCallback((coordinate: number[], featureIds?: number[]) => {
    if (!onAreaInspectRef.current || !mapInstance.current) return
    const map = mapInstance.current
    const [lng, lat] = toLonLat(coordinate)
    const zoom = Math.round(map.getView().getZoom() ?? 8)
    onAreaInspectRef.current(lat, lng, zoom, featureIds)
  }, [])

  useEffect(() => {
    setLayers(initialLayers)
    if (!externalVisible) {
      setInternalVisible(new Set(initialLayers.map((l) => l.id)))
    }
  }, [initialLayers, externalVisible])

  // Init map once
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const baseLayer = new TileLayer({
      source: createBasemapSource(basemapRef.current, showBasemapLabelsRef.current),
      zIndex: 0,
    })
    baseLayerRef.current = baseLayer

    const labelsLayer = new TileLayer({
      source: createLabelsSource(),
      zIndex: 1,
      visible: basemapLabelOverlayVisible(basemapRef.current, showBasemapLabelsRef.current),
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

    const analysisSource = new VectorSource()
    const analysisZoneLayer = new VectorLayer({
      source: analysisSource,
      zIndex: 4500,
      style: (feature) => {
        const extended = feature.get('extended') === true
        return new Style({
          stroke: new Stroke({
            color: extended ? 'rgba(13, 148, 136, 0.98)' : 'rgba(20, 184, 166, 0.95)',
            width: extended ? 3 : 2.5,
            lineDash: extended ? undefined : [12, 8],
          }),
          fill: new Fill({
            color: extended ? 'rgba(13, 148, 136, 0.16)' : 'rgba(20, 184, 166, 0.12)',
          }),
        })
      },
    })
    analysisZoneLayerRef.current = analysisZoneLayer

    const userDrawSource = new VectorSource()
    const userDrawLayer = new VectorLayer({
      source: userDrawSource,
      zIndex: 4700,
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      style: (feature) => userDrawStyles(feature.get('role')),
    })
    userDrawLayerRef.current = userDrawLayer

    const countrySource = new VectorSource()
    const countryLayer = new VectorLayer({
      source: countrySource,
      zIndex: 3400,
      style: () => countryBoundaryStyle(),
    })
    countryLayerRef.current = countryLayer

    const regionSource = new VectorSource()
    const regionLayer = new VectorLayer({
      source: regionSource,
      zIndex: 3300,
      declutter: 'boundary-layers',
      style: (feature) => {
        const focus = boundaryFocusRef.current
        const id = Number(feature.get('id') ?? -1)
        const mineralTint = mineralTintForFeature(feature, 1, mineralHighlightRef.current)
        const labels =
          showBoundaryLabelsRef.current && (mapZoomRef.current ?? 6) >= boundaryLabelZoom(1)
        return regionBoundaryStyle(
          feature,
          labels,
          focus?.level === 1 && focus.id === id,
          mineralTint,
        )
      },
    })
    regionLayerRef.current = regionLayer

    const districtSource = new VectorSource()
    const districtLayer = new VectorLayer({
      source: districtSource,
      zIndex: 3200,
      visible: false,
      declutter: 'boundary-layers',
      style: (feature) => {
        const focus = boundaryFocusRef.current
        const id = Number(feature.get('id') ?? -1)
        const labels =
          showBoundaryLabelsRef.current && (mapZoomRef.current ?? 6) >= boundaryLabelZoom(2)
        const mineralTint = mineralTintForFeature(feature, 2, mineralHighlightRef.current)
        return districtBoundaryStyle(feature, labels, focus?.level === 2 && focus.id === id, mineralTint)
      },
    })
    districtLayerRef.current = districtLayer

    const wardSource = new VectorSource()
    const wardLayer = new VectorLayer({
      source: wardSource,
      zIndex: 3150,
      visible: false,
      declutter: 'boundary-layers',
      style: (feature) => {
        const focus = boundaryFocusRef.current
        const labels =
          showBoundaryLabelsRef.current && (mapZoomRef.current ?? 6) >= boundaryLabelZoom(3)
        return wardBoundaryStyle(feature, labels, focus?.level === 3)
      },
    })
    wardLayerRef.current = wardLayer

    const villageSource = new VectorSource()
    const villageLayer = new VectorLayer({
      source: villageSource,
      zIndex: 3100,
      visible: false,
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      style: (feature) => {
        const focus = boundaryFocusRef.current
        const id = Number(feature.get('id') ?? -1)
        const mineralTint = mineralTintForFeature(feature, 4, mineralHighlightRef.current)
        return villageBoundaryStyle(
          feature,
          focus?.level === 4 && focus.id === id,
          mineralTint,
        )
      },
    })
    villageLayerRef.current = villageLayer

    const villageLabelLayer = new VectorLayer({
      source: villageSource,
      zIndex: 4300,
      visible: false,
      declutter: 'boundary-layers',
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      style: (feature) => {
        const zoom = mapZoomRef.current ?? 6
        const vis = boundaryVisibilityRef.current
        if (!villageLabelsVisible(vis, showBoundaryLabelsRef.current, zoom)) return undefined
        return villageBoundaryLabelStyle(feature)
      },
    })
    villageLabelLayerRef.current = villageLabelLayer

    const mobile = isMobileViewport()

    const map = new OlMap({
      target: mapRef.current,
      layers: [
        baseLayer,
        labelsLayer,
        villageLayer,
        wardLayer,
        districtLayer,
        regionLayer,
        countryLayer,
        analysisZoneLayer,
        userDrawLayer,
        villageLabelLayer,
        hoverLayer,
      ],
      view: new View({
        center: TANZANIA_CENTER,
        zoom: mobile ? 5 : 6.5,
        minZoom: mobile ? 4 : 5,
        maxZoom: 18,
        extent: TANZANIA_EXTENT,
        constrainOnlyCenter: true,
      }),
      controls: defaultControls({ zoom: false, attribution: false }).extend([
        new ScaleLine({ units: 'metric', bar: true, text: true, minWidth: 120 }),
      ]),
      interactions: defaultInteractions({ doubleClickZoom: !mobile }),
    })

    fitCountryView(map, countryFocusRef.current, mobile, false, countryFitChromeRef.current)

    const handleMapInspect = (evt: { coordinate: number[]; pixel: number[] }) => {
      if (drawActiveRef.current && onDrawPointRef.current) {
        const [lng, lat] = toLonLat(evt.coordinate)
        onDrawPointRef.current(lng, lat)
        return
      }
      const picked = pickFeatureAtPixel(
        map,
        evt.pixel,
        layerMetaRef.current,
        hoverLayerRef.current
      )
      if (picked) {
        onFeatureClickRef.current?.(picked.feature.getProperties())
        const ids = picked.featureId != null ? [picked.featureId] : undefined
        inspectAtCoordinate(evt.coordinate, ids)
        return
      }
      inspectAtCoordinate(evt.coordinate)
    }

    map.on('singleclick', handleMapInspect)

    const syncBoundaryLayerVisibility = () => {
      const zoom = map.getView().getZoom() ?? 6
      mapZoomRef.current = zoom
      const vis = boundaryVisibilityRef.current
      countryLayer.setVisible(vis.country)
      regionLayer.setVisible(vis.regions && zoom >= boundaryMinZoom(1))
      districtLayer.setVisible(vis.districts && zoom >= boundaryMinZoom(2))
      wardLayer.setVisible(vis.wards && zoom >= boundaryMinZoom(3))
      syncVillageLayers(zoom)
      regionLayer.changed()
      districtLayer.changed()
      wardLayer.changed()
    }
    map.getView().on('change:resolution', syncBoundaryLayerVisibility)
    syncBoundaryLayerVisibility()

    map.on('pointermove', (evt) => {
      const target = map.getTargetElement()
      if (evt.dragging) {
        target.style.cursor = 'grabbing'
        return
      }

      setPointerCoordinate(evt.coordinate)

      const hoverSource = hoverLayer.getSource()
      if (!hoverSource) return
      hoverSource.clear()

      if (drawActiveRef.current) {
        target.style.cursor = 'crosshair'
        return
      }

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
        target.style.cursor = 'pointer'
      } else {
        target.style.cursor = 'grab'
      }
    })

    map.on('pointerdrag', () => {
      map.getTargetElement().style.cursor = 'grabbing'
    })

    map.on('moveend', () => {
      if (!onAreaInspectRef.current || !continuousInspectRef.current || programmaticMoveRef.current) return
      if (inspectTimer.current) clearTimeout(inspectTimer.current)
      inspectTimer.current = setTimeout(() => {
        const center = map.getView().getCenter()
        if (center) inspectAtCoordinate(center)
      }, 700)
    })

    mapInstance.current = map
    requestAnimationFrame(() => map.updateSize())
    setMapEpoch((epoch) => epoch + 1)
    return () => {
      if (inspectTimer.current) clearTimeout(inspectTimer.current)
      villageBatchCancelRef.current?.()
      villageBatchCancelRef.current = null
      map.setTarget(undefined)
      mapInstance.current = null
      baseLayerRef.current = null
      labelsLayerRef.current = null
      hoverLayerRef.current = null
      analysisZoneLayerRef.current = null
      userDrawLayerRef.current = null
      countryLayerRef.current = null
      regionLayerRef.current = null
      districtLayerRef.current = null
      wardLayerRef.current = null
      villageLayerRef.current = null
      villageLabelLayerRef.current = null
      vectorLayersRef.current.clear()
      layerMetaRef.current.clear()
    }
  }, [inspectAtCoordinate])

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
    const view = map.getView()
    const syncRotation = () => setMapRotation(view.getRotation())
    syncRotation()
    view.on('change:rotation', syncRotation)
    return () => {
      view.un('change:rotation', syncRotation)
    }
  }, [mapEpoch])

  useEffect(() => {
    const map = mapInstance.current
    if (!map) return

    // Analysis zone owns the viewport while active — avoid competing mapFocus animations.
    if (analysisZone) return

    if (!mapFocus) {
      if (!hadMapFocusRef.current) return
      hadMapFocusRef.current = false
      if (adminFitBounds || analysisZone) return
      programmaticMoveRef.current = true
      const mobile = isMobileRef.current
      fitCountryView(map, countryFocusRef.current, mobile, true, countryFitChromeRef.current)
      window.setTimeout(() => {
        programmaticMoveRef.current = false
      }, isMobileRef.current ? 600 : 900)
      return
    }

    hadMapFocusRef.current = true

    const { lat, lng, zoom = 11 } = mapFocus
    const center = fromLonLat([lng, lat])

    programmaticMoveRef.current = true
    const view = map.getView()
    const targetZoom = zoom

    view.animate(
      {
        center,
        zoom: targetZoom,
        duration: isMobileRef.current ? 500 : 800,
      },
      () => {
        window.setTimeout(() => {
          programmaticMoveRef.current = false
        }, 200)
      }
    )
  }, [mapFocus, countryFocus, adminFitBounds, analysisZone])

  useEffect(() => {
    const map = mapInstance.current
    const countryLayer = countryLayerRef.current
    const regionLayer = regionLayerRef.current
    const districtLayer = districtLayerRef.current
    const wardLayer = wardLayerRef.current
    const villageLayer = villageLayerRef.current
    if (!map || !countryLayer || !regionLayer || !districtLayer || !wardLayer || !villageLayer) return

    const countrySource = countryLayer.getSource()
    const regionSource = regionLayer.getSource()
    const districtSource = districtLayer.getSource()
    const wardSource = wardLayer.getSource()
    const villageSource = villageLayer.getSource()
    if (!countrySource || !regionSource || !districtSource || !wardSource || !villageSource) return

    countrySource.clear()
    regionSource.clear()
    districtSource.clear()
    wardSource.clear()

    const collection = boundariesGeoJson
    if (collection?.features?.length) {
      const features = readGeojsonFeatures(collection)
      for (const feature of features) {
        const level = Number(feature.get('level') ?? 0)
        const featureId = Number(feature.get('id') ?? -1)
        if (boundaryFocus && level === boundaryFocus.level && featureId !== boundaryFocus.id) {
          continue
        }
        if (level === 0) countrySource.addFeature(feature)
        else if (level === 1) regionSource.addFeature(feature)
        else if (level === 2) districtSource.addFeature(feature)
        else if (level === 3) wardSource.addFeature(feature)
      }
    }

    const zoom = map.getView().getZoom() ?? 6
    mapZoomRef.current = zoom
    countryLayer.setVisible(activeBoundaryVisibility.country)
    regionLayer.setVisible(activeBoundaryVisibility.regions && zoom >= boundaryMinZoom(1))
    districtLayer.setVisible(activeBoundaryVisibility.districts && zoom >= boundaryMinZoom(2))
    wardLayer.setVisible(activeBoundaryVisibility.wards && zoom >= boundaryMinZoom(3))
    syncVillageLayers(zoom)
    regionLayer.changed()
    districtLayer.changed()
    wardLayer.changed()
  }, [boundariesGeoJson, activeBoundaryVisibility, boundaryFocus, syncVillageLayers])

  useEffect(() => {
    const map = mapInstance.current
    const villageLayer = villageLayerRef.current
    if (!map || !villageLayer) return

    const villageSource = villageLayer.getSource()
    if (!villageSource) return

    villageBatchCancelRef.current?.()
    villageBatchCancelRef.current = null
    villageSource.clear()

    const zoom = map.getView().getZoom() ?? 6
    const showVillages = activeBoundaryVisibility.villages && zoom >= boundaryMinZoom(4)
    syncVillageLayers(zoom)

    if (!showVillages || !villagesGeoJson?.features?.length) {
      return
    }

    const parsed = readGeojsonFeatures(villagesGeoJson)
    const villageFeatures: Feature[] = []
    for (const feature of parsed) {
      const featureId = Number(feature.get('id') ?? -1)
      if (boundaryFocus?.level === 4 && featureId !== boundaryFocus.id) continue
      villageFeatures.push(feature as Feature)
    }

    villageBatchCancelRef.current = addFeaturesInBatches(villageSource, villageFeatures, 500, () => {
      syncVillageLayers()
    })
  }, [villagesGeoJson, activeBoundaryVisibility.villages, boundaryFocus, syncVillageLayers])

  useEffect(() => {
    boundaryFocusRef.current = boundaryFocus
    regionLayerRef.current?.changed()
    districtLayerRef.current?.changed()
    wardLayerRef.current?.changed()
    villageLayerRef.current?.changed()
    villageLabelLayerRef.current?.changed()
  }, [boundaryFocus])

  useEffect(() => {
    mineralHighlightRef.current = mineralHighlight
    regionLayerRef.current?.changed()
    districtLayerRef.current?.changed()
    villageLayerRef.current?.changed()
  }, [mineralHighlight])

  useEffect(() => {
    const map = mapInstance.current
    if (!map || mapEpoch === 0) return
    let cancelled = false
    void syncMineralHeatmapLayer(
      map,
      heatmapLayerRef,
      mineralHeatmap,
      isMobileRef.current,
      () => cancelled,
    )
    return () => {
      cancelled = true
    }
  }, [mineralHeatmap, mapEpoch, isMobile])

  useEffect(() => {
    const map = mapInstance.current
    if (!map || mapEpoch === 0) return
    let cancelled = false
    const contourSpec =
      mineralHeatmap?.contours?.length && mineralHeatmap.color
        ? {
            slug: mineralHeatmap.slug,
            color: mineralHeatmap.color,
            contours: mineralHeatmap.contours,
          }
        : null
    void syncMineralHeatmapContours(map, heatmapContourLayerRef, contourSpec, () => cancelled)
    return () => {
      cancelled = true
    }
  }, [mineralHeatmap, mapEpoch])

  useEffect(() => {
    const map = mapInstance.current
    if (!map || !countryFocus) return

    const extent = boundsToExtent(countryFocus.bounds)
    map.getView().set('extent', extent)

    if (!analysisZone && !adminFitBounds) {
      programmaticMoveRef.current = true
      fitCountryView(map, countryFocus, isMobileRef.current, true, countryFitChromeRef.current)
      window.setTimeout(() => {
        programmaticMoveRef.current = false
      }, isMobileRef.current ? 650 : 900)
    }
  }, [countryFocus, analysisZone, adminFitBounds])

  useEffect(() => {
    const map = mapInstance.current
    if (!map || hadMapFocusRef.current || analysisZone || adminFitBounds) return
    programmaticMoveRef.current = true
    fitCountryView(map, countryFocusRef.current, isMobileRef.current, true, countryFitChromeRef.current)
    const timer = window.setTimeout(() => {
      programmaticMoveRef.current = false
    }, isMobileRef.current ? 650 : 900)
    return () => window.clearTimeout(timer)
  }, [showLayerPanel, hasPaidAccess, layers.length, minimalChrome, isMobile, analysisZone, adminFitBounds, mineralHeatmap?.points?.length])

  useEffect(() => {
    const map = mapInstance.current
    if (!map || !adminFitBounds) return
    programmaticMoveRef.current = true
    fitAdminBounds(map, adminFitBounds, isMobileRef.current)
    window.setTimeout(() => {
      programmaticMoveRef.current = false
    }, isMobileRef.current ? 650 : 850)
  }, [adminFitBounds])

  useEffect(() => {
    const map = mapInstance.current
    const layer = analysisZoneLayerRef.current
    const source = layer?.getSource()
    if (!map || !layer || !source) return

    source.clear()
    if (!analysisZone || adminFitBounds) {
      analysisFitKeyRef.current = ''
      return
    }

    const radiusM = analysisZoneRadiusKm(analysisZone.areaKm2) * 1000
    const feature = new Feature({
      geometry: new Circle(fromLonLat([analysisZone.lng, analysisZone.lat]), radiusM),
      extended: analysisZone.extended === true,
    })
    source.addFeature(feature)

    const fitKey = [
      analysisZone.lat,
      analysisZone.lng,
      analysisZone.areaKm2,
      analysisZone.extended === true,
    ].join('|')
    if (analysisFitKeyRef.current === fitKey) return
    analysisFitKeyRef.current = fitKey

    const geometry = feature.getGeometry()
    const extent = geometry?.getExtent()
    if (!extent || !extent.every((value) => Number.isFinite(value))) return

    const size = map.getSize()
    const targetZoom = size
      ? recommendedZoomForAnalysisZone(
          analysisZone.lat,
          analysisZone.areaKm2,
          size[0],
          size[1]
        )
      : 12
    const center = fromLonLat([analysisZone.lng, analysisZone.lat])

    programmaticMoveRef.current = true
    const mobile = isMobileRef.current
    const view = map.getView()
    view.cancelAnimations()

    const currentZoom = view.getZoom() ?? 6
    const padding = mobile ? [72, 28, 176, 28] : [48, 56, 152, 56]

    // Already close enough: pan only (no second zoom pass).
    if (currentZoom >= targetZoom - 0.15) {
      view.animate(
        { center, duration: mobile ? 350 : 450 },
        () => {
          programmaticMoveRef.current = false
        }
      )
      return
    }

    view.fit(extent, {
      padding,
      maxZoom: Math.min(targetZoom, 15.5),
      duration: mobile ? 500 : 650,
      callback: () => {
        programmaticMoveRef.current = false
      },
    })
  }, [analysisZone, adminFitBounds])

  // Render the user's exploration draw (point / line / polygon + vertices).
  useEffect(() => {
    const map = mapInstance.current
    const layer = userDrawLayerRef.current
    const source = layer?.getSource()
    if (!source) return
    source.clear()
    if (explorationDraw && explorationDraw.points.length) {
      source.addFeatures(buildUserDrawFeatures(explorationDraw))
      layer?.changed()
    }
  }, [explorationDraw, mapEpoch])

  // Switch basemap / place-name tiles
  useEffect(() => {
    const base = baseLayerRef.current
    const labels = labelsLayerRef.current
    if (!base) return

    base.setSource(createBasemapSource(basemap, showBasemapLabels))
    if (labels) {
      labels.setVisible(basemapLabelOverlayVisible(basemap, showBasemapLabels))
    }

    restyleVectorLayers()
  }, [basemap, showBasemapLabels, restyleVectorLayers])

  useEffect(() => {
    syncVillageLayers()
    regionLayerRef.current?.changed()
    districtLayerRef.current?.changed()
    wardLayerRef.current?.changed()
  }, [showBoundaryLabels, syncVillageLayers])

  useEffect(() => {
    syncVillageLayers()
  }, [activeBoundaryVisibility, syncVillageLayers])

  useEffect(() => {
    restyleVectorLayers()
  }, [theme, restyleVectorLayers])

  // Data layers - sync incrementally; cache GeoJSON per slug
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
        declutter: layer.layer_type === 'point' ? 'mineral-data' : false,
      })
      map.addLayer(vectorLayer)
      vectorLayersRef.current.set(layer.id, vectorLayer)
      populateLayerSource(layer.id, layer, source)
    })

    const heatmap = heatmapLayerRef.current
    if (heatmap) {
      heatmap.setZIndex(MINERAL_HEATMAP_Z_INDEX)
    }
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
    const current = view.getZoom() ?? 6
    const min = view.getMinZoom() ?? 0
    const max = view.getMaxZoom() ?? 28
    const next = Math.min(max, Math.max(min, current + delta))
    if (next === current) return
    view.animate({ zoom: next, duration: 200 })
  }, [])

  const resetMapView = useCallback(() => {
    onViewReset?.()
    const map = mapInstance.current
    if (!map) return
    programmaticMoveRef.current = true
    fitCountryView(map, countryFocusRef.current, isMobileRef.current, true, countryFitChromeRef.current)
    window.setTimeout(() => {
      programmaticMoveRef.current = false
    }, isMobileRef.current ? 650 : 900)
  }, [onViewReset])

  const compositeMapCanvases = useCallback((map: OlMap): string | null => {
    try {
      const size = map.getSize()
      if (!size) return null
      const [width, height] = size
      const composite = document.createElement('canvas')
      composite.width = width
      composite.height = height
      const ctx = composite.getContext('2d')
      if (!ctx) return null
      map.getViewport().querySelectorAll<HTMLCanvasElement>('canvas').forEach((canvas) => {
        if (!canvas.width || !canvas.height) return
        const parent = canvas.parentElement as HTMLElement | null
        const opacity = parent?.style.opacity
        ctx.globalAlpha = opacity === '' || !opacity ? 1 : Number(opacity)
        const matrix = canvas.style.transform.match(/matrix\(([^)]+)\)/)
        if (matrix) {
          const values = matrix[1].split(',').map((v) => parseFloat(v.trim()))
          if (values.length === 6) {
            ctx.setTransform(values[0], values[1], values[2], values[3], values[4], values[5])
            ctx.drawImage(canvas, 0, 0)
            ctx.setTransform(1, 0, 0, 1, 0, 0)
            return
          }
        }
        ctx.drawImage(canvas, 0, 0)
      })
      try {
        return composite.toDataURL('image/png')
      } catch {
        try {
          return composite.toDataURL('image/jpeg', 0.88)
        } catch {
          return null
        }
      }
    } catch {
      return null
    }
  }, [])

  const captureMapFrame = useCallback((): Promise<string | null> => {
    const map = mapInstance.current
    if (!map) return Promise.resolve(null)

    return new Promise((resolve) => {
      map.once('rendercomplete', () => {
        resolve(compositeMapCanvases(map))
      })
      map.renderSync()
    })
  }, [compositeMapCanvases])

  const waitMapRender = useCallback((): Promise<void> => {
    const map = mapInstance.current
    if (!map) return Promise.resolve()
    return new Promise((resolve) => {
      window.setTimeout(() => {
        map.once('rendercomplete', () => resolve())
        map.renderSync()
      }, 50)
    })
  }, [])

  const captureInsightSnapshot = useCallback(
    async (ctx: InsightSnapshotContext): Promise<string | null> => {
      const map = mapInstance.current
      if (!map) return null

      const view = map.getView()
      const savedCenter = view.getCenter()
      const savedZoom = view.getZoom()
      const savedRotation = view.getRotation()
      const mobile = isMobileRef.current
      const container = mapRef.current?.parentElement

      const fitDetailView = () => {
        const draw = ctx.explorationDraw ?? explorationDraw
        if (draw && explorationReady(draw)) {
          const fit = paddedExplorationFitBounds(draw.points, draw.mode)
          if (fit) {
            fitAdminBounds(map, { ...fit, key: 0 }, mobile, 0)
            return true
          }
          if (draw.mode === 'point' && draw.points[0]) {
            const [lng, lat] = draw.points[0]
            view.setCenter(fromLonLat([lng, lat]))
            view.setZoom(13)
            return true
          }
        }
        if (ctx.explorationGeometry) {
          const fit = boundsFromDrawGeometry(ctx.explorationGeometry)
          if (fit) {
            fitAdminBounds(map, { ...fit, key: 0 }, mobile, 0)
            return true
          }
        }
        const km2 = ctx.analysisAreaKm2 ?? 10
        const radiusM = analysisZoneRadiusKm(km2) * 1000
        const circle = new Circle(fromLonLat([ctx.lng, ctx.lat]), radiusM)
        const extent = circle.getExtent()
        view.fit(extent, {
          padding: mobile ? [48, 32, 48, 32] : [64, 48, 64, 48],
          maxZoom: 15,
          duration: 0,
        })
        return true
      }

      programmaticMoveRef.current = true
      let removeFreeze: (() => void) | null = null
      const analysisLayer = analysisZoneLayerRef.current
      const analysisLayerVisible = analysisLayer?.getVisible() ?? true

      map.renderSync()
      const instantFreeze = container ? compositeMapCanvases(map) : null
      if (instantFreeze && container) {
        removeFreeze = mountMapFreezeOverlay(container, instantFreeze)
      }

      if (analysisLayer) analysisLayer.setVisible(false)

      const countryLayer = countryLayerRef.current
      const regionLayer = regionLayerRef.current
      const districtLayer = districtLayerRef.current
      const wardLayer = wardLayerRef.current
      const villageLayer = villageLayerRef.current
      const boundaryVis = {
        country: countryLayer?.getVisible() ?? true,
        regions: regionLayer?.getVisible() ?? true,
        districts: districtLayer?.getVisible() ?? false,
        wards: wardLayer?.getVisible() ?? false,
        villages: villageLayer?.getVisible() ?? false,
      }
      try {
        countryLayer?.setVisible(true)
        regionLayer?.setVisible(true)
        districtLayer?.setVisible(false)
        wardLayer?.setVisible(false)
        villageLayer?.setVisible(false)

        fitCountryView(
          map,
          countryFocusRef.current,
          mobile,
          false,
          { leftPanel: false, rightDock: false },
        )
        map.renderSync()
        await waitMapRender()

        const size = map.getSize()
        const markerPixel = map.getPixelFromCoordinate(fromLonLat([ctx.lng, ctx.lat]))
        const marker = size && markerPixel
          ? { x: markerPixel[0] / size[0], y: markerPixel[1] / size[1] }
          : { x: 0.5, y: 0.42 }

        const overviewUrl = await captureMapFrame()
        if (!overviewUrl) return null

        fitDetailView()
        if (analysisLayer) analysisLayer.setVisible(false)
        await waitMapRender()
        const detailUrl = await captureMapFrame()
        if (!detailUrl) return overviewUrl

        try {
          return await compositeInsightSnapshot(overviewUrl, detailUrl, marker, {
            lat: ctx.lat,
            lng: ctx.lng,
          })
        } catch {
          return detailUrl
        }
      } finally {
        removeFreeze?.()
        if (analysisLayer) analysisLayer.setVisible(analysisLayerVisible)
        countryLayer?.setVisible(boundaryVis.country)
        regionLayer?.setVisible(boundaryVis.regions)
        districtLayer?.setVisible(boundaryVis.districts)
        wardLayer?.setVisible(boundaryVis.wards)
        villageLayer?.setVisible(boundaryVis.villages)
        if (savedCenter) {
          view.setCenter(savedCenter)
          if (savedZoom != null) view.setZoom(savedZoom)
          view.setRotation(savedRotation)
        }
        programmaticMoveRef.current = false
        map.renderSync()
      }
    },
    [captureMapFrame, waitMapRender, explorationDraw, compositeMapCanvases],
  )

  const captureSnapshot = useCallback((): Promise<string | null> => {
    const map = mapInstance.current
    if (!map) return Promise.resolve(null)

    const draw = explorationDraw
    if (draw && explorationReady(draw)) {
      let lat = 0
      let lng = 0
      if (draw.mode === 'point') {
        ;[lng, lat] = draw.points[0]
      } else {
        lng = draw.points.reduce((s, p) => s + p[0], 0) / draw.points.length
        lat = draw.points.reduce((s, p) => s + p[1], 0) / draw.points.length
      }
      return captureInsightSnapshot({ lat, lng, explorationDraw: draw })
    }

    const center = map.getView().getCenter()
    if (!center) return captureMapFrame()
    const [lng, lat] = toLonLat(center)
    return captureInsightSnapshot({
      lat,
      lng,
      zoom: Math.round(map.getView().getZoom() ?? 11),
    })
  }, [captureInsightSnapshot, captureMapFrame, explorationDraw])

  useEffect(() => {
    if (mapEpoch === 0) return
    onMapControlsReadyRef.current?.({
      zoomIn: () => zoomMap(1),
      zoomOut: () => zoomMap(-1),
      resetView: resetMapView,
      captureSnapshot,
      captureMapFrame,
      captureInsightSnapshot,
    })
  }, [mapEpoch, zoomMap, resetMapView, captureSnapshot, captureMapFrame, captureInsightSnapshot])

  const legendLayers = [...layers]
    .sort((a, b) => a.z_index - b.z_index)
    .filter((l) => visibleLayers.has(l.id))

  return (
    <div className={`relative map-viewer w-full min-w-0 overflow-hidden ${isMobile ? 'map-viewer--mobile' : ''} ${className}`}>
      <div ref={mapRef} className="h-full w-full min-w-0 overflow-hidden bg-slate-200" />
      {showWatermark && <WatermarkOverlay />}
      {!minimalChrome && !isMobile && (
        <MapCompass
          rotationRad={mapRotation}
          className={`map-compass${
            showCoordinateReadout && hasPaidAccess && pointerCoordinate
              ? ' map-compass--above-readout'
              : ''
          }`}
        />
      )}
      {!minimalChrome && !isMobile && showCoordinateReadout && hasPaidAccess && (
        <MapCoordinateReadout
          mapCoordinate={pointerCoordinate}
          coordinateSystem={coordinateSystem}
          coordinateFormat={coordinateFormat}
          onCoordinateFormatChange={setCoordinateFormat}
        />
      )}
      {isMobile && !minimalChrome && showCoordinateReadout && hasPaidAccess && (
        <div className="map-mobile-left-stack pointer-events-none absolute z-20 left-3 flex max-w-[min(18rem,calc(100vw-1.5rem))]">
          <MapCoordinateReadout
            mapCoordinate={pointerCoordinate}
            coordinateSystem={coordinateSystem}
            coordinateFormat={coordinateFormat}
            onCoordinateFormatChange={setCoordinateFormat}
            className="pointer-events-auto w-full shrink-0"
          />
        </div>
      )}
      {minimalChrome && (
        <div className="map-minimal-dock pointer-events-none">
          {boundaryControlsOnMap && showBoundaryControls && boundaryToggleLevels.length > 0 && (
            <div className="map-minimal-dock__panel map-chrome pointer-events-auto">
              <span className="map-minimal-dock__title">{m.map.boundaryLayersTitle}</span>
              <BoundaryVisibilityToggles
                availableLevels={boundaryToggleLevels}
                value={activeBoundaryVisibility}
                onChange={handleBoundaryVisibilityChange}
                showBasemapLabels={showBasemapLabels}
                onShowBasemapLabelsChange={setShowBasemapLabels}
                showBoundaryLabels={showBoundaryLabels}
                onShowBoundaryLabelsChange={setShowBoundaryLabels}
                villagesLoading={villagesLoading}
                villagesError={villagesError}
                compact
              />
            </div>
          )}
          <MapCompass rotationRad={mapRotation} compact className="map-minimal-dock__compass shrink-0 self-end" />
          <MapZoomControls
            className="map-minimal-dock__zoom shrink-0"
            onZoomIn={() => zoomMap(1)}
            onZoomOut={() => zoomMap(-1)}
            onResetView={resetMapView}
          />
        </div>
      )}
      {hasPaidAccess && !minimalChrome && !isMobile && (showLayerPanel && layers.length > 0 || mineralHeatmap?.points?.length || mineralHeatmapLoading) && (
        <div className="map-left-dock absolute z-10 top-[max(1.125rem,env(safe-area-inset-top,0px))] hidden md:flex min-h-0 flex-col gap-2 pointer-events-none overflow-hidden">
          {showLayerPanel && layers.length > 0 && (
            <LayerPanel
              embedded
              layers={layers}
              visibleLayers={visibleLayers}
              onToggle={toggleLayer}
              onToggleType={toggleLayerType}
              onReorder={reorderLayers}
              allowReorder={allowReorder || editable}
              layersLocked={staticMap}
              className="pointer-events-auto min-h-0 flex-1 overflow-hidden"
            />
          )}
          <MineralHeatmapColorbar
            embedded
            spec={mineralHeatmap?.points?.length ? mineralHeatmap : null}
            loading={mineralHeatmapLoading}
            className="pointer-events-none shrink-0 w-full"
          />
          {showMapAds && (
            <AdPlacementSlot
              placement="map_overlay"
              compact
              className="pointer-events-auto w-full shrink-0"
            />
          )}
        </div>
      )}
      {!minimalChrome && !isMobile && showMapAds && !(showLayerPanel && layers.length > 0) && !mineralHeatmap?.points?.length && (
        <div className="map-left-dock map-left-dock--ads-only absolute z-10 top-[max(1.125rem,env(safe-area-inset-top,0px))] hidden md:flex flex-col pointer-events-none overflow-hidden">
          <AdPlacementSlot placement="map_overlay" compact className="pointer-events-auto w-full" />
        </div>
      )}
      {!minimalChrome && !isMobile && (
        <MapRightDock
          basemap={basemap}
          onBasemapChange={handleBasemapChange}
          showBasemapLabels={showBasemapLabels}
          onShowBasemapLabelsChange={setShowBasemapLabels}
          showBoundaryLabels={showBoundaryLabels}
          onShowBoundaryLabelsChange={setShowBoundaryLabels}
          layers={legendLayers}
          countries={countries}
          countryCode={countryCode}
          onCountryChange={onCountryChange ?? (() => {})}
          availableBoundaryLevels={boundaryUiLevels}
          boundaryVisibility={activeBoundaryVisibility}
          onBoundaryVisibilityChange={handleBoundaryVisibilityChange}
          boundaryFocus={boundaryFocus}
          onClearBoundaryFocus={onClearBoundaryFocus}
          villagesLoading={villagesLoading}
          villagesError={villagesError}
          lockedBoundaryLevels={lockedBoundaryLevels}
          coordinateSystem={coordinateSystem}
          onCoordinateSystemChange={setCoordinateSystem}
          coordinateFormat={coordinateFormat}
          onCoordinateFormatChange={setCoordinateFormat}
          hasPaidAccess={hasPaidAccess}
          showCoordinateSystem={showCoordinateSystem && hasPaidAccess}
          showMapAds={showMapAds}
        />
      )}
      {isMobile && !minimalChrome && (
        <MapBottomControls
          showLayersPanel={showLayerPanel}
          layers={layers}
          visibleLayers={visibleLayers}
          onToggleLayer={toggleLayer}
          onToggleLayerType={toggleLayerType}
          basemap={basemap}
          onBasemapChange={handleBasemapChange}
          showBasemapLabels={showBasemapLabels}
          onShowBasemapLabelsChange={setShowBasemapLabels}
          showBoundaryLabels={showBoundaryLabels}
          onShowBoundaryLabelsChange={setShowBoundaryLabels}
          legendLayers={legendLayers}
          onZoomIn={() => zoomMap(1)}
          onZoomOut={() => zoomMap(-1)}
          onResetView={resetMapView}
          countries={countries}
          countryCode={countryCode}
          onCountryChange={onCountryChange ?? (() => {})}
          availableBoundaryLevels={boundaryUiLevels}
          boundaryVisibility={activeBoundaryVisibility}
          onBoundaryVisibilityChange={handleBoundaryVisibilityChange}
          boundaryFocus={boundaryFocus}
          onClearBoundaryFocus={onClearBoundaryFocus}
          villagesLoading={villagesLoading}
          villagesError={villagesError}
          lockedBoundaryLevels={lockedBoundaryLevels}
          staticMap={staticMap}
          coordinateSystem={coordinateSystem}
          onCoordinateSystemChange={setCoordinateSystem}
          coordinateFormat={coordinateFormat}
          onCoordinateFormatChange={setCoordinateFormat}
          showCoordinateSystem={showCoordinateSystem && hasPaidAccess}
          assistantOpen={assistantOpen ?? false}
          onAssistantToggle={onAssistantToggle ?? (() => {})}
          onAssistantClose={onAssistantClose ?? (() => {})}
          areaInsight={areaInsight ?? null}
          insightLoading={insightLoading ?? false}
          hasPaidAccess={hasPaidAccess ?? false}
          assistantMapContext={assistantMapContext ?? null}
          mapSnapshot={mapSnapshot}
          getMapSnapshot={getMapSnapshot}
          onRefreshInsight={onRefreshInsight}
          refreshInsightPending={refreshInsightPending}
          insightLoadingTerrainView={insightLoadingTerrainView}
          onExploreSimilarArea={onExploreSimilarArea}
          mineralHeatmap={mineralHeatmap?.points?.length ? mineralHeatmap : null}
          mineralHeatmapLoading={mineralHeatmapLoading}
          showMapAds={showMapAds}
          mapRotation={mapRotation}
        />
      )}
    </div>
  )
}
