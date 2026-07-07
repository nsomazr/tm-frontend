import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { clearLayerGeojsonCache } from '../../components/map/mapGeojsonCache'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllMapLayers, mapsApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import FileUploadField from '../../components/ui/FileUploadField'
import {
  detectLayerImportFileType,
  LAYER_IMPORT_ACCEPT,
  LAYER_IMPORT_CSV_HINT,
  LAYER_IMPORT_HINT,
} from '../../lib/layerImportFileType'
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
import {
  clampBufferKm,
  formatBufferKmRange,
  LAYER_BUFFER_KM_MAX,
  LAYER_BUFFER_KM_MIN,
} from '../../constants/layerBufferZone'
import type { MapLayer } from '../../types'

const LAYER_TYPES = [
  { value: 'polygon' as const, label: 'Polygon' },
  { value: 'point' as const, label: 'Point' },
  { value: 'line' as const, label: 'Line' },
] as const

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

type ImportOutcome = {
  layerId: string
  layerSlug: string
  layerName: string
  featureCount: number
}

function StepIndicator({
  activeStep,
  importComplete,
}: {
  activeStep: 'create' | 'import'
  importComplete?: boolean
}) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {STEPS.map((step, index) => {
        const isActive =
          step.id === activeStep ||
          (step.id === 'manage' && false)
        const isDone =
          (step.id === 'create' && activeStep === 'import') ||
          (step.id === 'import' && importComplete)
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
  const [useBufferZone, setUseBufferZone] = useState(false)
  const [newBufferKm, setNewBufferKm] = useState(10)
  const [layerMode, setLayerMode] = useState<'create' | 'import'>('create')
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace')
  const [importOutcome, setImportOutcome] = useState<ImportOutcome | null>(null)

  const { data: allLayers = [] } = useAdminLayers()

  const importableLayers = allLayers.filter((l) => l.is_active)
  const stackableLayers = allLayers.filter((l) => l.is_active)
  const selectedImportLayer = importableLayers.find((l) => String(l.id) === selectedLayerId)

  const usedLayerColors = useMemo(
    () => allLayers.map((layer) => layerFillColor(layer.style)).filter(Boolean),
    [allLayers]
  )

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
        ...(useBufferZone ? { buffer_km: clampBufferKm(newBufferKm) } : { buffer_km: null }),
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
      setUseBufferZone(false)
      setNewBufferKm(10)
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
      const fileType = detectLayerImportFileType(name)
      return mapsApi.bulkImport(layer.slug, uploadFile, fileType, layer.mineral_slug, importMode)
    },
    onSuccess: async (res) => {
      const layerId = selectedLayerId
      const layerSlug =
        res.data?.layer_slug ||
        allLayers.find((l) => String(l.id) === layerId)?.slug ||
        ''
      const layerName =
        res.data?.layer_name ||
        allLayers.find((l) => String(l.id) === layerId)?.name ||
        layerId
      const filename = uploadFile?.name ?? res.data?.filename ?? 'file'

      invalidateLayerQueries(qc)
      setUploadFile(null)

      if (res.data?.status === 'failed') {
        setImportOutcome(null)
        toast.error('Import failed', {
          description: res.data.error_message || 'The upload could not be processed.',
        })
        return
      }

      if (res.data?.status === 'completed') {
        clearLayerGeojsonCache()
        const previousCount =
          allLayers.find((l) => String(l.id) === layerId)?.feature_count ?? 0
        const updatedList = await fetchAllMapLayers({ include_inactive: '1' })
        const updated = updatedList.find((layer) => String(layer.id) === layerId)
        const featureCount = updated?.feature_count ?? 0
        const addedCount = Math.max(0, featureCount - previousCount)
        const outcome: ImportOutcome = {
          layerId,
          layerSlug: layerSlug || updated?.slug || '',
          layerName,
          featureCount,
        }
        setImportOutcome(outcome)
        const commoditiesPath = outcome.layerSlug
          ? `/admin/minerals?layer=${encodeURIComponent(outcome.layerSlug)}`
          : '/admin/minerals'
        const importDescription =
          importMode === 'append'
            ? `Added ${addedCount.toLocaleString()} features (${featureCount.toLocaleString()} total) in "${layerName}".`
            : `Imported ${featureCount.toLocaleString()} features into "${layerName}".`
        toast.success('Upload successful', {
          description: importDescription,
          action: {
            label: 'Configure in Commodities',
            onClick: () => navigate(commoditiesPath),
          },
        })
        return
      }

      setImportOutcome(null)
      toast.info('Import started', {
        description: `Processing ${filename} for "${layerName}". Refresh in a moment if features do not appear.`,
      })
    },
    onError: (err: Error) => {
      setImportOutcome(null)
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      toast.error('Import failed', { description: detail || err.message })
    },
  })

  const commoditiesPath = importOutcome?.layerSlug
    ? `/admin/minerals?layer=${encodeURIComponent(importOutcome.layerSlug)}`
    : '/admin/minerals'

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
          <StepIndicator activeStep={layerMode} importComplete={!!importOutcome} />
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
              onClick={() => {
                setLayerMode('import')
                setImportOutcome(null)
              }}
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
              <div className="max-w-xl space-y-5">
                <label className="block">
                  <span className="text-sm font-medium text-app-text">Layer name</span>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="input mt-1.5 w-full text-base"
                    placeholder="e.g. Nickel areas, Lithium points"
                    autoFocus
                  />
                </label>

                <div>
                  <span className="text-sm font-medium text-app-text">Geometry type</span>
                  <div className="segmented mt-1.5 w-full sm:w-auto" role="radiogroup" aria-label="Geometry type">
                    {LAYER_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        role="radio"
                        aria-checked={newLayerType === type.value}
                        onClick={() => setNewLayerType(type.value)}
                        className={`segmented-btn flex-1 sm:flex-none px-4 py-2 text-sm ${
                          newLayerType === type.value ? 'segmented-btn-active' : ''
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-3">
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => {
                      setColorTouched(true)
                      setNewColor(e.target.value)
                    }}
                    className="h-10 w-10 cursor-pointer rounded-lg border border-app-border bg-transparent p-0.5 shrink-0"
                    aria-label="Map color"
                  />
                  <span className="text-sm font-medium text-app-text">Map color</span>
                  {colorTouched && (
                    <button
                      type="button"
                      onClick={() => setColorTouched(false)}
                      className="text-xs text-terra-600 hover:underline"
                    >
                      Reset
                    </button>
                  )}
                </label>

                {newLayerType === 'line' && (
                  <label className="block max-w-xs">
                    <span className="text-sm font-medium text-app-text">Line weight</span>
                    <select
                      value={newStructureRank}
                      onChange={(e) => {
                        setStructureRankTouched(true)
                        setNewStructureRank(Number(e.target.value) as StructureLineRank)
                      }}
                      className="input mt-1.5 w-full"
                    >
                      {STRUCTURE_RANK_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={useBufferZone}
                      onChange={(e) => setUseBufferZone(e.target.checked)}
                      className="checkbox"
                    />
                    <span>Insight buffer</span>
                  </label>
                  {useBufferZone && (
                    <>
                      <div className="relative w-[4.5rem]">
                        <input
                          type="number"
                          min={LAYER_BUFFER_KM_MIN}
                          max={LAYER_BUFFER_KM_MAX}
                          step={1}
                          value={newBufferKm}
                          onChange={(e) => {
                            const n = Number(e.target.value)
                            if (Number.isFinite(n)) setNewBufferKm(n)
                          }}
                          onBlur={(e) => {
                            const n = Number(e.target.value)
                            if (Number.isFinite(n)) setNewBufferKm(clampBufferKm(n))
                          }}
                          className="input input-compact w-full pr-7 tabular-nums"
                          aria-label="Buffer radius in kilometers"
                        />
                        <span
                          className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-app-text-muted"
                          aria-hidden
                        >
                          km
                        </span>
                      </div>
                      <span className="text-xs text-app-text-muted">({formatBufferKmRange()})</span>
                    </>
                  )}
                </div>

                <div className="space-y-3 border-t app-divider pt-4">
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
                  <label className="checkbox-label checkbox-label--muted">
                    <input
                      type="checkbox"
                      checked={newPreview}
                      onChange={(e) => setNewPreview(e.target.checked)}
                      className="checkbox"
                    />
                    <span>Free-tier preview layer</span>
                  </label>
                </div>
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
                      onChange={(e) => {
                        setSelectedLayerId(e.target.value)
                        setImportOutcome(null)
                      }}
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
                          {selectedImportLayer.feature_count} existing features
                          {importMode === 'replace' ? ' will be replaced' : ' will be kept'}
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-sm font-medium text-app-text">Import mode</span>
                    <div className="mt-1.5 inline-flex rounded-lg border border-app-border p-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setImportMode('replace')
                          setImportOutcome(null)
                        }}
                        className={`segmented-btn px-3 py-1.5 text-sm ${
                          importMode === 'replace' ? 'segmented-btn-active' : ''
                        }`}
                      >
                        Replace existing
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImportMode('append')
                          setImportOutcome(null)
                        }}
                        className={`segmented-btn px-3 py-1.5 text-sm ${
                          importMode === 'append' ? 'segmented-btn-active' : ''
                        }`}
                      >
                        Add to existing
                      </button>
                    </div>
                    <p className="mt-1.5 text-xs text-app-text-muted">
                      {importMode === 'replace'
                        ? 'All current features in this layer are removed before the upload is applied.'
                        : 'New features from the file are added alongside the current features.'}
                    </p>
                  </div>

                  <FileUploadField
                    label="Data file"
                    accept={LAYER_IMPORT_ACCEPT}
                    value={uploadFile}
                    onChange={(file) => {
                      setUploadFile(file)
                      setImportOutcome(null)
                    }}
                    placeholder="ZIP, GeoJSON, JSON, or CSV"
                    hint={`${LAYER_IMPORT_HINT} ${LAYER_IMPORT_CSV_HINT}`}
                  />

                  {importOutcome && (
                    <section className="rounded-xl border border-terra-500/30 bg-terra-500/8 overflow-hidden">
                      <div className="px-4 py-3 border-b border-terra-500/20">
                        <p className="text-sm font-semibold text-app-text">Import complete</p>
                        <p className="text-xs text-app-text-muted mt-1">
                          {importOutcome.featureCount.toLocaleString()} features in{' '}
                          <span className="font-medium text-app-text">{importOutcome.layerName}</span>
                          . What would you like to do next?
                        </p>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="rounded-lg border border-app-border bg-app-surface px-3 py-3">
                          <p className="text-sm font-medium text-app-text">
                            1. Configure in Commodities
                          </p>
                          <p className="text-xs text-app-text-muted mt-1 leading-relaxed">
                            Set draw order, map color, line weight, and insight buffer before the
                            layer goes live for users.
                          </p>
                          <Link to={commoditiesPath} className="btn-primary text-sm mt-3 inline-flex">
                            Open Commodities
                          </Link>
                        </div>
                        <div className="rounded-lg border border-app-border bg-app-surface px-3 py-3">
                          <p className="text-sm font-medium text-app-text">2. Preview on map</p>
                          <p className="text-xs text-app-text-muted mt-1 leading-relaxed">
                            Turn on the layer from the map sidebar to verify geometry and coverage.
                          </p>
                          <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="btn-secondary text-sm mt-3"
                          >
                            View on map
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setImportOutcome(null)}
                          className="text-xs text-terra-600 dark:text-terra-400 hover:underline"
                        >
                          Import another file to this layer
                        </button>
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>

            {importableLayers.length > 0 && (
              <div className="px-5 py-4 border-t app-divider flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-xs text-app-text-muted">
                  {importOutcome
                    ? 'Step 3: arrange and style this layer in Commodities.'
                    : importMode === 'replace'
                      ? 'Upload replaces all features in the selected layer.'
                      : 'Upload adds features to the selected layer.'}
                </p>
                {!importOutcome && (
                  <button
                    type="button"
                    onClick={() => importLayer.mutate()}
                    disabled={!canImport || importLayer.isPending}
                    className="btn-primary shrink-0"
                  >
                    {importLayer.isPending
                      ? 'Importing…'
                      : importMode === 'replace'
                        ? 'Upload & replace'
                        : 'Upload & add'}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
