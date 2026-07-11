import { useState, useMemo, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { geographyApi, mapsApi } from '../../api'
import MapViewer from '../../components/map/MapViewer'
import type { AdminFitBounds } from '../../components/map/MapViewer'
import { clearLayerGeojsonCache } from '../../components/map/mapGeojsonCache'
import { useAdminLayers, ADMIN_LAYERS_KEY } from '../../hooks/useAdminLayers'
import {
  DEFAULT_BOUNDARY_VISIBILITY,
  boundaryLevelsFromGeoJson,
  type BoundaryVisibility,
} from '../../components/map/adminBoundaryStyles'
import {
  explorationCentroid,
  explorationReady,
  featureVertexCount,
  geometryFromDraw,
  geometryTypeLabel,
  layerTypeToDrawMode,
  type ExplorationDraw,
  type ExplorationMode,
} from '../../components/map/explorationGeometry'
import ListPagination from '../../components/ui/ListPagination'
import { toast } from '../../components/ui/toast'
import LayerBulkImportPanel from '../../components/admin/LayerBulkImportPanel'
import { layerDisplayColor } from '../../components/admin/layerColors'
import { parseCoordinateComponent } from '../../components/map/coordinateFormat'
import { usePagination } from '../../hooks/usePagination'
import { useDisplayName } from '../../i18n/useDisplayName'
import type { MapFeature, MapLayer } from '../../types'

const ADD_LABELS: Record<ExplorationMode, string> = {
  point: 'Add point',
  line: 'Add structure',
  polygon: 'Add polygon',
}

const ADD_HINTS: Record<ExplorationMode, string> = {
  point: 'Click map or enter lat/lng, then save.',
  line: 'Add vertices in order (min 2).',
  polygon: 'Add boundary vertices in order (min 3).',
}

function MapPlaceholderIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      className="text-app-text-muted/50"
      aria-hidden
    >
      <path
        d="M8 10h32v28H8V10Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M14 30l8-10 6 7 10-14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="18" r="2" fill="currentColor" />
    </svg>
  )
}

function layerDrawMode(layer: MapLayer): ExplorationMode {
  return layerTypeToDrawMode(layer.layer_type)
}

function layerOptionLabel(layer: MapLayer, displayName: (layer: MapLayer) => string) {
  const parts = [displayName(layer)]
  if (layer.mineral_name) parts.push(layer.mineral_name)
  parts.push(layer.layer_type)
  if (!layer.is_active) parts.push('hidden')
  return parts.join(' · ')
}

function boundsFromFeatures(features: MapFeature[]): AdminFitBounds | null {
  let west = Infinity
  let east = -Infinity
  let south = Infinity
  let north = -Infinity

  const visit = (lng: number, lat: number) => {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return
    if (lng < west) west = lng
    if (lng > east) east = lng
    if (lat < south) south = lat
    if (lat > north) north = lat
  }

  const walk = (coords: unknown): void => {
    if (!Array.isArray(coords)) return
    if (coords.length >= 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      visit(coords[0], coords[1])
      return
    }
    for (const part of coords) walk(part)
  }

  for (const feature of features) {
    if (feature.geometry && 'coordinates' in feature.geometry) {
      walk(feature.geometry.coordinates)
    } else if (feature.longitude != null && feature.latitude != null) {
      visit(parseFloat(feature.longitude), parseFloat(feature.latitude))
    }
  }

  if (!Number.isFinite(west)) return null
  return { west, south, east, north }
}

export default function CoordinatesEditor() {
  const qc = useQueryClient()
  const displayName = useDisplayName()
  const [selectedLayerId, setSelectedLayerId] = useState<number | null>(null)
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([])
  const [manualLat, setManualLat] = useState('')
  const [manualLng, setManualLng] = useState('')
  const [mapRefreshKey, setMapRefreshKey] = useState(0)

  const [boundaryVisibility, setBoundaryVisibility] = useState<BoundaryVisibility>(
    DEFAULT_BOUNDARY_VISIBILITY
  )

  const { data: boundariesData } = useQuery({
    queryKey: ['country-boundaries', 'TZ', 'base'],
    queryFn: () => geographyApi.boundaries('TZ', '0,1,2,3').then((r) => r.data),
    staleTime: 30 * 60 * 1000,
  })

  const { data: villageBoundaries, isFetching: villagesLoading, isError: villagesError } = useQuery({
    queryKey: ['country-boundaries', 'TZ', 'villages'],
    queryFn: () => geographyApi.boundariesAllVillages('TZ'),
    enabled: boundaryVisibility.villages,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  })

  const availableBoundaryLevels = useMemo(
    () => boundaryLevelsFromGeoJson(boundariesData, [3, 4]),
    [boundariesData]
  )

  const boundaryToggleLevels = useMemo(
    () =>
      availableBoundaryLevels.filter((level) =>
        ['regions', 'districts', 'wards', 'villages'].includes(level)
      ),
    [availableBoundaryLevels]
  )

  const { data: layerList = [], isLoading: layersLoading } = useAdminLayers()

  const { data: features, refetch } = useQuery({
    queryKey: ['features', selectedLayerId],
    queryFn: () =>
      mapsApi.features({ layer: String(selectedLayerId!) }).then((r) => r.data),
    enabled: !!selectedLayerId,
  })

  const selectedLayer = layerList.find((l) => l.id === selectedLayerId)
  const drawMode = selectedLayer ? layerDrawMode(selectedLayer) : 'point'

  useEffect(() => {
    setDrawPoints([])
    setManualLat('')
    setManualLng('')
    clearLayerGeojsonCache()
    setMapRefreshKey((key) => key + 1)
  }, [selectedLayerId])

  const explorationDraw = useMemo<ExplorationDraw | null>(() => {
    if (!selectedLayer || drawPoints.length === 0) return null
    return { mode: drawMode, points: drawPoints }
  }, [selectedLayer, drawMode, drawPoints])

  const canSave = explorationReady(explorationDraw)

  const addDrawPoint = useCallback(
    (lng: number, lat: number) => {
      setDrawPoints((current) => (drawMode === 'point' ? [[lng, lat]] : [...current, [lng, lat]]))
    },
    [drawMode]
  )

  const addManualPoint = () => {
    const lat = parseCoordinateComponent(manualLat, 'lat')
    const lng = parseCoordinateComponent(manualLng, 'lng')
    if (lat == null || lng == null) return
    addDrawPoint(lng, lat)
    setManualLat('')
    setManualLng('')
  }

  const createFeature = useMutation({
    mutationFn: () => {
      if (!selectedLayerId || !explorationDraw || !canSave) {
        throw new Error('Incomplete geometry')
      }
      const geometry = geometryFromDraw(explorationDraw)
      const centroid = explorationCentroid(drawPoints)
      return mapsApi.createFeature({
        layer: selectedLayerId,
        geometry,
        latitude: centroid ? String(centroid.lat) : undefined,
        longitude: centroid ? String(centroid.lng) : undefined,
        label: '',
        properties: {},
      })
    },
    onSuccess: () => {
      clearLayerGeojsonCache()
      setMapRefreshKey((key) => key + 1)
      refetch()
      qc.invalidateQueries({ queryKey: ADMIN_LAYERS_KEY })
      setDrawPoints([])
      setManualLat('')
      setManualLng('')
    },
  })

  const deleteFeature = useMutation({
    mutationFn: (id: number) => mapsApi.deleteFeature(id),
    onSuccess: () => {
      clearLayerGeojsonCache()
      setMapRefreshKey((key) => key + 1)
      refetch()
      qc.invalidateQueries({ queryKey: ADMIN_LAYERS_KEY })
      toast.success('Feature deleted')
    },
    onError: () => toast.error('Could not delete feature'),
  })

  const handleDeleteFeature = (feature: MapFeature) => {
    const typeLabel = geometryTypeLabel(feature.geometry)
    toast.confirm(`Delete ${typeLabel} #${feature.id}?`, {
      description: 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteFeature.mutate(feature.id),
    })
  }

  const featureList = features?.results ?? []
  const featurePagination = usePagination(featureList)
  const featureCount = featureList.length
  const adminFitBounds = useMemo(
    () => boundsFromFeatures(featureList),
    [featureList]
  )

  const sortedLayerList = useMemo(
    () =>
      [...layerList].sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
        return displayName(a).localeCompare(displayName(b))
      }),
    [layerList, displayName]
  )

  const handleImportSuccess = () => {
    clearLayerGeojsonCache()
    setMapRefreshKey((key) => key + 1)
    void refetch()
    qc.invalidateQueries({ queryKey: ADMIN_LAYERS_KEY })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-app-text">Coordinate editor</h1>
        <p className="text-app-muted text-sm mt-0.5">
          Draw features or bulk-import from ZIP, GeoJSON, or CSV.
        </p>
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="px-5 py-3 border-b app-divider flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <h2 className="font-bold text-app-text shrink-0">Map layer</h2>
          <label className="block w-full lg:max-w-md shrink-0">
            <span className="sr-only">Layer</span>
            <select
              value={selectedLayerId || ''}
              onChange={(e) => setSelectedLayerId(Number(e.target.value) || null)}
              className="input w-full"
              disabled={layersLoading}
            >
              <option value="">
                {layersLoading ? 'Loading layers…' : 'Select layer…'}
              </option>
              {sortedLayerList.map((layer) => (
                <option key={layer.id} value={layer.id}>
                  {layerOptionLabel(layer, displayName)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {selectedLayer && (
          <div className="px-5 py-3 border-b app-divider bg-app-subtle/40 flex flex-wrap items-center gap-2 text-xs">
            <span
              className="w-3 h-3 rounded-full shrink-0 border border-app-border/50"
              style={{ backgroundColor: layerDisplayColor(selectedLayer) }}
            />
            <span className="font-medium text-app-text">{displayName(selectedLayer)}</span>
            <span className="text-app-text-muted capitalize">{selectedLayer.layer_type}</span>
            {selectedLayer.mineral_name && (
              <span className="text-app-text-muted">· {selectedLayer.mineral_name}</span>
            )}
            {selectedLayer.region_name && (
              <span className="text-app-text-muted">· {selectedLayer.region_name}</span>
            )}
            <span className="text-app-text-muted">
              · {featureCount} feature{featureCount === 1 ? '' : 's'}
            </span>
            {!selectedLayer.is_active && (
              <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-px rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                Hidden
              </span>
            )}
            {featureCount === 0 && (
              <span className="text-amber-700 dark:text-amber-300">
                · No geometry yet — draw below or bulk import
              </span>
            )}
          </div>
        )}

        {!selectedLayer ? (
          <div className="px-6 py-12 flex flex-col items-center justify-center text-center min-h-[min(36vh,280px)] bg-app-subtle/30">
            <MapPlaceholderIcon />
            <h3 className="font-semibold text-app-text mt-3">Select a layer</h3>
            <p className="text-sm text-app-muted mt-1">
              Choose a layer above to preview and edit.
            </p>
            {!layersLoading && sortedLayerList.length === 0 && (
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-3">
                No layers yet — create one in Layers first.
              </p>
            )}
          </div>
        ) : (
          <div className="p-5">
            <div className="grid xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <div className="rounded-xl border border-app-border overflow-hidden bg-app-subtle">
              <MapViewer
                key={`${selectedLayer.id}-${mapRefreshKey}`}
                layers={[selectedLayer]}
                minimalChrome
                showLayerPanel={false}
                adminFitBounds={adminFitBounds ? { ...adminFitBounds, key: mapRefreshKey } : null}
                showBoundaryControls={boundaryToggleLevels.length > 0}
                boundaryControlLevels={boundaryToggleLevels}
                boundariesGeoJson={boundariesData}
                villagesGeoJson={villageBoundaries ?? null}
                villagesLoading={villagesLoading}
                villagesError={villagesError}
                boundaryVisibility={boundaryVisibility}
                onBoundaryVisibilityChange={setBoundaryVisibility}
                countryCode="TZ"
                drawActive
                explorationDraw={explorationDraw}
                onDrawPoint={addDrawPoint}
                className="h-[min(52vh,480px)] w-full"
              />
            </div>

            <div className="rounded-xl border border-app-border bg-app-surface p-4 sm:p-5">
              <h2 className="font-semibold text-app-text mb-1">Bulk import</h2>
              <p className="text-xs text-app-text-muted mb-4">
                Upload a ZIP, GeoJSON, JSON, or CSV file to add many features to{' '}
                <span className="font-medium text-app-text">{displayName(selectedLayer)}</span>.
              </p>
              <LayerBulkImportPanel
                layer={selectedLayer}
                compact
                onSuccess={handleImportSuccess}
              />
            </div>

            <div className="rounded-xl border border-app-border bg-app-surface p-4 sm:p-5">
              <h2 className="font-semibold text-app-text mb-1">{ADD_LABELS[drawMode]}</h2>
              <p className="text-xs text-app-text-muted mb-4">{ADD_HINTS[drawMode]}</p>

              <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 mb-3 items-end">
                <label>
                  <span className="text-xs text-app-text-muted">Latitude</span>
                  <input
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    className="input mt-1"
                    placeholder="-6.5 or 6° 30' 0&quot; S"
                    inputMode="decimal"
                  />
                </label>
                <label>
                  <span className="text-xs text-app-text-muted">Longitude</span>
                  <input
                    value={manualLng}
                    onChange={(e) => setManualLng(e.target.value)}
                    className="input mt-1"
                    placeholder="34.8 or 34° 48' 0&quot; E"
                    inputMode="decimal"
                  />
                </label>
                <button
                  type="button"
                  onClick={addManualPoint}
                  disabled={!manualLat || !manualLng}
                  className="btn-secondary text-sm"
                >
                  Add vertex
                </button>
              </div>

              {drawPoints.length > 0 && (
                <div className="mb-4">
                  {drawMode !== 'point' && (
                    <p className="text-[11px] text-app-text-muted mb-2">
                      {drawMode === 'polygon'
                        ? drawPoints.length < 3
                          ? `${drawPoints.length} vertex${drawPoints.length === 1 ? '' : 'es'}. Add ${3 - drawPoints.length} more to close the ring`
                          : `${drawPoints.length} connected vertices · closes ${drawPoints.length} → 1`
                        : `${drawPoints.length} connected vertex${drawPoints.length === 1 ? '' : 'es'}`}
                    </p>
                  )}
                  <ul className="max-h-36 overflow-y-auto rounded-lg border border-app-border/60 divide-y divide-app-border/35">
                    {drawPoints.map(([lng, lat], index) => (
                      <li
                        key={`${index}-${lng}-${lat}`}
                        className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
                      >
                        <span className="tabular-nums text-app-text-secondary min-w-0">
                          <span className="font-medium text-app-text">{index + 1}</span>
                          {' · '}
                          {lat.toFixed(5)}, {lng.toFixed(5)}
                          {drawMode === 'polygon' && index > 0 && (
                            <span className="text-app-text-muted"> ← {index}</span>
                          )}
                          {drawMode === 'polygon' && index === 0 && drawPoints.length >= 3 && (
                            <span className="text-app-text-muted"> ← {drawPoints.length}</span>
                          )}
                          {drawMode === 'line' && index > 0 && (
                            <span className="text-app-text-muted"> ← {index}</span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDrawPoints((pts) => pts.filter((_, i) => i !== index))}
                          className="text-red-500 hover:text-red-600 font-medium shrink-0"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => createFeature.mutate()}
                  disabled={!canSave || createFeature.isPending}
                  className="btn-primary text-sm"
                >
                  {createFeature.isPending ? 'Saving…' : ADD_LABELS[drawMode]}
                </button>
                <button
                  type="button"
                  onClick={() => setDrawPoints([])}
                  disabled={drawPoints.length === 0}
                  className="btn-secondary text-sm"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          <aside className="rounded-xl border border-app-border bg-app-surface overflow-hidden min-w-0 xl:sticky xl:top-4">
            <div className="px-4 py-3 border-b app-divider">
              <h2 className="font-semibold text-app-text">Features</h2>
              <p className="text-xs text-app-text-muted mt-0.5">{featureCount} in this layer</p>
            </div>
            <div className="divide-y divide-app-border/35">
              {featurePagination.pageItems.map((f) => (
                <FeatureRow
                  key={f.id}
                  feature={f}
                  onDelete={() => handleDeleteFeature(f)}
                  deleting={deleteFeature.isPending}
                />
              ))}
              {featureCount === 0 && (
                <p className="text-app-text-muted text-sm px-4 py-8 text-center">
                  No features in this layer yet.
                </p>
              )}
            </div>
            <ListPagination
              page={featurePagination.page}
              pageCount={featurePagination.pageCount}
              total={featurePagination.total}
              pageSize={featurePagination.pageSize}
              onPageChange={featurePagination.setPage}
              className="px-4 pb-4"
            />
          </aside>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FeatureRow({
  feature,
  onDelete,
  deleting,
}: {
  feature: MapFeature
  onDelete: () => void
  deleting: boolean
}) {
  const typeLabel = geometryTypeLabel(feature.geometry)
  const vertices = featureVertexCount(feature.geometry)
  const detail =
    typeLabel === 'Point'
      ? `${feature.latitude}, ${feature.longitude}`
      : vertices != null
        ? `${vertices} vertices · ${feature.latitude}, ${feature.longitude}`
        : `${feature.latitude}, ${feature.longitude}`

  return (
    <div className="flex justify-between items-start gap-3 px-4 py-3 text-sm">
      <div className="min-w-0">
        <p className="font-medium text-app-text truncate">
          {typeLabel} #{feature.id}
        </p>
        <p className="text-xs text-app-text-muted mt-0.5 tabular-nums">{detail}</p>
      </div>
      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        className="text-red-500 hover:text-red-600 text-xs font-medium shrink-0"
      >
        Delete
      </button>
    </div>
  )
}
