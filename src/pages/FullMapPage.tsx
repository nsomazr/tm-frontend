import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { analyticsApi, mapsApi } from '../api'
import MapViewer, { type MapFocusTarget } from '../components/map/MapViewer'
import MapSidebar from '../components/map/MapSidebar'
import MapSearchBar from '../components/map/MapSearchBar'
import { useAuth } from '../auth/AuthContext'
import { useTranslation } from '../i18n/LocaleContext'
import { useDisplayName } from '../i18n/useDisplayName'
import type { AreaInsight, MineralSearchInsight } from '../types'
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
  const [analysisActive, setAnalysisActive] = useState(false)
  const [panelDismissed, setPanelDismissed] = useState(false)

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
  })

  const searchResults = searchData?.results || []
  const layers = layersData?.results || []

  const showResultsPanel = useMemo(
    () =>
      !panelDismissed &&
      (debouncedSearch.length >= 2 ||
        !!selectedResult ||
        !!areaInsight ||
        insightLoading),
    [panelDismissed, debouncedSearch, selectedResult, areaInsight, insightLoading]
  )

  const layerIdsKey = useMemo(
    () => layers.map((l) => l.id).sort((a, b) => a - b).join(','),
    [layers]
  )

  useEffect(() => {
    if (!layerIdsKey) return
    setVisibleLayers(defaultVisibleLayerIds(layers))
  }, [mineral, layerIdsKey, layers])

  const focusOn = useCallback((lat: number, lng: number, zoom = 11, radiusM = 12000) => {
    setMapFocus({ lat, lng, zoom, radiusM, key: Date.now() })
  }, [])

  const handleAreaInspect = useCallback(async (lat: number, lng: number, zoom: number) => {
    setPanelDismissed(false)
    setAnalysisActive(true)
    setInsightLoading(true)
    focusOn(lat, lng, Math.max(zoom, 11), 8000)
    try {
      const { data } = await analyticsApi.areaInsights(lat, lng, zoom)
      setAreaInsight(data)
    } catch {
      setAreaInsight(null)
    } finally {
      setInsightLoading(false)
    }
  }, [focusOn])

  const handleSelectResult = (item: MineralSearchInsight) => {
    setPanelDismissed(false)
    setSelectedResult(item)
    setSearch('')
    setDebouncedSearch('')

    if (item.type === 'region') {
      setMineral('')
    } else {
      setMineral(item.slug)
    }

    if (item.center) {
      focusOn(item.center.lat, item.center.lng, item.zoom ?? 9, item.type === 'region' ? 18000 : 12000)
    }
  }

  const handleClearFilter = () => {
    setMineral('')
    setSelectedResult(null)
    setMapFocus(null)
    setPanelDismissed(false)
  }

  const handleClosePanel = () => {
    setPanelDismissed(true)
    setSearch('')
    setDebouncedSearch('')
    setMineral('')
    setSelectedResult(null)
    setAreaInsight(null)
    setAnalysisActive(false)
    setMapFocus(null)
  }

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
    <div className="flex h-full relative">
      {showResultsPanel && (
        <MapSidebar
          debouncedSearch={debouncedSearch}
          searchResults={searchResults}
          searchLoading={searchLoading}
          selectedMineral={selectedResult}
          mineralFilter={mineral}
          onSelectMineral={handleSelectResult}
          onClearFilter={handleClearFilter}
          areaInsight={areaInsight}
          insightLoading={insightLoading}
          hasDetailAccess={hasPaidAccess || !!areaInsight?.has_detail_access}
          onClose={handleClosePanel}
        />
      )}

      <div className="flex-1 min-w-0 relative">
        <MapSearchBar
          search={search}
          onSearchChange={(v) => {
            setSearch(v)
            if (v.trim().length >= 2) setPanelDismissed(false)
          }}
        />

        {mineral && selectedResult && selectedResult.type !== 'region' && panelDismissed && (
          <div className="absolute top-[4.25rem] left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm text-sm">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: selectedResult.color }}
            />
            <span className="text-slate-700 font-medium">{displayName(selectedResult)}</span>
            <button
              type="button"
              onClick={handleClearFilter}
              className="text-slate-400 hover:text-slate-700 ml-1"
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
            continuousInspect={analysisActive}
          />
        )}
        {isFetching && !initialLoad && (
          <div className="absolute top-16 right-3 z-20 h-6 w-6 animate-spin rounded-full border-2 border-terra-600 border-t-transparent bg-white/80" />
        )}
      </div>
    </div>
  )
}
