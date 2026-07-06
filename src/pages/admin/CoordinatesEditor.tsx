import { useState, useMemo, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { geographyApi, mapsApi } from '../../api'
import MapViewer from '../../components/map/MapViewer'
import type { AdminFitBounds } from '../../components/map/MapViewer'
import { clearLayerGeojsonCache } from '../../components/map/mapGeojsonCache'
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
import { usePagination } from '../../hooks/usePagination'
import { useDisplayName } from '../../i18n/useDisplayName'
import type { MapFeature, MapLayer } from '../../types'

const ADD_LABELS: Record<ExplorationMode, string> = {
  point: 'Add point',
  line: 'Add structure',
  polygon: 'Add polygon',
}

const ADD_HINTS: Record<ExplorationMode, string> = {
  point: 'Click the map or enter WGS84 latitude/longitude, then save.',
  line: 'Add connected vertices in order — each point links to the previous one (minimum 2).',
  polygon:
    'Add connected vertices in order around the boundary. Each point links to the previous; the ring closes back to vertex 1 (minimum 3).',
}

function layerDrawMode(layer: MapLayer): ExplorationMode {
  return layerTypeToDrawMode(layer.layer_type)
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

  const { data: layers } = useQuery({
    queryKey: ['admin-layers'],
    queryFn: () => mapsApi.layers({ include_inactive: '1' }).then((r) => r.data),
  })

  const { data: features, refetch } = useQuery({
    queryKey: ['features', selectedLayerId],
    queryFn: () =>
      mapsApi.features({ layer: String(selectedLayerId!) }).then((r) => r.data),
    enabled: !!selectedLayerId,
  })

  const layerList = layers?.results || []
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
    const lat = parseFloat(manualLat)
    const lng = parseFloat(manualLng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
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
      qc.invalidateQueries({ queryKey: ['admin-layers'] })
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
      qc.invalidateQueries({ queryKey: ['admin-layers'] })
    },
  })

  const featureList = features?.results ?? []
  const featurePagination = usePagination(featureList)
  const featureCount = featureList.length
  const adminFitBounds = useMemo(
    () => boundsFromFeatures(featureList),
    [featureList]
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-app-text">Coordinate editor</h1>
        <p className="text-app-muted text-sm mt-1 max-w-2xl">
          Pick an existing layer, draw or type coordinates on the map, then add points, structures
          (lines), or polygons matching that layer type.
        </p>
      </div>

      <section className="rounded-xl border border-app-border bg-app-surface p-4 sm:p-5">
        <label className="block max-w-md">
          <span className="text-sm font-medium text-app-text-secondary">Layer</span>
          <select
            value={selectedLayerId || ''}
            onChange={(e) => setSelectedLayerId(Number(e.target.value) || null)}
            className="input mt-1.5"
          >
            <option value="">Choose a layer…</option>
            {layerList.map((l) => (
              <option key={l.id} value={l.id}>
                {displayName(l)} ({l.layer_type})
              </option>
            ))}
          </select>
        </label>

        {selectedLayer && (
          <p className="text-xs text-app-text-muted mt-2">
            {selectedLayer.mineral_name}
            {selectedLayer.region_name ? ` · ${selectedLayer.region_name}` : ''}
            {' · '}
            {featureCount} feature{featureCount === 1 ? '' : 's'}
            {' · '}
            <span className="capitalize">{selectedLayer.layer_type}</span> layer
            {!selectedLayer.is_active && (
              <span className="text-amber-700 dark:text-amber-400"> · inactive (hidden on public map)</span>
            )}
          </p>
        )}
        {selectedLayer && featureCount === 0 && (
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
            No geometry in this layer yet. If you uploaded a file, check Layers → upload status (pending/failed).
          </p>
        )}
      </section>

      {selectedLayer ? (
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
              <h2 className="font-semibold text-app-text mb-1">{ADD_LABELS[drawMode]}</h2>
              <p className="text-xs text-app-text-muted mb-4">{ADD_HINTS[drawMode]}</p>

              <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 mb-3 items-end">
                <label>
                  <span className="text-xs text-app-text-muted">Latitude</span>
                  <input
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    className="input mt-1"
                    placeholder="-6.5"
                    inputMode="decimal"
                  />
                </label>
                <label>
                  <span className="text-xs text-app-text-muted">Longitude</span>
                  <input
                    value={manualLng}
                    onChange={(e) => setManualLng(e.target.value)}
                    className="input mt-1"
                    placeholder="34.8"
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
                          ? `${drawPoints.length} vertex${drawPoints.length === 1 ? '' : 'es'} — add ${3 - drawPoints.length} more to close the ring`
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
                  onDelete={() => deleteFeature.mutate(f.id)}
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
      ) : (
        <div className="rounded-xl border border-dashed border-app-border-strong bg-app-subtle/50 px-6 py-12 text-center">
          <p className="text-sm text-app-text-secondary">
            Select a layer to preview the map and add features.
          </p>
        </div>
      )}
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
