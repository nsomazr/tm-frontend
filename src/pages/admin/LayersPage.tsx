import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllMapLayers, mapsApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import FileUploadField from '../../components/ui/FileUploadField'
import { toast } from '../../components/ui/toast'
import { ADMIN_LAYERS_KEY, useAdminLayers } from '../../hooks/useAdminLayers'
import { useDisplayName } from '../../i18n/useDisplayName'
import { layerDisplayColor } from '../../components/admin/layerColors'
import {
  layerFillColor,
  layerStyleWithColor,
  suggestLayerStyle,
} from '../../components/admin/layerColors'
import {
  STRUCTURE_RANK_OPTIONS,
  layerStyleWithStructureRank,
  suggestStructureRank,
  type StructureLineRank,
} from '../../components/map/structureLineRank'
import { matchGeologicalColor } from '../../constants/geologicalMineralColors'
import type { MapLayer } from '../../types'

const LAYER_TYPES = [
  {
    value: 'polygon' as const,
    label: 'Polygon',
    hint: 'Zones and areas',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
        <path d="M4 8l8-4 8 4v8l-8 4-8-4V8z" opacity="0.35" />
        <path d="M4 8l8-4 8 4v8l-8 4-8-4V8z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    value: 'point' as const,
    label: 'Point',
    hint: 'Sites and markers',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
        <path d="M12 3c-3.3 0-6 2.5-6 5.7 0 4.3 6 12.3 6 12.3s6-8 6-12.3C18 5.5 15.3 3 12 3zm0 7.8a2.1 2.1 0 110-4.2 2.1 2.1 0 010 4.2z" />
      </svg>
    ),
  },
  {
    value: 'line' as const,
    label: 'Line',
    hint: 'Structures and belts',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M4 18c4-10 12-10 16-14" strokeLinecap="round" />
      </svg>
    ),
  },
]

const STEPS = [
  { id: 'create', label: 'Create layer' },
  { id: 'import', label: 'Import data' },
  { id: 'manage', label: 'Commodities' },
] as const

function invalidateLayerQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ADMIN_LAYERS_KEY })
  qc.invalidateQueries({ queryKey: ['layers'] })
  qc.invalidateQueries({ queryKey: ['map-layers'] })
  qc.invalidateQueries({ queryKey: ['layer-uploads'] })
}

function StepIndicator({ activeStep }: { activeStep: 'create' | 'import' }) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {STEPS.map((step, index) => {
        const isActive =
          step.id === activeStep ||
          (step.id === 'manage' && false)
        const isDone = step.id === 'create' && activeStep === 'import'
        const isManage = step.id === 'manage'

        return (
          <li key={step.id} className="flex items-center gap-2">
            {index > 0 && <span className="text-app-text-muted">→</span>}
            {isManage ? (
              <Link
                to="/admin/minerals"
                className="inline-flex items-center gap-1.5 rounded-full border border-app-border px-2.5 py-1 text-app-text-secondary hover:border-terra-500/40 hover:text-terra-600 dark:hover:text-terra-400 transition-colors"
              >
                <span className="font-medium">{step.label}</span>
              </Link>
            ) : (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ${
                  isActive
                    ? 'bg-terra-500/10 text-terra-700 dark:text-terra-300 border border-terra-500/25'
                    : isDone
                      ? 'bg-app-subtle text-app-text-secondary border border-app-border'
                      : 'text-app-text-muted border border-transparent'
                }`}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                    isActive
                      ? 'bg-terra-600 text-white'
                      : isDone
                        ? 'bg-app-text-muted/20 text-app-text-secondary'
                        : 'bg-app-subtle text-app-text-muted'
                  }`}
                >
                  {index + 1}
                </span>
                {step.label}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

export default function LayersPage() {
  const qc = useQueryClient()
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const displayName = useDisplayName()
  const [selectedLayerId, setSelectedLayerId] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  const [newName, setNewName] = useState('')
  const [newNameSw, setNewNameSw] = useState('')
  const [showSwahili, setShowSwahili] = useState(false)
  const [newLayerType, setNewLayerType] = useState<'polygon' | 'point' | 'line'>('polygon')
  const [newPreview, setNewPreview] = useState(false)
  const [newColor, setNewColor] = useState('#0D9488')
  const [colorTouched, setColorTouched] = useState(false)
  const [newStructureRank, setNewStructureRank] = useState<StructureLineRank>(2)
  const [structureRankTouched, setStructureRankTouched] = useState(false)
  const [layerMode, setLayerMode] = useState<'create' | 'import'>('create')

  const { data: allLayers = [] } = useAdminLayers()

  const importableLayers = allLayers.filter((l) => l.is_active)
  const stackableLayers = allLayers.filter((l) => l.is_active)
  const selectedImportLayer = importableLayers.find((l) => String(l.id) === selectedLayerId)

  const usedLayerColors = useMemo(
    () => allLayers.map((layer) => layerFillColor(layer.style)).filter(Boolean),
    [allLayers]
  )

  const matchedColor = useMemo(() => matchGeologicalColor(newName), [newName])

  useEffect(() => {
    if (colorTouched) return
    const suggested = suggestLayerStyle(newName, usedLayerColors, newLayerType)
    setNewColor(suggested.fill)
  }, [newName, usedLayerColors, newLayerType, colorTouched])

  useEffect(() => {
    if (structureRankTouched || newLayerType !== 'line') return
    setNewStructureRank(suggestStructureRank(newName, newLayerType))
  }, [newName, newLayerType, structureRankTouched])

  const createLayer = useMutation({
    mutationFn: () => {
      if (!newName.trim()) throw new Error('Layer name is required')
      const style = suggestLayerStyle(newName, usedLayerColors, newLayerType)
      const fill = colorTouched ? newColor : style.fill
      const baseStyle = layerStyleWithColor(
        { fill, stroke: fill, strokeWidth: style.strokeWidth },
        newLayerType,
        fill
      )
      const payload: Partial<MapLayer> = {
        name: newName.trim(),
        name_sw: newNameSw.trim(),
        layer_type: newLayerType,
        z_index: stackableLayers.length,
        is_preview: newPreview,
        is_active: true,
        style:
          newLayerType === 'line'
            ? layerStyleWithStructureRank(baseStyle, newStructureRank)
            : baseStyle,
      }
      return mapsApi.createLayer(payload)
    },
    onSuccess: (res) => {
      invalidateLayerQueries(qc)
      setSelectedLayerId(String(res.data.id))
      setLayerMode('import')
      toast.info(`Layer "${res.data.name}" created`, {
        description: 'Upload your shapefile or GeoJSON in the Import step.',
      })
      setNewName('')
      setNewNameSw('')
      setShowSwahili(false)
      setNewPreview(false)
      setColorTouched(false)
      setStructureRankTouched(false)
      setNewStructureRank(2)
    },
    onError: (err: Error) => {
      toast.error('Could not create layer', { description: err.message })
    },
  })

  const importLayer = useMutation({
    mutationFn: () => {
      const layer = allLayers.find((l) => String(l.id) === selectedLayerId)
      if (!layer || !uploadFile) throw new Error('Missing layer or file')
      const name = uploadFile.name.toLowerCase()
      let fileType = 'geojson'
      if (name.endsWith('.shp') || name.includes('shp')) fileType = 'shapefile'
      else if (name.endsWith('.zip')) fileType = 'zip'
      return mapsApi.bulkImport(layer.slug, uploadFile, fileType, layer.mineral_slug)
    },
    onSuccess: async (res) => {
      const layerId = selectedLayerId
      const layerName =
        res.data?.layer_name ||
        allLayers.find((l) => String(l.id) === layerId)?.name ||
        layerId
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
        const updatedList = await fetchAllMapLayers({ include_inactive: '1' })
        const updated = updatedList.find((layer) => String(layer.id) === layerId)
        const featureCount = updated?.feature_count ?? 0
        toast.success('Upload successful', {
          description: `Imported ${featureCount.toLocaleString()} features into "${layerName}".`,
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

  const canCreate = newName.trim().length > 0
  const canImport = !!selectedLayerId && !!uploadFile

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-app-text">Layers</h1>
        <p className="text-sm text-app-muted mt-1 max-w-2xl">
          Create a layer, upload your data, then manage colors and draw order in{' '}
          <Link to="/admin/minerals" className="text-terra-600 dark:text-terra-400 hover:underline">
            Commodities
          </Link>
          .
        </p>
        {isAdmin && (
          <p className="text-xs text-app-text-muted mt-2">
            Boundaries:{' '}
            <Link to="/admin/boundaries?level=4" className="text-terra-600 dark:text-terra-400 hover:underline">
              Boundary layers
            </Link>
            {' · '}
            <Link to="/admin/layer-activity" className="text-terra-600 dark:text-terra-400 hover:underline">
              Activity & logs
            </Link>
          </p>
        )}
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="px-5 py-4 border-b app-divider space-y-4">
          <StepIndicator activeStep={layerMode} />
          <div className="segmented w-full sm:w-auto" role="tablist" aria-label="Layer workflow">
            <button
              type="button"
              role="tab"
              aria-selected={layerMode === 'create'}
              onClick={() => setLayerMode('create')}
              className={`segmented-btn flex-1 sm:flex-none px-4 py-2 text-sm ${
                layerMode === 'create' ? 'segmented-btn-active' : ''
              }`}
            >
              1. Create layer
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
              2. Import data
            </button>
          </div>
        </div>

        {layerMode === 'create' ? (
          <>
            <div className="px-5 py-5">
              <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,16rem)] gap-6 items-start">
                <div className="space-y-5 min-w-0">
                  <label className="block">
                    <span className="text-sm font-medium text-app-text">Layer name</span>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="input mt-1.5 w-full text-base"
                      placeholder="e.g. Nickel zones, Lithium points"
                      autoFocus
                    />
                    <p className="text-xs text-app-text-muted mt-1.5">
                      This becomes the commodity name on the map.
                    </p>
                  </label>

                  <fieldset>
                    <legend className="text-sm font-medium text-app-text mb-2">Geometry type</legend>
                    <div className="grid grid-cols-3 gap-2">
                      {LAYER_TYPES.map((type) => {
                        const selected = newLayerType === type.value
                        return (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setNewLayerType(type.value)}
                            className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                              selected
                                ? 'border-terra-500 bg-terra-500/8 ring-1 ring-terra-500/20'
                                : 'border-app-border hover:bg-app-subtle/60'
                            }`}
                          >
                            <span className={selected ? 'text-terra-700 dark:text-terra-300' : 'text-app-text-muted'}>
                              {type.icon}
                            </span>
                            <span className="block text-sm font-medium text-app-text mt-2">{type.label}</span>
                            <span className="block text-[11px] text-app-text-muted mt-0.5">{type.hint}</span>
                          </button>
                        )
                      })}
                    </div>
                  </fieldset>

                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="color"
                      value={newColor}
                      onChange={(e) => {
                        setColorTouched(true)
                        setNewColor(e.target.value)
                      }}
                      className="h-11 w-12 cursor-pointer rounded-lg border border-app-border bg-transparent p-0.5 shrink-0"
                      aria-label="Layer color"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-app-text">Map color</p>
                      <p className="text-xs text-app-text-muted">
                        {colorTouched
                          ? 'Custom — adjust in Commodities anytime'
                          : matchedColor
                            ? `Auto-matched to ${matchedColor.label}`
                            : 'Picked automatically from your layer list'}
                      </p>
                    </div>
                    {colorTouched && (
                      <button
                        type="button"
                        onClick={() => setColorTouched(false)}
                        className="text-xs text-terra-600 hover:underline shrink-0"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {matchedColor && !colorTouched && (
                    <button
                      type="button"
                      onClick={() => {
                        setColorTouched(true)
                        setNewColor(matchedColor.hex)
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-terra-500/30 bg-terra-500/8 px-3 py-1.5 text-sm text-terra-800 dark:text-terra-200 hover:bg-terra-500/12 transition-colors"
                    >
                      <span
                        className="h-4 w-4 rounded-full border border-app-border/50 shrink-0"
                        style={{ backgroundColor: matchedColor.hex }}
                      />
                      Use {matchedColor.label}
                    </button>
                  )}

                  {newLayerType === 'line' && (
                    <label className="block">
                      <span className="text-sm font-medium text-app-text-secondary">Line weight</span>
                      <select
                        value={newStructureRank}
                        onChange={(e) => {
                          setStructureRankTouched(true)
                          setNewStructureRank(Number(e.target.value) as StructureLineRank)
                        }}
                        className="input mt-1.5 w-full max-w-sm"
                      >
                        {STRUCTURE_RANK_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <div className="space-y-3 pt-1">
                    {!showSwahili ? (
                      <button
                        type="button"
                        onClick={() => setShowSwahili(true)}
                        className="text-xs text-terra-600 dark:text-terra-400 hover:underline"
                      >
                        + Add Swahili name (optional)
                      </button>
                    ) : (
                      <label className="block">
                        <span className="text-sm font-medium text-app-text-secondary">Name (Swahili)</span>
                        <input
                          type="text"
                          value={newNameSw}
                          onChange={(e) => setNewNameSw(e.target.value)}
                          className="input mt-1.5 w-full"
                        />
                      </label>
                    )}
                    <label className="flex items-center gap-2 text-sm text-app-text-secondary">
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

                <aside className="rounded-xl border border-app-border bg-app-subtle/40 p-4 lg:sticky lg:top-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-app-text-muted mb-3">
                    Preview
                  </p>
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className="h-10 w-10 rounded-lg border border-app-border shrink-0"
                      style={{ backgroundColor: newColor }}
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-app-text truncate">
                        {newName.trim() || 'Layer name'}
                      </p>
                      <p className="text-xs text-app-text-muted capitalize">{newLayerType}</p>
                    </div>
                  </div>
                  <ol className="space-y-2 text-xs text-app-text-muted">
                    <li className="flex gap-2">
                      <span className="text-terra-600 font-semibold">1.</span>
                      <span>Create empty layer</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold">2.</span>
                      <span>Import shapefile or GeoJSON</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold">3.</span>
                      <span>
                        Arrange & style in{' '}
                        <Link to="/admin/minerals" className="text-terra-600 hover:underline">
                          Commodities
                        </Link>
                      </span>
                    </li>
                  </ol>
                </aside>
              </div>
            </div>

            <div className="px-5 py-4 border-t app-divider flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-xs text-app-text-muted">
                Next: switch to Import data and upload your file.
              </p>
              <button
                type="button"
                onClick={() => createLayer.mutate()}
                disabled={!canCreate || createLayer.isPending}
                className="btn-primary shrink-0"
              >
                {createLayer.isPending ? 'Creating…' : 'Create layer'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="px-5 py-5 space-y-5">
              {importableLayers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-app-border px-6 py-10 text-center">
                  <p className="text-sm text-app-text-secondary">No layers to import into yet.</p>
                  <button
                    type="button"
                    onClick={() => setLayerMode('create')}
                    className="mt-3 text-sm font-medium text-terra-600 dark:text-terra-400 hover:underline"
                  >
                    Create a layer first
                  </button>
                </div>
              ) : (
                <>
                  <label className="block">
                    <span className="text-sm font-medium text-app-text">Target layer</span>
                    <select
                      value={selectedLayerId}
                      onChange={(e) => setSelectedLayerId(e.target.value)}
                      className="input mt-1.5 w-full"
                    >
                      <option value="">Choose a layer…</option>
                      {importableLayers.map((layer) => (
                        <option key={layer.id} value={String(layer.id)}>
                          {displayName(layer)} · {layer.layer_type} · {layer.feature_count} features
                        </option>
                      ))}
                    </select>
                  </label>

                  {selectedImportLayer && (
                    <div className="flex items-center gap-3 rounded-xl border border-app-border bg-app-subtle/40 px-4 py-3">
                      <span
                        className="h-9 w-9 rounded-lg border border-app-border shrink-0"
                        style={{ backgroundColor: layerDisplayColor(selectedImportLayer) }}
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-app-text">{displayName(selectedImportLayer)}</p>
                        <p className="text-xs text-app-text-muted capitalize">
                          {selectedImportLayer.layer_type}
                          {' · '}
                          {selectedImportLayer.feature_count} existing features will be replaced
                        </p>
                      </div>
                    </div>
                  )}

                  <FileUploadField
                    label="Data file"
                    accept=".zip,.shp,.geojson,.json"
                    value={uploadFile}
                    onChange={setUploadFile}
                    placeholder="ZIP shapefile, .shp, or .geojson"
                    hint="ZIP must include .shp, .shx, and .dbf. Use WGS84 (EPSG:4326)."
                  />
                </>
              )}
            </div>

            {importableLayers.length > 0 && (
              <div className="px-5 py-4 border-t app-divider flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-xs text-app-text-muted">
                  Upload replaces all features in the selected layer.
                </p>
                <button
                  type="button"
                  onClick={() => importLayer.mutate()}
                  disabled={!canImport || importLayer.isPending}
                  className="btn-primary shrink-0"
                >
                  {importLayer.isPending ? 'Importing…' : 'Upload & replace'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
