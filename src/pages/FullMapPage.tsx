import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { analyticsApi, geographyApi, mapsApi } from '../api'
import MapViewer, {
  type AdminFitBounds,
  type MapControls,
  type MapFocusTarget,
} from '../components/map/MapViewer'
import MapZoomControls from '../components/map/MapZoomControls'
import {
  DEFAULT_BOUNDARY_VISIBILITY,
  UNPAID_BOUNDARY_VISIBILITY,
  boundaryVisibilityIsDefault,
  initialBoundaryVisibilityForGeoJson,
  type BoundaryVisibility,
} from '../components/map/adminBoundaryStyles'
import {
  boundaryFocusFromAt,
  boundaryVisibilityForFocus,
  resolveBoundaryFocus,
  type BoundaryFocus,
} from '../components/map/boundaryFocus'
import {
  DEFAULT_COUNTRY_CODE,
  resolveCountryFocus,
} from '../components/map/countryFocus'
import MapSidebar from '../components/map/MapSidebar'
import MapSearchBar from '../components/map/MapSearchBar'
import TerraAssistantLauncher from '../components/map/TerraAssistantLauncher'
import ExploreDrawTool from '../components/map/ExploreDrawTool'
import {
  explorationBounds,
  explorationCentroid,
  explorationReady,
  type ExplorationMode,
} from '../components/map/explorationGeometry'
import { useCoordinateSystemState } from '../components/map/useCoordinateSystemState'
import { parseCoordinateQuery } from '../components/map/parseCoordinate'
import type { TerraAssistantMapContext } from '../components/assistant/TerraAssistantPanel'
import { useAuth } from '../auth/AuthContext'
import { toast } from '../components/ui/toast'
import { canExploreMineral } from '../lib/mineralExploration'
import { useTranslation } from '../i18n/LocaleContext'
import { useDisplayName } from '../i18n/useDisplayName'
import type { AreaInsight, MapLayer, MineralCatalogEntry, MineralHighlightSpec, MineralSearchInsight } from '../types'
import type { MineralHeatmapSpec } from '../components/map/mineralHeatmapLayer'
import { mineralHeatmapZIndex } from '../components/map/mineralHeatmapLayer'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { allVisibleLayerIds, defaultVisibleLayerIds } from '../components/map/mapUtils'
import { layerDisplayColor } from '../components/admin/layerColors'
import { resolveColorHex } from '../lib/mineralColorUtils'

const GENERAL_MINERAL_SLUG = 'general'

function isHeatmapMineralSlug(slug: string | null): slug is string {
  return !!slug && slug !== GENERAL_MINERAL_SLUG
}

function searchInsightParams(item: MineralSearchInsight) {
  if (item.type === 'mineral') return { mineral_slug: item.slug }
  if (item.type === 'region') return { region_id: item.id }
  if (item.type === 'region_boundary' || item.type === 'district_boundary' || item.type === 'ward_boundary' || item.type === 'village_boundary') {
    return { boundary_id: item.boundary_id ?? item.id }
  }
  if (item.type === 'layer') return { layer_id: item.id }
  return {}
}

function isRegionSearchResult(item: MineralSearchInsight) {
  return item.type === 'region' || item.type === 'region_boundary' || item.type === 'district_boundary' || item.type === 'ward_boundary' || item.type === 'village_boundary'
}

function focusSearchResult(
  item: MineralSearchInsight,
  setAdminFitBounds: (bounds: AdminFitBounds | null) => void,
  setMapFocus: (focus: MapFocusTarget | null) => void,
  focusOn: (lat: number, lng: number, zoom?: number) => void
) {
  setAdminFitBounds(null)
  setMapFocus(null)
  const bounds = item.bounds
  if (
    bounds &&
    Number.isFinite(bounds.west) &&
    Number.isFinite(bounds.south) &&
    Number.isFinite(bounds.east) &&
    Number.isFinite(bounds.north)
  ) {
    setAdminFitBounds({ ...bounds, key: Date.now() })
    return
  }
  if (item.center) {
    focusOn(item.center.lat, item.center.lng, item.zoom ?? 9)
  }
}

/** Group key for heatmap eligibility (one mineral / commodity at a time). */
function layerHeatmapGroupKey(layer: MapLayer): string | null {
  if (layer.mineral_slug && layer.mineral_slug !== GENERAL_MINERAL_SLUG) {
    return layer.mineral_slug
  }
  return layer.slug || null
}

/** When exactly one mineral has visible layers (and at least one layer is checked), return that slug. */
function soleVisibleMineralSlug(visible: Set<number>, layerList: MapLayer[]): string | null {
  if (visible.size === 0) return null
  const slugs = new Set<string>()
  for (const layer of layerList) {
    if (!visible.has(layer.id)) continue
    const key = layerHeatmapGroupKey(layer)
    if (key) slugs.add(key)
  }
  if (slugs.size !== 1) return null
  return [...slugs][0]
}

function visibleLayersForMineral(
  slug: string,
  layerList: MapLayer[],
  visible: Set<number>,
): MapLayer[] {
  return layerList.filter(
    (layer) => layerHeatmapGroupKey(layer) === slug && visible.has(layer.id),
  )
}

function visibleLayerIdsKey(slug: string, layerList: MapLayer[], visible: Set<number>): string {
  return visibleLayersForMineral(slug, layerList, visible)
    .map((layer) => layer.id)
    .sort((a, b) => a - b)
    .join(',')
}

function heatmapApiSlug(slug: string, visibleMineralLayers: MapLayer[]): string {
  const mineralSlugs = new Set(
    visibleMineralLayers
      .map((layer) => layer.mineral_slug)
      .filter((value) => value && value !== GENERAL_MINERAL_SLUG),
  )
  if (mineralSlugs.size === 1) return [...mineralSlugs][0]
  return slug
}
function mineralColorFromVisibleLayers(
  slug: string,
  layerList: MapLayer[],
  visible: Set<number>,
): string {
  const mineralLayers = visibleLayersForMineral(slug, layerList, visible)
  const polygon = mineralLayers.find((l) => l.layer_type === 'polygon')
  const point = mineralLayers.find((l) => l.layer_type === 'point')
  const pick = polygon ?? point ?? mineralLayers[0]
  return pick ? layerDisplayColor(pick) : '#E87722'
}

export default function FullMapPage() {
  const { hasPaidAccess, hasFullMapAccess, canSaveExplorations, mineralExploration, refreshUser } =
    useAuth()
  const queryClient = useQueryClient()
  const { m } = useTranslation()
  const displayName = useDisplayName()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [mineral, setMineral] = useState('')
  const [selectedResult, setSelectedResult] = useState<MineralSearchInsight | null>(null)
  const [searchPreview, setSearchPreview] = useState<AreaInsight | null>(null)
  const [searchPreviewLoading, setSearchPreviewLoading] = useState(false)
  const [mapFocus, setMapFocus] = useState<MapFocusTarget | null>(null)
  const [areaInsight, setAreaInsight] = useState<AreaInsight | null>(null)
  const [insightLoading, setInsightLoading] = useState(false)
  const [visibleLayers, setVisibleLayers] = useState<Set<number>>(new Set())
  const layerHeatmapSlugRef = useRef<string | null>(null)
  const layerHeatmapLayersKeyRef = useRef<string>('')
  const heatmapRequestRef = useRef(0)
  const layersBeforeExploreRef = useRef<Set<number> | null>(null)
  const [panelDismissed, setPanelDismissed] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assistantMapContext, setAssistantMapContext] = useState<TerraAssistantMapContext | null>(null)
  const [mapControls, setMapControls] = useState<MapControls | null>(null)
  const [boundaryVisibility, setBoundaryVisibility] = useState<BoundaryVisibility>(
    () => DEFAULT_BOUNDARY_VISIBILITY
  )
  const [adminFitBounds, setAdminFitBounds] = useState<AdminFitBounds | null>(null)
  const [boundaryFocus, setBoundaryFocus] = useState<BoundaryFocus | null>(null)
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE)
  const [catalogMineralSlug, setCatalogMineralSlug] = useState<string | null>(null)
  const [mineralHighlight, setMineralHighlight] = useState<MineralHighlightSpec | null>(null)
  const [mineralHeatmap, setMineralHeatmap] = useState<MineralHeatmapSpec | null>(null)
  const [searchParams] = useSearchParams()
  const mineralParamHandled = useRef(false)
  const isMobile = useMediaQuery('(max-width: 767px)')

  const [exploreOpen, setExploreOpen] = useState(false)

  // Draw-and-explore tool (paid users): manually enter/click points to form a
  // point, line, or polygon, then zoom to and explore the area.
  const [drawMode, setDrawMode] = useState<ExplorationMode>('point')
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([])
  const [coordinateSystem] = useCoordinateSystemState()
  const explorationDraw = useMemo(
    () => (drawPoints.length ? { mode: drawMode, points: drawPoints } : null),
    [drawMode, drawPoints]
  )
  const coordinateResult = useMemo(
    () => parseCoordinateQuery(debouncedSearch),
    [debouncedSearch]
  )

  const addDrawPoint = useCallback(
    (lng: number, lat: number) => {
      setDrawPoints((prev) =>
        drawMode === 'point' ? [[lng, lat]] : [...prev, [lng, lat]]
      )
    },
    [drawMode]
  )
  const removeDrawPoint = useCallback((index: number) => {
    setDrawPoints((prev) => prev.filter((_, i) => i !== index))
  }, [])
  const clearDraw = useCallback(() => setDrawPoints([]), [])
  const handleDrawModeChange = useCallback((next: ExplorationMode) => {
    setDrawMode(next)
    if (next === 'point') setDrawPoints((prev) => prev.slice(-1))
  }, [])

  const { data: savedExplorationsData } = useQuery({
    queryKey: ['saved-explorations'],
    queryFn: () => mapsApi.savedExplorations().then((r) => r.data),
    enabled: hasPaidAccess,
    staleTime: 5 * 60 * 1000,
  })
  const savedExplorations = savedExplorationsData?.results ?? []

  const [savingExploration, setSavingExploration] = useState(false)
  const handleSaveExploration = useCallback(async () => {
    if (!drawPoints.length) return
    const name = window.prompt('Name this exploration:')?.trim()
    if (!name) return
    setSavingExploration(true)
    try {
      await mapsApi.createSavedExploration({ name, mode: drawMode, points: drawPoints })
      await queryClient.invalidateQueries({ queryKey: ['saved-explorations'] })
    } finally {
      setSavingExploration(false)
    }
  }, [drawMode, drawPoints, queryClient])

  const handleDeleteExploration = useCallback(
    async (id: number) => {
      await mapsApi.deleteSavedExploration(id)
      await queryClient.invalidateQueries({ queryKey: ['saved-explorations'] })
    },
    [queryClient]
  )

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data: searchData, isFetching: searchLoading } = useQuery({
    queryKey: ['mineral-search-insights', debouncedSearch],
    queryFn: () => analyticsApi.searchInsights(debouncedSearch).then((r) => r.data),
    enabled: debouncedSearch.length >= 2,
  })

  const { data: mineralCatalogData } = useQuery({
    queryKey: ['mineral-catalog', countryCode],
    queryFn: () => analyticsApi.mineralCatalog(countryCode).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const mineralCatalog = mineralCatalogData?.minerals ?? []

  const loadMineralMapOverlay = useCallback(
    async (slug: string) => {
      if (!canExploreMineral(mineralExploration, slug)) {
        if (!hasPaidAccess) toast.error(m.map.mineralExplorationBlocked)
        return null
      }

      try {
        const coverageRes = await analyticsApi.mineralCoverage(slug, {
          country: countryCode,
          includeVillages: hasPaidAccess,
        })
        const quota = coverageRes.data.exploration_quota
        if (quota) void refreshUser()

        const data = coverageRes.data
        setMineralHighlight({
          slug: data.slug,
          color: data.color,
          regionIds: data.region_ids,
          districtIds: data.district_ids,
          villageIds: data.village_ids,
        })
        setBoundaryVisibility(DEFAULT_BOUNDARY_VISIBILITY)
        return data
      } catch (error: unknown) {
        const err = error as { response?: { status?: number; data?: { detail?: string } } }
        if (err.response?.status === 403) {
          toast.error(err.response.data?.detail || m.map.mineralExplorationBlocked)
          void refreshUser()
        }
        setMineralHighlight(null)
        return null
      }
    },
    [countryCode, hasPaidAccess, mineralExploration, m.map.mineralExplorationBlocked, refreshUser]
  )

  const applyCatalogMineral = useCallback(
    async (entry: MineralCatalogEntry | null) => {
      if (!entry) {
        setCatalogMineralSlug(null)
        setMineralHighlight(null)
        setMineralHeatmap(null)
        return
      }

      setCatalogMineralSlug(entry.slug)
      setBoundaryFocus(null)
      setSelectedResult(null)
      setMineral('')

      const data = await loadMineralMapOverlay(entry.slug)
      if (!data) {
        setCatalogMineralSlug(null)
        return
      }
      if (data.bounds) {
        setAdminFitBounds({ ...data.bounds, key: Date.now() })
      } else if (data.center) {
        setMapFocus({ lat: data.center.lat, lng: data.center.lng, zoom: 8, key: Date.now() })
      }
    },
    [loadMineralMapOverlay]
  )

  useEffect(() => {
    const slug = searchParams.get('mineral')
    if (!slug || mineralCatalog.length === 0) return
    if (mineralParamHandled.current && catalogMineralSlug === slug) return
    const entry = mineralCatalog.find((m) => m.slug === slug && m.is_mapped)
    if (!entry) return
    mineralParamHandled.current = true
    void applyCatalogMineral(entry)
  }, [searchParams, mineralCatalog, applyCatalogMineral, catalogMineralSlug])

  const { data: boundaryCountriesData } = useQuery({
    queryKey: ['countries-with-boundaries'],
    queryFn: () => geographyApi.countriesWithBoundaries().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const boundaryCountries = boundaryCountriesData ?? []

  const { data: tanzaniaFocusData } = useQuery({
    queryKey: ['country-focus', DEFAULT_COUNTRY_CODE],
    queryFn: () => geographyApi.countryFocus(DEFAULT_COUNTRY_CODE).then((r) => r.data),
    staleTime: 30 * 60 * 1000,
  })

  const mapCountryFocus = useMemo(
    () => resolveCountryFocus(DEFAULT_COUNTRY_CODE, tanzaniaFocusData, null),
    [tanzaniaFocusData]
  )

  useEffect(() => {
    if (boundaryCountries.length === 0) return
    const codes = new Set(boundaryCountries.map((c) => c.code.toUpperCase()))
    if (!codes.has(countryCode.toUpperCase())) {
      const next = codes.has(DEFAULT_COUNTRY_CODE)
        ? DEFAULT_COUNTRY_CODE
        : boundaryCountries[0].code
      setCountryCode(next)
      setBoundaryVisibility(DEFAULT_BOUNDARY_VISIBILITY)
    }
  }, [boundaryCountries, countryCode])

  const { data: boundariesData } = useQuery({
    queryKey: ['country-boundaries', countryCode, 'base'],
    queryFn: () => geographyApi.boundaries(countryCode, '0,1,2,3').then((r) => r.data),
    enabled: boundaryCountries.some((c) => c.code === countryCode),
    staleTime: 30 * 60 * 1000,
  })

  const { data: villageBoundaries, isFetching: villagesLoading, isError: villagesError } = useQuery({
    queryKey: ['country-boundaries', countryCode, 'villages'],
    queryFn: () => geographyApi.boundariesAllVillages(countryCode),
    enabled:
      boundaryVisibility.villages &&
      boundaryCountries.some((c) => c.code === countryCode),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  })

  const mergedBoundaries = useMemo(() => {
    const base = boundariesData?.features ?? []
    const villages = villageBoundaries?.features ?? []
    if (!base.length && !villages.length) return boundariesData ?? null
    return {
      type: 'FeatureCollection' as const,
      features: [...base, ...villages],
    }
  }, [boundariesData, villageBoundaries])

  useEffect(() => {
    if (!hasPaidAccess) {
      setBoundaryVisibility(UNPAID_BOUNDARY_VISIBILITY)
      return
    }
    if (!mergedBoundaries?.features?.length) return
    setBoundaryVisibility((prev) => {
      if (!boundaryVisibilityIsDefault(prev)) return prev
      return initialBoundaryVisibilityForGeoJson(mergedBoundaries)
    })
  }, [mergedBoundaries, hasPaidAccess])

  const handleCountryChange = useCallback(
    (code: string) => {
      setCountryCode(code.toUpperCase())
      setBoundaryVisibility(DEFAULT_BOUNDARY_VISIBILITY)
      setBoundaryFocus(null)
      setAdminFitBounds(null)
    },
    [],
  )

  const { data: layersData, isLoading, isFetching } = useQuery({
    queryKey: ['layers', hasPaidAccess ? mineral : '__all__'],
    queryFn: () =>
      mapsApi.layers(hasPaidAccess && mineral ? { mineral_slug: mineral } : {}).then((r) => r.data),
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  })

  const searchResults = searchData?.results || []
  const layers = layersData?.results || []

  const loadMineralHeatmapForCheckbox = useCallback(
    async (slug: string, nextVisible: Set<number>, requestId: number) => {
      if (!hasPaidAccess || !isHeatmapMineralSlug(slug)) return
      const visibleMineralLayers = visibleLayersForMineral(slug, layers, nextVisible)
      if (visibleMineralLayers.length === 0) {
        if (requestId === heatmapRequestRef.current) setMineralHeatmap(null)
        return
      }
      const layerIds = visibleMineralLayers.map((layer) => layer.id)
      const apiSlug = heatmapApiSlug(slug, visibleMineralLayers)
      const colorHex = resolveColorHex(mineralColorFromVisibleLayers(slug, layers, nextVisible))
      const minZ = Math.min(...visibleMineralLayers.map((layer) => layer.z_index))
      try {
        const { data } = await analyticsApi.mineralHeatmap(apiSlug, {
          country: countryCode,
          layerIds,
        })
        if (requestId !== heatmapRequestRef.current) return
        if (soleVisibleMineralSlug(nextVisible, layers) !== slug) {
          setMineralHeatmap(null)
          return
        }
        if (data?.points?.length) {
          setMineralHeatmap({
            slug,
            name: data.name,
            color: colorHex || resolveColorHex(data.color),
            points: data.points,
            zIndex: mineralHeatmapZIndex(minZ),
          })
        } else {
          layerHeatmapSlugRef.current = null
          layerHeatmapLayersKeyRef.current = ''
          setMineralHeatmap(null)
        }
      } catch (error: unknown) {
        if (requestId !== heatmapRequestRef.current) return
        const err = error as { response?: { status?: number; data?: { detail?: string } } }
        if (err.response?.status === 403) {
          toast.error(err.response.data?.detail || m.map.mineralExplorationBlocked)
        } else if (err.response?.status !== 404) {
          toast.error(m.map.mineralHeatmapFailed)
        }
        setMineralHeatmap(null)
      }
    },
    [countryCode, hasPaidAccess, layers, m.map.mineralExplorationBlocked, m.map.mineralHeatmapFailed]
  )

  const syncHeatmapFromVisibleLayers = useCallback(
    (nextVisible: Set<number>) => {
      if (!hasPaidAccess || exploreOpen || layers.length === 0) return

      const slug = soleVisibleMineralSlug(nextVisible, layers)
      const layersKey = slug ? visibleLayerIdsKey(slug, layers, nextVisible) : ''

      if (!isHeatmapMineralSlug(slug) || layersKey === '') {
        heatmapRequestRef.current += 1
        layerHeatmapSlugRef.current = null
        layerHeatmapLayersKeyRef.current = ''
        setMineralHeatmap(null)
        return
      }

      if (
        slug === layerHeatmapSlugRef.current &&
        layersKey === layerHeatmapLayersKeyRef.current
      ) {
        return
      }

      const requestId = ++heatmapRequestRef.current
      layerHeatmapSlugRef.current = slug
      layerHeatmapLayersKeyRef.current = layersKey
      void loadMineralHeatmapForCheckbox(slug, nextVisible, requestId)
    },
    [hasPaidAccess, exploreOpen, layers, loadMineralHeatmapForCheckbox]
  )

  const handleExploreOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        layersBeforeExploreRef.current = new Set(visibleLayers)
        setVisibleLayers(new Set())
        layerHeatmapSlugRef.current = null
        layerHeatmapLayersKeyRef.current = ''
        setMineralHeatmap(null)
        setMineralHighlight(null)
      } else {
        const restored = layersBeforeExploreRef.current
        if (restored) {
          setVisibleLayers(new Set(restored))
          syncHeatmapFromVisibleLayers(restored)
        }
        layersBeforeExploreRef.current = null
      }
      setExploreOpen(open)
    },
    [visibleLayers, syncHeatmapFromVisibleLayers]
  )

  const handleLoadExploration = useCallback(
    (mode: ExplorationMode, points: [number, number][]) => {
      setDrawMode(mode)
      setDrawPoints(points)
      handleExploreOpenChange(true)
    },
    [handleExploreOpenChange]
  )

  const showAssistantPanel =
    !panelDismissed && (assistantOpen || insightLoading || !!areaInsight)

  const showSearchPanel =
    !panelDismissed &&
    !assistantOpen &&
    (debouncedSearch.length >= 2 || !!selectedResult)

  const layerIdsKey = useMemo(
    () => layers.map((l) => l.id).sort((a, b) => a - b).join(','),
    [layers]
  )

  useEffect(() => {
    if (!layerIdsKey || exploreOpen || layers.length === 0) return
    setVisibleLayers(hasPaidAccess ? defaultVisibleLayerIds(layers) : allVisibleLayerIds(layers))
    layerHeatmapSlugRef.current = null
    layerHeatmapLayersKeyRef.current = ''
    setMineralHeatmap(null)
  }, [mineral, layerIdsKey, hasPaidAccess, exploreOpen])

  useEffect(() => {
    if (!hasPaidAccess || exploreOpen || !layerIdsKey || layers.length === 0) return
    syncHeatmapFromVisibleLayers(visibleLayers)
  }, [visibleLayers, layerIdsKey, hasPaidAccess, exploreOpen, layers.length, syncHeatmapFromVisibleLayers])

  const handleBoundaryVisibilityChange = useCallback((next: BoundaryVisibility) => {
    setBoundaryVisibility(next)
  }, [])

  const focusOn = useCallback((lat: number, lng: number, zoom = 11) => {
    setMapFocus((prev) => {
      if (
        prev &&
        Math.abs(prev.lat - lat) < 0.02 &&
        Math.abs(prev.lng - lng) < 0.02 &&
        prev.zoom === zoom
      ) {
        return prev
      }
      return { lat, lng, zoom, key: Date.now() }
    })
  }, [])

  const handleGoToCoordinate = useCallback(() => {
    if (!coordinateResult) return
    const { lat, lng } = coordinateResult
    // Mark the searched point on the map overlay.
    setDrawMode('point')
    setDrawPoints([[lng, lat]])
    setAdminFitBounds(null)
    setBoundaryFocus(null)
    focusOn(lat, lng, 13)
    // Collapse the search panel so the marked point is visible.
    setSearch('')
    setDebouncedSearch('')
    setPanelDismissed(true)
  }, [coordinateResult, focusOn])

  const handleExplore = useCallback(async () => {
    const draw = { mode: drawMode, points: drawPoints }
    if (!explorationReady(draw)) return
    const centroid = explorationCentroid(drawPoints)
    if (!centroid) return

    // Zoom/fit to the drawn geometry (not the containing admin boundary).
    setBoundaryFocus(null)
    const bounds = explorationBounds(drawPoints)
    if (drawMode !== 'point' && bounds && (bounds.east > bounds.west || bounds.north > bounds.south)) {
      const padLng = Math.max((bounds.east - bounds.west) * 0.15, 0.02)
      const padLat = Math.max((bounds.north - bounds.south) * 0.15, 0.02)
      setMapFocus(null)
      setAdminFitBounds({
        west: bounds.west - padLng,
        south: bounds.south - padLat,
        east: bounds.east + padLng,
        north: bounds.north + padLat,
        key: Date.now(),
      })
    } else {
      setAdminFitBounds(null)
      focusOn(centroid.lat, centroid.lng, 12)
    }

    // Run exploration insight at the centroid + open Ask Terra with that context.
    setPanelDismissed(false)
    setCatalogMineralSlug(null)
    setMineralHighlight(null)
    setMineralHeatmap(null)
    setInsightLoading(true)
    setAreaInsight(null)
    const label = `Exploration ${drawMode} (${drawPoints.length} pt${drawPoints.length === 1 ? '' : 's'})`
    setAssistantMapContext({
      lat: centroid.lat,
      lng: centroid.lng,
      zoom: 12,
      fromMapClick: true,
      countryCode: DEFAULT_COUNTRY_CODE,
      searchLabel: label,
    })
    setAssistantOpen(true)
    try {
      const { data } = await analyticsApi.areaInsights(centroid.lat, centroid.lng, 12, {
        country: DEFAULT_COUNTRY_CODE,
      })
      setAreaInsight(data)
    } catch {
      setAreaInsight(null)
    } finally {
      setInsightLoading(false)
    }
  }, [drawMode, drawPoints, focusOn])

  const handleAreaInspect = useCallback(
    async (lat: number, lng: number, zoom: number, featureIds?: number[]) => {
      setPanelDismissed(false)
      setInsightLoading(true)
      setCatalogMineralSlug(null)
      setMineralHighlight(null)
      setMineralHeatmap(null)

      let boundaryId: number | undefined
      let regionBoundaryName: string | undefined
      let districtBoundaryName: string | undefined
      let wardBoundaryName: string | undefined
      let villageBoundaryName: string | undefined

      try {
        const { data: at } = await geographyApi.boundariesAt(DEFAULT_COUNTRY_CODE, lat, lng)
        const focus = boundaryFocusFromAt(at)
        if (focus) {
          setBoundaryFocus(focus)
          setBoundaryVisibility(boundaryVisibilityForFocus(focus))
        } else {
          setBoundaryFocus(null)
        }
        const focusUnit = at.village || at.district || at.ward || at.region
        if (focusUnit?.bounds) {
          setAdminFitBounds({ ...focusUnit.bounds, key: Date.now() })
        }
        if (at.region) {
          regionBoundaryName = at.region.name
        }
        if (at.district) {
          districtBoundaryName = at.district.name
        }
        if (at.ward) {
          wardBoundaryName = at.ward.name
        }
        if (at.village) {
          villageBoundaryName = at.village.name
          boundaryId = at.village.id
        } else if (at.district) {
          boundaryId = at.district.id
        } else if (at.ward) {
          boundaryId = at.ward.id
        } else if (at.region) {
          boundaryId = at.region.id
        }
      } catch {
        /* boundary lookup optional */
      }

      setAssistantMapContext({
        lat,
        lng,
        zoom,
        featureIds,
        fromMapClick: true,
        countryCode: DEFAULT_COUNTRY_CODE,
        boundaryId,
        regionBoundaryName,
        districtBoundaryName,
        wardBoundaryName,
        villageBoundaryName,
      })
      setAssistantOpen(true)
      try {
        const { data } = await analyticsApi.areaInsights(lat, lng, zoom, {
          featureIds,
          country: DEFAULT_COUNTRY_CODE,
          boundaryId,
        })
        setAreaInsight(data)
      } catch {
        setAreaInsight(null)
      } finally {
        setInsightLoading(false)
      }
    },
    [hasPaidAccess],
  )

  const openAssistantPanel = useCallback(() => {
    setAssistantOpen(true)
    setPanelDismissed(false)
  }, [])

  const handleCloseAssistant = useCallback(() => {
    const fromMapClick = assistantMapContext?.fromMapClick
    setAssistantOpen(false)
    setAreaInsight(null)
    setAssistantMapContext(null)
    setInsightLoading(false)
    if (fromMapClick && !selectedResult) {
      setBoundaryFocus(null)
      setAdminFitBounds(null)
    }
    if (!debouncedSearch && !selectedResult) {
      setPanelDismissed(true)
    }
  }, [assistantMapContext, debouncedSearch, selectedResult])

  const toggleAssistantPanel = useCallback(() => {
    if (!panelDismissed && (assistantOpen || insightLoading || !!areaInsight)) {
      handleCloseAssistant()
      return
    }
    openAssistantPanel()
  }, [panelDismissed, assistantOpen, insightLoading, areaInsight, handleCloseAssistant, openAssistantPanel])

  const handleAskTerraAboutSearch = useCallback(
    async (item: MineralSearchInsight) => {
      setPanelDismissed(false)
      setAssistantOpen(true)
      setInsightLoading(true)
      setAreaInsight(null)

      const lat = item.center?.lat ?? -6.369
      const lng = item.center?.lng ?? 34.888
      const zoom = item.zoom ?? 9
      const searchLabel = displayName(item)

      setAssistantMapContext({
        lat,
        lng,
        zoom,
        mineralSlug: item.type === 'mineral' ? item.slug : undefined,
        regionId: item.type === 'region' ? item.id : undefined,
        boundaryId:
          item.type === 'region_boundary' ||
          item.type === 'district_boundary' ||
          item.type === 'ward_boundary' ||
          item.type === 'village_boundary'
            ? (item.boundary_id ?? item.id)
            : undefined,
        searchLabel,
      })

      if (item.center || item.bounds) {
        focusSearchResult(item, setAdminFitBounds, setMapFocus, focusOn)
      }

      try {
        const params = searchInsightParams(item)
        if (Object.keys(params).length > 0) {
          const { data } = await analyticsApi.searchContextInsights(params)
          setAreaInsight(data)
        }
      } catch {
        setAreaInsight(null)
      } finally {
        setInsightLoading(false)
      }
    },
    [displayName, focusOn, setAdminFitBounds, setMapFocus]
  )

  const loadSearchPreview = useCallback(async (item: MineralSearchInsight) => {
    const params = searchInsightParams(item)
    if (Object.keys(params).length === 0) {
      setSearchPreview(null)
      return
    }
    setSearchPreviewLoading(true)
    try {
      const { data } = await analyticsApi.searchContextInsights(params)
      setSearchPreview(data)
    } catch {
      setSearchPreview(null)
    } finally {
      setSearchPreviewLoading(false)
    }
  }, [])

  const handleSelectResult = useCallback((item: MineralSearchInsight) => {
    setPanelDismissed(false)
    setCatalogMineralSlug(null)
    setMineralHighlight(null)
    setMineralHeatmap(null)
    setSelectedResult(item)
    setSearch('')
    setDebouncedSearch('')
    setAreaInsight(null)
    setAssistantOpen(false)
    setAssistantMapContext(null)
    setSearchPreview(null)
    void loadSearchPreview(item)

    if (isRegionSearchResult(item)) {
      setMineral('')
      const focus = resolveBoundaryFocus(item, mergedBoundaries)
      if (focus) {
        setBoundaryFocus(focus)
        setBoundaryVisibility(boundaryVisibilityForFocus(focus))
      } else {
        setBoundaryFocus(null)
      }
    } else if (item.type === 'layer') {
      if (hasPaidAccess) {
        setMineral('')
        setVisibleLayers(new Set([item.id]))
      }
      setBoundaryFocus(null)
      void loadMineralMapOverlay(item.slug)
    } else {
      if (hasPaidAccess) {
        setMineral(item.slug)
      }
      setBoundaryFocus(null)
      void loadMineralMapOverlay(item.slug)
    }

    if (item.center || item.bounds) {
      focusSearchResult(item, setAdminFitBounds, setMapFocus, focusOn)
    }
  }, [mergedBoundaries, focusOn, loadSearchPreview, hasPaidAccess, loadMineralMapOverlay])

  useEffect(() => {
    if (debouncedSearch.length < 2 || searchLoading || searchResults.length !== 1) return
    const item = searchResults[0]
    const q = debouncedSearch.toLowerCase()
    const name = item.name.toLowerCase()
    const nameSw = item.name_sw?.toLowerCase() ?? ''
    if (name === q || name.startsWith(q) || nameSw.startsWith(q)) {
      handleSelectResult(item)
    }
  }, [debouncedSearch, searchLoading, searchResults, handleSelectResult])

  const handleClearFilter = () => {
    setMineral('')
    setCatalogMineralSlug(null)
    setMineralHighlight(null)
    setMineralHeatmap(null)
    setSelectedResult(null)
    setSearchPreview(null)
    setSearchPreviewLoading(false)
    setMapFocus(null)
    setAdminFitBounds(null)
    setBoundaryFocus(null)
    setPanelDismissed(false)
    setAssistantOpen(false)
    setAreaInsight(null)
    setAssistantMapContext(null)
  }

  const handleClosePanel = () => {
    setAssistantOpen(false)
    setPanelDismissed(true)
    setSearch('')
    setDebouncedSearch('')
    setMineral('')
    setSelectedResult(null)
    setSearchPreview(null)
    setSearchPreviewLoading(false)
    setAreaInsight(null)
    setMapFocus(null)
    setAdminFitBounds(null)
    setBoundaryFocus(null)
    setAssistantMapContext(null)
  }

  const handleClearBoundaryFocus = useCallback(() => {
    setBoundaryFocus(null)
    setAdminFitBounds(null)
    setBoundaryVisibility(DEFAULT_BOUNDARY_VISIBILITY)
  }, [])

  const handleViewReset = useCallback(() => {
    setMapFocus(null)
    setAdminFitBounds(null)
    setBoundaryFocus(null)
  }, [])

  const askTerraFromSearch = insightLoading && assistantOpen && !!assistantMapContext?.searchLabel

  const toggleLayer = (id: number) => {
    if (!hasPaidAccess) return
    setVisibleLayers((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleLayerType = (type: string, visible: boolean) => {
    if (!hasPaidAccess) return
    setVisibleLayers((prev) => {
      const next = new Set(prev)
      for (const layer of layers) {
        if (layer.layer_type === type) {
          if (visible) next.add(layer.id)
          else next.delete(layer.id)
        }
      }
      return next
    })
  }

  const initialLoad = isLoading && layers.length === 0

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 overflow-hidden relative">
      {showSearchPanel && (
        <>
          <button
            type="button"
            aria-label={m.map.closePanel}
            className="fixed inset-0 z-30 bg-black/25 sm:hidden"
            onClick={handleClosePanel}
          />
          <MapSidebar
            debouncedSearch={debouncedSearch}
            searchResults={searchResults}
            searchLoading={searchLoading}
            selectedMineral={selectedResult}
            mineralFilter={mineral}
            previewInsight={searchPreview}
            previewLoading={searchPreviewLoading}
            hasPaidAccess={hasPaidAccess}
            onSelectMineral={handleSelectResult}
            onClearFilter={handleClearFilter}
            onAskTerra={handleAskTerraAboutSearch}
            askTerraLoading={askTerraFromSearch}
            isMobile={isMobile}
            onClose={handleClosePanel}
            coordinateResult={coordinateResult}
            onGoToCoordinate={handleGoToCoordinate}
          />
        </>
      )}

      <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col">
        <MapSearchBar
          search={search}
          onSearchChange={(v) => {
            setSearch(v)
            if (v.trim().length >= 2) setPanelDismissed(false)
          }}
          exploreEnabled={hasPaidAccess}
          exploreOpen={exploreOpen}
          onExploreOpenChange={handleExploreOpenChange}
          explorePanel={
            <ExploreDrawTool
              mode={drawMode}
              points={drawPoints}
              coordinateSystem={coordinateSystem}
              canExplore={explorationReady({ mode: drawMode, points: drawPoints })}
              canSave={canSaveExplorations}
              saving={savingExploration}
              savedExplorations={savedExplorations}
              onModeChange={handleDrawModeChange}
              onAddPoint={addDrawPoint}
              onRemovePoint={removeDrawPoint}
              onClear={clearDraw}
              onExplore={handleExplore}
              onSave={handleSaveExploration}
              onLoad={handleLoadExploration}
              onDelete={handleDeleteExploration}
              onClose={() => handleExploreOpenChange(false)}
              embedded
            />
          }
        />

        {selectedResult && panelDismissed && (
          <div className="absolute top-[4.25rem] left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 map-chrome rounded-full text-sm">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: selectedResult.color }}
            />
            <span className="map-text-secondary font-medium">{displayName(selectedResult)}</span>
            {selectedResult.type === 'region' && (
              <span className="map-text-muted text-xs">({m.map.region})</span>
            )}
            <button
              type="button"
              onClick={handleClearFilter}
              className="map-text-muted hover:text-app-secondary ml-1"
              aria-label={m.map.showAllMinerals}
            >
              ×
            </button>
          </div>
        )}

        {initialLoad ? (
          <div className="h-full flex items-center justify-center bg-slate-100">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-terra-600 border-t-transparent" />
          </div>
        ) : (
          <MapViewer
            layers={layers}
            visibleLayers={visibleLayers}
            onToggleLayer={toggleLayer}
            onToggleLayerType={toggleLayerType}
            showLayerPanel
            showWatermark={!hasFullMapAccess}
            fullScreen
            className="h-full w-full"
            mapFocus={mapFocus}
            countryFocus={mapCountryFocus}
            countries={boundaryCountries}
            countryCode={countryCode}
            onCountryChange={handleCountryChange}
            boundariesGeoJson={boundariesData ?? null}
            villagesGeoJson={villageBoundaries ?? null}
            boundaryVisibility={boundaryVisibility}
            onBoundaryVisibilityChange={handleBoundaryVisibilityChange}
            boundaryFocus={boundaryFocus}
            onClearBoundaryFocus={handleClearBoundaryFocus}
            villagesLoading={villagesLoading}
            villagesError={villagesError}
            adminFitBounds={adminFitBounds}
            onMapControlsReady={setMapControls}
            onViewReset={handleViewReset}
            onAreaInspect={handleAreaInspect}
            staticMap={!hasPaidAccess}
            mineralHighlight={mineralHighlight}
            mineralHeatmap={mineralHeatmap}
            assistantOpen={assistantOpen}
            onAssistantToggle={toggleAssistantPanel}
            onAssistantClose={handleCloseAssistant}
            areaInsight={areaInsight}
            insightLoading={insightLoading}
            hasPaidAccess={hasPaidAccess}
            assistantMapContext={assistantMapContext}
            getMapSnapshot={mapControls?.captureSnapshot}
            showCoordinateSystem={false}
            showCoordinateReadout
            explorationDraw={explorationDraw}
            drawActive={exploreOpen && hasPaidAccess}
            onDrawPoint={addDrawPoint}
          />
        )}
        {isFetching && !initialLoad && (
          <div className="absolute top-16 right-3 z-20 h-6 w-6 animate-spin rounded-full border-2 border-terra-600 border-t-transparent bg-white/80" />
        )}

        <div className="pointer-events-none fixed right-3 z-50 flex flex-col items-end gap-2 max-md:bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:bottom-6">
          {!isMobile && mapControls && (
            <MapZoomControls
              onZoomIn={mapControls.zoomIn}
              onZoomOut={mapControls.zoomOut}
              onResetView={mapControls.resetView}
            />
          )}
          {!isMobile && (
            <TerraAssistantLauncher
              open={showAssistantPanel}
              onToggle={toggleAssistantPanel}
              onClose={handleCloseAssistant}
              areaInsight={areaInsight}
              insightLoading={insightLoading}
              hasPaidAccess={hasPaidAccess}
              mapContext={assistantMapContext}
              getMapSnapshot={mapControls?.captureSnapshot}
            />
          )}
        </div>
      </div>
    </div>
  )
}
