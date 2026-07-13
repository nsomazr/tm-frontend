import { useMemo, useState } from 'react'
import { useTranslation } from '../../i18n/LocaleContext'
import { useDisplayName } from '../../i18n/useDisplayName'
import type { MapLayer } from '../../types'
import LayerTypeSymbol from './LayerTypeSymbol'

interface LayerPanelProps {
  layers: MapLayer[]
  visibleLayers: Set<number>
  onToggle: (id: number) => void
  onToggleType: (type: string, visible: boolean) => void
  onReorder?: (layers: MapLayer[]) => void
  allowReorder?: boolean
  /** Render inside left dock (no absolute positioning). */
  embedded?: boolean
  /** All layers visible; checkboxes and bulk toggles disabled (free map preview). */
  layersLocked?: boolean
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
  embedded = false,
  layersLocked = false,
  className = '',
}: LayerPanelProps) {
  const { m } = useTranslation()
  const displayName = useDisplayName()
  const [open, setOpen] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : false
  )
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

  const shellClass = embedded
    ? 'relative map-chrome rounded-xl text-sm flex flex-col overflow-hidden w-full max-h-full'
    : 'absolute z-10 map-chrome rounded-xl text-sm flex flex-col overflow-hidden top-[max(0.75rem,env(safe-area-inset-top,0px))] left-[max(0.75rem,env(safe-area-inset-left,0px))] w-[min(18rem,calc(100vw-1.5rem))] max-h-[min(40vh,calc(100%-6rem))] hidden md:flex'

  return (
    <div className={`${shellClass} ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full shrink-0 px-2.5 py-2 font-semibold text-xs map-text text-left flex justify-between items-center gap-2 hover:bg-app-subtle/80"
      >
        <span>
          {m.map.layersTitle}
          {layerCount > 0 && (
            <span className="ml-1 text-[10px] font-normal map-text-muted">({layerCount})</span>
          )}
        </span>
        <span className="map-text-muted shrink-0 text-xs">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="border-t border-app-border max-h-[min(40vh,22rem)] overflow-y-auto overflow-x-hidden overscroll-y-contain p-1.5 pb-2 space-y-2 scrollbar-pane">
          {grouped.map(({ type, layers: typeLayers }) => {
            const allOn = typeAllVisible(type, typeLayers)
            return (
              <div key={type} className="not-first:pt-3 not-first:border-t not-first:app-divider">
                <div className="px-1 mb-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide map-text">
                      {typeLabels[type] || type}
                      <span className="ml-1 font-normal normal-case tracking-normal text-app-muted">
                        ({typeLayers.length})
                      </span>
                    </span>
                    {!layersLocked && (
                    <button
                      type="button"
                      onClick={() => onToggleType(type, !allOn)}
                      className="text-xs text-terra-700 hover:text-terra-900 dark:text-terra-400 dark:hover:text-terra-300 font-semibold shrink-0 whitespace-nowrap"
                    >
                      {allOn ? m.map.hideAll : m.map.showAll}
                    </button>
                    )}
                  </div>
                </div>
                <ul className="space-y-0.5">
                  {typeLayers.map((layer, index) => {
                    const isVisible = visibleLayers.has(layer.id)
                    return (
                      <li
                        key={layer.id}
                        draggable={allowReorder && !layersLocked}
                        onDragStart={() => allowReorder && !layersLocked && setDragIndex(index)}
                        onDragOver={(e) => allowReorder && !layersLocked && e.preventDefault()}
                        onDrop={() => allowReorder && !layersLocked && handleDrop(index)}
                        className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg ${
                          layersLocked ? '' : 'hover:bg-app-subtle'
                        } ${allowReorder && !layersLocked ? 'cursor-grab' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isVisible}
                          disabled={layersLocked}
                          onChange={() => onToggle(layer.id)}
                          className="checkbox checkbox--sm disabled:opacity-70"
                        />
                        <LayerTypeSymbol layer={layer} />
                        <span className="flex-1 min-w-0 map-text text-sm font-medium leading-snug break-words">
                          {displayName(layer)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
          {layers.length === 0 && (
            <p className="text-xs map-text-muted px-2 py-3 leading-relaxed">{m.map.noLayers}</p>
          )}
        </div>
      )}
    </div>
  )
}
