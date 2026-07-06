import type { MapLayer } from '../../types'
import {
  sortLayersBottomToTop,
  sortLayersTopToBottom,
  stackPositionLabel,
} from './layerOrder'
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

type MoveDirection = 'front' | 'forward' | 'backward' | 'back'

interface LayerArrangeSectionProps {
  layers: MapLayer[]
  onMove: (layerId: number, direction: MoveDirection) => void
  onResetDefault: () => void
  busy?: boolean
}

export default function LayerArrangeSection({
  layers,
  onMove,
  onResetDefault,
  busy = false,
}: LayerArrangeSectionProps) {
  const displayName = useDisplayName()

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

  const bottomToTop = sortLayersBottomToTop(layers)
  const canReorder = layers.length > 1

  return (
    <section className="card mb-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="font-bold text-app-text">Arrange map layers</h2>
          <p className="text-sm text-app-muted mt-1 max-w-2xl">
            Control which layers draw on top. Forward moves a layer above others; backward sends it
            behind. Default order: polygons at the back, then lines, then points on top.
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

      {!canReorder && (
        <p className="text-sm text-app-text-secondary mb-4">
          Add a second layer to enable forward and backward ordering.
        </p>
      )}

      <div className="space-y-5">
        {ARRANGE_GROUPS.map((group) => {
          const groupLayers = sortLayersTopToBottom(
            layers.filter((layer) => layer.layer_type === group.type)
          )
          if (groupLayers.length === 0) return null

          return (
            <div
              key={group.type}
              className="rounded-xl border border-app-border/60 overflow-hidden"
            >
              <div className="px-4 py-3 bg-app-subtle/60 border-b app-divider">
                <h3 className="text-sm font-semibold text-app-text">{group.label}</h3>
                <p className="text-xs text-app-muted mt-0.5">{group.hint}</p>
              </div>
              <ul className="divide-y divide-app-border/40">
                {groupLayers.map((layer) => {
                  const stackIndex = bottomToTop.findIndex((item) => item.id === layer.id)
                  const color = layerDisplayColor(layer)

                  return (
                    <li
                      key={layer.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 border border-app-border/50"
                          style={{ backgroundColor: color }}
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-app-text truncate">{displayName(layer)}</p>
                          <p className="text-xs text-app-text-muted">
                            {stackPositionLabel(stackIndex, layers.length)} · z-index {layer.z_index}
                            {layer.feature_count > 0
                              ? ` · ${layer.feature_count} features`
                              : ''}
                          </p>
                        </div>
                      </div>
                      {canReorder && (
                        <div className="flex flex-wrap items-center gap-1 sm:shrink-0">
                          <button
                            type="button"
                            title="Bring to front (top of map)"
                            onClick={() => onMove(layer.id, 'front')}
                            disabled={busy || stackIndex === layers.length - 1}
                            className="text-xs px-2.5 py-1.5 rounded-lg border border-app-border hover:bg-app-subtle text-app-text-secondary disabled:opacity-40"
                          >
                            To front
                          </button>
                          <button
                            type="button"
                            title="Move forward one step"
                            onClick={() => onMove(layer.id, 'forward')}
                            disabled={busy || stackIndex === layers.length - 1}
                            className="text-xs px-2.5 py-1.5 rounded-lg border border-app-border hover:bg-app-subtle text-app-text-secondary disabled:opacity-40"
                          >
                            Forward
                          </button>
                          <button
                            type="button"
                            title="Move backward one step"
                            onClick={() => onMove(layer.id, 'backward')}
                            disabled={busy || stackIndex <= 0}
                            className="text-xs px-2.5 py-1.5 rounded-lg border border-app-border hover:bg-app-subtle text-app-text-secondary disabled:opacity-40"
                          >
                            Backward
                          </button>
                          <button
                            type="button"
                            title="Send to back (bottom of map)"
                            onClick={() => onMove(layer.id, 'back')}
                            disabled={busy || stackIndex <= 0}
                            className="text-xs px-2.5 py-1.5 rounded-lg border border-app-border hover:bg-app-subtle text-app-text-secondary disabled:opacity-40"
                          >
                            To back
                          </button>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>

      {canReorder && (
        <p className="text-xs text-app-text-muted mt-4">
          Map draw order (front → back):{' '}
          {sortLayersTopToBottom(layers)
            .map((layer) => displayName(layer))
            .join(' → ')}
        </p>
      )}
    </section>
  )
}
