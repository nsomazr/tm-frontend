import { useState } from 'react'
import type { MapLayer } from '../../types'
import { sortLayersTopToBottom, stackPositionLabel } from './layerOrder'
import { layerDisplayColor } from './layerColors'
import { useDisplayName } from '../../i18n/useDisplayName'

const ARRANGE_GROUPS = [
  {
    type: 'polygon' as const,
    label: 'Polygons',
    hint: 'Filled zones and area features',
  },
  {
    type: 'line' as const,
    label: 'Lines / structures',
    hint: 'Faults, belts, and linear features',
  },
  {
    type: 'point' as const,
    label: 'Points',
    hint: 'Markers and prospect sites',
  },
]

interface LayerArrangeSectionProps {
  layers: MapLayer[]
  onReorderGroup: (groupType: string, orderedTopToBottom: MapLayer[]) => void
  onResetDefault: () => void
  busy?: boolean
}

export default function LayerArrangeSection({
  layers,
  onReorderGroup,
  onResetDefault,
  busy = false,
}: LayerArrangeSectionProps) {
  const displayName = useDisplayName()
  const [dragGroup, setDragGroup] = useState<string | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  if (layers.length === 0) {
    return (
      <section className="card mb-8">
        <h2 className="font-bold text-app-text">Arrange map layers</h2>
        <p className="text-sm text-app-muted mt-1">
          Create or show at least one layer to control draw order on the map.
        </p>
      </section>
    )
  }

  const canReorder = layers.length > 1

  const handleDrop = (groupType: string, groupLayers: MapLayer[], targetIndex: number) => {
    if (dragGroup !== groupType || dragIndex === null || dragIndex === targetIndex) {
      setDragGroup(null)
      setDragIndex(null)
      return
    }
    const next = [...groupLayers]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(targetIndex, 0, moved)
    onReorderGroup(groupType, next)
    setDragGroup(null)
    setDragIndex(null)
  }

  return (
    <section className="card mb-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="font-bold text-app-text">Arrange map layers</h2>
          <p className="text-sm text-app-muted mt-1 max-w-2xl">
            Drag rows to change stacking within each geometry type. The top row draws in front on
            the map; the bottom row sits behind others in that group.
          </p>
        </div>
        {canReorder && (
          <button
            type="button"
            onClick={onResetDefault}
            disabled={busy}
            className="shrink-0 text-sm px-3 py-2 rounded-lg border border-app-border hover:bg-app-subtle text-app-text-secondary disabled:opacity-50"
          >
            Reset default stack
          </button>
        )}
      </div>

      <div className="space-y-5">
        {ARRANGE_GROUPS.map((group) => {
          const groupLayers = sortLayersTopToBottom(
            layers.filter((layer) => layer.layer_type === group.type)
          )
          if (groupLayers.length === 0) return null
          const groupCanDrag = groupLayers.length > 1 && !busy

          return (
            <div
              key={group.type}
              className="rounded-xl border border-app-border/60 overflow-hidden"
            >
              <div className="px-4 py-3 bg-app-subtle/60 border-b app-divider flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-app-text">{group.label}</h3>
                  <p className="text-xs text-app-muted mt-0.5">{group.hint}</p>
                </div>
                {groupCanDrag && (
                  <span className="text-[10px] font-medium uppercase tracking-wide text-app-text-muted shrink-0 pt-0.5">
                    Top = front
                  </span>
                )}
              </div>
              <ul className="divide-y divide-app-border/40">
                {groupLayers.map((layer, index) => {
                  const color = layerDisplayColor(layer)
                  const isDragging = dragGroup === group.type && dragIndex === index

                  return (
                    <li
                      key={layer.id}
                      draggable={groupCanDrag}
                      onDragStart={() => {
                        if (!groupCanDrag) return
                        setDragGroup(group.type)
                        setDragIndex(index)
                      }}
                      onDragEnd={() => {
                        setDragGroup(null)
                        setDragIndex(null)
                      }}
                      onDragOver={(e) => {
                        if (!groupCanDrag || dragGroup !== group.type) return
                        e.preventDefault()
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        handleDrop(group.type, groupLayers, index)
                      }}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                        groupCanDrag ? 'cursor-grab active:cursor-grabbing hover:bg-app-subtle/50' : ''
                      } ${isDragging ? 'opacity-50 bg-app-subtle/40' : ''}`}
                    >
                      {groupCanDrag ? (
                        <span
                          className="shrink-0 text-app-text-muted select-none"
                          aria-hidden
                          title="Drag to reorder"
                        >
                          <GripIcon />
                        </span>
                      ) : (
                        <span className="w-4 shrink-0" aria-hidden />
                      )}
                      <span
                        className="w-3 h-3 rounded-full shrink-0 border border-app-border/50"
                        style={{ backgroundColor: color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-app-text truncate">{displayName(layer)}</p>
                        <p className="text-xs text-app-text-muted">
                          {stackPositionLabel(index, groupLayers.length)}
                          {layer.feature_count > 0
                            ? ` · ${layer.feature_count.toLocaleString()} features`
                            : ''}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] font-mono tabular-nums text-app-text-muted">
                        #{index + 1}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function GripIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="opacity-70">
      <circle cx="5" cy="4" r="1.25" />
      <circle cx="11" cy="4" r="1.25" />
      <circle cx="5" cy="8" r="1.25" />
      <circle cx="11" cy="8" r="1.25" />
      <circle cx="5" cy="12" r="1.25" />
      <circle cx="11" cy="12" r="1.25" />
    </svg>
  )
}
