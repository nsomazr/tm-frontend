import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analyticsApi, geographyApi } from '../../api'
import MapViewer, { type AdminFitBounds } from '../map/MapViewer'
import type { ExplorationDraw } from '../map/explorationGeometry'
import { parseCoordinateQuery } from '../map/parseCoordinate'
import type { AdminBoundaryAtResponse, MineralSearchInsight } from '../../types'
import SelectionChipList from './SelectionChipList'
import SearchPickList from './SearchPickList'
import {
  activeLayerRegions,
  boundaryMatchesLayerRegions,
  regionBoundaryIdsForLayers,
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
  hasLayersSelected = false,
}: ReportLocationPickerProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [drawActive, setDrawActive] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [mapSectionOpen, setMapSectionOpen] = useState(!hasLayersSelected)
  const [mapSearch, setMapSearch] = useState('')
  const [mapSearchDebounced, setMapSearchDebounced] = useState('')
  const [adminFitBounds, setAdminFitBounds] = useState<AdminFitBounds | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setMapSearchDebounced(mapSearch.trim()), 280)
    return () => window.clearTimeout(timer)
  }, [mapSearch])

  useEffect(() => {
    if (!hasLayersSelected) setMapSectionOpen(true)
  }, [hasLayersSelected])

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
      if (!levels.length) return [] as BoundaryOption[]
      const { data } = await geographyApi.boundaries('TZ', levels.join(','), { display: true })
      return parseFeatures(data.features ?? [])
    },
    enabled: availableLevels.length > 0 && (hasLayersSelected || mapSectionOpen),
  })

  const { data: remoteSearchResults = [] } = useQuery({
    queryKey: ['report-map-location-search', mapSearchDebounced],
    queryFn: () => analyticsApi.searchInsights(mapSearchDebounced).then((r) => r.data.results),
    enabled: mapSearchDebounced.length >= 2,
  })

  const allBoundaries = levelQueries.data ?? []
  const byId = useMemo(() => new Map(allBoundaries.map((row) => [row.id, row])), [allBoundaries])

  const activeRegions = useMemo(() => activeLayerRegions(layerRegions), [layerRegions])

  const scopedBoundaries = useMemo(() => {
    if (!hasLayersSelected) return []
    if (activeRegions.length) {
      return allBoundaries.filter((row) => boundaryMatchesLayerRegions(row, byId, activeRegions))
    }
    return allBoundaries
  }, [allBoundaries, byId, activeRegions, hasLayersSelected])

  const layerRegionLabel = useMemo(
    () =>
      activeRegions
        .map((row) => row.regionName)
        .filter(Boolean)
        .join(' · '),
    [activeRegions]
  )

  const layersWithoutRegion = layerRegions.length > 0 && activeRegions.length === 0

  const selectedBoundaries = useMemo(
    () =>
      selectedIds
        .map((id) => byId.get(id))
        .filter(Boolean) as BoundaryOption[],
    [selectedIds, byId]
  )

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])

  useEffect(() => {
    if (!hasLayersSelected || hydrated || !allBoundaries.length) return
    if (value.boundaryIds.length > 0) {
      setSelectedIds(value.boundaryIds)
      setHydrated(true)
      return
    }
    if (activeRegions.length) {
      const autoIds = regionBoundaryIdsForLayers(allBoundaries, activeRegions)
      if (autoIds.length) {
        setSelectedIds(autoIds)
        const selected = autoIds
          .map((id) => byId.get(id))
          .filter(Boolean) as BoundaryOption[]
        publishSelected(value, onChange, selected, byId)
      }
    }
    setHydrated(true)
  }, [hydrated, allBoundaries, byId, value.boundaryIds, activeRegions, hasLayersSelected])

  useEffect(() => {
    if (hasLayersSelected) return
    setHydrated(false)
  }, [hasLayersSelected])

  function commitSelection(nextIds: number[], centerOverride?: { lat: number; lng: number }) {
    setSelectedIds(nextIds)
    const selected = nextIds.map((id) => byId.get(id)).filter(Boolean) as BoundaryOption[]
    publishSelected(value, onChange, selected, byId, centerOverride)
  }

  function handleToggle(option: BoundaryOption) {
    const nextIds = selectedIdSet.has(option.id)
      ? selectedIds.filter((id) => id !== option.id)
      : [...selectedIds, option.id]
    commitSelection(nextIds)
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

    for (const row of allBoundaries) {
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
      if (seen.has(option.id)) continue
      seen.add(option.id)
      rows.push({
        option,
        sublabel: levelLabel(option.level),
        bounds: item.bounds ?? null,
      })
      if (rows.length >= 8) break
    }

    return rows
  }, [allBoundaries, byId, mapSearchDebounced, remoteSearchResults])

  const showMapSearchResults =
    mapSearchDebounced.length >= 2 && (mapSearchResults.length > 0 || mapSearchCoord != null)

  async function handleMapPoint(lng: number, lat: number) {
    try {
      const { data } = await geographyApi.boundariesAt('TZ', lat, lng)
      const leaf = leafFromAt(data)
      if (leaf) {
        const resolved = byId.get(leaf.id) ?? leaf
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
    const lat = parseFloat(value.centerLat)
    const lng = parseFloat(value.centerLng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return { mode: 'point', points: [[lng, lat]] }
  }, [value.centerLat, value.centerLng])

  const locationListItems = useMemo(
    () =>
      scopedBoundaries.map((row) => ({
        id: row.id,
        label: row.name,
        sublabel:
          row.level > 1
            ? `${levelLabel(row.level)} · ${hierarchyPath(row, byId)}`
            : levelLabel(row.level),
      })),
    [scopedBoundaries, byId]
  )

  const locationHint = !hasLayersSelected
    ? ''
    : layersWithoutRegion
      ? 'Suggested from all boundaries (selected layers have no region)'
      : layerRegionLabel || 'Suggested for your selected layers'

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

  const mapPick = (
    <details
      className="text-sm group"
      open={mapSectionOpen}
      onToggle={(e) => setMapSectionOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer text-app-text-secondary hover:text-app-text">
        Pick on map
      </summary>
      <div className="mt-3 space-y-2">
        <div className="relative">
          <input
            type="search"
            value={mapSearch}
            onChange={(e) => setMapSearch(e.target.value)}
            placeholder="Search place or coordinates…"
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
                      Go to {mapSearchCoord.lat.toFixed(4)}, {mapSearchCoord.lng.toFixed(4)}
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
          className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
            drawActive ? 'bg-terra-600 text-white' : 'bg-app-subtle text-app-text-secondary'
          }`}
          onClick={() => setDrawActive((v) => !v)}
        >
          {drawActive ? 'Click map to add…' : 'Enable map pick'}
        </button>
        <div className="h-48 rounded-lg border border-app-border overflow-hidden">
          <MapViewer
            layers={[]}
            minimalChrome
            showBoundaryControls
            boundaryControlLevels={['regions', 'districts']}
            adminFitBounds={adminFitBounds}
            explorationDraw={explorationDraw}
            drawActive={drawActive}
            onDrawPoint={handleMapPoint}
            className="h-full w-full"
          />
        </div>
      </div>
    </details>
  )

  return (
    <div className="space-y-3">
      {selectedBoundaries.length > 0 && (
        <div className="flex flex-wrap items-start gap-2">
          <div className="flex-1 min-w-0">
            <SelectionChipList
              items={selectedBoundaries.map((row) => ({
                id: row.id,
                label: row.name,
                meta: locationChipMeta(row, byId),
              }))}
              onRemove={(id) => handleRemove(Number(id))}
            />
          </div>
          <button type="button" onClick={handleClearAll} className="btn-secondary text-xs px-2.5 py-1.5 shrink-0">
            Clear
          </button>
        </div>
      )}

      {!hasLayersSelected ? (
        <>
          <p className="text-sm text-app-text-muted py-4 text-center rounded-lg border border-dashed border-app-border">
            Select a layer to see suggested locations
          </p>
          {mapPick}
        </>
      ) : (
        <>
          {locationHint && <p className="text-xs text-app-text-muted">{locationHint}</p>}

          <SearchPickList
            items={locationListItems}
            selectedIds={selectedIdSet}
            onToggle={(id) => {
              const option = byId.get(id)
              if (option) handleToggle(option)
            }}
            loading={levelQueries.isLoading}
            placeholder="Search locations…"
            emptyLabel={levelQueries.isLoading ? 'Loading locations…' : 'No locations in this scope'}
            maxHeight="max-h-56"
          />

          {mapPick}
        </>
      )}
    </div>
  )
}
