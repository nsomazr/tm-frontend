import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analyticsApi, geographyApi } from '../../api'
import MapViewer, { type AdminFitBounds } from '../map/MapViewer'
import BoundaryVisibilityToggles from '../map/BoundaryVisibilityToggles'
import { DEFAULT_BOUNDARY_VISIBILITY } from '../map/adminBoundaryStyles'
import { useMapLabelState } from '../map/usePlaceNamesState'
import type { ExplorationDraw } from '../map/explorationGeometry'
import { parseCoordinateQuery } from '../map/parseCoordinate'
import { formatLatLngPair, parseCoordinateComponent } from '../map/coordinateFormat'
import { useCoordinateFormatState } from '../map/useCoordinateFormatState'
import type { AdminBoundaryAtResponse, MineralSearchInsight } from '../../types'
import SelectionChipList from './SelectionChipList'
import SearchPickList from './SearchPickList'
import {
  activeLayerRegions,
  boundariesForLayerCoverage,
  boundaryMatchesLayerRegions,
  regionBoundaryIdsForLayers,
  type LayerBoundaryCoverageRef,
  type LayerRegionRef,
} from './reportEditorText'

export interface ReportLocationValue {
  regionId: string
  centerLat: string
  centerLng: string
  zoom: string
  boundingBox: { west: string; south: string; east: string; north: string }
  boundaryIds: number[]
  locationLabel: string
}

interface ReportLocationPickerProps {
  value: ReportLocationValue
  onChange: (next: ReportLocationValue) => void
  layerRegions?: LayerRegionRef[]
  selectedLayerIds?: number[]
  hasLayersSelected?: boolean
}

type BoundaryOption = {
  id: number
  name: string
  level: number
  parentId: number | null
  regionId: number | null
  centerLat: number | null
  centerLng: number | null
}

const LEVEL_META = [
  { level: 1, key: 'region' as const, label: 'Region' },
  { level: 2, key: 'district' as const, label: 'District' },
  { level: 3, key: 'ward' as const, label: 'Ward' },
  { level: 4, key: 'village' as const, label: 'Village' },
]

function parseFeatures(features: unknown[]): BoundaryOption[] {
  const rows: BoundaryOption[] = []
  for (const feature of features) {
    const f = feature as {
      properties?: {
        id?: number
        name?: string
        level?: number
        parent_id?: number | null
        region_id?: number | null
        center_lat?: number | null
        center_lng?: number | null
      }
    }
    const id = f.properties?.id
    const name = f.properties?.name
    const level = f.properties?.level
    if (id && name && level) {
      rows.push({
        id,
        name,
        level,
        parentId: f.properties?.parent_id ?? null,
        regionId: f.properties?.region_id ?? null,
        centerLat: f.properties?.center_lat ?? null,
        centerLng: f.properties?.center_lng ?? null,
      })
    }
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name))
}

function levelLabel(level: number) {
  return LEVEL_META.find((meta) => meta.level === level)?.label ?? 'Area'
}

function hierarchyPath(option: BoundaryOption, byId: Map<number, BoundaryOption>) {
  const parts: string[] = []
  let current: BoundaryOption | undefined = option
  while (current) {
    parts.unshift(current.name)
    current = current.parentId ? byId.get(current.parentId) : undefined
  }
  return parts.join(' · ')
}

function locationChipMeta(option: BoundaryOption, byId: Map<number, BoundaryOption>) {
  const path = hierarchyPath(option, byId)
  if (option.level === 1) return 'Region'
  return `${levelLabel(option.level)} · ${path}`
}

function buildLocationLabel(selected: BoundaryOption[], byId: Map<number, BoundaryOption>) {
  return selected
    .map((row) => {
      const path = hierarchyPath(row, byId)
      return row.level === 1 ? row.name : `${row.name} (${path})`
    })
    .join(' · ')
}

function publishSelected(
  value: ReportLocationValue,
  onChange: (next: ReportLocationValue) => void,
  selected: BoundaryOption[],
  byId: Map<number, BoundaryOption>,
  centerOverride?: { lat: number; lng: number }
) {
  const boundaryIds = selected.map((row) => row.id)
  const locationLabel = buildLocationLabel(selected, byId)
  const catalogRegionId =
    selected.map((row) => row.regionId).find(Boolean) ??
    selected.find((row) => row.level === 1)?.id ??
    null

  const center =
    centerOverride ??
    (() => {
      const picked = [...selected].sort((a, b) => b.level - a.level)[0]
      if (picked?.centerLat != null && picked.centerLng != null) {
        return { lat: picked.centerLat, lng: picked.centerLng }
      }
      return null
    })()

  onChange({
    ...value,
    regionId: catalogRegionId ? String(catalogRegionId) : '',
    boundaryIds,
    locationLabel,
    ...(center ? { centerLat: String(center.lat), centerLng: String(center.lng) } : {}),
  })
}

function leafFromAt(response: AdminBoundaryAtResponse): BoundaryOption | null {
  const toOption = (
    ref: AdminBoundaryAtResponse['region'],
    level: number
  ): BoundaryOption | null => {
    if (!ref) return null
    return {
      id: ref.id,
      name: ref.name,
      level,
      parentId: null,
      regionId: ref.region_id ?? null,
      centerLat: ref.center?.lat ?? null,
      centerLng: ref.center?.lng ?? null,
    }
  }

  return (
    toOption(response.village, 4) ??
    toOption(response.ward, 3) ??
    toOption(response.district, 2) ??
    toOption(response.region, 1)
  )
}

function isBoundarySearchResult(item: MineralSearchInsight) {
  return (
    item.type === 'region_boundary' ||
    item.type === 'district_boundary' ||
    item.type === 'ward_boundary' ||
    item.type === 'village_boundary'
  )
}

function insightToBoundary(item: MineralSearchInsight): BoundaryOption {
  const level =
    item.boundary_level ??
    (item.type === 'district_boundary'
      ? 2
      : item.type === 'ward_boundary'
        ? 3
        : item.type === 'village_boundary'
          ? 4
          : 1)
  return {
    id: item.boundary_id ?? item.id,
    name: item.name,
    level,
    parentId: null,
    regionId: null,
    centerLat: item.center?.lat ?? null,
    centerLng: item.center?.lng ?? null,
  }
}

function boundsAroundPoint(lat: number, lng: number, span = 0.08): AdminFitBounds {
  return {
    west: lng - span,
    east: lng + span,
    south: lat - span,
    north: lat + span,
  }
}

function fitBoundsFromBoundary(option: BoundaryOption, bounds?: AdminFitBounds | null) {
  if (bounds) return { ...bounds, key: Date.now() }
  if (option.centerLat != null && option.centerLng != null) {
    return { ...boundsAroundPoint(option.centerLat, option.centerLng), key: Date.now() }
  }
  return null
}

export default function ReportLocationPicker({
  value,
  onChange,
  layerRegions = [],
  selectedLayerIds = [],
  hasLayersSelected = false,
}: ReportLocationPickerProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [drawActive, setDrawActive] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [layerScopeKey, setLayerScopeKey] = useState('')
  const [levelFilter, setLevelFilter] = useState<'all' | 1 | 2 | 3 | 4>('all')
  const [mapSearch, setMapSearch] = useState('')
  const [mapSearchDebounced, setMapSearchDebounced] = useState('')
  const [adminFitBounds, setAdminFitBounds] = useState<AdminFitBounds | null>(null)
  const [boundaryVisibility, setBoundaryVisibility] = useState(DEFAULT_BOUNDARY_VISIBILITY)
  const {
    showBasemapLabels,
    setShowBasemapLabels,
    showBoundaryLabels,
    setShowBoundaryLabels,
  } = useMapLabelState()
  const [coordinateFormat] = useCoordinateFormatState()

  useEffect(() => {
    const timer = window.setTimeout(() => setMapSearchDebounced(mapSearch.trim()), 280)
    return () => window.clearTimeout(timer)
  }, [mapSearch])

  useEffect(() => {
    if (!hasLayersSelected) setMapSearch('')
  }, [hasLayersSelected])

  useEffect(() => {
    setLevelFilter('all')
  }, [selectedLayerIds.join(',')])

  const { data: stats } = useQuery({
    queryKey: ['admin-boundary-stats', 'TZ'],
    queryFn: () => geographyApi.adminBoundaryStats('TZ').then((r) => r.data),
  })

  const availableLevels = useMemo(
    () =>
      LEVEL_META.filter((meta) => {
        const count = stats?.counts?.[String(meta.level) as '1' | '2' | '3' | '4'] ?? 0
        return count > 0
      }),
    [stats]
  )

  const levelQueries = useQuery({
    queryKey: ['report-location-boundaries', availableLevels.map((l) => l.level).join(',')],
    queryFn: async () => {
      const levels = availableLevels.map((l) => l.level)
      if (!levels.length) return null
      const { data } = await geographyApi.boundaries('TZ', levels.join(','), { display: true })
      return data
    },
    enabled: availableLevels.length > 0 && hasLayersSelected,
  })

  const layerCoverageQuery = useQuery({
    queryKey: ['report-layer-boundary-coverage', selectedLayerIds.join(',')],
    queryFn: () => analyticsApi.layerCoverage(selectedLayerIds).then((r) => r.data),
    enabled: hasLayersSelected && selectedLayerIds.length > 0,
  })

  const { data: remoteSearchResults = [] } = useQuery({
    queryKey: ['report-map-location-search', mapSearchDebounced],
    queryFn: () => analyticsApi.searchInsights(mapSearchDebounced).then((r) => r.data.results),
    enabled: mapSearchDebounced.length >= 2,
  })

  const allBoundaries = useMemo(
    () => parseFeatures(levelQueries.data?.features ?? []),
    [levelQueries.data],
  )
  const byId = useMemo(() => new Map(allBoundaries.map((row) => [row.id, row])), [allBoundaries])

  const activeRegions = useMemo(() => activeLayerRegions(layerRegions), [layerRegions])

  const layerCoverage = layerCoverageQuery.data

  const scopedBoundaries = useMemo(() => {
    if (!hasLayersSelected) return []
    const coverage: LayerBoundaryCoverageRef | null = layerCoverage
      ? {
          region_ids: layerCoverage.region_ids,
          district_ids: layerCoverage.district_ids,
          ward_ids: layerCoverage.ward_ids,
          village_ids: layerCoverage.village_ids,
          feature_count: layerCoverage.feature_count,
          bounds: layerCoverage.bounds,
          center: layerCoverage.center,
        }
      : null
    const scoped = boundariesForLayerCoverage(allBoundaries, coverage, byId, activeRegions)
    if (scoped.length) return scoped
    if (activeRegions.length) {
      return allBoundaries.filter((row) => boundaryMatchesLayerRegions(row, byId, activeRegions))
    }
    return []
  }, [allBoundaries, byId, activeRegions, hasLayersSelected, layerCoverage])

  const scopedBoundaryIdSet = useMemo(
    () => new Set(scopedBoundaries.map((row) => row.id)),
    [scopedBoundaries]
  )

  const scopedBoundariesGeoJson = useMemo(() => {
    const source = levelQueries.data
    if (!source?.features?.length || !scopedBoundaryIdSet.size) return null
    const features = source.features.filter((feature) => {
      const props = (feature as { properties?: { id?: number | string } }).properties
      const id = Number(props?.id)
      return Number.isFinite(id) && scopedBoundaryIdSet.has(id)
    })
    if (!features.length) return null
    return {
      type: 'FeatureCollection' as const,
      features,
    }
  }, [levelQueries.data, scopedBoundaryIdSet])

  const levelCounts = useMemo(() => {
    const counts = { regions: 0, districts: 0, wards: 0, villages: 0 }
    for (const row of scopedBoundaries) {
      if (row.level === 1) counts.regions += 1
      else if (row.level === 2) counts.districts += 1
      else if (row.level === 3) counts.wards += 1
      else if (row.level === 4) counts.villages += 1
    }
    return counts
  }, [scopedBoundaries])

  const filteredScopedBoundaries = useMemo(() => {
    if (levelFilter === 'all') return scopedBoundaries
    return scopedBoundaries.filter((row) => row.level === levelFilter)
  }, [scopedBoundaries, levelFilter])

  const isLoadingScope = levelQueries.isLoading || layerCoverageQuery.isLoading

  const layerRegionLabel = useMemo(
    () =>
      activeRegions
        .map((row) => row.regionName)
        .filter(Boolean)
        .join(' · '),
    [activeRegions]
  )

  const layersWithoutRegion =
    layerRegions.length > 0 &&
    activeRegions.length === 0 &&
    !layerCoverageQuery.isLoading &&
    !layerCoverage?.region_ids.length &&
    !layerCoverage?.district_ids.length

  const locationHintDetail = useMemo(() => {
    if (!hasLayersSelected) return ''
    if (layerCoverageQuery.isLoading) return 'Loading mapped locations for selected layers…'
    if (layersWithoutRegion && !scopedBoundaries.length) {
      return 'No mapped locations found for the selected layers'
    }
    const parts: string[] = []
    if (layerCoverage?.feature_count) {
      parts.push(`${layerCoverage.feature_count} mapped features`)
    }
    const counts = [
      layerCoverage?.region_ids.length ? `${layerCoverage.region_ids.length} region(s)` : '',
      layerCoverage?.district_ids.length ? `${layerCoverage.district_ids.length} district(s)` : '',
      layerCoverage?.ward_ids.length ? `${layerCoverage.ward_ids.length} ward(s)` : '',
    ].filter(Boolean)
    if (counts.length) parts.push(counts.join(', '))
    if (parts.length) return `Showing locations where selected layers have coverage · ${parts.join(' · ')}`
    if (layerRegionLabel) return `Suggested for ${layerRegionLabel}`
    return 'Suggested for your selected layers'
  }, [
    hasLayersSelected,
    layerCoverageQuery.isLoading,
    layersWithoutRegion,
    scopedBoundaries.length,
    layerCoverage,
    layerRegionLabel,
  ])

  const selectedBoundaries = useMemo(
    () =>
      selectedIds
        .map((id) => byId.get(id))
        .filter(Boolean) as BoundaryOption[],
    [selectedIds, byId]
  )

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])

  useEffect(() => {
    if (hasLayersSelected) return
    setHydrated(false)
    setLayerScopeKey('')
  }, [hasLayersSelected])

  useEffect(() => {
    if (!hasLayersSelected || !allBoundaries.length || !scopedBoundaries.length) return

    const scopedIds = scopedBoundaries.map((row) => row.id)
    const scopedSet = new Set(scopedIds)
    const pruned = selectedIds.filter((id) => scopedSet.has(id))

    if (value.boundaryIds.length > 0 && !hydrated) {
      const fromValue = value.boundaryIds.filter((id) => scopedSet.has(id))
      const nextIds = fromValue.length ? fromValue : pruned
      setSelectedIds(nextIds)
      if (nextIds.length) {
        const selected = nextIds.map((id) => byId.get(id)).filter(Boolean) as BoundaryOption[]
        publishSelected(value, onChange, selected, byId)
      }
      setHydrated(true)
      return
    }

    if (hydrated) {
      if (pruned.length !== selectedIds.length) {
        setSelectedIds(pruned)
        const selected = pruned.map((id) => byId.get(id)).filter(Boolean) as BoundaryOption[]
        publishSelected(value, onChange, selected, byId)
      }
      return
    }

    if (selectedIds.length === 0) {
      const coverageRegionIds =
        layerCoverage?.region_ids.filter((id) => scopedSet.has(id)) ?? []
      const autoIds = coverageRegionIds.length
        ? coverageRegionIds
        : regionBoundaryIdsForLayers(allBoundaries, activeRegions).filter((id) => scopedSet.has(id))
      if (autoIds.length) {
        setSelectedIds(autoIds)
        const selected = autoIds.map((id) => byId.get(id)).filter(Boolean) as BoundaryOption[]
        publishSelected(value, onChange, selected, byId)
        if (layerCoverage?.bounds) {
          setAdminFitBounds({ ...layerCoverage.bounds, key: Date.now() })
        } else if (selected[0]) {
          const fit = fitBoundsFromBoundary(selected[0])
          if (fit) setAdminFitBounds(fit)
        }
      }
    }
    setHydrated(true)
  }, [
    hydrated,
    allBoundaries,
    byId,
    value,
    onChange,
    activeRegions,
    hasLayersSelected,
    scopedBoundaries,
    selectedIds,
    layerCoverage,
  ])

  useEffect(() => {
    if (!hasLayersSelected) return
    const nextKey = selectedLayerIds.join(',')
    if (nextKey === layerScopeKey) return
    setLayerScopeKey(nextKey)
    setHydrated(false)
  }, [selectedLayerIds, layerScopeKey, hasLayersSelected])

  useEffect(() => {
    if (!hasLayersSelected || isLoadingScope) return
    if (layerCoverage?.bounds) {
      setAdminFitBounds({ ...layerCoverage.bounds, key: Date.now() })
    }
  }, [hasLayersSelected, isLoadingScope, layerCoverage?.bounds, layerScopeKey])

  function commitSelection(nextIds: number[], centerOverride?: { lat: number; lng: number }) {
    setSelectedIds(nextIds)
    const selected = nextIds.map((id) => byId.get(id)).filter(Boolean) as BoundaryOption[]
    publishSelected(value, onChange, selected, byId, centerOverride)
  }

  function handleToggle(option: BoundaryOption) {
    if (!scopedBoundaryIdSet.has(option.id)) return
    const adding = !selectedIdSet.has(option.id)
    const nextIds = adding
      ? [...selectedIds, option.id]
      : selectedIds.filter((id) => id !== option.id)
    commitSelection(nextIds)
    if (adding) {
      const fit = fitBoundsFromBoundary(option)
      if (fit) setAdminFitBounds(fit)
    }
  }

  function handleRemove(id: number) {
    commitSelection(selectedIds.filter((rowId) => rowId !== id))
  }

  function handleClearAll() {
    setSelectedIds([])
    onChange({
      ...value,
      regionId: '',
      boundaryIds: [],
      locationLabel: '',
    })
  }

  function selectFromMapSearch(option: BoundaryOption, bounds?: AdminFitBounds | null) {
    if (!scopedBoundaryIdSet.has(option.id)) return
    const fit = fitBoundsFromBoundary(option, bounds)
    if (fit) setAdminFitBounds(fit)

    const resolved = byId.get(option.id) ?? option
    const nextIds = selectedIdSet.has(resolved.id) ? selectedIds : [...selectedIds, resolved.id]
    const center =
      resolved.centerLat != null && resolved.centerLng != null
        ? { lat: resolved.centerLat, lng: resolved.centerLng }
        : undefined
    commitSelection(nextIds, center)
    setMapSearch('')
    setMapSearchDebounced('')
  }

  function goToCoordinates(lat: number, lng: number) {
    setAdminFitBounds({ ...boundsAroundPoint(lat, lng, 0.06), key: Date.now() })
    setMapSearch('')
    setMapSearchDebounced('')
    void handleMapPoint(lng, lat)
  }

  const mapSearchCoord = useMemo(
    () => (mapSearchDebounced ? parseCoordinateQuery(mapSearchDebounced) : null),
    [mapSearchDebounced]
  )

  const mapSearchResults = useMemo(() => {
    if (mapSearchDebounced.length < 2) return []

    const q = mapSearchDebounced.toLowerCase()
    const seen = new Set<number>()
    const rows: { option: BoundaryOption; sublabel: string; bounds?: AdminFitBounds | null }[] = []

    for (const row of scopedBoundaries) {
      if (!row.name.toLowerCase().includes(q) || seen.has(row.id)) continue
      seen.add(row.id)
      rows.push({
        option: row,
        sublabel:
          row.level > 1 ? `${levelLabel(row.level)} · ${hierarchyPath(row, byId)}` : levelLabel(row.level),
      })
      if (rows.length >= 6) break
    }

    for (const item of remoteSearchResults) {
      if (!isBoundarySearchResult(item)) continue
      const option = insightToBoundary(item)
      if (seen.has(option.id) || !scopedBoundaryIdSet.has(option.id)) continue
      seen.add(option.id)
      rows.push({
        option,
        sublabel: levelLabel(option.level),
        bounds: item.bounds ?? null,
      })
      if (rows.length >= 8) break
    }

    return rows
  }, [scopedBoundaries, byId, mapSearchDebounced, remoteSearchResults, scopedBoundaryIdSet])

  const showMapSearchResults =
    mapSearchDebounced.length >= 2 && (mapSearchResults.length > 0 || mapSearchCoord != null)

  async function handleMapPoint(lng: number, lat: number) {
    try {
      const { data } = await geographyApi.boundariesAt('TZ', lat, lng)
      const leaf = leafFromAt(data)
      if (leaf) {
        const resolved = byId.get(leaf.id) ?? leaf
        if (!scopedBoundaryIdSet.has(resolved.id)) {
          setDrawActive(false)
          return
        }
        const nextIds = selectedIdSet.has(resolved.id)
          ? selectedIds
          : [...selectedIds, resolved.id]
        commitSelection(nextIds, { lat, lng })
      } else {
        onChange({
          ...value,
          centerLat: String(lat),
          centerLng: String(lng),
        })
      }
    } catch {
      onChange({
        ...value,
        centerLat: String(lat),
        centerLng: String(lng),
      })
    }
    setDrawActive(false)
  }

  const explorationDraw: ExplorationDraw | null = useMemo(() => {
    const lat = parseCoordinateComponent(value.centerLat, 'lat')
    const lng = parseCoordinateComponent(value.centerLng, 'lng')
    if (lat == null || lng == null) return null
    return { mode: 'point', points: [[lng, lat]] }
  }, [value.centerLat, value.centerLng])

  const locationListItems = useMemo(
    () =>
      filteredScopedBoundaries.map((row) => ({
        id: row.id,
        label: row.name,
        sublabel:
          row.level > 1
            ? `${levelLabel(row.level)} · ${hierarchyPath(row, byId)}`
            : levelLabel(row.level),
        badge: levelLabel(row.level),
      })),
    [filteredScopedBoundaries, byId]
  )

  const levelTabs = useMemo(
    () =>
      [
        { key: 'all' as const, label: 'All', count: scopedBoundaries.length },
        { key: 1 as const, label: 'Regions', count: levelCounts.regions },
        { key: 2 as const, label: 'Districts', count: levelCounts.districts },
        { key: 3 as const, label: 'Wards', count: levelCounts.wards },
        { key: 4 as const, label: 'Villages', count: levelCounts.villages },
      ].filter((tab) => tab.key === 'all' || tab.count > 0),
    [scopedBoundaries.length, levelCounts]
  )

  if (!availableLevels.length) {
    return (
      <section className="rounded-xl border border-dashed border-app-border px-4 py-6 text-center">
        <p className="text-sm text-app-text-secondary">No uploaded boundaries yet.</p>
        <p className="text-xs text-app-muted mt-1">
          Upload region, district, ward, or village boundaries under Admin → Boundaries to tag report
          locations and improve assistant insights.
        </p>
      </section>
    )
  }

  const mapPanel = (
    <div className="location-scope-map">
      <div className="location-scope-map__frame">
        <MapViewer
          key={selectedLayerIds.join('-') || 'none'}
          layers={[]}
          minimalChrome
          showBoundaryControls={false}
          boundaryControlsOnMap={false}
          boundaryControlLevels={['regions', 'districts']}
          boundaryVisibility={boundaryVisibility}
          onBoundaryVisibilityChange={setBoundaryVisibility}
          showBasemapLabels={showBasemapLabels}
          onShowBasemapLabelsChange={setShowBasemapLabels}
          showBoundaryLabels={showBoundaryLabels}
          onShowBoundaryLabelsChange={setShowBoundaryLabels}
          boundariesGeoJson={scopedBoundariesGeoJson}
          adminFitBounds={adminFitBounds}
          explorationDraw={explorationDraw}
          drawActive={drawActive}
          onDrawPoint={handleMapPoint}
          className="location-scope-map__viewer"
        />
        {isLoadingScope && (
          <div className="location-scope-map__overlay">
            <p>Loading map…</p>
          </div>
        )}
        {!isLoadingScope && scopedBoundaries.length === 0 && hasLayersSelected && (
          <div className="location-scope-map__overlay location-scope-map__overlay--muted">
            <p>No mapped outlines</p>
            <span>This layer has no locations with boundary shapes yet</span>
          </div>
        )}
      </div>

      <div className="location-scope-map__layer-controls map-chrome">
        <span className="location-scope-map__layer-controls-title">Map display</span>
        <BoundaryVisibilityToggles
          availableLevels={['regions', 'districts']}
          value={boundaryVisibility}
          onChange={setBoundaryVisibility}
          showBasemapLabels={showBasemapLabels}
          onShowBasemapLabelsChange={setShowBasemapLabels}
          showBoundaryLabels={showBoundaryLabels}
          onShowBoundaryLabelsChange={setShowBoundaryLabels}
          compact
        />
      </div>

      <div className="location-scope-map__tools">
        <div className="relative flex-1 min-w-0">
          <input
            type="search"
            value={mapSearch}
            onChange={(e) => setMapSearch(e.target.value)}
            placeholder="Search on map…"
            className="input w-full text-sm"
            autoComplete="off"
          />
          {showMapSearchResults && (
            <ul className="absolute z-20 mt-1 w-full max-h-44 overflow-y-auto rounded-lg border border-app-border bg-app-surface py-1 shadow-lg">
              {mapSearchCoord && (
                <li>
                  <button
                    type="button"
                    onClick={() => goToCoordinates(mapSearchCoord.lat, mapSearchCoord.lng)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-app-subtle"
                  >
                    <span className="text-app-text">
                      Go to{' '}
                      {formatLatLngPair(mapSearchCoord.lat, mapSearchCoord.lng, coordinateFormat)}
                    </span>
                    <span className="block text-xs text-app-text-muted">Coordinates</span>
                  </button>
                </li>
              )}
              {mapSearchResults.map(({ option, sublabel, bounds }) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => selectFromMapSearch(option, bounds)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-app-subtle"
                  >
                    <span className="text-app-text">{option.name}</span>
                    <span className="block text-xs text-app-text-muted truncate">{sublabel}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          className={`location-scope-map__pick ${drawActive ? 'location-scope-map__pick--active' : ''}`}
          onClick={() => setDrawActive((v) => !v)}
        >
          {drawActive ? 'Click map…' : 'Pick point'}
        </button>
      </div>
    </div>
  )

  const coverageSummary = hasLayersSelected ? (
    <p className="location-scope__coverage">
      {isLoadingScope ? (
        'Loading mapped locations…'
      ) : (
        <>
          <strong>{scopedBoundaries.length.toLocaleString()}</strong> locations in layer coverage
          {locationHintDetail ? ` · ${locationHintDetail}` : ''}
        </>
      )}
    </p>
  ) : null

  const locationListPanel = (
    <div className="location-scope__list">
      {levelTabs.length > 1 && (
        <div className="location-scope-tabs" role="tablist" aria-label="Location level">
          {levelTabs.map((tab) => (
            <button
              key={String(tab.key)}
              type="button"
              role="tab"
              aria-selected={levelFilter === tab.key}
              className={`location-scope-tabs__btn ${levelFilter === tab.key ? 'location-scope-tabs__btn--active' : ''}`}
              onClick={() => setLevelFilter(tab.key)}
            >
              {tab.label}
              <span className="location-scope-tabs__count">{tab.count}</span>
            </button>
          ))}
        </div>
      )}

      <SearchPickList
        items={locationListItems}
        selectedIds={selectedIdSet}
        onToggle={(id) => {
          const option = byId.get(id)
          if (option) handleToggle(option)
        }}
        loading={isLoadingScope}
        placeholder="Filter locations…"
        emptyLabel={
          isLoadingScope
            ? 'Loading locations…'
            : levelFilter === 'all'
              ? 'No mapped locations for this layer'
              : `No ${levelTabs.find((tab) => tab.key === levelFilter)?.label.toLowerCase() ?? 'locations'} in scope`
        }
        emptyHint={
          !isLoadingScope && scopedBoundaries.length === 0
            ? 'The layer may have no features yet, or boundaries may not be uploaded for this area.'
            : !isLoadingScope && locationListItems.length === 0
              ? 'Try another level tab or pick a point on the map.'
              : undefined
        }
        compactWhenEmpty
        maxHeight="max-h-56"
      />
    </div>
  )

  return (
    <div className="location-scope">
      {selectedBoundaries.length > 0 && (
        <div className="location-scope__selection">
          <SelectionChipList
            items={selectedBoundaries.map((row) => ({
              id: row.id,
              label: row.name,
              meta: locationChipMeta(row, byId),
            }))}
            onRemove={(id) => handleRemove(Number(id))}
          />
          <button type="button" onClick={handleClearAll} className="btn-secondary text-xs px-2.5 py-1.5 shrink-0">
            Clear all
          </button>
        </div>
      )}

      {!hasLayersSelected ? (
        <div className="location-scope-empty">
          <div className="location-scope-empty__icon" aria-hidden>
            ◫
          </div>
          <p className="location-scope-empty__title">Choose a layer first</p>
          <p className="location-scope-empty__hint">
            Locations are scoped to where your selected layer has mapped data.
          </p>
        </div>
      ) : (
        <>
          {coverageSummary}
          <div className="location-scope__workspace">
            <div className="location-scope__map">{mapPanel}</div>
            {locationListPanel}
          </div>
        </>
      )}
    </div>
  )
}
