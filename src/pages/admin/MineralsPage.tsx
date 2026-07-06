import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { mapsApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import {
  layerDisplayColor,
  layerFillRgba,
  layerStyleWithColor,
} from '../../components/admin/layerColors'
import MineralColorReference from '../../components/admin/MineralColorReference'
import { colorRecordForLayer, formatColorCodes } from '../../lib/mineralColorUtils'
import ListPagination from '../../components/ui/ListPagination'
import { usePagination } from '../../hooks/usePagination'
import { useAlternateName } from '../../i18n/useAlternateName'
import { useDisplayName } from '../../i18n/useDisplayName'
import { toast } from '../../components/ui/toast'
import type { MapLayer } from '../../types'

const LAYER_TYPE_LABELS: Record<string, string> = {
  polygon: 'Polygon',
  point: 'Point',
  line: 'Line',
}

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
  const colorRecord = colorRecordForLayer(color, layer.layer_type)

  const save = useMutation({
    mutationFn: () =>
      mapsApi.updateLayer(layer.slug, {
        name,
        name_sw: nameSw,
        style: layerStyleWithColor(layer.style, layer.layer_type, color),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-layers'] })
      qc.invalidateQueries({ queryKey: ['layers'] })
      toast.success('Commodity updated')
      onClose()
    },
    onError: () => toast.error('Could not save changes'),
  })

  if (!isManager) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg p-6 my-6 max-h-[min(92vh,720px)] overflow-y-auto">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Edit commodity</h2>
        <p className="text-sm text-slate-500 mb-4">
          This name and color appear on the map legend and search for {displayName(layer)}.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Name (English)</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Name (Swahili)</label>
            <input
              value={nameSw}
              onChange={(e) => setNameSw(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Map color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-14 rounded border border-slate-200 cursor-pointer"
              />
              <input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
              />
              <span className="w-8 h-8 rounded-lg border border-slate-200" style={{ backgroundColor: color }} />
            </div>
            <p className="text-[11px] font-mono text-slate-500 mt-1">{formatColorCodes(colorRecord)}</p>
          </div>
          <MineralColorReference
            layerName={name}
            layerType={layer.layer_type}
            usedColors={usedColors}
            selectedColor={color}
            onSelect={setColor}
          />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending || !name.trim()}
            className="btn-primary text-sm !py-2 !px-4"
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
  const displayName = useDisplayName()
  const alternateName = useAlternateName()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-layers'],
    queryFn: () => mapsApi.layers({ include_inactive: '1' }).then((r) => r.data),
  })

  const commodities = (data?.results ?? []).filter((layer) => (layer.feature_count ?? 0) > 0)
  const pagination = usePagination(commodities, 25)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-app-text">Minerals / Commodities</h1>
        <p className="text-sm text-app-muted mt-1 max-w-2xl">
          Commodities come from your uploaded shapefiles. Each layer name is what appears on the map
          and in analytics, not the old demo mineral catalog.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-app-muted">Loading…</p>
      ) : commodities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-app-border bg-app-subtle px-6 py-12 text-center">
          <p className="text-sm text-app-text-secondary">No uploaded commodities yet.</p>
          <p className="text-sm text-app-muted mt-1">
            Upload a shapefile under Layers. The layer name becomes your commodity on the map.
          </p>
          <Link
            to="/admin/layers"
            className="inline-block mt-4 text-sm font-medium text-terra-600 dark:text-terra-400 hover:underline"
          >
            Go to Layers →
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b app-divider">
            <h2 className="text-sm font-bold text-app-text">
              Mapped commodities ({commodities.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="w-10" aria-label="Color" />
                  <th>Name</th>
                  <th>Type</th>
                  <th className="tabular-nums">Zones</th>
                  <th>Color</th>
                  {isManager && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {pagination.pageItems.map((layer) => {
                  const color = layerDisplayColor(layer)
                  return (
                    <tr key={layer.id}>
                      <td>
                        <span
                          className="inline-block h-7 w-7 rounded-md border border-app-border shrink-0"
                          style={{ backgroundColor: color }}
                          aria-hidden
                        />
                      </td>
                      <td className="min-w-[10rem]">
                        <div className="font-medium text-app-text">{displayName(layer)}</div>
                        {alternateName(layer) && (
                          <div className="text-xs text-app-text-muted mt-0.5">{alternateName(layer)}</div>
                        )}
                      </td>
                      <td className="text-app-text-secondary capitalize whitespace-nowrap text-xs">
                        {LAYER_TYPE_LABELS[layer.layer_type] ?? layer.layer_type}
                      </td>
                      <td className="tabular-nums text-app-text">{layer.feature_count}</td>
                      <td className="text-[11px] font-mono text-app-text-muted whitespace-nowrap">
                        <div>{color}</div>
                        {layerFillRgba(layer.style) && (
                          <div className="text-[10px] opacity-80">{layerFillRgba(layer.style)}</div>
                        )}
                      </td>
                      {isManager && (
                        <td className="text-right">
                          <button
                            type="button"
                            onClick={() => setEditing(layer)}
                            className="text-xs text-terra-600 dark:text-terra-400 hover:underline"
                          >
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <ListPagination
            page={pagination.page}
            pageCount={pagination.pageCount}
            total={pagination.total}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setPage}
            className="px-4 pb-4"
          />
        </div>
      )}

      {editing && (
        <CommodityEditor
          layer={editing}
          usedColors={commodities.map((l) => layerDisplayColor(l))}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
