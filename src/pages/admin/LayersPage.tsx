import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { clearLayerGeojsonCache } from '../../components/map/mapGeojsonCache'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAllMapLayers, fetchAllMinerals, mapsApi, mineralsApi } from '../../api'
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
  colorInputValue,
  layerDisplayColor,
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
  qc.invalidateQueries({ queryKey: ['mineral-catalog'] })
  qc.invalidateQueries({ queryKey: ['mineral-catalog-nav'] })
}

/** Wait until a background Celery import finishes so the minerals navbar can refresh. */
async function waitForLayerUpload(uploadId: number, timeoutMs = 180_000) {
  const started = Date.now()
  for (;;) {
    const { data } = await mapsApi.upload(uploadId)
    if (data.status === 'completed' || data.status === 'failed') return data
    if (Date.now() - started > timeoutMs) {
      return data
    }
    await new Promise((resolve) => window.setTimeout(resolve, 1500))
  }
}

/** Link a new polygon/point layer to all structure (line) layers on its commodity. */
async function persistStructureLinks(
  created: MapLayer,
  allLayers: MapLayer[],
  linkWithStructure: boolean,
) {
  if (!linkWithStructure || !created.mineral_slug) return

  if (created.layer_type === 'line') {
    // New structure: attach it to every commodity that already has polygon/point layers.
    const mineralSlugs = new Set(
      allLayers
        .filter(
          (layer) =>
            layer.is_active &&
            (layer.layer_type === 'polygon' || layer.layer_type === 'point') &&
            layer.mineral_slug,
        )
        .map((layer) => layer.mineral_slug as string),
    )
    mineralSlugs.add(created.mineral_slug)
    await Promise.all(
      [...mineralSlugs].map(async (slug) => {
        const { data: mineral } = await mineralsApi.get(slug)
        const next = new Set([...(mineral.associated_layer_ids ?? []), created.id])
        await mineralsApi.update(slug, { associated_layer_ids: [...next] })
      }),
    )
    return
  }

  // Polygon / point: attach all existing structure layers to this commodity.
  const structureIds = allLayers
    .filter((layer) => layer.is_active && layer.layer_type === 'line')
    .map((layer) => layer.id)
  if (!structureIds.length) return

  const { data: mineral } = await mineralsApi.get(created.mineral_slug)
  const next = new Set([...(mineral.associated_layer_ids ?? []), ...structureIds])
  await mineralsApi.update(created.mineral_slug, {
    associated_layer_ids: [...next],
  })
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
  const [newLayerType, setNewLayerType] = useState<'polygon' | 'point' | 'line'>(
    isAdmin ? 'polygon' : 'point',
  )
  const [linkToLayerId, setLinkToLayerId] = useState('')
  const [linkWithStructure, setLinkWithStructure] = useState(true)
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
  const managedLayers = useMemo(
    () => (isAdmin ? allLayers : allLayers.filter((layer) => layer.layer_type === 'point')),
    [allLayers, isAdmin],
  )
  const availableLayerTypes = useMemo(
    () => (isAdmin ? LAYER_TYPES : LAYER_TYPES.filter((type) => type.value === 'point')),
    [isAdmin],
  )
  const { data: mineralsList = [] } = useQuery({
    queryKey: ['minerals', 'all'],
    queryFn: fetchAllMinerals,
  })

  const structureLayers = useMemo(
    () =>
      allLayers.filter(
        (layer) => layer.is_active && layer.layer_type === 'line' && (layer.feature_count ?? 0) > 0,
      ),
    [allLayers],
  )

  const linkableExistingLayers = useMemo(
    () =>
      [...managedLayers.filter((layer) => layer.is_active)].sort((a, b) =>
        displayName(a).localeCompare(displayName(b)),
      ),
    [managedLayers, displayName],
  )

  const importableLayers = managedLayers.filter((l) => l.is_active)
  const stackableLayers = managedLayers.filter((l) => l.is_active)

  const usedLayerColors = useMemo(
    () => allLayers.map((layer) => layerDisplayColor(layer)).filter(Boolean),
    [allLayers]
  )

  const linkToLayer = useMemo(
    () => linkableExistingLayers.find((layer) => String(layer.id) === linkToLayerId) ?? null,
    [linkableExistingLayers, linkToLayerId],
  )

  const linkedMineralColor = useMemo(() => {
    if (!linkToLayer?.mineral) return undefined
    return mineralsList.find((mineral) => mineral.id === linkToLayer.mineral)?.color
  }, [linkToLayer, mineralsList])

  const colorSuggestion = useMemo(
    () =>
      suggestLayerStyle(
        newName || linkToLayer?.mineral_name || '',
        usedLayerColors,
        newLayerType,
        linkedMineralColor,
      ),
    [newName, linkToLayer, usedLayerColors, newLayerType, linkedMineralColor],
  )

  useEffect(() => {
    if (colorTouched) return
    setNewColor(colorSuggestion.fill)
  }, [colorSuggestion.fill, colorTouched])

  useEffect(() => {
    if (structureRankTouched || newLayerType !== 'line') return
    setNewStructureRank(suggestStructureRank(newName, newLayerType))
  }, [newName, newLayerType, structureRankTouched])

  // Polygons and points stay linked to structures by default.
  useEffect(() => {
    if (newLayerType === 'polygon' || newLayerType === 'point') {
      setLinkWithStructure(true)
    }
  }, [newLayerType])

  const createLayer = useMutation({
    mutationFn: async () => {
      if (!newName.trim()) throw new Error('Layer name is required')
      const layerType = isAdmin ? newLayerType : 'point'
      const style = suggestLayerStyle(
        newName,
        usedLayerColors,
        layerType,
        linkedMineralColor,
      )
      const fill = colorTouched ? newColor : style.fill
      const baseStyle = layerStyleWithColor(
        { fill, stroke: fill, strokeWidth: style.strokeWidth },
        layerType,
        fill
      )
      const payload: Partial<MapLayer> = {
        name: newName.trim(),
        name_sw: newNameSw.trim(),
        layer_type: layerType,
        z_index: stackableLayers.length,
        is_preview: isAdmin ? newPreview : false,
        is_active: true,
        style:
          layerType === 'line'
            ? layerStyleWithStructureRank(baseStyle, newStructureRank)
            : baseStyle,
        ...(isAdmin && useBufferZone ? { buffer_km: clampBufferKm(newBufferKm) } : { buffer_km: null }),
        heatmap_weight: isAdmin ? clampHeatmapWeight(newHeatmapWeight) : LAYER_HEATMAP_WEIGHT_DEFAULT,
      }
      if (linkToLayer?.mineral) {
        payload.mineral = linkToLayer.mineral
      }
      const res = await mapsApi.createLayer(payload)
      try {
        if (isAdmin) {
          await persistStructureLinks(res.data, allLayers, linkWithStructure)
        }
      } catch {
        toast.error('Layer created, but structure linking failed', {
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
      setLinkToLayerId('')
      setLinkWithStructure(true)
      setNewPreview(false)
      setColorTouched(false)
      setStructureRankTouched(false)
      setNewStructureRank(2)
      setUseBufferZone(false)
      setNewBufferKm(10)
      setNewHeatmapWeight(LAYER_HEATMAP_WEIGHT_DEFAULT)
      if (!isAdmin) setNewLayerType('point')
    },
    onError: (err: Error) => {
      toast.error('Could not create layer', { description: err.message })
    },
  })

  const importLayer = useMutation({
    mutationFn: () => {
      const layer = managedLayers.find((l) => String(l.id) === selectedLayerId)
      if (!layer || !uploadFile) throw new Error('Missing layer or file')
      if (!isAdmin && layer.layer_type !== 'point') {
        throw new Error('Managers may only upload point occurrence layers.')
      }
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
      let upload = res.data
      const layerSlug =
        upload?.layer_slug ||
        allLayers.find((l) => String(l.id) === layerId)?.slug ||
        ''
      const layerName =
        upload?.layer_name ||
        allLayers.find((l) => String(l.id) === layerId)?.name ||
        layerId
      const filename = uploadFile?.name ?? upload?.filename ?? 'file'

      setUploadFile(null)

      if (upload?.status === 'pending' || upload?.status === 'processing') {
        toast.info('Import started', {
          description: `Processing ${filename} for "${layerName}"…`,
        })
        try {
          upload = await waitForLayerUpload(upload.id)
        } catch {
          invalidateLayerQueries(qc)
          setImportOutcome(null)
          toast.info('Import is still processing', {
            description: 'Refresh the map in a moment if the layer or minerals menu is not updated yet.',
          })
          return
        }
      }

      invalidateLayerQueries(qc)

      if (upload?.status === 'failed') {
        setImportOutcome(null)
        toast.error('Import failed', {
          description: upload.error_message || 'The upload could not be processed.',
        })
        return
      }

      if (upload?.status === 'completed') {
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
          description: `${importDescription} It will appear in the minerals menu on the map.`,
          action: {
            label: 'Configure in Commodities',
            onClick: () => navigate(commoditiesPath),
          },
        })
        return
      }

      setImportOutcome(null)
      toast.info('Import still running', {
        description: `Processing ${filename} for "${layerName}". Refresh the map shortly if it is not listed yet.`,
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
  const advancedOptionCount =
    (newNameSw.trim() ? 1 : 0) +
    (isAdmin && useBufferZone ? 1 : 0) +
    (isAdmin && newPreview ? 1 : 0) +
    (isAdmin && newLayerType === 'line' && structureRankTouched ? 1 : 0) +
    (isAdmin && newHeatmapWeight !== LAYER_HEATMAP_WEIGHT_DEFAULT ? 1 : 0)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-app-text">
            {isAdmin ? 'Layers' : 'Occurrences'}
          </h1>
          <p className="text-sm text-app-muted mt-0.5">
            {isAdmin ? (
              <>
                Create, import, then style in{' '}
                <Link to="/admin/minerals" className="text-terra-600 dark:text-terra-400 hover:underline">
                  Commodities
                </Link>
                .
              </>
            ) : (
              'Upload point occurrences for your assigned commodities. Polygons and other map tools are managed by platform admins.'
            )}
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
              <div className="mx-auto max-w-xl space-y-4">
                <label className="block">
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

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block min-w-0">
                    <span className="text-sm font-medium text-app-text">Link to</span>
                    <select
                      value={linkToLayerId}
                      onChange={(e) => setLinkToLayerId(e.target.value)}
                      className="input mt-1 w-full"
                    >
                      <option value="">None (new group)</option>
                      {linkableExistingLayers.map((layer) => (
                        <option key={layer.id} value={String(layer.id)}>
                          {displayName(layer)}
                          {layer.mineral_name ? ` · ${layer.mineral_name}` : ''}
                          {` · ${layer.layer_type}`}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-app-text-muted">
                      {linkableExistingLayers.length > 0
                        ? 'Optional. Group this with an existing layer, or leave as a new group.'
                        : 'No layers yet. This creates a new group from the layer name.'}
                    </p>
                  </label>

                  <div className="min-w-0">
                    <span className="text-sm font-medium text-app-text">Type</span>
                    <div
                      className="segmented mt-1 w-full"
                      role="radiogroup"
                      aria-label="Geometry type"
                    >
                      {availableLayerTypes.map((type) => (
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
                    {!isAdmin ? (
                      <p className="mt-1 text-xs text-app-text-muted">
                        Managers upload point occurrences only.
                      </p>
                    ) : null}
                  </div>
                </div>

                {isAdmin ? (
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-app-border bg-app-subtle/40 px-3.5 py-3">
                    <input
                      type="checkbox"
                      className="checkbox mt-0.5"
                      checked={linkWithStructure}
                      onChange={(e) => setLinkWithStructure(e.target.checked)}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-app-text">
                        {newLayerType === 'line'
                          ? 'Link with polygons & points'
                          : 'Link with structure'}
                      </span>
                      <span className="mt-0.5 block text-xs text-app-text-muted">
                        {newLayerType === 'line'
                          ? 'Connect this structure to mineral polygon and point layers (on by default).'
                          : structureLayers.length > 0
                            ? `On by default. Ties this layer to ${structureLayers.length} structure layer${structureLayers.length === 1 ? '' : 's'} for insights and heatmaps.`
                            : 'On by default. When structure lines exist, this polygon/point layer stays connected to them.'}
                      </span>
                    </span>
                  </label>
                ) : null}

                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-app-border bg-app-subtle/40 px-3 py-2.5">
                  <input
                    type="color"
                    value={colorInputValue(newColor)}
                    onChange={(e) => {
                      setColorTouched(true)
                      setNewColor(e.target.value)
                    }}
                    className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-app-border bg-transparent p-0.5"
                    aria-label="Map color"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-app-text">Map color</p>
                    <p className="truncate font-mono text-xs text-app-text-muted">
                      {colorInputValue(newColor)}
                      {!colorTouched && colorSuggestion.sourceLabel
                        ? ` · Auto from ${colorSuggestion.sourceLabel}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {colorTouched ? (
                      <button
                        type="button"
                        onClick={() => setColorTouched(false)}
                        className="text-xs text-app-text-muted hover:underline"
                      >
                        Use auto
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setColorPickerOpen(true)}
                      className="btn-secondary !px-3 !py-1.5 text-xs"
                    >
                      Palette
                    </button>
                  </div>
                </div>

                <details className="group rounded-xl border border-app-border open:bg-app-subtle/20">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-2.5 text-sm font-medium text-app-text marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-2">
                      More options
                      {advancedOptionCount > 0 ? (
                        <span className="rounded-full bg-terra-500/15 px-2 py-0.5 text-[11px] font-semibold text-terra-800 dark:text-terra-300">
                          {advancedOptionCount} set
                        </span>
                      ) : (
                        <span className="text-xs font-normal text-app-text-muted">
                          Optional
                        </span>
                      )}
                    </span>
                    <span
                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-app-border text-sm font-semibold leading-none text-app-text-muted transition-transform group-open:rotate-45"
                      aria-hidden
                    >
                      +
                    </span>
                  </summary>

                  <div className="space-y-4 border-t border-app-border px-3.5 py-3.5">
                    <label className="block">
                      <span className="text-sm font-medium text-app-text">Swahili name</span>
                      <input
                        type="text"
                        value={newNameSw}
                        onChange={(e) => setNewNameSw(e.target.value)}
                        className="input mt-1 w-full"
                        placeholder="Optional"
                      />
                    </label>

                    {isAdmin && newLayerType === 'line' ? (
                      <label className="block">
                        <span className="text-sm font-medium text-app-text">Line style</span>
                        <select
                          value={newStructureRank}
                          onChange={(e) => {
                            setStructureRankTouched(true)
                            setNewStructureRank(Number(e.target.value) as StructureLineRank)
                          }}
                          className="input mt-1 w-full"
                        >
                          {STRUCTURE_RANK_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}

                    {isAdmin ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="text-sm font-medium text-app-text">Heatmap weight</span>
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
                            className="input mt-1 w-full tabular-nums"
                            aria-label="Heatmap weight"
                            title={`0-${LAYER_HEATMAP_WEIGHT_MAX}`}
                          />
                        </label>

                        <div className="flex flex-col justify-end gap-2 sm:pb-1">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={useBufferZone}
                              onChange={(e) => setUseBufferZone(e.target.checked)}
                              className="checkbox"
                            />
                            <span>Buffer zone</span>
                          </label>
                          {useBufferZone ? (
                            <div className="flex items-center gap-2 pl-6">
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
                                className="input input-compact w-20 tabular-nums"
                                aria-label="Buffer radius in kilometers"
                                title={formatBufferKmRange()}
                              />
                              <span className="text-xs text-app-text-muted">km</span>
                            </div>
                          ) : null}
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={newPreview}
                              onChange={(e) => setNewPreview(e.target.checked)}
                              className="checkbox"
                            />
                            <span>Show on free map</span>
                          </label>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </details>
              </div>
            </div>

            <div className="flex justify-end border-t app-divider px-4 py-3">
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
        selectedColor={colorInputValue(newColor)}
        onSelect={(hex) => {
          setColorTouched(true)
          setNewColor(hex)
        }}
      />
    </div>
  )
}
