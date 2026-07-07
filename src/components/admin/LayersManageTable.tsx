import { Fragment, useState, useEffect, useRef, type ReactNode } from 'react'
import type { MapLayer } from '../../types'
import ActionMenu, { ActionMenuItem } from '../ui/ActionMenu'
import { sortLayersTopToBottom, stackPositionLabel } from './layerOrder'
import { layerDisplayColor } from './layerColors'
import {
  STRUCTURE_RANK_OPTIONS,
  resolveStructureRank,
  type StructureLineRank,
} from '../map/structureLineRank'
import { useDisplayName } from '../../i18n/useDisplayName'
import { useAlternateName } from '../../i18n/useAlternateName'
import {
  clampBufferKm,
  formatBufferKmRange,
  LAYER_BUFFER_KM_MAX,
  LAYER_BUFFER_KM_MIN,
} from '../../constants/layerBufferZone'

export const LAYER_ARRANGE_GROUPS = [
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

function LayerActionsMenu({
  layer,
  layerLabel,
  isOpen,
  historyOpen,
  isAdmin,
  updateBusy,
  deleteBusy,
  onOpenChange,
  onToggleExpanded,
  onToggleActive,
  onTogglePreview,
  onDelete,
  onEditDetails,
}: {
  layer: MapLayer
  layerLabel: string
  isOpen: boolean
  historyOpen: boolean
  isAdmin: boolean
  updateBusy?: boolean
  deleteBusy?: boolean
  onOpenChange: (open: boolean) => void
  onToggleExpanded: () => void
  onToggleActive: () => void
  onTogglePreview: () => void
  onDelete: () => void
  onEditDetails?: () => void
}) {
  return (
    <ActionMenu
      label={`Actions for ${layerLabel}`}
      open={isOpen}
      onOpenChange={onOpenChange}
      minWidth="10rem"
    >
      <ActionMenuItem onClick={onToggleExpanded} className="text-sm text-terra-600 dark:text-terra-400">
        {historyOpen ? 'Hide history' : 'History'}
      </ActionMenuItem>
      {onEditDetails && (
        <ActionMenuItem onClick={onEditDetails} className="text-sm text-app-text-secondary">
          Edit
        </ActionMenuItem>
      )}
      <ActionMenuItem onClick={onToggleActive} disabled={updateBusy} className="text-sm text-app-text-secondary">
        {layer.is_active ? 'Hide' : 'Show'}
      </ActionMenuItem>
      <ActionMenuItem onClick={onTogglePreview} disabled={updateBusy} className="text-sm text-app-text-secondary">
        {layer.is_preview ? 'Unpreview' : 'Preview'}
      </ActionMenuItem>
      {isAdmin && (
        <ActionMenuItem onClick={onDelete} disabled={deleteBusy} destructive className="text-sm">
          Delete
        </ActionMenuItem>
      )}
    </ActionMenu>
  )
}

function formatWhenShort(iso?: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString()
}

interface LayersManageTableProps {
  layers: MapLayer[]
  stackableLayers: MapLayer[]
  showHidden: boolean
  onShowHiddenChange: (value: boolean) => void
  expandedLayerId: number | null
  highlightLayerId?: number | null
  onToggleExpanded: (layerId: number) => void
  onReorderGroup: (groupType: string, orderedTopToBottom: MapLayer[]) => void
  onResetDefault: () => void
  onColorChange: (layer: MapLayer, color: string) => void
  onStructureRankChange: (layer: MapLayer, rank: StructureLineRank) => void
  onBufferChange: (layer: MapLayer, bufferKm: number | null) => void
  onToggleActive: (layer: MapLayer) => void
  onTogglePreview: (layer: MapLayer) => void
  onDelete: (layer: MapLayer) => void
  onEditDetails?: (layer: MapLayer) => void
  renderVersionHistory: (layerId: number) => ReactNode
  isAdmin: boolean
  reorderBusy?: boolean
  updateBusy?: boolean
  deleteBusy?: boolean
}

export default function LayersManageTable({
  layers,
  stackableLayers,
  showHidden,
  onShowHiddenChange,
  expandedLayerId,
  highlightLayerId = null,
  onToggleExpanded,
  onReorderGroup,
  onResetDefault,
  onColorChange,
  onStructureRankChange,
  onBufferChange,
  onToggleActive,
  onTogglePreview,
  onDelete,
  onEditDetails,
  renderVersionHistory,
  isAdmin,
  reorderBusy = false,
  updateBusy = false,
  deleteBusy = false,
}: LayersManageTableProps) {
  const displayName = useDisplayName()
  const alternateName = useAlternateName()
  const [dragGroup, setDragGroup] = useState<string | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [openMenuLayerId, setOpenMenuLayerId] = useState<number | null>(null)
  const highlightRowRef = useRef<HTMLTableRowElement | null>(null)

  useEffect(() => {
    if (highlightLayerId == null) return
    highlightRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlightLayerId])

  const canResetStack = stackableLayers.length > 1

  const groupedLayers = LAYER_ARRANGE_GROUPS.map((group) => ({
    ...group,
    layers: sortLayersTopToBottom(layers.filter((layer) => layer.layer_type === group.type)),
    activeLayers: sortLayersTopToBottom(
      stackableLayers.filter((layer) => layer.layer_type === group.type)
    ),
  })).filter((group) => group.layers.length > 0)

  const handleDrop = (
    groupType: string,
    groupLayers: MapLayer[],
    activeLayers: MapLayer[],
    targetIndex: number
  ) => {
    if (dragGroup !== groupType || dragIndex === null || dragIndex === targetIndex) {
      setDragGroup(null)
      setDragIndex(null)
      return
    }
    const next = [...activeLayers]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(targetIndex, 0, moved)
    onReorderGroup(groupType, next)
    setDragGroup(null)
    setDragIndex(null)
  }

  if (layers.length === 0) {
    return (
      <p className="text-sm text-app-muted">
        No layers yet. Create one above.
      </p>
    )
  }

  return (
    <div className="card overflow-x-auto">
      <div className="px-5 py-4 border-b app-divider flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="font-bold text-app-text">Commodity layers ({layers.length})</h2>
          <p className="text-sm text-app-muted mt-1 max-w-2xl">
            Arrange draw order, edit colors, and control visibility. Create new layers under Layers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <label className="checkbox-label checkbox-label--muted">
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(e) => onShowHiddenChange(e.target.checked)}
              className="checkbox"
            />
            <span>Include hidden layers</span>
          </label>
          {canResetStack && (
            <button
              type="button"
              onClick={onResetDefault}
              disabled={reorderBusy}
              className="text-sm px-3 py-2 rounded-lg border border-app-border hover:bg-app-subtle text-app-text-secondary disabled:opacity-50"
            >
              Reset default stack
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th className="w-10" aria-label="Reorder" />
              <th>Layer</th>
              <th>Type</th>
              <th className="tabular-nums">Features</th>
              <th>Stack</th>
              <th>Last upload</th>
              <th>Color</th>
              <th>Line weight</th>
              <th>Buffer</th>
              <th className="w-12 text-right" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {groupedLayers.map((group) => {
              const groupCanDrag = group.activeLayers.length > 1 && !reorderBusy

              return (
                <Fragment key={group.type}>
                  <tr className="bg-app-subtle/60">
                    <td colSpan={10} className="!py-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-app-text">{group.label}</p>
                          <p className="text-xs text-app-text-muted">{group.hint}</p>
                        </div>
                        {groupCanDrag && (
                          <span className="text-[10px] font-medium uppercase tracking-wide text-app-text-muted shrink-0">
                            Top = front
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                  {group.layers.map((layer) => {
                    const displayColor = layerDisplayColor(layer)
                    const activeIndex = group.activeLayers.findIndex((item) => item.id === layer.id)
                    const stackLabel =
                      layer.is_active && group.activeLayers.length > 0 && activeIndex >= 0
                        ? stackPositionLabel(activeIndex, group.activeLayers.length)
                        : '-'
                    const canDrag = layer.is_active && groupCanDrag
                    const isDragging =
                      dragGroup === group.type && dragIndex === activeIndex && activeIndex >= 0

                    const isHighlighted = highlightLayerId === layer.id

                    return (
                      <Fragment key={layer.id}>
                        <tr
                          ref={isHighlighted ? highlightRowRef : undefined}
                          className={`${!layer.is_active ? 'opacity-70' : ''} ${
                            canDrag ? 'hover:bg-app-subtle/40' : ''
                          } ${isDragging ? 'opacity-50 bg-app-subtle/40' : ''} ${
                            isHighlighted ? 'bg-terra-500/10 ring-1 ring-inset ring-terra-500/35' : ''
                          }`}
                          draggable={canDrag}
                          onDragStart={() => {
                            if (!canDrag || activeIndex < 0) return
                            setDragGroup(group.type)
                            setDragIndex(activeIndex)
                          }}
                          onDragEnd={() => {
                            setDragGroup(null)
                            setDragIndex(null)
                          }}
                          onDragOver={(e) => {
                            if (!canDrag || dragGroup !== group.type || activeIndex < 0) return
                            e.preventDefault()
                          }}
                          onDrop={(e) => {
                            e.preventDefault()
                            if (activeIndex < 0) return
                            handleDrop(group.type, group.layers, group.activeLayers, activeIndex)
                          }}
                        >
                          <td className="w-10 text-center">
                            {canDrag ? (
                              <span
                                className="inline-flex text-app-text-muted select-none cursor-grab active:cursor-grabbing"
                                title="Drag to reorder"
                              >
                                <GripIcon />
                              </span>
                            ) : (
                              <span className="inline-block w-4" aria-hidden />
                            )}
                          </td>
                          <td className="min-w-[10rem]">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full shrink-0 border border-app-border/50"
                                style={{ backgroundColor: displayColor }}
                              />
                              <div className="min-w-0">
                                <div className="font-medium text-app-text">{displayName(layer)}</div>
                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                  {!layer.is_active && (
                                    <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-px rounded bg-app-subtle text-app-text-muted border border-app-border">
                                      Hidden
                                    </span>
                                  )}
                                  {layer.is_preview && (
                                    <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-px rounded bg-terra-500/10 text-terra-600 dark:text-terra-400 border border-terra-500/25">
                                      Preview
                                    </span>
                                  )}
                                  {alternateName(layer) && (
                                    <span className="text-xs text-app-text-muted truncate max-w-[12rem]">
                                      {alternateName(layer)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="text-app-text-secondary capitalize whitespace-nowrap">
                            {layer.layer_type}
                          </td>
                          <td className="tabular-nums text-app-text">{layer.feature_count}</td>
                          <td className="text-xs text-app-text-muted whitespace-nowrap">
                            {stackLabel}
                            <span className="block text-[11px]">z{layer.z_index}</span>
                          </td>
                          <td className="text-xs text-app-text-muted whitespace-nowrap">
                            <span className="text-app-text-secondary">
                              {layer.last_uploaded_by_name ?? '-'}
                            </span>
                            {layer.last_uploaded_at && (
                              <span className="block">{formatWhenShort(layer.last_uploaded_at)}</span>
                            )}
                          </td>
                          <td>
                            <label className="inline-flex items-center gap-1.5" title="Change layer color">
                              <input
                                type="color"
                                value={displayColor.startsWith('#') ? displayColor : '#0D9488'}
                                onChange={(e) => onColorChange(layer, e.target.value)}
                                disabled={updateBusy}
                                className="h-7 w-8 cursor-pointer rounded border border-app-border bg-transparent p-0.5"
                                aria-label={`Color for ${displayName(layer)}`}
                              />
                              <span className="text-[10px] font-mono text-app-text-muted hidden lg:inline">
                                {displayColor}
                              </span>
                            </label>
                          </td>
                          <td>
                            {layer.layer_type === 'line' ? (
                              <select
                                value={resolveStructureRank(layer)}
                                onChange={(e) =>
                                  onStructureRankChange(
                                    layer,
                                    Number(e.target.value) as StructureLineRank
                                  )
                                }
                                disabled={updateBusy}
                                className="input !py-1 !px-2 text-xs max-w-[9rem]"
                                aria-label={`Line weight for ${displayName(layer)}`}
                              >
                                {STRUCTURE_RANK_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.shortLabel}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-app-text-muted">-</span>
                            )}
                          </td>
                          <td>
                            <input
                              type="number"
                              min={LAYER_BUFFER_KM_MIN}
                              max={LAYER_BUFFER_KM_MAX}
                              step={1}
                              value={layer.buffer_km ?? ''}
                              onChange={(e) => {
                                const raw = e.target.value
                                if (raw === '') {
                                  onBufferChange(layer, null)
                                  return
                                }
                                const n = Number(raw)
                                if (Number.isFinite(n)) onBufferChange(layer, n)
                              }}
                              onBlur={(e) => {
                                const raw = e.target.value
                                if (raw === '') return
                                const n = Number(raw)
                                if (!Number.isFinite(n)) {
                                  onBufferChange(layer, null)
                                  return
                                }
                                const clamped = clampBufferKm(n)
                                if (clamped !== layer.buffer_km) onBufferChange(layer, clamped)
                              }}
                              disabled={updateBusy}
                              placeholder="Off"
                              className="input !py-1 !px-2 text-xs max-w-[6.5rem]"
                              aria-label={`Reference buffer for ${displayName(layer)}`}
                              title={`Insight influence radius (${formatBufferKmRange()}, leave empty to disable)`}
                            />
                          </td>
                          <td className="text-right w-12">
                            <LayerActionsMenu
                              layer={layer}
                              layerLabel={displayName(layer)}
                              isOpen={openMenuLayerId === layer.id}
                              historyOpen={expandedLayerId === layer.id}
                              isAdmin={isAdmin}
                              updateBusy={updateBusy}
                              deleteBusy={deleteBusy}
                              onOpenChange={(open) =>
                                setOpenMenuLayerId(open ? layer.id : null)
                              }
                              onToggleExpanded={() => onToggleExpanded(layer.id)}
                              onToggleActive={() => onToggleActive(layer)}
                              onTogglePreview={() => onTogglePreview(layer)}
                              onDelete={() => onDelete(layer)}
                              onEditDetails={
                                onEditDetails ? () => onEditDetails(layer) : undefined
                              }
                            />
                          </td>
                        </tr>
                        {expandedLayerId === layer.id && (
                          <tr>
                            <td colSpan={10} className="!py-3 bg-app-subtle/40">
                              {renderVersionHistory(layer.id)}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
