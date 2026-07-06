import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { mapsApi } from '../../api'
import { ADMIN_LAYERS_KEY, useAdminLayers } from '../../hooks/useAdminLayers'
import { useAuth } from '../../auth/AuthContext'
import CommodityLayersPanel from '../../components/admin/CommodityLayersPanel'
import {
  layerDisplayColor,
  layerStyleWithColor,
} from '../../components/admin/layerColors'
import MineralColorReference from '../../components/admin/MineralColorReference'
import { useDisplayName } from '../../i18n/useDisplayName'
import { toast } from '../../components/ui/toast'
import type { MapLayer } from '../../types'

function CommodityEditor({
  layer,
  onClose,
  usedColors,
}: {
  layer: MapLayer
  onClose: () => void
  usedColors: string[]
}) {
  const qc = useQueryClient()
  const { isManager } = useAuth()
  const displayName = useDisplayName()
  const [name, setName] = useState(layer.name)
  const [nameSw, setNameSw] = useState(layer.name_sw || '')
  const [color, setColor] = useState(layerDisplayColor(layer))

  const save = useMutation({
    mutationFn: () =>
      mapsApi.updateLayer(
        layer.slug,
        {
          name,
          name_sw: nameSw,
          style: layerStyleWithColor(layer.style, layer.layer_type, color),
        },
        layer.mineral_slug
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_LAYERS_KEY })
      qc.invalidateQueries({ queryKey: ['layers'] })
      toast.success('Commodity updated')
      onClose()
    },
    onError: () => toast.error('Could not save changes'),
  })

  if (!isManager) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div
        className="bg-app-surface rounded-xl shadow-xl border border-app-border w-full max-w-md flex flex-col max-h-[min(90vh,640px)]"
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

        <div className="px-5 py-4 overflow-y-auto space-y-4 flex-1">
          <label className="block">
            <span className="text-sm font-medium text-app-text-secondary">Name (English)</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input mt-1.5 w-full"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-app-text-secondary">Name (Swahili)</span>
            <input
              value={nameSw}
              onChange={(e) => setNameSw(e.target.value)}
              className="input mt-1.5 w-full"
            />
          </label>

          <div>
            <span className="text-sm font-medium text-app-text-secondary">Color</span>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-12 cursor-pointer rounded-lg border border-app-border bg-transparent p-0.5 shrink-0"
                aria-label="Map color"
              />
              <input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="input flex-1 font-mono text-sm"
              />
            </div>
          </div>

          <MineralColorReference
            variant="inline"
            layerName={name}
            usedColors={usedColors}
            selectedColor={color}
            onSelect={setColor}
          />
        </div>

        <div className="px-5 py-4 border-t app-divider flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending || !name.trim()}
            className="btn-primary text-sm"
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-app-text">Commodities</h1>
        <p className="text-sm text-app-muted mt-1 max-w-2xl">
          Arrange layers, edit colors inline, or open Edit from the ⋮ menu. New layers are created under{' '}
          <Link to="/admin/layers" className="text-terra-600 dark:text-terra-400 hover:underline">
            Layers
          </Link>
          .
        </p>
      </div>

      <CommodityLayersPanel onEditDetails={isManager ? setEditing : undefined} />

      {editing && (
        <CommodityEditor
          layer={editing}
          usedColors={usedColors}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
