import { useState, useEffect, useMemo, Fragment } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, mapsApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import FileUploadField from '../../components/ui/FileUploadField'
import ListPagination from '../../components/ui/ListPagination'
import { toast } from '../../components/ui/toast'
import { usePagination } from '../../hooks/usePagination'
import { useAlternateName } from '../../i18n/useAlternateName'
import { useDisplayName } from '../../i18n/useDisplayName'
import LayerArrangeSection from '../../components/admin/LayerArrangeSection'
import MineralColorReference from '../../components/admin/MineralColorReference'
import {
  layerDisplayColor,
  layerFillColor,
  layerStyleWithColor,
  suggestLayerStyle,
} from '../../components/admin/layerColors'
import { colorRecordForLayer, formatColorCodes } from '../../lib/mineralColorUtils'
import {
  applyDefaultTypeStack,
  applyGroupOrder,
  sortLayersBottomToTop,
  sortLayersTopToBottom,
  stackPositionLabel,
} from '../../components/admin/layerOrder'
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

function formatWhenShort(iso?: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString()
}

function formatWhen(iso?: string | null) {
  if (!iso) return '-'
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

function LayerVersionHistory({ layerId, className = 'mt-3' }: { layerId: number; className?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['layer-versions', layerId],
    queryFn: () => mapsApi.versions({ layer: String(layerId) }).then((r) => r.data),
  })
  const versions = data?.results ?? []
  const pagination = usePagination(versions)

  if (isLoading) {
    return <p className={`text-xs text-app-text-muted ${className}`}>Loading upload history…</p>
  }

  if (!versions.length) {
    return <p className={`text-xs text-app-text-muted ${className}`}>No uploads recorded yet.</p>
  }

  return (
    <div className={`${className} rounded-lg border border-app-border/50 overflow-hidden`}>
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
          {pagination.pageItems.map((version) => (
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
      <div className="px-3 pb-3">
        <ListPagination
          page={pagination.page}
          pageCount={pagination.pageCount}
          total={pagination.total}
          pageSize={pagination.pageSize}
          onPageChange={pagination.setPage}
        />
      </div>
    </div>
  )
}

export default function LayersPage() {
  const qc = useQueryClient()
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const displayName = useDisplayName()
  const alternateName = useAlternateName()
  const [selectedLayer, setSelectedLayer] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [showHidden, setShowHidden] = useState(false)
  const [expandedLayerId, setExpandedLayerId] = useState<number | null>(null)

  const [newName, setNewName] = useState('')
  const [newNameSw, setNewNameSw] = useState('')
  const [newLayerType, setNewLayerType] = useState<'polygon' | 'point' | 'line'>('polygon')
  const [newPreview, setNewPreview] = useState(false)
  const [newColor, setNewColor] = useState('#0D9488')
  const [colorTouched, setColorTouched] = useState(false)
  const [layerMode, setLayerMode] = useState<'create' | 'import'>('import')

  const { data: layers } = useQuery({
    queryKey: ['admin-layers'],
    queryFn: () => mapsApi.layers({ include_inactive: '1' }).then((r) => r.data),
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
  const stackableLayers = allLayers.filter((l) => l.is_active)
  const orderedStackLayers = sortLayersTopToBottom(stackableLayers)
  const orderedVisibleLayers = [
    ...orderedStackLayers,
    ...sortLayersTopToBottom(visibleLayers.filter((layer) => !layer.is_active)),
  ]
  const layerPagination = usePagination(orderedVisibleLayers, 25)
  const managerUploadsList = managerUploads?.results ?? []
  const uploadsPagination = usePagination(managerUploadsList)
  const auditLogsList = layerAudit?.results ?? []
  const auditPagination = usePagination(auditLogsList)

  const usedLayerColors = useMemo(
    () => allLayers.map((layer) => layerFillColor(layer.style)).filter(Boolean),
    [allLayers]
  )

  useEffect(() => {
    if (colorTouched) return
    const suggested = suggestLayerStyle(newName, usedLayerColors, newLayerType)
    setNewColor(suggested.fill)
  }, [newName, usedLayerColors, newLayerType, colorTouched])

  const createLayer = useMutation({
    mutationFn: () => {
      if (!newName.trim()) throw new Error('Layer name is required')
      const style = suggestLayerStyle(newName, usedLayerColors, newLayerType)
      const fill = colorTouched ? newColor : style.fill
      const payload: Partial<MapLayer> = {
        name: newName.trim(),
        name_sw: newNameSw.trim(),
        layer_type: newLayerType,
        z_index: stackableLayers.length,
        is_preview: newPreview,
        is_active: true,
        style: layerStyleWithColor(
          { fill, stroke: fill, strokeWidth: style.strokeWidth },
          newLayerType,
          fill
        ),
      }
      return mapsApi.createLayer(payload)
    },
    onSuccess: (res) => {
      const slug = res.data.slug
      invalidateLayerQueries(qc)
      setSelectedLayer(slug)
      setLayerMode('import')
      toast.info(`Layer "${res.data.name}" created`, {
        description: 'Select your file below and upload to add map features.',
      })
      setNewName('')
      setNewNameSw('')
      setNewPreview(false)
      setColorTouched(false)
    },
    onError: (err: Error) => {
      toast.error('Could not create layer', { description: err.message })
    },
  })

  const updateLayer = useMutation({
    mutationFn: ({ slug, data }: { slug: string; data: Partial<MapLayer> }) =>
      mapsApi.updateLayer(slug, data),
    onSuccess: () => {
      invalidateLayerQueries(qc)
    },
    onError: (err: Error) => {
      toast.error('Update failed', { description: err.message })
    },
  })

  const deleteLayer = useMutation({
    mutationFn: (slug: string) => mapsApi.deleteLayer(slug),
    onSuccess: (_res, slug) => {
      invalidateLayerQueries(qc)
      setSelectedLayer((current) => (current === slug ? '' : current))
      toast.success('Layer deleted')
    },
    onError: (err: Error) => {
      toast.error('Delete failed', { description: err.message })
    },
  })

  const persistLayerStack = async (orderedActive: MapLayer[]) => {
    const bottomToTop = sortLayersBottomToTop(orderedActive)
    const inactive = sortLayersBottomToTop(allLayers.filter((layer) => !layer.is_active))
    const layerIds = [
      ...bottomToTop.map((layer) => layer.id),
      ...inactive.map((layer) => layer.id),
    ]
    await mapsApi.reorder(layerIds)
  }

  const reorderStack = useMutation({
    mutationFn: (orderedActive: MapLayer[]) => persistLayerStack(orderedActive),
    onSuccess: () => {
      invalidateLayerQueries(qc)
      toast.success('Layer draw order updated')
    },
    onError: (err: Error) => {
      toast.error('Could not update layer order', { description: err.message })
    },
  })

  const handleReorderGroup = (groupType: string, orderedTopToBottom: MapLayer[]) => {
    const next = applyGroupOrder(stackableLayers, groupType, orderedTopToBottom)
    reorderStack.mutate(next)
  }

  const handleDefaultStack = () => {
    if (stackableLayers.length === 0) return
    reorderStack.mutate(applyDefaultTypeStack(stackableLayers))
  }

  const handleLayerColorChange = (layer: MapLayer, color: string) => {
    updateLayer.mutate({
      slug: layer.slug,
      data: {
        style: layerStyleWithColor(layer.style, layer.layer_type, color),
      },
    })
  }

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
    onSuccess: async (res) => {
      const slug = selectedLayer
      const layerName =
        res.data?.layer_name ||
        allLayers.find((l) => l.slug === slug)?.name ||
        slug
      const filename = uploadFile?.name ?? res.data?.filename ?? 'file'

      invalidateLayerQueries(qc)
      setUploadFile(null)

      if (res.data?.status === 'failed') {
        toast.error('Import failed', {
          description: res.data.error_message || 'The upload could not be processed.',
        })
        return
      }

      if (res.data?.status === 'completed') {
        const { data } = await mapsApi.layers({ include_inactive: '1' })
        const updated = data.results.find((layer) => layer.slug === slug)
        const featureCount = updated?.feature_count ?? 0
        toast.success('Upload successful', {
          description: `Imported ${featureCount.toLocaleString()} features into "${layerName}" from ${filename}.`,
          action:
            featureCount > 0
              ? { label: 'View on map', onClick: () => navigate('/') }
              : undefined,
        })
        return
      }

      toast.info('Import started', {
        description: `Processing ${filename} for "${layerName}". Refresh in a moment if features do not appear.`,
      })
    },
    onError: (err: Error) => {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      toast.error('Import failed', { description: detail || err.message })
    },
  })

  const handleToggleActive = (layer: MapLayer) => {
    const nextActive = !layer.is_active
    if (!window.confirm(`${nextActive ? 'Show' : 'Hide'} "${displayName(layer)}" on the map?`)) return
    updateLayer.mutate({ slug: layer.slug, data: { is_active: nextActive } })
    toast.info(nextActive ? `Showing ${displayName(layer)}` : `Hiding ${displayName(layer)}`)
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
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-app-text mb-2">Map Layers</h1>
      <p className="text-sm text-app-muted mb-6">
        Create a new empty layer or import a shapefile / GeoJSON to replace features on an existing
        mineral or commodity layer.
        {isAdmin && (
          <>
            {' '}
            For country, region, district, ward, or village boundaries, use{' '}
            <Link to="/admin/boundaries?level=4" className="text-terra-600 dark:text-terra-400 hover:underline">
              Boundary layers
            </Link>
            .
          </>
        )}
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
                  <span className="text-sm font-medium text-app-text-secondary">Map color</span>
                  <div className="mt-1.5 flex items-center gap-3">
                    <input
                      type="color"
                      value={newColor}
                      onChange={(e) => {
                        setColorTouched(true)
                        setNewColor(e.target.value)
                      }}
                      className="h-10 w-14 cursor-pointer rounded-lg border border-app-border bg-app-bg p-1"
                      aria-label="Layer color"
                    />
                    <div className="min-w-0">
                      <p className="text-sm text-app-text-secondary">
                        {colorTouched ? 'Custom color' : 'Suggested from your layer list'}
                      </p>
                      <p className="text-xs text-app-text-muted font-mono truncate">{newColor}</p>
                      <p className="text-[10px] text-app-text-muted font-mono truncate">
                        {formatColorCodes(colorRecordForLayer(newColor, newLayerType))}
                      </p>
                    </div>
                    {colorTouched && (
                      <button
                        type="button"
                        onClick={() => setColorTouched(false)}
                        className="text-xs text-terra-600 hover:underline shrink-0"
                      >
                        Use suggestion
                      </button>
                    )}
                  </div>
                </label>
                <div className="block sm:col-span-2">
                  <MineralColorReference
                    layerName={newName}
                    layerType={newLayerType}
                    usedColors={usedLayerColors}
                    selectedColor={newColor}
                    onSelect={(hex) => {
                      setColorTouched(true)
                      setNewColor(hex)
                    }}
                  />
                </div>
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
              <p className="text-xs text-app-text-muted order-2 sm:order-1">
                After creating, switch to Import data to upload your file.
              </p>
              <button
                type="button"
                onClick={() => createLayer.mutate()}
                disabled={!newName.trim() || createLayer.isPending}
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
              <p className="text-xs text-app-text-muted order-2 sm:order-1">
                Import replaces every feature in the selected layer.
              </p>
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

      <LayerArrangeSection
        layers={stackableLayers}
        onReorderGroup={handleReorderGroup}
        onResetDefault={handleDefaultStack}
        busy={reorderStack.isPending}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-bold text-app-text">All layers ({visibleLayers.length})</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
      </div>

      {visibleLayers.length === 0 ? (
        <p className="text-sm text-app-muted">
          {allLayers.length > 0
            ? 'No active layers. Check “Include hidden layers” to review or delete old demo layers.'
            : 'No layers yet. Create one above.'}
        </p>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Layer</th>
                  <th>Type</th>
                  <th className="tabular-nums">Features</th>
                  <th>Stack</th>
                  <th>Last upload</th>
                  <th>Color</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {layerPagination.pageItems.map((layer) => {
                  const displayColor = layerDisplayColor(layer)
                  const indexFromTop = sortLayersTopToBottom(stackableLayers).findIndex(
                    (item) => item.id === layer.id
                  )
                  const stackLabel =
                    layer.is_active && stackableLayers.length > 0 && indexFromTop >= 0
                      ? stackPositionLabel(indexFromTop, stackableLayers.length)
                      : '-'

                  return (
                    <Fragment key={layer.id}>
                      <tr
                        className={!layer.is_active ? 'opacity-70' : undefined}
                      >
                        <td className="min-w-[10rem]">
                          <div className="font-medium text-app-text">{displayName(layer)}</div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            {!layer.is_active && (
                              <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-px rounded bg-app-subtle text-app-text-muted border border-app-border">
                                Hidden
                              </span>
                            )}
                            {layer.is_preview && (
                              <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-px rounded bg-terra-500/10 text-terra-600 dark:text-terra-400 border border-terra-500/25">
                                Preview
                              </span>
                            )}
                            {alternateName(layer) && (
                              <span className="text-xs text-app-text-muted truncate max-w-[12rem]">
                                {alternateName(layer)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-app-text-secondary capitalize whitespace-nowrap">
                          {layer.layer_type}
                        </td>
                        <td className="tabular-nums text-app-text">{layer.feature_count}</td>
                        <td className="text-xs text-app-text-muted whitespace-nowrap">
                          {stackLabel}
                          <span className="block text-[11px]">z{layer.z_index}</span>
                        </td>
                        <td className="text-xs text-app-text-muted whitespace-nowrap">
                          <span className="text-app-text-secondary">
                            {layer.last_uploaded_by_name ?? '-'}
                          </span>
                          {layer.last_uploaded_at && (
                            <span className="block">{formatWhenShort(layer.last_uploaded_at)}</span>
                          )}
                        </td>
                        <td>
                          <label
                            className="inline-flex items-center gap-1.5"
                            title="Change layer color"
                          >
                            <input
                              type="color"
                              value={displayColor.startsWith('#') ? displayColor : '#0D9488'}
                              onChange={(e) => handleLayerColorChange(layer, e.target.value)}
                              disabled={updateLayer.isPending}
                              className="h-7 w-8 cursor-pointer rounded border border-app-border bg-transparent p-0.5"
                              aria-label={`Color for ${displayName(layer)}`}
                            />
                            <span className="text-[10px] font-mono text-app-text-muted hidden lg:inline">
                              {displayColor}
                            </span>
                          </label>
                        </td>
                        <td className="text-right">
                          <div className="flex flex-wrap justify-end gap-x-2 gap-y-1 text-xs whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedLayerId((current) =>
                                  current === layer.id ? null : layer.id
                                )
                              }
                              className="text-terra-600 dark:text-terra-400 hover:underline"
                            >
                              {expandedLayerId === layer.id ? 'Hide history' : 'History'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(layer)}
                              disabled={updateLayer.isPending}
                              className="text-app-text-secondary hover:underline"
                            >
                              {layer.is_active ? 'Hide' : 'Show'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTogglePreview(layer)}
                              disabled={updateLayer.isPending}
                              className="text-app-text-secondary hover:underline"
                            >
                              {layer.is_preview ? 'Unpreview' : 'Preview'}
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleDelete(layer)}
                                disabled={deleteLayer.isPending}
                                className="text-red-600 dark:text-red-400 hover:underline"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedLayerId === layer.id && (
                        <tr>
                          <td colSpan={7} className="!py-3 bg-app-subtle/40">
                            <LayerVersionHistory layerId={layer.id} className="mx-1" />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
          <ListPagination
            page={layerPagination.page}
            pageCount={layerPagination.pageCount}
            total={layerPagination.total}
            pageSize={layerPagination.pageSize}
            onPageChange={layerPagination.setPage}
            className="px-4 pb-4"
          />
        </div>
      )}

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
                    {uploadsPagination.pageItems.map((upload) => (
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
              <ListPagination
                page={uploadsPagination.page}
                pageCount={uploadsPagination.pageCount}
                total={uploadsPagination.total}
                pageSize={uploadsPagination.pageSize}
                onPageChange={uploadsPagination.setPage}
                className="px-4 pb-4"
              />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-app-text mb-1">Layer activity log</h2>
            <p className="text-sm text-app-muted mb-4">
              Creates, uploads, updates, and deletes recorded for map layers.
            </p>
            <div className="card overflow-hidden">
              {!layerAudit?.results.length ? (
                <p className="text-sm text-app-muted p-4">No layer activity logged yet.</p>
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
                    {auditPagination.pageItems.map((log) => (
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
              <ListPagination
                page={auditPagination.page}
                pageCount={auditPagination.pageCount}
                total={auditPagination.total}
                pageSize={auditPagination.pageSize}
                onPageChange={auditPagination.setPage}
                className="px-4 pb-4"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
