import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, geographyApi, mapsApi, mineralsApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import FileUploadField from '../../components/ui/FileUploadField'
import { useAlternateName } from '../../i18n/useAlternateName'
import { useDisplayName } from '../../i18n/useDisplayName'
import type { AuditLog, LayerUpload, MapLayer } from '../../types'

const LAYER_TYPES = [
  { value: 'polygon', label: 'Polygon' },
  { value: 'point', label: 'Point' },
  { value: 'line', label: 'Line' },
] as const

function invalidateLayerQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['admin-layers'] })
  qc.invalidateQueries({ queryKey: ['layers'] })
  qc.invalidateQueries({ queryKey: ['map-layers'] })
  qc.invalidateQueries({ queryKey: ['layer-uploads'] })
  qc.invalidateQueries({ queryKey: ['layer-audit'] })
  qc.invalidateQueries({ queryKey: ['layer-versions'] })
}

function formatWhen(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

function describeLayerAction(log: AuditLog) {
  const details = log.details ?? {}
  switch (log.action) {
    case 'layer_upload':
      return `Uploaded ${String(details.filename ?? 'file')} to ${String(details.layer_name ?? 'layer')}`
    case 'layer_create':
      return `Created layer ${String(details.name ?? '')}`
    case 'layer_update':
      return `Updated ${String(details.name ?? 'layer')}`
    case 'layer_delete':
      return `Deleted ${String(details.name ?? 'layer')}`
    default:
      return log.action
  }
}

function uploadStatusClass(status: LayerUpload['status']) {
  switch (status) {
    case 'completed':
      return 'text-emerald-600 dark:text-emerald-400'
    case 'failed':
      return 'text-red-600 dark:text-red-400'
    case 'processing':
      return 'text-blue-600 dark:text-blue-400'
    default:
      return 'text-app-text-muted'
  }
}

function LayerVersionHistory({ layerId }: { layerId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['layer-versions', layerId],
    queryFn: () => mapsApi.versions({ layer: String(layerId) }).then((r) => r.data),
  })

  if (isLoading) {
    return <p className="text-xs text-app-text-muted mt-3">Loading upload history…</p>
  }

  if (!data?.results.length) {
    return <p className="text-xs text-app-text-muted mt-3">No uploads recorded yet.</p>
  }

  return (
    <div className="mt-3 rounded-lg border border-app-border/50 overflow-hidden">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Version</th>
            <th>Uploaded by</th>
            <th>Features</th>
            <th>When</th>
          </tr>
        </thead>
        <tbody>
          {data.results.map((version) => (
            <tr key={version.id}>
              <td className="text-app-text">v{version.version_number}</td>
              <td>
                {version.uploaded_by_name ?? 'Unknown'}
              </td>
              <td className="tabular-nums">
                {version.feature_count}
              </td>
              <td className="text-app-text-muted">{formatWhen(version.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function LayersPage() {
  const qc = useQueryClient()
  const { isAdmin } = useAuth()
  const displayName = useDisplayName()
  const alternateName = useAlternateName()
  const [selectedLayer, setSelectedLayer] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [actionStatus, setActionStatus] = useState<string | null>(null)
  const [showHidden, setShowHidden] = useState(true)
  const [expandedLayerId, setExpandedLayerId] = useState<number | null>(null)

  const [newName, setNewName] = useState('')
  const [newNameSw, setNewNameSw] = useState('')
  const [newMineralId, setNewMineralId] = useState('')
  const [newLayerType, setNewLayerType] = useState<'polygon' | 'point' | 'line'>('polygon')
  const [newRegionId, setNewRegionId] = useState('')
  const [newPreview, setNewPreview] = useState(false)
  const [createStatus, setCreateStatus] = useState<string | null>(null)
  const [layerMode, setLayerMode] = useState<'create' | 'import'>('import')

  const { data: layers } = useQuery({
    queryKey: ['admin-layers'],
    queryFn: () => mapsApi.layers({ include_inactive: '1' }).then((r) => r.data),
  })

  const { data: minerals } = useQuery({
    queryKey: ['minerals'],
    queryFn: () => mineralsApi.list().then((r) => r.data),
  })

  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: () => geographyApi.regions().then((r) => r.data),
  })

  const { data: managerUploads } = useQuery({
    queryKey: ['layer-uploads', 'managers'],
    queryFn: () => mapsApi.uploads({ manager_only: '1' }).then((r) => r.data),
    enabled: isAdmin,
  })

  const { data: layerAudit } = useQuery({
    queryKey: ['layer-audit'],
    queryFn: () =>
      adminApi.auditLogs({ resource_type: 'MapLayer' }).then((r) => r.data),
    enabled: isAdmin,
  })

  const allLayers = layers?.results ?? []
  const visibleLayers = showHidden ? allLayers : allLayers.filter((l) => l.is_active)
  const importableLayers = allLayers.filter((l) => l.is_active)

  const createLayer = useMutation({
    mutationFn: () => {
      if (!newName.trim() || !newMineralId) throw new Error('Name and mineral are required')
      const mineral = minerals?.results.find((m) => String(m.id) === newMineralId)
      const payload: Partial<MapLayer> = {
        name: newName.trim(),
        name_sw: newNameSw.trim(),
        layer_type: newLayerType,
        mineral: Number(newMineralId),
        z_index: (layers?.results.length ?? 0) + 1,
        is_preview: newPreview,
        is_active: true,
        style: mineral?.color
          ? { fill: mineral.color, stroke: mineral.color, strokeWidth: 1 }
          : {},
      }
      if (newRegionId) payload.region = Number(newRegionId)
      return mapsApi.createLayer(payload)
    },
    onSuccess: (res) => {
      const slug = res.data.slug
      invalidateLayerQueries(qc)
      setSelectedLayer(slug)
      setLayerMode('import')
      setCreateStatus(null)
      setUploadStatus(`Layer "${res.data.name}" created. Select your file and upload.`)
      setNewName('')
      setNewNameSw('')
      setNewRegionId('')
      setNewPreview(false)
    },
    onError: (err: Error) => {
      setCreateStatus(`Could not create layer: ${err.message}`)
    },
  })

  const updateLayer = useMutation({
    mutationFn: ({ slug, data }: { slug: string; data: Partial<MapLayer> }) =>
      mapsApi.updateLayer(slug, data),
    onSuccess: () => {
      invalidateLayerQueries(qc)
      setActionStatus(null)
    },
    onError: (err: Error) => {
      setActionStatus(`Update failed: ${err.message}`)
    },
  })

  const deleteLayer = useMutation({
    mutationFn: (slug: string) => mapsApi.deleteLayer(slug),
    onSuccess: (_res, slug) => {
      invalidateLayerQueries(qc)
      setSelectedLayer((current) => (current === slug ? '' : current))
      setActionStatus(null)
    },
    onError: (err: Error) => {
      setActionStatus(`Delete failed: ${err.message}`)
    },
  })

  const importLayer = useMutation({
    mutationFn: () => {
      const layer = allLayers.find((l) => l.slug === selectedLayer)
      if (!layer || !uploadFile) throw new Error('Missing layer or file')
      const name = uploadFile.name.toLowerCase()
      let fileType = 'geojson'
      if (name.endsWith('.shp') || name.includes('shp')) fileType = 'shapefile'
      else if (name.endsWith('.zip')) fileType = 'zip'
      return mapsApi.bulkImport(layer.slug, uploadFile, fileType)
    },
    onSuccess: (res) => {
      invalidateLayerQueries(qc)
      setUploadFile(null)
      const status = res.data?.status
      setUploadStatus(status === 'completed' ? 'Import completed successfully.' : 'Import started…')
    },
    onError: (err: Error) => {
      setUploadStatus(`Import failed: ${err.message}`)
    },
  })

  const downloadSample = async (slug: string) => {
    try {
      const { data } = await mapsApi.sampleShapefile(slug)
      const url = URL.createObjectURL(data as Blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${slug}-sample.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Sample shapefile not found. Run: python manage.py generate_sample_shapefiles')
    }
  }

  const handleToggleActive = (layer: MapLayer) => {
    const nextActive = !layer.is_active
    if (!window.confirm(`${nextActive ? 'Show' : 'Hide'} "${displayName(layer)}" on the map?`)) return
    updateLayer.mutate({ slug: layer.slug, data: { is_active: nextActive } })
    setActionStatus(nextActive ? `Showing ${displayName(layer)}…` : `Hiding ${displayName(layer)}…`)
  }

  const handleTogglePreview = (layer: MapLayer) => {
    updateLayer.mutate({ slug: layer.slug, data: { is_preview: !layer.is_preview } })
  }

  const handleDelete = (layer: MapLayer) => {
    if (
      !window.confirm(
        `Permanently delete "${displayName(layer)}" and all ${layer.feature_count} features? This cannot be undone.`,
      )
    ) {
      return
    }
    deleteLayer.mutate(layer.slug)
    setActionStatus(`Deleting ${displayName(layer)}…`)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-app-text mb-2">Map Layers</h1>
      <p className="text-sm text-app-muted mb-6">
        Create a new empty layer or import a shapefile / GeoJSON to replace features on an existing
        layer.
      </p>

      <div className="card !p-0 overflow-hidden mb-8">
        <div className="px-5 py-4 border-b app-divider">
          <h2 className="font-bold text-app-text">Layer setup</h2>
          <p className="text-sm text-app-muted mt-1">
            {layerMode === 'create'
              ? 'Add an empty layer, then import your file into it. Slug is generated from the name.'
              : 'Replace all features in an existing layer with a shapefile or GeoJSON upload.'}
          </p>
          <div className="segmented mt-4 w-full sm:w-auto" role="tablist" aria-label="Layer action">
            <button
              type="button"
              role="tab"
              aria-selected={layerMode === 'create'}
              onClick={() => setLayerMode('create')}
              className={`segmented-btn flex-1 sm:flex-none px-4 py-2 text-sm ${
                layerMode === 'create' ? 'segmented-btn-active' : ''
              }`}
            >
              Create new layer
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={layerMode === 'import'}
              onClick={() => setLayerMode('import')}
              className={`segmented-btn flex-1 sm:flex-none px-4 py-2 text-sm ${
                layerMode === 'import' ? 'segmented-btn-active' : ''
              }`}
            >
              Import data
            </button>
          </div>
        </div>

        {layerMode === 'create' ? (
          <>
            <div className="px-5 py-5">
              <div className="grid sm:grid-cols-2 gap-4 max-w-3xl">
                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium text-app-text-secondary">Layer name (English)</span>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="input mt-1.5 w-full"
                    placeholder="e.g. Gold Priority 4"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium text-app-text-secondary">Name (Swahili, optional)</span>
                  <input
                    type="text"
                    value={newNameSw}
                    onChange={(e) => setNewNameSw(e.target.value)}
                    className="input mt-1.5 w-full"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-app-text-secondary">Mineral</span>
                  <select
                    value={newMineralId}
                    onChange={(e) => setNewMineralId(e.target.value)}
                    className="input mt-1.5 w-full"
                  >
                    <option value="">Select mineral</option>
                    {minerals?.results.map((m) => (
                      <option key={m.id} value={m.id}>
                        {displayName(m)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-app-text-secondary">Geometry type</span>
                  <select
                    value={newLayerType}
                    onChange={(e) => setNewLayerType(e.target.value as typeof newLayerType)}
                    className="input mt-1.5 w-full"
                  >
                    {LAYER_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-app-text-secondary">Region (optional)</span>
                  <select
                    value={newRegionId}
                    onChange={(e) => setNewRegionId(e.target.value)}
                    className="input mt-1.5 w-full"
                  >
                    <option value="">Any / national</option>
                    {regions?.results.map((r) => (
                      <option key={r.id} value={r.id}>
                        {displayName(r)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm text-app-text-secondary self-end pb-2">
                  <input
                    type="checkbox"
                    checked={newPreview}
                    onChange={(e) => setNewPreview(e.target.checked)}
                    className="rounded border-app-border"
                  />
                  Free-tier preview layer
                </label>
              </div>
            </div>
            <div className="px-5 py-4 border-t app-divider flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {createStatus ? (
                <p className="text-sm text-app-text-secondary order-2 sm:order-1">{createStatus}</p>
              ) : (
                <p className="text-xs text-app-text-muted order-2 sm:order-1">
                  After creating, switch to Import data to upload your file.
                </p>
              )}
              <button
                type="button"
                onClick={() => createLayer.mutate()}
                disabled={!newName.trim() || !newMineralId || createLayer.isPending}
                className="btn-primary order-1 sm:order-2 shrink-0 self-end sm:self-auto"
              >
                {createLayer.isPending ? 'Creating…' : 'Create layer'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="px-5 py-5 space-y-5">
              <label className="block max-w-md">
                <span className="text-sm font-medium text-app-text-secondary">Target layer</span>
                <select
                  value={selectedLayer}
                  onChange={(e) => setSelectedLayer(e.target.value)}
                  className="input mt-1.5 w-full"
                >
                  <option value="">Select layer…</option>
                  {importableLayers.map((l) => (
                    <option key={l.id} value={l.slug}>
                      {displayName(l)} ({l.feature_count} features)
                    </option>
                  ))}
                </select>
              </label>

              <FileUploadField
                label="Data file"
                accept=".zip,.shp,.geojson,.json"
                value={uploadFile}
                onChange={setUploadFile}
                placeholder="ZIP shapefile, .shp, or .geojson"
                hint="ZIP must include .shp, .shx, and .dbf. Use WGS84 coordinates (EPSG:4326)."
              />
            </div>

            <div className="px-5 py-4 border-t app-divider flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {uploadStatus ? (
                <p className="text-sm text-app-text-secondary order-2 sm:order-1">{uploadStatus}</p>
              ) : (
                <p className="text-xs text-app-text-muted order-2 sm:order-1">
                  Import replaces every feature in the selected layer.
                </p>
              )}
              <button
                type="button"
                onClick={() => importLayer.mutate()}
                disabled={!selectedLayer || !uploadFile || importLayer.isPending}
                className="btn-primary order-1 sm:order-2 shrink-0 self-end sm:self-auto"
              >
                {importLayer.isPending ? 'Importing…' : 'Upload & replace'}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-bold text-app-text">All layers ({visibleLayers.length})</h2>
        <label className="flex items-center gap-2 text-sm text-app-text-secondary">
          <input
            type="checkbox"
            checked={showHidden}
            onChange={(e) => setShowHidden(e.target.checked)}
            className="rounded border-app-border"
          />
          Include hidden layers
        </label>
      </div>

      {actionStatus && <p className="mb-4 text-sm text-app-text-secondary">{actionStatus}</p>}

      <div className="grid gap-4">
        {visibleLayers.map((layer) => (
          <div
            key={layer.id}
            className={`card ${!layer.is_active ? 'opacity-75 border-dashed' : ''}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-app-text">{displayName(layer)}</h3>
                  {!layer.is_active && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-app-subtle text-app-text-muted border border-app-border">
                      Hidden
                    </span>
                  )}
                  {layer.is_preview && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-terra-500/10 text-terra-600 dark:text-terra-400 border border-terra-500/25">
                      Preview
                    </span>
                  )}
                </div>
                <p className="text-sm text-app-text-secondary">
                  {alternateName(layer) ? `${alternateName(layer)} · ` : ''}
                  {layer.layer_type}
                </p>
                <p className="text-xs text-app-text-muted mt-1">
                  {layer.mineral_name} · z-index {layer.z_index} · {layer.feature_count} features
                </p>
                <p className="text-xs text-app-text-muted mt-1">
                  Created by {layer.created_by_name ?? 'Unknown'}
                  {layer.created_at ? ` · ${formatWhen(layer.created_at)}` : ''}
                </p>
                <p className="text-xs text-app-text-muted mt-0.5">
                  Last upload by {layer.last_uploaded_by_name ?? '—'}
                  {layer.last_uploaded_at ? ` · ${formatWhen(layer.last_uploaded_at)}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => downloadSample(layer.slug)}
                  className="text-xs px-2 py-1 border border-app-border rounded-lg hover:bg-app-subtle text-app-text-secondary"
                >
                  Sample ZIP
                </button>
                <span
                  className="w-6 h-6 rounded flex-shrink-0 border border-app-border"
                  style={{ backgroundColor: (layer.style?.fill as string) || '#ccc' }}
                />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t app-divider flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setExpandedLayerId((current) => (current === layer.id ? null : layer.id))
                }
                className="text-xs px-3 py-1.5 rounded-lg border border-app-border hover:bg-app-subtle text-app-text-secondary"
              >
                {expandedLayerId === layer.id ? 'Hide upload history' : 'Upload history'}
              </button>
              <button
                type="button"
                onClick={() => handleToggleActive(layer)}
                disabled={updateLayer.isPending}
                className="text-xs px-3 py-1.5 rounded-lg border border-app-border hover:bg-app-subtle text-app-text-secondary"
              >
                {layer.is_active ? 'Hide from map' : 'Show on map'}
              </button>
              <button
                type="button"
                onClick={() => handleTogglePreview(layer)}
                disabled={updateLayer.isPending}
                className="text-xs px-3 py-1.5 rounded-lg border border-app-border hover:bg-app-subtle text-app-text-secondary"
              >
                {layer.is_preview ? 'Remove preview flag' : 'Mark as preview'}
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleDelete(layer)}
                  disabled={deleteLayer.isPending}
                  className="text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10"
                >
                  Delete permanently
                </button>
              )}
            </div>
            {expandedLayerId === layer.id && <LayerVersionHistory layerId={layer.id} />}
          </div>
        ))}
        {visibleLayers.length === 0 && (
          <p className="text-sm text-app-muted">No layers yet. Create one above.</p>
        )}
      </div>

      {isAdmin && (
        <div className="mt-10 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-app-text mb-1">Manager uploads</h2>
            <p className="text-sm text-app-muted mb-4">
              Recent file imports by mineral managers across all layers.
            </p>
            <div className="card overflow-hidden">
              {!managerUploads?.results.length ? (
                <p className="text-sm text-app-muted">No manager uploads yet.</p>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Manager</th>
                      <th>Layer</th>
                      <th>File</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managerUploads.results.map((upload) => (
                      <tr key={upload.id}>
                        <td className="text-app-text-muted whitespace-nowrap">
                          {formatWhen(upload.created_at)}
                        </td>
                        <td className="text-app-text">
                          {upload.uploaded_by_name ?? 'Unknown'}
                        </td>
                        <td>
                          {upload.layer_name}
                          <span className="text-app-text-muted"> · {upload.mineral_name}</span>
                        </td>
                        <td className="truncate max-w-[180px]">
                          {upload.filename || upload.file_type}
                        </td>
                        <td className={`capitalize ${uploadStatusClass(upload.status)}`}>
                          {upload.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-app-text mb-1">Layer activity log</h2>
            <p className="text-sm text-app-muted mb-4">
              Creates, uploads, updates, and deletes recorded for map layers.
            </p>
            <div className="card overflow-hidden max-h-96 overflow-y-auto">
              {!layerAudit?.results.length ? (
                <p className="text-sm text-app-muted">No layer activity logged yet.</p>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Actor</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {layerAudit.results.map((log) => (
                      <tr key={log.id}>
                        <td className="text-app-text-muted whitespace-nowrap">
                          {formatWhen(log.created_at)}
                        </td>
                        <td>{log.actor_name || 'System'}</td>
                        <td>{describeLayerAction(log)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
