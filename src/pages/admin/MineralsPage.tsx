import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { mineralsApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { useAlternateName } from '../../i18n/useAlternateName'
import { useDisplayName } from '../../i18n/useDisplayName'
import type { Mineral } from '../../types'

function MineralEditor({
  mineral,
  onClose,
}: {
  mineral: Mineral
  onClose: () => void
}) {
  const qc = useQueryClient()
  const { isManager } = useAuth()
  const [name, setName] = useState(mineral.name)
  const [nameSw, setNameSw] = useState(mineral.name_sw)
  const [color, setColor] = useState(mineral.color)
  const [description, setDescription] = useState(mineral.description)
  const [syncLayers, setSyncLayers] = useState(true)

  const save = useMutation({
    mutationFn: () =>
      mineralsApi.update(mineral.slug, {
        name,
        name_sw: nameSw,
        color,
        description,
        sync_layer_colors: syncLayers,
      } as Partial<Mineral> & { sync_layer_colors?: boolean }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['minerals'] })
      qc.invalidateQueries({ queryKey: ['layers'] })
      onClose()
    },
  })

  if (!isManager) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Edit mineral</h2>
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
            <label className="block text-xs font-medium text-slate-500 mb-1">Legend color</label>
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
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={syncLayers}
              onChange={(e) => setSyncLayers(e.target.checked)}
              className="rounded border-slate-300"
            />
            Update map layer colors to match
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="btn-primary text-sm !py-2 !px-4"
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
        {save.isError && (
          <p className="text-xs text-red-600 mt-2">Could not save changes.</p>
        )}
      </div>
    </div>
  )
}

export default function MineralsPage() {
  const { isManager } = useAuth()
  const [editing, setEditing] = useState<Mineral | null>(null)
  const displayName = useDisplayName()
  const alternateName = useAlternateName()

  const { data, isLoading } = useQuery({
    queryKey: ['minerals'],
    queryFn: () => mineralsApi.list().then((r) => r.data),
  })

  const minerals = data?.results || []

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Minerals</h1>
        <p className="text-sm text-slate-500 mt-1">
          Edit names and legend colors shown on the map and in search results.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="grid gap-3">
          {minerals.map((m) => (
            <div
              key={m.id}
              className="rounded-xl border border-slate-200 bg-white p-4 flex items-start gap-4"
            >
              <span
                className="w-10 h-10 rounded-lg shrink-0 border border-slate-100"
                style={{ backgroundColor: m.color }}
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900">{displayName(m)}</h3>
                <p className="text-sm text-slate-500">
                  {alternateName(m) ? `${alternateName(m)} · ` : ''}{m.country_code}
                </p>
                {m.description && (
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">{m.description}</p>
                )}
                <p className="text-xs text-slate-400 mt-1 font-mono">{m.color}</p>
              </div>
              {isManager && (
                <button
                  type="button"
                  onClick={() => setEditing(m)}
                  className="shrink-0 text-sm font-medium text-terra-600 hover:text-terra-700 px-3 py-1.5 rounded-lg hover:bg-terra-50"
                >
                  Edit
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && <MineralEditor mineral={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
