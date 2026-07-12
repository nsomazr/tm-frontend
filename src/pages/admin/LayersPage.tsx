import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { clearLayerGeojsonCache } from '../../components/map/mapGeojsonCache'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllMapLayers, mapsApi, mineralsApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import FileUploadField from '../../components/ui/FileUploadField'
import UploadProgressBar from '../../components/ui/UploadProgressBar'
import {
  detectLayerImportFileType,
  LAYER_IMPORT_ACCEPT,
  LAYER_IMPORT_CSV_HINT,
  LAYER_IMPORT_HINT,
} from '../../lib/layerImportFileType'
import { toast } from '../../components/ui/toast'
import { ADMIN_LAYERS_KEY, useAdminLayers } from '../../hooks/useAdminLayers'
import { useDisplayName } from '../../i18n/useDisplayName'
import {
  layerDisplayColor,
  layerFillColor,
  layerStyleWithColor,
  suggestLayerStyle,
} from '../../components/admin/layerColors'
import MineralColorPickerModal from '../../components/admin/MineralColorPickerModal'
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
import {
  clampHeatmapWeight,
  LAYER_HEATMAP_WEIGHT_DEFAULT,
  LAYER_HEATMAP_WEIGHT_MAX,
  LAYER_HEATMAP_WEIGHT_MIN,
} from '../../constants/layerHeatmapWeight'
import type { MapLayer } from '../../types'

const LAYER_TYPES = [
  { value: 'polygon' as const, label: 'Polygon' },
  { value: 'point' as const, label: 'Point' },
  { value: 'line' as const, label: 'Line' },
] as const

function invalidateLayerQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ADMIN_LAYERS_KEY })
  qc.invalidateQueries({ queryKey: ['layers'] })
  qc.invalidateQueries({ queryKey: ['map-layers'] })
  qc.invalidateQueries({ queryKey: ['layer-uploads'] })
  qc.invalidateQueries({ queryKey: ['mineral'] })
  qc.invalidateQueries({ queryKey: ['minerals'] })
}

/** Attach the new layer to selected layers' commodities, and/or adopt selected point/line layers. */
async function persistLinkedLayers(
  created: MapLayer,
  linkedLayerIds: number[],
  allLayers: MapLayer[],
) {
  if (!linkedLayerIds.length) return

  const selected = allLayers.filter((layer) => linkedLayerIds.includes(layer.id))
  const pointLineIds = selected
    .filter((layer) => layer.layer_type === 'point' || layer.layer_type === 'line')
    .map((layer) => layer.id)

  if (created.mineral_slug && pointLineIds.length > 0) {
    const { data: mineral } = await mineralsApi.get(created.mineral_slug)
    const next = new Set([...(mineral.associated_layer_ids ?? []), ...pointLineIds])
    await mineralsApi.update(created.mineral_slug, {
      associated_layer_ids: [...next],
    })
  }

  const targetSlugs = [
    ...new Set(
      selected
        .map((layer) => layer.mineral_slug)
        .filter((slug): slug is string => Boolean(slug) && slug !== created.mineral_slug),
    ),
  ]

  await Promise.all(
    targetSlugs.map(async (slug) => {
      const { data: mineral } = await mineralsApi.get(slug)
      const next = new Set([...(mineral.associated_layer_ids ?? []), created.id])
      await mineralsApi.update(slug, { associated_layer_ids: [...next] })
    }),
  )
}

type ImportOutcome = {
  layerId: string
  layerSlug: string
  layerName: string
  featureCount: number
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
  const [newLayerType, setNewLayerType] = useState<'polygon' | 'point' | 'line'>('polygon')
  const [linkedLayerIds, setLinkedLayerIds] = useState<number[]>([])
  const [newPreview, setNewPreview] = useState(false)
  const [newColor, setNewColor] = useState('#0D9488')
  const [colorTouched, setColorTouched] = useState(false)
  const [newStructureRank, setNewStructureRank] = useState<StructureLineRank>(2)
  const [structureRankTouched, setStructureRankTouched] = useState(false)
  const [useBufferZone, setUseBufferZone] = useState(false)
  const [newBufferKm, setNewBufferKm] = useState(10)
  const [newHeatmapWeight, setNewHeatmapWeight] = useState(LAYER_HEATMAP_WEIGHT_DEFAULT)
  const [layerMode, setLayerMode] = useState<'create' | 'import'>('create')
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace')
  const [importOutcome, setImportOutcome] = useState<ImportOutcome | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

  const { data: allLayers = [] } = useAdminLayers()

  const importableLayers = allLayers.filter((l) => l.is_active)
  const stackableLayers = allLayers.filter((l) => l.is_active)
  const linkableLayers = useMemo(
    () =>
      [...allLayers.filter((layer) => layer.is_active)].sort((a, b) =>
        displayName(a).localeCompare(displayName(b)),
      ),
    [allLayers, displayName],
  )

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

  const toggleLinkedLayer = (layerId: number) => {
    setLinkedLayerIds((prev) =>
      prev.includes(layerId) ? prev.filter((id) => id !== layerId) : [...prev, layerId],
    )
  }

  const createLayer = useMutation({
    mutationFn: async () => {
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
        heatmap_weight: clampHeatmapWeight(newHeatmapWeight),
      }
      const res = await mapsApi.createLayer(payload)
      try {
        await persistLinkedLayers(res.data, linkedLayerIds, allLayers)
      } catch {
        toast.error('Layer created, but linking failed', {
          description: 'You can link layers later in Commodities → Edit.',
        })
      }
      return res
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
      setLinkedLayerIds([])
      setNewPreview(false)
      setColorTouched(false)
      setStructureRankTouched(false)
      setNewStructureRank(2)
      setUseBufferZone(false)
      setNewBufferKm(10)
      setNewHeatmapWeight(LAYER_HEATMAP_WEIGHT_DEFAULT)
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
      setUploadProgress(0)
      return mapsApi.bulkImport(
        layer.slug,
        uploadFile,
        fileType,
        layer.mineral_slug,
        importMode,
        (percent) => setUploadProgress(percent),
      )
    },
    onSuccess: async (res) => {
      setUploadProgress(null)
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
      setUploadProgress(null)
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
  const linkedSummary =
    linkedLayerIds.length === 0
      ? 'None selected'
      : `${linkedLayerIds.length} selected`

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-app-text">Layers</h1>
          <p className="text-sm text-app-muted mt-0.5">
            Create, import, then style in{' '}
            <Link to="/admin/minerals" className="text-terra-600 dark:text-terra-400 hover:underline">
              Commodities
            </Link>
            .
          </p>
        </div>
        {isAdmin && (
          <p className="text-xs text-app-text-muted">
            <Link to="/admin/boundaries?level=4" className="text-terra-600 dark:text-terra-400 hover:underline">
              Boundaries
            </Link>
            {' · '}
            <Link to="/admin/layer-activity" className="text-terra-600 dark:text-terra-400 hover:underline">
              Activity
            </Link>
          </p>
        )}
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="px-4 py-3 border-b app-divider">
          <div className="segmented w-full sm:w-auto" role="tablist" aria-label="Layer workflow">
            <button
              type="button"
              role="tab"
              aria-selected={layerMode === 'create'}
              onClick={() => setLayerMode('create')}
              className={`segmented-btn flex-1 sm:flex-none px-3 py-1.5 text-sm ${
                layerMode === 'create' ? 'segmented-btn-active' : ''
              }`}
            >
              1. Create
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={layerMode === 'import'}
              onClick={() => {
                setLayerMode('import')
                setImportOutcome(null)
              }}
              className={`segmented-btn flex-1 sm:flex-none px-3 py-1.5 text-sm ${
                layerMode === 'import' ? 'segmented-btn-active' : ''
              }`}
            >
              2. Import
            </button>
            <Link
              to="/admin/minerals"
              className="segmented-btn flex-1 sm:flex-none px-3 py-1.5 text-sm text-center"
            >
              3. Commodities
            </Link>
          </div>
        </div>

        {layerMode === 'create' ? (
          <>
            <div className="px-4 py-4">
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="block sm:col-span-2">
                    <span className="text-sm font-medium text-app-text">Name</span>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="input mt-1 w-full"
                      placeholder="e.g. Lithium points"
                      autoFocus
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-app-text-secondary">Swahili</span>
                    <input
                      type="text"
                      value={newNameSw}
                      onChange={(e) => setNewNameSw(e.target.value)}
                      className="input mt-1 w-full"
                      placeholder="Optional"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-app-text">Link Layers</span>
                      <span className="text-xs text-app-text-muted">{linkedSummary}</span>
                    </div>
                    {linkableLayers.length === 0 ? (
                      <p className="mt-1 text-xs text-app-text-muted rounded-xl border border-dashed border-app-border px-3 py-2.5">
                        No other layers yet. Optional.
                      </p>
                    ) : (
                      <ul className="mt-1 max-h-36 overflow-y-auto rounded-xl border border-app-border divide-y app-divider">
                        {linkableLayers.map((layer) => {
                          const checked = linkedLayerIds.includes(layer.id)
                          return (
                            <li key={layer.id}>
                              <label className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-app-subtle/50">
                                <input
                                  type="checkbox"
                                  className="checkbox"
                                  checked={checked}
                                  onChange={() => toggleLinkedLayer(layer.id)}
                                />
                                <span
                                  className="h-2.5 w-2.5 rounded-full shrink-0 border border-app-border/50"
                                  style={{ backgroundColor: layerDisplayColor(layer) }}
                                  aria-hidden
                                />
                                <span className="min-w-0 flex-1 text-sm text-app-text truncate">
                                  {displayName(layer)}
                                </span>
                                <span className="text-[10px] uppercase tracking-wide text-app-text-muted">
                                  {layer.layer_type}
                                </span>
                              </label>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                    <p className="mt-1 text-xs text-app-text-muted">
                      Optional. Pick any combination, or none.
                    </p>
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-app-text">Type</span>
                    <div
                      className="segmented mt-1 w-full"
                      role="radiogroup"
                      aria-label="Geometry type"
                    >
                      {LAYER_TYPES.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          role="radio"
                          aria-checked={newLayerType === type.value}
                          onClick={() => setNewLayerType(type.value)}
                          className={`segmented-btn flex-1 px-2 py-1.5 text-sm ${
                            newLayerType === type.value ? 'segmented-btn-active' : ''
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-x-4 sm:gap-y-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-app-text shrink-0">Color</span>
                    <input
                      type="color"
                      value={newColor}
                      onChange={(e) => {
                        setColorTouched(true)
                        setNewColor(e.target.value)
                      }}
                      className="h-8 w-8 cursor-pointer rounded-md border border-app-border bg-transparent p-0.5 shrink-0"
                      aria-label="Map color"
                    />
                    <button
                      type="button"
                      onClick={() => setColorPickerOpen(true)}
                      className="text-xs text-terra-600 dark:text-terra-400 hover:underline"
                    >
                      Palette
                    </button>
                    {colorTouched && (
                      <button
                        type="button"
                        onClick={() => setColorTouched(false)}
                        className="text-xs text-app-text-muted hover:underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {newLayerType === 'line' && (
                    <label className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-app-text shrink-0">Line</span>
                      <select
                        value={newStructureRank}
                        onChange={(e) => {
                          setStructureRankTouched(true)
                          setNewStructureRank(Number(e.target.value) as StructureLineRank)
                        }}
                        className="input input-compact min-w-0 flex-1 sm:w-32 sm:flex-none"
                      >
                        {STRUCTURE_RANK_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label className="flex items-center gap-2">
                    <span className="text-sm font-medium text-app-text shrink-0">Heatmap</span>
                    <input
                      type="number"
                      min={LAYER_HEATMAP_WEIGHT_MIN}
                      max={LAYER_HEATMAP_WEIGHT_MAX}
                      step={1}
                      value={newHeatmapWeight}
                      onChange={(e) => {
                        const n = Number(e.target.value)
                        if (Number.isFinite(n)) setNewHeatmapWeight(n)
                      }}
                      onBlur={(e) => {
                        const n = Number(e.target.value)
                        if (Number.isFinite(n)) setNewHeatmapWeight(clampHeatmapWeight(n))
                      }}
                      className="input input-compact w-14 tabular-nums"
                      aria-label="Heatmap weight"
                      title={`0–${LAYER_HEATMAP_WEIGHT_MAX}`}
                    />
                  </label>

                  <div className="inline-flex items-center gap-2 flex-wrap">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={useBufferZone}
                        onChange={(e) => setUseBufferZone(e.target.checked)}
                        className="checkbox"
                      />
                      <span>Buffer</span>
                    </label>
                    {useBufferZone && (
                      <>
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
                          className="input input-compact w-14 tabular-nums"
                          aria-label="Buffer radius in kilometers"
                          title={formatBufferKmRange()}
                        />
                        <span className="text-xs text-app-text-muted">km</span>
                      </>
                    )}
                  </div>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={newPreview}
                      onChange={(e) => setNewPreview(e.target.checked)}
                      className="checkbox"
                    />
                    <span>Free map</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t app-divider flex justify-end">
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
            <div className="px-4 py-4 space-y-3">
              {importableLayers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-app-border px-4 py-8 text-center">
                  <p className="text-sm text-app-text-secondary">No layers yet.</p>
                  <button
                    type="button"
                    onClick={() => setLayerMode('create')}
                    className="mt-2 text-sm font-medium text-terra-600 dark:text-terra-400 hover:underline"
                  >
                    Create one
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    <label className="block min-w-0">
                      <span className="text-sm font-medium text-app-text">Layer</span>
                      <select
                        value={selectedLayerId}
                        onChange={(e) => {
                          setSelectedLayerId(e.target.value)
                          setImportOutcome(null)
                        }}
                        className="input mt-1 w-full"
                      >
                        <option value="">Select…</option>
                        {importableLayers.map((layer) => (
                          <option key={layer.id} value={String(layer.id)}>
                            {displayName(layer)} · {layer.layer_type} · {layer.feature_count}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div>
                      <span className="text-sm font-medium text-app-text">Mode</span>
                      <div className="segmented mt-1" role="group" aria-label="Import mode">
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
                          Replace
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
                          Append
                        </button>
                      </div>
                    </div>
                  </div>

                  <FileUploadField
                    label="File"
                    accept={LAYER_IMPORT_ACCEPT}
                    value={uploadFile}
                    onChange={(file) => {
                      setUploadFile(file)
                      setImportOutcome(null)
                      setUploadProgress(null)
                    }}
                    placeholder="ZIP, GeoJSON, or CSV"
                    hint={`${LAYER_IMPORT_HINT} · ${LAYER_IMPORT_CSV_HINT}`}
                  />

                  {importLayer.isPending && uploadProgress != null && (
                    <UploadProgressBar
                      progress={uploadProgress}
                      label={
                        uploadProgress >= 100
                          ? 'Processing…'
                          : 'Uploading…'
                      }
                    />
                  )}

                  {importOutcome && (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-terra-500/30 bg-terra-500/8 px-3 py-2.5">
                      <p className="text-sm text-app-text min-w-0 flex-1">
                        <span className="font-medium">{importOutcome.featureCount.toLocaleString()}</span>
                        {' '}features in {importOutcome.layerName}
                      </p>
                      <Link to={commoditiesPath} className="btn-primary text-sm py-1.5">
                        Commodities
                      </Link>
                      <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="btn-secondary text-sm py-1.5"
                      >
                        Map
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportOutcome(null)}
                        className="text-xs text-terra-600 dark:text-terra-400 hover:underline px-1"
                      >
                        Import more
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {importableLayers.length > 0 && !importOutcome && (
              <div className="px-4 py-3 border-t app-divider flex justify-end">
                <button
                  type="button"
                  onClick={() => importLayer.mutate()}
                  disabled={!canImport || importLayer.isPending}
                  className="btn-primary shrink-0"
                >
                  {importLayer.isPending
                    ? uploadProgress != null && uploadProgress < 100
                      ? `Uploading ${uploadProgress}%…`
                      : 'Processing…'
                    : importMode === 'replace'
                      ? 'Upload & replace'
                      : 'Upload & add'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <MineralColorPickerModal
        open={colorPickerOpen}
        onClose={() => setColorPickerOpen(false)}
        layerName={newName}
        usedColors={usedLayerColors}
        selectedColor={newColor}
        onSelect={(hex) => {
          setColorTouched(true)
          setNewColor(hex)
        }}
      />
    </div>
  )
}
