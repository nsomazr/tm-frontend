import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { geographyApi, mapsApi } from '../../api'
import MapViewer from '../../components/map/MapViewer'
import {
  DEFAULT_BOUNDARY_VISIBILITY,
  boundaryLevelsFromGeoJson,
  type BoundaryLevelKey,
  type BoundaryVisibility,
} from '../../components/map/adminBoundaryStyles'
import ListPagination from '../../components/ui/ListPagination'
import { usePagination } from '../../hooks/usePagination'
import { useDisplayName } from '../../i18n/useDisplayName'

export default function CoordinatesEditor() {
  const qc = useQueryClient()
  const displayName = useDisplayName()
  const [selectedLayerId, setSelectedLayerId] = useState<number | null>(null)
  const [form, setForm] = useState({
    latitude: '',
    longitude: '',
    label: '',
  })

  const [boundaryVisibility, setBoundaryVisibility] = useState<BoundaryVisibility>(
    DEFAULT_BOUNDARY_VISIBILITY
  )

  const { data: boundariesData } = useQuery({
    queryKey: ['country-boundaries', 'TZ'],
    queryFn: () => geographyApi.boundaries('TZ', '0,1,2,3,4').then((r) => r.data),
    staleTime: 30 * 60 * 1000,
  })

  const availableBoundaryLevels = useMemo(
    () => boundaryLevelsFromGeoJson(boundariesData),
    [boundariesData]
  )

  const boundaryToggleLevels = useMemo(
    () => availableBoundaryLevels.filter((level) => level === 'regions' || level === 'districts'),
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

  const createFeature = useMutation({
    mutationFn: () => {
      const lng = parseFloat(form.longitude)
      const lat = parseFloat(form.latitude)
      return mapsApi.createFeature({
        layer: selectedLayerId!,
        geometry: { type: 'Point', coordinates: [lng, lat] },
        latitude: form.latitude,
        longitude: form.longitude,
        label: form.label,
        properties: { label: form.label },
      })
    },
    onSuccess: () => {
      refetch()
      qc.invalidateQueries({ queryKey: ['admin-layers'] })
      setForm({ latitude: '', longitude: '', label: '' })
    },
  })

  const deleteFeature = useMutation({
    mutationFn: (id: number) => mapsApi.deleteFeature(id),
    onSuccess: () => {
      refetch()
      qc.invalidateQueries({ queryKey: ['admin-layers'] })
    },
  })

  const layerList = layers?.results || []
  const selectedLayer = layerList.find((l) => l.id === selectedLayerId)
  const featureList = features?.results ?? []
  const featurePagination = usePagination(featureList)
  const featureCount = featureList.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-app-text">Coordinate editor</h1>
        <p className="text-app-muted text-sm mt-1 max-w-2xl">
          Pick a layer, preview it on the map, then add point coordinates or remove existing features.
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
          </p>
        )}
      </section>

      {selectedLayer ? (
        <div className="grid xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <div className="rounded-xl border border-app-border overflow-hidden bg-app-subtle">
              <MapViewer
                key={selectedLayer.id}
                layers={[selectedLayer]}
                minimalChrome
                showLayerPanel={false}
                showBoundaryControls={boundaryToggleLevels.length > 0}
                boundaryControlLevels={boundaryToggleLevels}
                boundariesGeoJson={boundariesData}
                boundaryVisibility={boundaryVisibility}
                onBoundaryVisibilityChange={setBoundaryVisibility}
                countryCode="TZ"
                className="h-[min(52vh,480px)] w-full"
              />
            </div>

            <div className="rounded-xl border border-app-border bg-app-surface p-4 sm:p-5">
              <h2 className="font-semibold text-app-text mb-1">Add point</h2>
              <p className="text-xs text-app-text-muted mb-4">
                Enter WGS84 coordinates (EPSG:4326). Polygon layers can still store point markers.
              </p>
              <div className="grid sm:grid-cols-2 gap-3 mb-3">
                <label>
                  <span className="text-xs text-app-text-muted">Latitude</span>
                  <input
                    value={form.latitude}
                    onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                    className="input mt-1"
                    placeholder="-6.5"
                  />
                </label>
                <label>
                  <span className="text-xs text-app-text-muted">Longitude</span>
                  <input
                    value={form.longitude}
                    onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                    className="input mt-1"
                    placeholder="34.8"
                  />
                </label>
              </div>
              <label className="block mb-4">
                <span className="text-xs text-app-text-muted">Label</span>
                <input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  className="input mt-1"
                  placeholder="Prospect name or ID"
                />
              </label>
              <button
                type="button"
                onClick={() => createFeature.mutate()}
                disabled={!form.latitude || !form.longitude || createFeature.isPending}
                className="btn-primary text-sm"
              >
                {createFeature.isPending ? 'Adding…' : 'Add coordinate'}
              </button>
            </div>
          </div>

          <aside className="rounded-xl border border-app-border bg-app-surface overflow-hidden min-w-0 xl:sticky xl:top-4">
            <div className="px-4 py-3 border-b app-divider">
              <h2 className="font-semibold text-app-text">Features</h2>
              <p className="text-xs text-app-text-muted mt-0.5">{featureCount} in this layer</p>
            </div>
            <div className="divide-y divide-app-border/35">
              {featurePagination.pageItems.map((f) => (
                <div key={f.id} className="flex justify-between items-start gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-app-text truncate">
                      {f.label || `Feature #${f.id}`}
                    </p>
                    <p className="text-xs text-app-text-muted mt-0.5 tabular-nums">
                      {f.latitude}, {f.longitude}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteFeature.mutate(f.id)}
                    disabled={deleteFeature.isPending}
                    className="text-red-500 hover:text-red-600 text-xs font-medium shrink-0"
                  >
                    Delete
                  </button>
                </div>
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
          <p className="text-sm text-app-text-secondary">Select a layer to preview the map and edit coordinates.</p>
        </div>
      )}
    </div>
  )
}
