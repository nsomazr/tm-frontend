import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { analyticsApi, mapsApi } from '../api'
import MapViewer, { type MapFocusTarget } from '../components/map/MapViewer'
import MapSidebar from '../components/map/MapSidebar'
import MapSearchBar from '../components/map/MapSearchBar'
import TerraAssistantButton from '../components/map/TerraAssistantButton'
import type { TerraAssistantMapContext } from '../components/assistant/TerraAssistantPanel'
import { useAuth } from '../auth/AuthContext'
import { useTranslation } from '../i18n/LocaleContext'
import { useDisplayName } from '../i18n/useDisplayName'
import type { AreaInsight, MineralSearchInsight } from '../types'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { defaultVisibleLayerIds } from '../components/map/mapUtils'

export default function FullMapPage() {
  const { hasPaidAccess, hasFullMapAccess } = useAuth()
  const { m } = useTranslation()
  const displayName = useDisplayName()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [mineral, setMineral] = useState('')
  const [selectedResult, setSelectedResult] = useState<MineralSearchInsight | null>(null)
  const [mapFocus, setMapFocus] = useState<MapFocusTarget | null>(null)
  const [areaInsight, setAreaInsight] = useState<AreaInsight | null>(null)
  const [insightLoading, setInsightLoading] = useState(false)
  const [visibleLayers, setVisibleLayers] = useState<Set<number>>(new Set())
  const [panelDismissed, setPanelDismissed] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assistantMapContext, setAssistantMapContext] = useState<TerraAssistantMapContext | null>(null)
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

  const { data: layersData, isLoading, isFetching } = useQuery({
    queryKey: ['layers', mineral],
    queryFn: () =>
      mapsApi.layers(mineral ? { mineral_slug: mineral } : {}).then((r) => r.data),
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  })

  const searchResults = searchData?.results || []
  const layers = layersData?.results || []

  const showResultsPanel = useMemo(
    () =>
      !panelDismissed &&
      (assistantOpen ||
        debouncedSearch.length >= 2 ||
        !!selectedResult ||
        !!areaInsight ||
        insightLoading),
    [panelDismissed, assistantOpen, debouncedSearch, selectedResult, areaInsight, insightLoading]
  )

  const layerIdsKey = useMemo(
    () => layers.map((l) => l.id).sort((a, b) => a - b).join(','),
    [layers]
  )

  useEffect(() => {
    if (!layerIdsKey) return
    setVisibleLayers(defaultVisibleLayerIds(layers))
  }, [mineral, layerIdsKey, layers])

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
      setAssistantMapContext({ lat, lng, zoom, featureIds })
      setAssistantOpen(true)
      const inspectZoom = isMobile ? Math.min(zoom, 7) : Math.max(zoom, 10)
      focusOn(lat, lng, inspectZoom)
      try {
        const { data } = await analyticsApi.areaInsights(lat, lng, zoom, featureIds)
        setAreaInsight(data)
      } catch {
        setAreaInsight(null)
      } finally {
        setInsightLoading(false)
      }
    },
    [focusOn, isMobile]
  )

  const openAssistantPanel = useCallback(() => {
    setAssistantOpen(true)
    setPanelDismissed(false)
    setAssistantMapContext((prev) =>
      prev ?? { lat: -6.369, lng: 34.888, zoom: 6 }
    )
  }, [])

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
        searchLabel,
      })

      if (item.center) {
        focusOn(lat, lng, zoom)
      }

      try {
        const params =
          item.type === 'mineral' ? { mineral_slug: item.slug } : { region_id: item.id }
        const { data } = await analyticsApi.searchContextInsights(params)
        setAreaInsight(data)
      } catch {
        setAreaInsight(null)
      } finally {
        setInsightLoading(false)
      }
    },
    [displayName, focusOn]
  )

  const handleSelectResult = useCallback((item: MineralSearchInsight) => {
    setPanelDismissed(false)
    setSelectedResult(item)
    setSearch('')
    setDebouncedSearch('')
    setAreaInsight(null)
    setAssistantOpen(false)
    setAssistantMapContext(null)

    if (item.type === 'region') {
      setMineral('')
    } else {
      setMineral(item.slug)
    }

    if (item.center) {
      focusOn(item.center.lat, item.center.lng, item.zoom ?? 9)
    }
  }, [focusOn])

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
    setSelectedResult(null)
    setMapFocus(null)
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
    setAreaInsight(null)
    setMapFocus(null)
    setAssistantMapContext(null)
  }

  const askTerraFromSearch = insightLoading && assistantOpen && !!assistantMapContext?.searchLabel

  const toggleLayer = (id: number) => {
    setVisibleLayers((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleLayerType = (type: string, visible: boolean) => {
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
      {showResultsPanel && (
        <>
          {!assistantOpen && (
            <button
              type="button"
              aria-label={m.map.closePanel}
              className="fixed inset-0 z-30 bg-black/25 sm:hidden"
              onClick={handleClosePanel}
            />
          )}
          <MapSidebar
          debouncedSearch={debouncedSearch}
          searchResults={searchResults}
          searchLoading={searchLoading}
          selectedMineral={selectedResult}
          mineralFilter={mineral}
          onSelectMineral={handleSelectResult}
          onClearFilter={handleClearFilter}
          onAskTerra={handleAskTerraAboutSearch}
          askTerraLoading={askTerraFromSearch}
          areaInsight={areaInsight}
          insightLoading={insightLoading}
          hasPaidAccess={hasPaidAccess}
          mapContext={assistantMapContext}
          assistantOpen={assistantOpen}
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
            onAreaInspect={handleAreaInspect}
            onOpenAssistant={openAssistantPanel}
            assistantActive={showResultsPanel && (assistantOpen || !!areaInsight || insightLoading)}
          />
        )}
        {isFetching && !initialLoad && (
          <div className="absolute top-16 right-3 z-20 h-6 w-6 animate-spin rounded-full border-2 border-terra-600 border-t-transparent bg-white/80" />
        )}

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none max-md:hidden">
          <TerraAssistantButton
            active={showResultsPanel && (assistantOpen || !!areaInsight || insightLoading)}
            onClick={openAssistantPanel}
            className="pointer-events-auto"
          />
        </div>
      </div>
    </div>
  )
}
