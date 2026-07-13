import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { analyticsApi, fetchAllMapLayers, geographyApi, mapsApi } from '../api'
import MapViewer, {
  type AdminFitBounds,
  type AnalysisZoneSpec,
  type MapControls,
  type MapFocusTarget,
} from '../components/map/MapViewer'
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
  isInspectableMapClick,
  resolveBoundaryFocus,
  type BoundaryFocus,
} from '../components/map/boundaryFocus'
import {
  DEFAULT_COUNTRY_CODE,
  resolveCountryFocus,
} from '../components/map/countryFocus'
import MapSidebar from '../components/map/MapSidebar'
import MapSearchBar from '../components/map/MapSearchBar'
import MapCaptureGuard from '../components/map/MapCaptureGuard'
import TerraAssistantLauncher from '../components/map/TerraAssistantLauncher'
import ExploreDrawTool from '../components/map/ExploreDrawTool'
import {
  explorationCentroid,
  explorationReady,
  geometryFromDraw,
  paddedExplorationFitBounds,
  type DrawGeometry,
  type ExplorationMode,
} from '../components/map/explorationGeometry'
import { useCoordinateSystemState } from '../components/map/useCoordinateSystemState'
import { useCoordinateFormatState } from '../components/map/useCoordinateFormatState'
import { parseCoordinateQuery } from '../components/map/parseCoordinate'
import type { TerraAssistantMapContext } from '../components/assistant/TerraAssistantPanel'
import {
  type BasemapId,
  isTerrainVisualBasemap,
} from '../components/map/basemaps'
import { compressSnapshotForExport } from '../components/map/snapshotCompress'
import { useMapEntitlements } from '../hooks/useMapEntitlements'
import { toast } from '../components/ui/toast'
import InputDialog from '../components/ui/InputDialog'
import { canExploreMineral } from '../lib/mineralExploration'
import { useTranslation } from '../i18n/LocaleContext'
import { useDisplayName } from '../i18n/useDisplayName'
import type { AreaInsight, MapLayer, MineralCatalogEntry, MineralHighlightSpec, MineralSearchInsight } from '../types'
import type { MineralHeatmapSpec } from '../components/map/mineralHeatmapLayer'
import { mineralHeatmapZIndex } from '../components/map/mineralHeatmapLayer'
import { useMediaQuery } from '../hooks/useMediaQuery'
import {
  LANDING_MAP_LAYER_BATCH,
  LANDING_MAP_LAYER_ROTATION_MS,
  defaultVisibleLayerIds,
  pickRandomVisibleLayerIds,
} from '../components/map/mapUtils'
import { layersForCatalogSlug } from '../components/map/catalogMineralLayers'
import { layerDisplayColor } from '../components/admin/layerColors'
import { resolveColorHex } from '../lib/mineralColorUtils'
import { mineralHeatmapQueryOptions } from '../lib/mineralHeatmapQuery'

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
  return layersForHeatmapSlug(slug, layerList).filter((layer) => visible.has(layer.id))
}

function layersForHeatmapSlug(slug: string, layerList: MapLayer[]): MapLayer[] {
  const catalogMatches = layersForCatalogSlug(slug, layerList)
  if (catalogMatches.length) return catalogMatches
  return layerList.filter((layer) => layerHeatmapGroupKey(layer) === slug)
}

function visibleLayerIdsForCatalogSlug(catalogSlug: string, layerList: MapLayer[]): Set<number> {
  const catalogLayers = layersForCatalogSlug(catalogSlug, layerList)
  if (catalogLayers.length) {
    return new Set(catalogLayers.map((layer) => layer.id))
  }
  return new Set(
    layerList.filter((layer) => layer.mineral_slug === catalogSlug).map((layer) => layer.id),
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
  const { hasFullMapAccess, canSaveExplorations, mineralExploration, refreshUser } =
    useMapEntitlements()
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
  const catalogMineralSlugRef = useRef<string | null>(null)
  const layersBeforeExploreRef = useRef<Set<number> | null>(null)
  const [panelDismissed, setPanelDismissed] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assistantMapContext, setAssistantMapContext] = useState<TerraAssistantMapContext | null>(null)
  const [mapBasemap, setMapBasemap] = useState<BasemapId>('light')
  const [mapControls, setMapControls] = useState<MapControls | null>(null)
  const mapControlsRef = useRef<MapControls | null>(null)
  const handleMapControlsReady = useCallback((controls: MapControls) => {
    mapControlsRef.current = controls
    setMapControls((prev) => prev ?? controls)
  }, [])
  const [boundaryVisibility, setBoundaryVisibility] = useState<BoundaryVisibility>(
    () => UNPAID_BOUNDARY_VISIBILITY
  )
  const [adminFitBounds, setAdminFitBounds] = useState<AdminFitBounds | null>(null)
  const [boundaryFocus, setBoundaryFocus] = useState<BoundaryFocus | null>(null)
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE)
  const [catalogMineralSlug, setCatalogMineralSlug] = useState<string | null>(null)
  catalogMineralSlugRef.current = catalogMineralSlug
  const [mineralHighlight, setMineralHighlight] = useState<MineralHighlightSpec | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const isMobile = useMediaQuery('(max-width: 767px)')

  const [exploreOpen, setExploreOpen] = useState(false)

  // Draw-and-explore tool (paid users): manually enter/click points to form a
  // point, line, or polygon, then zoom to and explore the area.
  const [drawMode, setDrawMode] = useState<ExplorationMode>('point')
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([])
  const [coordinateSystem] = useCoordinateSystemState(countryCode)
  const [coordinateFormat] = useCoordinateFormatState()
  const explorationDraw = useMemo(
    () => (drawPoints.length ? { mode: drawMode, points: drawPoints } : null),
    [drawMode, drawPoints]
  )
  const [insightExplorationGeometry, setInsightExplorationGeometry] = useState<
    DrawGeometry | undefined
  >()
  const activeExplorationGeometry = useMemo((): DrawGeometry | undefined => {
    if (!explorationDraw || !explorationReady(explorationDraw)) return undefined
    return geometryFromDraw(explorationDraw)
  }, [explorationDraw])
  const coordinateResult = useMemo(
    () => (hasFullMapAccess ? parseCoordinateQuery(debouncedSearch) : null),
    [debouncedSearch, hasFullMapAccess]
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
  const clearDraw = useCallback(() => {
    setDrawPoints([])
    setInsightExplorationGeometry(undefined)
  }, [])
  const handleDrawModeChange = useCallback((next: ExplorationMode) => {
    setDrawMode(next)
    if (next === 'point') setDrawPoints((prev) => prev.slice(-1))
  }, [])

  const { data: savedExplorations = [] } = useQuery({
    queryKey: ['saved-explorations'],
    queryFn: () => mapsApi.savedExplorations(),
    enabled: hasFullMapAccess,
    staleTime: 5 * 60 * 1000,
  })

  const [savingExploration, setSavingExploration] = useState(false)
  const [saveExplorationOpen, setSaveExplorationOpen] = useState(false)

  const handleSaveExploration = useCallback(() => {
    if (!drawPoints.length) return
    setSaveExplorationOpen(true)
  }, [drawPoints.length])

  const confirmSaveExploration = useCallback(
    async (name: string) => {
      setSaveExplorationOpen(false)
      setSavingExploration(true)
      try {
        await mapsApi.createSavedExploration({ name, mode: drawMode, points: drawPoints })
        await queryClient.invalidateQueries({ queryKey: ['saved-explorations'] })
        toast.success('Exploration saved', { description: name })
      } catch {
        toast.error('Could not save exploration')
      } finally {
        setSavingExploration(false)
      }
    },
    [drawMode, drawPoints, queryClient],
  )

  const handleDeleteExploration = useCallback(
    (id: number) => {
      const item = savedExplorations.find((s) => s.id === id)
      toast.confirm(`Delete "${item?.name ?? 'this exploration'}"?`, {
        description: 'This cannot be undone.',
        confirmLabel: 'Delete',
        destructive: true,
        onConfirm: async () => {
          try {
            await mapsApi.deleteSavedExploration(id)
            await queryClient.invalidateQueries({ queryKey: ['saved-explorations'] })
            toast.success('Exploration deleted')
          } catch {
            toast.error('Could not delete exploration')
          }
        },
      })
    },
    [savedExplorations, queryClient],
  )

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (hasFullMapAccess) return
    setSearch('')
    setDebouncedSearch('')
    setSelectedResult(null)
    setSearchPreview(null)
    setSearchPreviewLoading(false)
  }, [hasFullMapAccess])

  const { data: searchData, isFetching: searchLoading } = useQuery({
    queryKey: ['mineral-search-insights', debouncedSearch],
    queryFn: () => analyticsApi.searchInsights(debouncedSearch).then((r) => r.data),
    enabled: hasFullMapAccess && debouncedSearch.length >= 2,
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
        if (!hasFullMapAccess) toast.error(m.map.mineralExplorationBlocked)
        return null
      }

      try {
        const coverageRes = await analyticsApi.mineralCoverage(slug, {
          country: countryCode,
          includeVillages: hasFullMapAccess,
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
        // Leave regions/districts/villages for the user to toggle — do not auto-enable.
        return data
      } catch (error: unknown) {
        const err = error as {
          response?: { status?: number; data?: { detail?: string } }
          code?: string
          message?: string
        }
        if (err.response?.status === 403) {
          toast.error(err.response.data?.detail || m.map.mineralExplorationBlocked)
          void refreshUser()
        } else if (!err.response) {
          console.warn('Mineral coverage request failed:', err.message || err.code)
        }
        setMineralHighlight(null)
        return null
      }
    },
    [countryCode, hasFullMapAccess, mineralExploration, m.map.mineralExplorationBlocked, refreshUser]
  )

  const applyCatalogMineral = useCallback(
    async (entry: MineralCatalogEntry | null) => {
      if (!entry || !hasFullMapAccess) {
        setCatalogMineralSlug(null)
        setMineral('')
        setMineralHighlight(null)
        setAdminFitBounds(null)
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev)
            next.delete('mineral')
            return next
          },
          { replace: true },
        )
        return
      }

      setCatalogMineralSlug(entry.slug)
      setBoundaryFocus(null)
      setSelectedResult(null)
      setMineral(entry.slug)
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('mineral', entry.slug)
          return next
        },
        { replace: true },
      )

      void loadMineralMapOverlay(entry.slug)
      void queryClient.prefetchQuery(
        mineralHeatmapQueryOptions({ slug: entry.slug, countryCode, layerIds: undefined }),
      )
    },
    [hasFullMapAccess, loadMineralMapOverlay, setSearchParams, queryClient, countryCode],
  )

  useEffect(() => {
    const slug = searchParams.get('mineral')
    if (!hasFullMapAccess) {
      if (slug || catalogMineralSlug) {
        void applyCatalogMineral(null)
      }
      return
    }
    if (!slug) {
      if (catalogMineralSlug) {
        void applyCatalogMineral(null)
      }
      return
    }
    if (mineralCatalog.length === 0) return
    const entry = mineralCatalog.find((m) => m.slug === slug && m.is_mapped)
    if (!entry) return
    if (catalogMineralSlug === slug) return
    void applyCatalogMineral(entry)
  }, [hasFullMapAccess, searchParams, mineralCatalog, applyCatalogMineral, catalogMineralSlug])

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
      setBoundaryVisibility(hasFullMapAccess ? DEFAULT_BOUNDARY_VISIBILITY : UNPAID_BOUNDARY_VISIBILITY)
    }
  }, [boundaryCountries, countryCode, hasFullMapAccess])

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
    if (!hasFullMapAccess) {
      setBoundaryVisibility(UNPAID_BOUNDARY_VISIBILITY)
      return
    }
    if (!mergedBoundaries?.features?.length) return
    setBoundaryVisibility((prev) => {
      if (!boundaryVisibilityIsDefault(prev)) return prev
      return initialBoundaryVisibilityForGeoJson(mergedBoundaries)
    })
  }, [mergedBoundaries, hasFullMapAccess])

  const handleCountryChange = useCallback(
    (code: string) => {
      setCountryCode(code.toUpperCase())
      setBoundaryVisibility(hasFullMapAccess ? DEFAULT_BOUNDARY_VISIBILITY : UNPAID_BOUNDARY_VISIBILITY)
      setBoundaryFocus(null)
      setAdminFitBounds(null)
    },
    [hasFullMapAccess],
  )

  const layersAccessKey = hasFullMapAccess ? 'full' : 'preview'
  const layersMineralKey =
    hasFullMapAccess && mineral && !catalogMineralSlug ? mineral : '__all__'

  const { data: layersList = [], isLoading, isFetching } = useQuery({
    queryKey: ['layers', layersAccessKey, layersMineralKey],
    queryFn: () =>
      fetchAllMapLayers(
        hasFullMapAccess && mineral && !catalogMineralSlug ? { mineral_slug: mineral } : {},
      ),
    staleTime: 5 * 60 * 1000,
  })

  const searchResults = searchData?.results || []
  const layers = useMemo(() => {
    // Defense in depth: unpaid map/legend only show admin-selected free-map layers.
    if (hasFullMapAccess) return layersList
    return layersList.filter((layer) => layer.is_preview)
  }, [layersList, hasFullMapAccess])

  const activeHeatmapSlug = useMemo(() => {
    if (!hasFullMapAccess || exploreOpen) return null
    const slug = catalogMineralSlug ?? soleVisibleMineralSlug(visibleLayers, layers)
    return isHeatmapMineralSlug(slug) ? slug : null
  }, [hasFullMapAccess, exploreOpen, catalogMineralSlug, visibleLayers, layers])

  const heatmapLayerList = useMemo(
    () => (activeHeatmapSlug ? layersForHeatmapSlug(activeHeatmapSlug, layers) : []),
    [activeHeatmapSlug, layers],
  )

  const heatmapQueryInput = useMemo(() => {
    if (!activeHeatmapSlug) return null
    const useAllLayers = !!catalogMineralSlug
    return {
      slug: activeHeatmapSlug,
      countryCode,
      layerIds: useAllLayers ? undefined : heatmapLayerList.map((layer) => layer.id),
      apiSlug: heatmapApiSlug(activeHeatmapSlug, heatmapLayerList),
    }
  }, [activeHeatmapSlug, countryCode, catalogMineralSlug, heatmapLayerList])

  const {
    data: heatmapPayload,
    isFetching: heatmapFetching,
    error: heatmapError,
  } = useQuery({
    ...mineralHeatmapQueryOptions(heatmapQueryInput ?? { slug: '', countryCode }),
    enabled: !!heatmapQueryInput && heatmapLayerList.length > 0,
  })

  useEffect(() => {
    if (!hasFullMapAccess || !countryCode || mineralCatalog.length === 0) return

    const prefetch = (slug: string) => {
      void queryClient.prefetchQuery(
        mineralHeatmapQueryOptions({ slug, countryCode, layerIds: undefined }),
      )
    }

    if (activeHeatmapSlug) prefetch(activeHeatmapSlug)

    const scheduleIdle =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback
        : (cb: IdleRequestCallback) => window.setTimeout(() => cb({ didTimeout: true, timeRemaining: () => 0 } as IdleDeadline), 120)

    const idleId = scheduleIdle(() => {
      for (const entry of mineralCatalog) {
        if (!entry.is_mapped || entry.slug === GENERAL_MINERAL_SLUG) continue
        if (entry.slug === activeHeatmapSlug) continue
        prefetch(entry.slug)
      }
    })

    return () => {
      if (typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId)
      } else {
        window.clearTimeout(idleId)
      }
    }
  }, [hasFullMapAccess, countryCode, mineralCatalog, activeHeatmapSlug, queryClient])

  const mineralHeatmap = useMemo((): MineralHeatmapSpec | null => {
    if (!activeHeatmapSlug || !heatmapPayload || heatmapPayload.slug !== activeHeatmapSlug) {
      return null
    }
    const { data } = heatmapPayload
    if (!data?.points?.length) return null
    const visibleIds = new Set(heatmapLayerList.map((layer) => layer.id))
    const colorHex = resolveColorHex(
      mineralColorFromVisibleLayers(activeHeatmapSlug, layers, visibleIds),
    )
    const minZ = Math.min(...heatmapLayerList.map((layer) => layer.z_index))
    return {
      slug: activeHeatmapSlug,
      name: data.name,
      color: colorHex || resolveColorHex(data.color),
      points: data.points,
      contours: data.contours,
      concentrationStats: data.concentration_stats,
      weightLegend: data.weight_legend,
      zIndex: mineralHeatmapZIndex(minZ),
    }
  }, [activeHeatmapSlug, heatmapPayload, heatmapLayerList, layers])

  const heatmapLoading = heatmapFetching && !mineralHeatmap

  useEffect(() => {
    if (!heatmapError) return
    const err = heatmapError as {
      response?: { status?: number; data?: { detail?: string } }
    }
    if (err.response?.status === 403) {
      toast.error(err.response.data?.detail || m.map.mineralExplorationBlocked)
      void refreshUser()
    } else if (err.response?.status !== 404) {
      toast.error(m.map.mineralHeatmapFailed)
    }
  }, [heatmapError, m.map.mineralExplorationBlocked, m.map.mineralHeatmapFailed, refreshUser])

  const handleExploreOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        layersBeforeExploreRef.current = new Set(visibleLayers)
        setVisibleLayers(new Set())
        setMineralHighlight(null)
      } else {
        const restored = layersBeforeExploreRef.current
        if (restored) {
          setVisibleLayers(new Set(restored))
        }
        layersBeforeExploreRef.current = null
      }
      setExploreOpen(open)
    },
    [visibleLayers]
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
    hasFullMapAccess &&
    !panelDismissed &&
    !assistantOpen &&
    (debouncedSearch.length >= 2 || !!selectedResult)

  const layerIdsKey = useMemo(
    () => layers.map((l) => l.id).sort((a, b) => a - b).join(','),
    [layers]
  )

  useEffect(() => {
    if (!layerIdsKey || exploreOpen || layers.length === 0) return
    if (catalogMineralSlug) {
      const nextVisible = visibleLayerIdsForCatalogSlug(catalogMineralSlug, layers)
      if (nextVisible.size > 0) {
        setVisibleLayers(nextVisible)
        return
      }
    }
    // Paid: all layers on. Free landing map: random batch of ~10 (rotated below).
    setVisibleLayers(
      hasFullMapAccess
        ? defaultVisibleLayerIds(layers)
        : pickRandomVisibleLayerIds(layers, LANDING_MAP_LAYER_BATCH),
    )
  }, [mineral, layerIdsKey, hasFullMapAccess, exploreOpen, catalogMineralSlug, layers])

  useEffect(() => {
    if (hasFullMapAccess || exploreOpen || catalogMineralSlug) return
    if (layers.length <= LANDING_MAP_LAYER_BATCH) return

    const timer = window.setInterval(() => {
      setVisibleLayers((prev) =>
        pickRandomVisibleLayerIds(layers, LANDING_MAP_LAYER_BATCH, prev),
      )
    }, LANDING_MAP_LAYER_ROTATION_MS)

    return () => window.clearInterval(timer)
  }, [hasFullMapAccess, exploreOpen, catalogMineralSlug, layerIdsKey, layers])

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

  const zoomToExplorationSelection = useCallback(() => {
    const fit = paddedExplorationFitBounds(drawPoints, drawMode)
    if (fit) {
      setBoundaryFocus(null)
      setMapFocus(null)
      setAdminFitBounds({ ...fit, key: Date.now() })
      return
    }
    const centroid = explorationCentroid(drawPoints)
    if (centroid) {
      setAdminFitBounds(null)
      focusOn(centroid.lat, centroid.lng, 12)
    }
  }, [drawMode, drawPoints, focusOn])

  useEffect(() => {
    if (!exploreOpen || !explorationReady({ mode: drawMode, points: drawPoints })) return
    zoomToExplorationSelection()
  }, [exploreOpen, drawMode, drawPoints, zoomToExplorationSelection])

  const mapAnalysisZone = useMemo((): AnalysisZoneSpec | null => {
    if (!areaInsight || !assistantMapContext?.fromMapClick || insightExplorationGeometry) return null
    if (assistantMapContext.insideAdminBoundaries === false) return null
    const km2 = areaInsight.aerial?.analysis_area_km2
    if (!km2 || km2 <= 0) return null
    const hitFeature = (assistantMapContext.featureIds?.length ?? 0) > 0
    return {
      lat: areaInsight.lat,
      lng: areaInsight.lng,
      areaKm2: km2,
      extended: areaInsight.aerial?.using_extended_area === true,
      // Feature hits (points/polygons) stay centered on the click, not zoomed to the full zone.
      focusMode: hitFeature ? 'point' : 'zone',
    }
  }, [areaInsight, assistantMapContext?.fromMapClick, assistantMapContext?.featureIds, insightExplorationGeometry])

  useEffect(() => {
    if (!areaInsight?.minerals?.length || layers.length === 0) return
    setVisibleLayers((prev) => {
      const next = new Set(prev)
      let changed = false
      for (const mineral of areaInsight.minerals) {
        for (const layer of layers) {
          const matches =
            layer.slug === mineral.slug ||
            (layer.mineral_slug && layer.mineral_slug === mineral.slug)
          if (matches && !next.has(layer.id)) {
            next.add(layer.id)
            changed = true
          }
        }
      }
      return changed ? next : prev
    })
  }, [areaInsight, layers])

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

  const captureInsightMapSnapshot = useCallback(async (): Promise<string | undefined> => {
    if (!isTerrainVisualBasemap(mapBasemap) || !mapControlsRef.current?.captureMapFrame) return undefined
    try {
      const raw = await mapControlsRef.current.captureMapFrame()
      if (!raw) return undefined
      return compressSnapshotForExport(raw, 768, 0.7)
    } catch {
      return undefined
    }
  }, [mapBasemap])

  const fetchAreaInsight = useCallback(
    async (params: {
      lat: number
      lng: number
      zoom: number
      featureIds?: number[]
      boundaryId?: number
      explorationGeometry?: DrawGeometry
      visibleLayerIds?: number[]
    }) => {
      const mapSnapshot = await captureInsightMapSnapshot()
      const { data } = await analyticsApi.areaInsights(params.lat, params.lng, params.zoom, {
        featureIds: params.featureIds,
        visibleLayerIds: params.visibleLayerIds,
        country: DEFAULT_COUNTRY_CODE,
        boundaryId: params.boundaryId,
        explorationGeometry: params.explorationGeometry,
        basemap: mapBasemap,
        mapSnapshot,
      })
      return data
    },
    [captureInsightMapSnapshot, mapBasemap],
  )

  const handleRefreshInsight = useCallback(async () => {
    if (!assistantMapContext?.fromMapClick) return
    setInsightLoading(true)
    try {
      const data = await fetchAreaInsight({
        lat: assistantMapContext.lat,
        lng: assistantMapContext.lng,
        zoom: assistantMapContext.zoom,
        featureIds: assistantMapContext.featureIds,
        boundaryId: assistantMapContext.boundaryId,
        explorationGeometry: assistantMapContext.explorationGeometry,
        visibleLayerIds: assistantMapContext.visibleLayerIds,
      })
      setAreaInsight(data)
      setAssistantMapContext((prev) =>
        prev
          ? {
              ...prev,
              basemap: mapBasemap,
              visibleLayerIds: [...visibleLayers],
            }
          : prev,
      )
    } catch {
      setAreaInsight(null)
    } finally {
      setInsightLoading(false)
    }
  }, [assistantMapContext, fetchAreaInsight, mapBasemap, visibleLayers])

  const handleExplore = useCallback(async () => {
    const draw = { mode: drawMode, points: drawPoints }
    if (!explorationReady(draw)) return
    const centroid = explorationCentroid(drawPoints)
    if (!centroid) return

    // Zoom/fit to the drawn geometry (not the containing admin boundary).
    zoomToExplorationSelection()

    // Run exploration insight at the centroid + open Ask Terra with that context.
    setInsightExplorationGeometry(activeExplorationGeometry)
    setPanelDismissed(false)
    setCatalogMineralSlug(null)
    setMineralHighlight(null)
    setInsightLoading(true)
    setAreaInsight(null)
    const label = `Exploration ${drawMode} (${drawPoints.length} pt${drawPoints.length === 1 ? '' : 's'})`
    const visibleLayerIds = [...visibleLayers]
    setAssistantMapContext({
      lat: centroid.lat,
      lng: centroid.lng,
      zoom: 12,
      fromMapClick: true,
      countryCode: DEFAULT_COUNTRY_CODE,
      searchLabel: label,
      explorationGeometry: activeExplorationGeometry,
      basemap: mapBasemap,
      visibleLayerIds,
    })
    setAssistantOpen(true)
    try {
      const data = await fetchAreaInsight({
        lat: centroid.lat,
        lng: centroid.lng,
        zoom: 12,
        explorationGeometry: activeExplorationGeometry,
        visibleLayerIds,
      })
      setAreaInsight(data)
    } catch {
      setAreaInsight(null)
    } finally {
      setInsightLoading(false)
    }
  }, [
    drawMode,
    drawPoints,
    activeExplorationGeometry,
    zoomToExplorationSelection,
    mapBasemap,
    fetchAreaInsight,
    visibleLayers,
  ])

  const handleAreaInspect = useCallback(
    async (lat: number, lng: number, zoom: number, featureIds?: number[]) => {
      let boundaryId: number | undefined
      let regionBoundaryName: string | undefined
      let districtBoundaryName: string | undefined
      let wardBoundaryName: string | undefined
      let villageBoundaryName: string | undefined
      let insideAdminBoundaries = false

      try {
        const { data: at } = await geographyApi.boundariesAt(DEFAULT_COUNTRY_CODE, lat, lng)
        insideAdminBoundaries = isInspectableMapClick(at, featureIds)
        if (!insideAdminBoundaries) {
          toast.info(m.map.clickOutsideBoundaries, {
            description: m.map.clickOutsideBoundariesDescription,
          })
          return
        }

        const focus = boundaryFocusFromAt(at)
        if (focus) {
          setBoundaryFocus(focus)
          if (hasFullMapAccess) {
            setBoundaryVisibility(boundaryVisibilityForFocus(focus))
          }
        } else {
          setBoundaryFocus(null)
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
        toast.info(m.map.clickOutsideBoundaries, {
          description: m.map.clickOutsideBoundariesDescription,
        })
        return
      }

      setPanelDismissed(false)
      setInsightLoading(true)
      setCatalogMineralSlug(null)
      setMineralHighlight(null)

      setInsightExplorationGeometry(undefined)
      setAdminFitBounds(null)
      setMapFocus(null)

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
        insideAdminBoundaries,
        basemap: mapBasemap,
        visibleLayerIds: [...visibleLayers],
      })
      setAssistantOpen(true)
      try {
        const data = await fetchAreaInsight({
          lat,
          lng,
          zoom,
          featureIds,
          boundaryId,
          visibleLayerIds: [...visibleLayers],
        })
        setAreaInsight(data)
      } catch {
        setAreaInsight(null)
      } finally {
        setInsightLoading(false)
      }
    },
    [
      fetchAreaInsight,
      hasFullMapAccess,
      mapBasemap,
      m.map.clickOutsideBoundaries,
      m.map.clickOutsideBoundariesDescription,
      visibleLayers,
    ],
  )

  const handleExploreSimilarArea = useCallback(
    async (lat: number, lng: number, _boundaryId?: number) => {
      focusOn(lat, lng, 11)
      setAssistantOpen(true)
      await handleAreaInspect(lat, lng, 11)
    },
    [focusOn, handleAreaInspect],
  )

  const openAssistantPanel = useCallback(() => {
    setAssistantOpen(true)
    setPanelDismissed(false)
  }, [])

  const handleCloseAssistant = useCallback(() => {
    const fromMapClick = assistantMapContext?.fromMapClick
    setAssistantOpen(false)
    setInsightLoading(false)
    setInsightExplorationGeometry(undefined)
    // Keep areaInsight + map context so the analysis circle stays on the map.
    if (fromMapClick) {
      setBoundaryFocus(null)
      setAdminFitBounds(null)
      setMapFocus(null)
    } else {
      setAreaInsight(null)
      setAssistantMapContext(null)
    }
    if (!debouncedSearch && !selectedResult) {
      setPanelDismissed(true)
    }
    // Zoom out to country while leaving the circular zone visible.
    window.setTimeout(() => {
      mapControlsRef.current?.refreshLayout()
      mapControlsRef.current?.zoomToCountry()
    }, 80)
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
        layerId: item.type === 'layer' ? item.id : undefined,
        regionId: item.type === 'region' ? item.id : undefined,
        boundaryId:
          item.type === 'region_boundary' ||
          item.type === 'district_boundary' ||
          item.type === 'ward_boundary' ||
          item.type === 'village_boundary'
            ? (item.boundary_id ?? item.id)
            : undefined,
        searchLabel,
        visibleLayerIds: [...visibleLayers],
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
    [displayName, focusOn, setAdminFitBounds, setMapFocus, visibleLayers]
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
      if (hasFullMapAccess) {
        setMineral('')
        setVisibleLayers(new Set([item.id]))
      }
      setBoundaryFocus(null)
      void loadMineralMapOverlay(item.slug)
    } else {
      if (hasFullMapAccess) {
        setMineral(item.slug)
      }
      setBoundaryFocus(null)
      void loadMineralMapOverlay(item.slug)
    }

    if (item.center || item.bounds) {
      focusSearchResult(item, setAdminFitBounds, setMapFocus, focusOn)
    }
  }, [mergedBoundaries, focusOn, loadSearchPreview, hasFullMapAccess, loadMineralMapOverlay])

  useEffect(() => {
    if (!hasFullMapAccess || debouncedSearch.length < 2 || searchLoading || searchResults.length !== 1) return
    const item = searchResults[0]
    const q = debouncedSearch.toLowerCase()
    const name = item.name.toLowerCase()
    const nameSw = item.name_sw?.toLowerCase() ?? ''
    if (name === q || name.startsWith(q) || nameSw.startsWith(q)) {
      handleSelectResult(item)
    }
  }, [hasFullMapAccess, debouncedSearch, searchLoading, searchResults, handleSelectResult])

  const handleClearFilter = () => {
    setMineral('')
    setCatalogMineralSlug(null)
    setMineralHighlight(null)
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
    const fromMapClick = assistantMapContext?.fromMapClick
    setAssistantOpen(false)
    setPanelDismissed(true)
    setSearch('')
    setDebouncedSearch('')
    setMineral('')
    setSelectedResult(null)
    setSearchPreview(null)
    setSearchPreviewLoading(false)
    setMapFocus(null)
    setAdminFitBounds(null)
    setBoundaryFocus(null)
    setInsightExplorationGeometry(undefined)
    if (fromMapClick) {
      // Keep insight so the analysis circle remains; only zoom out.
      window.setTimeout(() => {
        mapControlsRef.current?.refreshLayout()
        mapControlsRef.current?.zoomToCountry()
      }, 80)
      return
    }
    setAreaInsight(null)
    setAssistantMapContext(null)
    window.setTimeout(() => {
      mapControlsRef.current?.refreshLayout()
      mapControlsRef.current?.resetView()
    }, 80)
  }

  const handleClearBoundaryFocus = useCallback(() => {
    setBoundaryFocus(null)
    setAdminFitBounds(null)
    setBoundaryVisibility(hasFullMapAccess ? DEFAULT_BOUNDARY_VISIBILITY : UNPAID_BOUNDARY_VISIBILITY)
  }, [hasFullMapAccess])

  const handleViewReset = useCallback(() => {
    setMapFocus(null)
    setAdminFitBounds(null)
    setBoundaryFocus(null)
    // Home / full reset also clears the inspection circle.
    setAreaInsight(null)
    setAssistantMapContext(null)
    setAssistantOpen(false)
    setInsightLoading(false)
    setInsightExplorationGeometry(undefined)
  }, [])

  const askTerraFromSearch = insightLoading && assistantOpen && !!assistantMapContext?.searchLabel

  const toggleLayer = (id: number) => {
    if (!hasFullMapAccess) return
    setVisibleLayers((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleLayerType = (type: string, visible: boolean) => {
    if (!hasFullMapAccess) return
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
            hasPaidAccess={hasFullMapAccess}
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

      <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col pt-[3.5rem] sm:pt-14 box-border">
        <MapSearchBar
          search={search}
          onSearchChange={(v) => {
            setSearch(v)
            if (v.trim().length >= 2) setPanelDismissed(false)
          }}
          searchEnabled={hasFullMapAccess}
          exploreEnabled={hasFullMapAccess}
          exploreOpen={exploreOpen}
          onExploreOpenChange={handleExploreOpenChange}
          explorePanel={
            <ExploreDrawTool
              mode={drawMode}
              points={drawPoints}
              coordinateSystem={coordinateSystem}
              coordinateFormat={coordinateFormat}
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

        <MapCaptureGuard className="relative flex-1 min-h-0 min-w-0 w-full">
          {selectedResult && panelDismissed && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 map-chrome rounded-full text-sm">
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
            showLayerPanel={!catalogMineralSlug}
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
            analysisZone={mapAnalysisZone}
            onMapControlsReady={handleMapControlsReady}
            onBasemapChange={setMapBasemap}
            onViewReset={handleViewReset}
            onAreaInspect={handleAreaInspect}
            staticMap={!hasFullMapAccess}
            mineralHighlight={mineralHighlight}
            mineralHeatmap={mineralHeatmap}
            mineralHeatmapLoading={heatmapLoading}
            assistantOpen={assistantOpen}
            onAssistantToggle={toggleAssistantPanel}
            onAssistantClose={handleCloseAssistant}
            areaInsight={areaInsight}
            insightLoading={insightLoading}
            hasPaidAccess={hasFullMapAccess}
            assistantMapContext={assistantMapContext}
            onRefreshInsight={handleRefreshInsight}
            refreshInsightPending={insightLoading}
            onExploreSimilarArea={handleExploreSimilarArea}
            insightLoadingTerrainView={insightLoading && isTerrainVisualBasemap(mapBasemap)}
            getMapSnapshot={(ctx) => mapControlsRef.current?.captureInsightSnapshot(ctx) ?? Promise.resolve(null)}
            showCoordinateSystem={false}
            showCoordinateReadout={hasFullMapAccess}
            explorationDraw={explorationDraw}
            drawActive={exploreOpen && hasFullMapAccess}
            onDrawPoint={addDrawPoint}
          />
          )}
          {isFetching && !initialLoad && (
            <div className="absolute top-4 right-3 z-20 h-6 w-6 animate-spin rounded-full border-2 border-terra-600 border-t-transparent bg-white/80" />
          )}
        </MapCaptureGuard>

        <div
          className={`pointer-events-none fixed right-3 z-50 flex min-h-0 max-h-full flex-col items-end gap-3 overflow-hidden max-md:bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] ${
            showAssistantPanel
              ? 'map-assistant-desktop-anchor md:bottom-6'
              : 'md:bottom-6'
          }`}
        >
          {!isMobile && (
            <TerraAssistantLauncher
              open={showAssistantPanel}
              onToggle={toggleAssistantPanel}
              onClose={handleCloseAssistant}
              areaInsight={areaInsight}
              insightLoading={insightLoading}
              insightLoadingTerrainView={insightLoading && isTerrainVisualBasemap(mapBasemap)}
              hasPaidAccess={hasFullMapAccess}
              mapContext={assistantMapContext}
              onRefreshInsight={handleRefreshInsight}
              refreshInsightPending={insightLoading}
              onExploreSimilarArea={handleExploreSimilarArea}
              getMapSnapshot={(ctx) => mapControlsRef.current?.captureInsightSnapshot(ctx) ?? Promise.resolve(null)}
              zoomControls={
                mapControls
                  ? {
                      onZoomIn: mapControls.zoomIn,
                      onZoomOut: mapControls.zoomOut,
                      onResetView: mapControls.resetView,
                    }
                  : null
              }
            />
          )}
        </div>
      </div>

      <InputDialog
        open={saveExplorationOpen}
        title="Name this exploration"
        description="Give your drawn area a name so you can load it again later."
        label="Name"
        placeholder="e.g. Mererani prospect zone"
        confirmLabel="Save"
        onConfirm={confirmSaveExploration}
        onCancel={() => setSaveExplorationOpen(false)}
      />
    </div>
  )
}
