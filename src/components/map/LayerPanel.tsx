import { useMemo, useState } from 'react'
import { useTranslation } from '../../i18n/LocaleContext'
import { useDisplayName } from '../../i18n/useDisplayName'
import type { MapLayer } from '../../types'

interface LayerPanelProps {
  layers: MapLayer[]
  visibleLayers: Set<number>
  onToggle: (id: number) => void
  onToggleType: (type: string, visible: boolean) => void
  onReorder?: (layers: MapLayer[]) => void
  allowReorder?: boolean
  className?: string
}

const TYPE_ORDER = ['polygon', 'point', 'line']

export default function LayerPanel({
  layers,
  visibleLayers,
  onToggle,
  onToggleType,
  onReorder,
  allowReorder = false,
  className = '',
}: LayerPanelProps) {
  const { m } = useTranslation()
  const displayName = useDisplayName()
  const [open, setOpen] = useState(true)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const typeLabels: Record<string, string> = {
    polygon: m.map.polygons,
    point: m.map.points,
    line: m.map.lines,
  }

  const grouped = useMemo(() => {
    const map = new Map<string, MapLayer[]>()
    for (const layer of layers) {
      const t = layer.layer_type || 'polygon'
      if (!map.has(t)) map.set(t, [])
      map.get(t)!.push(layer)
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.z_index - b.z_index)
    }
    return TYPE_ORDER.filter((t) => map.has(t)).map((t) => ({ type: t, layers: map.get(t)! }))
  }, [layers])

  const sorted = [...layers].sort((a, b) => b.z_index - a.z_index)

  const handleDrop = (targetIndex: number) => {
    if (!onReorder || dragIndex === null || dragIndex === targetIndex) return
    const reordered = [...sorted]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(targetIndex, 0, moved)
    const withZ = reordered.map((l, i) => ({ ...l, z_index: reordered.length - i }))
    onReorder(withZ)
    setDragIndex(null)
  }

  const typeAllVisible = (type: string, list: MapLayer[]) =>
    list.every((l) => visibleLayers.has(l.id))

  const layerCount = layers.length

  return (
    <div
      className={`absolute top-3 left-3 z-10 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 w-72 text-sm ${className}`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2.5 font-semibold text-slate-800 text-left flex justify-between items-center gap-2 hover:bg-slate-50/80"
      >
        <span>
          {m.map.layersTitle}
          {layerCount > 0 && (
            <span className="ml-1.5 text-xs font-normal text-slate-400">({layerCount})</span>
          )}
        </span>
        <span className="text-slate-400 shrink-0">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="border-t border-slate-100 overflow-y-auto max-h-[min(58vh,480px)] p-2 space-y-3">
          {grouped.map(({ type, layers: typeLayers }) => {
            const allOn = typeAllVisible(type, typeLayers)
            return (
              <div key={type}>
                <div className="flex items-center justify-between px-1 mb-1 gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {typeLabels[type] || type}
                    {type === 'line' && (
                      <span className="ml-1 font-normal normal-case text-slate-400">{m.map.linesOffByDefault}</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => onToggleType(type, !allOn)}
                    className="text-[10px] text-terra-600 hover:text-terra-800 font-medium shrink-0"
                  >
                    {allOn ? m.map.hideAll : m.map.showAll}
                  </button>
                </div>
                <ul className="space-y-0.5">
                  {typeLayers.map((layer, index) => (
                    <li
                      key={layer.id}
                      draggable={allowReorder}
                      onDragStart={() => allowReorder && setDragIndex(index)}
                      onDragOver={(e) => allowReorder && e.preventDefault()}
                      onDrop={() => allowReorder && handleDrop(index)}
                      className={`flex items-start gap-2 px-1.5 py-1 rounded-lg hover:bg-slate-50 ${allowReorder ? 'cursor-grab' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={visibleLayers.has(layer.id)}
                        onChange={() => onToggle(layer.id)}
                        className="rounded border-slate-300 mt-0.5 shrink-0"
                      />
                      <span
                        className="w-3 h-3 rounded-sm shrink-0 border border-black/10 mt-0.5"
                        style={{
                          backgroundColor: (layer.style?.fill as string) || '#E87722',
                          height: layer.layer_type === 'line' ? 2 : 12,
                          marginTop: layer.layer_type === 'line' ? 8 : undefined,
                        }}
                      />
                      <span className="flex-1 min-w-0 text-slate-700 text-xs leading-snug break-words">
                        {displayName(layer)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
          {layers.length === 0 && (
            <p className="text-xs text-slate-500 px-2 py-3 leading-relaxed">{m.map.noLayers}</p>
          )}
        </div>
      )}
    </div>
  )
}
