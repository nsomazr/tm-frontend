import { useQuery } from '@tanstack/react-query'
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
import type { TerraAssistantMapContext } from '../components/assistant/TerraAssistantPanel'
import { useAuth } from '../auth/AuthContext'
import { useTranslation } from '../i18n/LocaleContext'
import { useDisplayName } from '../i18n/useDisplayName'
import type { AreaInsight, MineralCatalogEntry, MineralHighlightSpec, MineralSearchInsight } from '../types'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { allVisibleLayerIds, defaultVisibleLayerIds } from '../components/map/mapUtils'

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

export default function FullMapPage() {
  const { hasPaidAccess, hasFullMapAccess } = useAuth()
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
  const [searchParams] = useSearchParams()
  const mineralParamHandled = useRef(false)
  const isMobile = useMediaQuery('(max-width: 767px)')

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

  const applyCatalogMineral = useCallback(
    async (entry: MineralCatalogEntry | null) => {
      if (!entry) {
        setCatalogMineralSlug(null)
        setMineralHighlight(null)
        return
      }

      setCatalogMineralSlug(entry.slug)
      setBoundaryFocus(null)
      setSelectedResult(null)
      setMineral('')

      try {
        const { data } = await analyticsApi.mineralCoverage(entry.slug, {
          country: countryCode,
          includeVillages: hasPaidAccess,
        })
        setMineralHighlight({
          slug: data.slug,
          color: data.color,
          regionIds: data.region_ids,
          districtIds: data.district_ids,
          villageIds: data.village_ids,
        })
        setBoundaryVisibility(DEFAULT_BOUNDARY_VISIBILITY)
        if (data.bounds) {
          setAdminFitBounds({ ...data.bounds, key: Date.now() })
        } else if (data.center) {
          setMapFocus({ lat: data.center.lat, lng: data.center.lng, zoom: 8, key: Date.now() })
        }
      } catch {
        setMineralHighlight(null)
        setCatalogMineralSlug(null)
      }
    },
    [countryCode, hasPaidAccess]
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
    if (!mergedBoundaries?.features?.length) return
    setBoundaryVisibility((prev) => {
      if (!boundaryVisibilityIsDefault(prev)) return prev
      return initialBoundaryVisibilityForGeoJson(mergedBoundaries)
    })
  }, [mergedBoundaries])

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
    if (!layerIdsKey) return
    setVisibleLayers(hasPaidAccess ? defaultVisibleLayerIds(layers) : allVisibleLayerIds(layers))
  }, [mineral, layerIdsKey, layers, hasPaidAccess])

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

  const handleAreaInspect = useCallback(
    async (lat: number, lng: number, zoom: number, featureIds?: number[]) => {
      setPanelDismissed(false)
      setInsightLoading(true)
      setCatalogMineralSlug(null)
      setMineralHighlight(null)

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
    } else {
      if (hasPaidAccess) {
        setMineral(item.slug)
      }
      setBoundaryFocus(null)
    }

    if (item.center || item.bounds) {
      focusSearchResult(item, setAdminFitBounds, setMapFocus, focusOn)
    }
  }, [mergedBoundaries, focusOn, loadSearchPreview, hasPaidAccess])

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
        </div>
      </div>
    </div>
  )
}
