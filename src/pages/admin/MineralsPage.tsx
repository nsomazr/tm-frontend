import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { mapsApi, fetchAllMinerals, mineralsApi } from '../../api'
import { ADMIN_LAYERS_KEY, useAdminLayers } from '../../hooks/useAdminLayers'
import { useAuth } from '../../auth/AuthContext'
import CommodityLayersPanel from '../../components/admin/CommodityLayersPanel'
import {
  layerDisplayColor,
  layerStyleWithColor,
} from '../../components/admin/layerColors'
import MineralColorPickerModal from '../../components/admin/MineralColorPickerModal'
import {
  SPECIAL_COMMODITY_FALLBACKS,
  TRACKED_ELEMENT_COMMODITIES,
} from '../../constants/periodicCommodities'
import { useDisplayName } from '../../i18n/useDisplayName'
import { toast } from '../../components/ui/toast'
import type { MapLayer } from '../../types'

const NAV_COMMODITY_SLUGS = new Set([
  ...TRACKED_ELEMENT_COMMODITIES.map((c) => c.slug),
  ...SPECIAL_COMMODITY_FALLBACKS.map((c) => c.slug),
])

function CommodityEditor({
  layer,
  allLayers,
  onClose,
  usedColors,
}: {
  layer: MapLayer
  allLayers: MapLayer[]
  onClose: () => void
  usedColors: string[]
}) {
  const qc = useQueryClient()
  const { isManager } = useAuth()
  const displayName = useDisplayName()
  const [name, setName] = useState(layer.name)
  const [nameSw, setNameSw] = useState(layer.name_sw || '')
  const [color, setColor] = useState(layerDisplayColor(layer))
  const [mineralId, setMineralId] = useState(String(layer.mineral || ''))
  const [associatedIds, setAssociatedIds] = useState<number[]>([])
  const [colorPickerOpen, setColorPickerOpen] = useState(false)

  const { data: mineralsList = [] } = useQuery({
    queryKey: ['minerals', 'all'],
    queryFn: fetchAllMinerals,
  })

  const commodityOptions = useMemo(() => {
    const list = mineralsList.filter((m) => m.is_active)
    return [...list].sort((a, b) => {
      const aNav = NAV_COMMODITY_SLUGS.has(a.slug) ? 0 : a.slug === 'general' ? 2 : 1
      const bNav = NAV_COMMODITY_SLUGS.has(b.slug) ? 0 : b.slug === 'general' ? 2 : 1
      if (aNav !== bNav) return aNav - bNav
      return a.name.localeCompare(b.name)
    })
  }, [mineralsList])

  const selectedMineralSlug =
    commodityOptions.find((m) => String(m.id) === mineralId)?.slug || layer.mineral_slug

  const { data: mineral } = useQuery({
    queryKey: ['mineral', selectedMineralSlug],
    queryFn: () => mineralsApi.get(selectedMineralSlug).then((r) => r.data),
    enabled: !!selectedMineralSlug,
  })

  useEffect(() => {
    if (mineral?.associated_layer_ids) {
      setAssociatedIds(mineral.associated_layer_ids)
    }
  }, [mineral?.associated_layer_ids])

  const associableLayers = useMemo(
    () =>
      allLayers.filter(
        (candidate) =>
          candidate.is_active &&
          candidate.id !== layer.id &&
          (candidate.layer_type === 'line' || candidate.layer_type === 'point'),
      ),
    [allLayers, layer.id],
  )

  const toggleAssociated = (layerId: number) => {
    setAssociatedIds((prev) =>
      prev.includes(layerId) ? prev.filter((id) => id !== layerId) : [...prev, layerId],
    )
  }

  const save = useMutation({
    mutationFn: async () => {
      const nextMineralId = Number(mineralId)
      if (!Number.isFinite(nextMineralId)) {
        throw new Error('Choose a commodity')
      }
      await mapsApi.updateLayer(
        layer.slug,
        {
          name,
          name_sw: nameSw,
          mineral: nextMineralId,
          style: layerStyleWithColor(layer.style, layer.layer_type, color),
        },
        layer.mineral_slug,
      )
      if (selectedMineralSlug) {
        await mineralsApi.update(selectedMineralSlug, {
          associated_layer_ids: associatedIds,
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_LAYERS_KEY })
      qc.invalidateQueries({ queryKey: ['layers'] })
      qc.invalidateQueries({ queryKey: ['mineral'] })
      qc.invalidateQueries({ queryKey: ['minerals'] })
      qc.invalidateQueries({ queryKey: ['minerals', 'all'] })
      toast.success('Layer updated')
      onClose()
    },
    onError: () => toast.error('Could not save changes'),
  })

  if (!isManager) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="relative z-10 bg-app-surface rounded-t-2xl sm:rounded-xl shadow-xl border border-app-border w-full max-w-md flex flex-col max-h-[min(90vh,640px)]"
        role="dialog"
        aria-labelledby="commodity-editor-title"
      >
        <div className="px-5 py-4 border-b app-divider flex items-start gap-3">
          <span
            className="h-11 w-11 rounded-lg border border-app-border shrink-0 mt-0.5"
            style={{ backgroundColor: color }}
          />
          <div className="min-w-0 flex-1">
            <h2 id="commodity-editor-title" className="text-lg font-bold text-app-text">
              Edit
            </h2>
            <p className="text-sm text-app-muted truncate">{displayName(layer)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-app-text-muted hover:text-app-text text-xl leading-none px-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto space-y-3 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block min-w-0">
              <span className="text-sm font-medium text-app-text">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input mt-1 w-full"
              />
            </label>
            <label className="block min-w-0">
              <span className="text-sm font-medium text-app-text-secondary">Swahili</span>
              <input
                value={nameSw}
                onChange={(e) => setNameSw(e.target.value)}
                className="input mt-1 w-full"
                placeholder="Optional"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-app-text">Commodity</span>
            <select
              value={mineralId}
              onChange={(e) => setMineralId(e.target.value)}
              className="input mt-1 w-full"
            >
              {commodityOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                  {NAV_COMMODITY_SLUGS.has(option.slug)
                    ? ''
                    : option.slug === 'general'
                      ? ' (shared)'
                      : ''}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="text-sm font-medium text-app-text">Color</span>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-8 cursor-pointer rounded-md border border-app-border bg-transparent p-0.5 shrink-0"
                aria-label="Map color"
              />
              <input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="input flex-1 min-w-[7rem] font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setColorPickerOpen(true)}
                className="text-xs text-terra-600 dark:text-terra-400 hover:underline shrink-0"
              >
                Palette
              </button>
            </div>
          </div>

          <MineralColorPickerModal
            open={colorPickerOpen}
            onClose={() => setColorPickerOpen(false)}
            layerName={name}
            usedColors={usedColors}
            selectedColor={color}
            onSelect={setColor}
          />

          <div>
            <span className="text-sm font-medium text-app-text">Link Layers</span>
            {associableLayers.length === 0 ? (
              <p className="text-xs text-app-text-muted mt-1">No point or line layers. Optional.</p>
            ) : (
              <ul className="mt-1 max-h-40 overflow-y-auto rounded-xl border border-app-border divide-y app-divider">
                {associableLayers.map((candidate) => {
                  const checked = associatedIds.includes(candidate.id)
                  return (
                    <li key={candidate.id}>
                      <label className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-app-subtle/50">
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={checked}
                          onChange={() => toggleAssociated(candidate.id)}
                        />
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0 border border-app-border/50"
                          style={{ backgroundColor: layerDisplayColor(candidate) }}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 text-sm text-app-text truncate">
                          {displayName(candidate)}
                        </span>
                        <span className="text-[10px] uppercase tracking-wide text-app-text-muted">
                          {candidate.layer_type}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="px-4 sm:px-5 py-3 sm:py-4 border-t app-divider flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4">
          <button type="button" onClick={onClose} className="btn-secondary text-sm w-full sm:w-auto">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending || !name.trim() || !mineralId}
            className="btn-primary text-sm w-full sm:w-auto"
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MineralsPage() {
  const { isManager } = useAuth()
  const [editing, setEditing] = useState<MapLayer | null>(null)
  const { data: allLayers = [] } = useAdminLayers()
  const usedColors = allLayers.map((layer) => layerDisplayColor(layer))

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold text-app-text">Commodities</h1>
        <Link
          to="/admin/layers"
          className="text-sm text-terra-600 dark:text-terra-400 hover:underline"
        >
          Create layers →
        </Link>
      </div>

      <CommodityLayersPanel onEditDetails={isManager ? setEditing : undefined} />

      {editing && (
        <CommodityEditor
          layer={editing}
          allLayers={allLayers}
          usedColors={usedColors}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
