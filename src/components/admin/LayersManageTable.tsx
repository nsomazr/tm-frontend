import { Fragment, useState, useEffect, useMemo, useRef, type ReactNode } from 'react'
import type { MapLayer } from '../../types'
import ActionMenu, { ActionMenuItem } from '../ui/ActionMenu'
import ListPagination from '../ui/ListPagination'
import MineralColorPickerModal from './MineralColorPickerModal'
import { sortLayersTopToBottom, stackPositionLabel } from './layerOrder'
import { layerDisplayColor, layerStyleWithColor } from './layerColors'
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
import {
  clampHeatmapWeight,
  LAYER_HEATMAP_WEIGHT_DEFAULT,
  LAYER_HEATMAP_WEIGHT_MAX,
  LAYER_HEATMAP_WEIGHT_MIN,
} from '../../constants/layerHeatmapWeight'
import { DEFAULT_PAGE_SIZE } from '../../hooks/usePagination'

const GROUP_PAGE_SIZE = DEFAULT_PAGE_SIZE

export const LAYER_ARRANGE_GROUPS = [
  {
    type: 'polygon' as const,
    label: 'Polygons',
  },
  {
    type: 'line' as const,
    label: 'Lines',
  },
  {
    type: 'point' as const,
    label: 'Points',
  },
]

function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <circle cx="5" cy="4" r="1.25" />
      <circle cx="11" cy="4" r="1.25" />
      <circle cx="5" cy="8" r="1.25" />
      <circle cx="11" cy="8" r="1.25" />
      <circle cx="5" cy="12" r="1.25" />
      <circle cx="11" cy="12" r="1.25" />
    </svg>
  )
}

function PolygonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M3 11.5 8 2.5l5 9H3Z" strokeLinejoin="round" />
    </svg>
  )
}

function LineIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M2.5 12.5 6 7l3 3 4.5-6.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PointIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <circle cx="8" cy="8" r="3.25" />
    </svg>
  )
}

function groupIcon(type: string) {
  if (type === 'polygon') return <PolygonIcon />
  if (type === 'line') return <LineIcon />
  return <PointIcon />
}

function shortStackLabel(indexFromTop: number, total: number) {
  if (total <= 1) return 'Solo'
  if (indexFromTop === 0) return 'Front'
  if (indexFromTop === total - 1) return 'Back'
  return `${indexFromTop + 1}/${total}`
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
        {layer.is_preview ? 'Free map off' : 'Free map on'}
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
  if (!iso) return null
  return new Date(iso).toLocaleDateString()
}

interface LayersManageTableProps {
  layers: MapLayer[]
  /** Full catalog used for Select all (includes hidden when the table filter hides them). */
  allLayers?: MapLayer[]
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
  onHeatmapWeightChange: (layer: MapLayer, weight: number) => void
  onToggleActive: (layer: MapLayer) => void
  onTogglePreview: (layer: MapLayer) => void
  onDelete: (layer: MapLayer) => void
  onBulkDelete?: (layers: MapLayer[]) => void
  onEditDetails?: (layer: MapLayer) => void
  renderVersionHistory: (layerId: number) => ReactNode
  isAdmin: boolean
  reorderBusy?: boolean
  updateBusy?: boolean
  deleteBusy?: boolean
}

export default function LayersManageTable({
  layers,
  allLayers,
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
  onHeatmapWeightChange,
  onToggleActive,
  onTogglePreview,
  onDelete,
  onBulkDelete,
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
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const [openMenuLayerId, setOpenMenuLayerId] = useState<number | null>(null)
  const [colorPickerLayerId, setColorPickerLayerId] = useState<number | null>(null)
  const [groupPages, setGroupPages] = useState<Record<string, number>>({})
  /** When true, that group lists every layer (for cross-page drag reorder). */
  const [groupShowAll, setGroupShowAll] = useState<Record<string, boolean>>({})
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set())
  const highlightRowRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (highlightLayerId == null) return
    highlightRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlightLayerId])

  // Drop selection entries that are no longer in the catalog.
  useEffect(() => {
    const catalog = allLayers ?? layers
    const valid = new Set(catalog.map((layer) => layer.id))
    setSelectedIds((prev) => {
      let changed = false
      const next = new Set<number>()
      for (const id of prev) {
        if (valid.has(id)) next.add(id)
        else changed = true
      }
      return changed ? next : prev
    })
  }, [allLayers, layers])

  const usedColors = useMemo(
    () => layers.map((layer) => layerDisplayColor(layer)).filter(Boolean),
    [layers]
  )
  const colorPickerLayer = layers.find((layer) => layer.id === colorPickerLayerId) ?? null

  const canResetStack = stackableLayers.length > 1
  const selectionPool = allLayers ?? layers
  const hiddenCount = useMemo(
    () => selectionPool.filter((layer) => !layer.is_active).length,
    [selectionPool],
  )
  const allSelected = selectionPool.length > 0 && selectedIds.size === selectionPool.length
  const someSelected = selectedIds.size > 0 && !allSelected
  const selectedLayers = useMemo(
    () => selectionPool.filter((layer) => selectedIds.has(layer.id)),
    [selectionPool, selectedIds],
  )

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
      return
    }
    // Select every layer in the catalog, including hidden ones not currently listed.
    if (!showHidden && hiddenCount > 0) {
      onShowHiddenChange(true)
    }
    setSelectedIds(new Set(selectionPool.map((layer) => layer.id)))
  }

  const toggleSelectLayer = (layerId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(layerId)) next.delete(layerId)
      else next.add(layerId)
      return next
    })
  }

  const handleBulkDeleteClick = () => {
    if (!onBulkDelete || selectedLayers.length === 0) return
    onBulkDelete(selectedLayers)
  }

  const groupedLayers = useMemo(
    () =>
      LAYER_ARRANGE_GROUPS.map((group) => ({
        ...group,
        layers: sortLayersTopToBottom(layers.filter((layer) => layer.layer_type === group.type)),
        activeLayers: sortLayersTopToBottom(
          stackableLayers.filter((layer) => layer.layer_type === group.type)
        ),
      })).filter((group) => group.layers.length > 0),
    [layers, stackableLayers],
  )

  useEffect(() => {
    if (highlightLayerId == null) return
    for (const group of groupedLayers) {
      const index = group.layers.findIndex((layer) => layer.id === highlightLayerId)
      if (index < 0) continue
      if (groupShowAll[group.type]) break
      const page = Math.floor(index / GROUP_PAGE_SIZE) + 1
      setGroupPages((prev) => (prev[group.type] === page ? prev : { ...prev, [group.type]: page }))
      break
    }
  }, [highlightLayerId, groupedLayers, groupShowAll])

  const setGroupPage = (groupType: string, page: number) => {
    setGroupPages((prev) => ({ ...prev, [groupType]: page }))
  }

  const toggleGroupShowAll = (groupType: string) => {
    setGroupShowAll((prev) => ({ ...prev, [groupType]: !prev[groupType] }))
  }

  const handleDrop = (
    groupType: string,
    activeLayers: MapLayer[],
    targetIndex: number
  ) => {
    if (dragGroup !== groupType || dragIndex === null || dragIndex === targetIndex) {
      setDragGroup(null)
      setDragIndex(null)
      setDropIndex(null)
      return
    }
    const next = [...activeLayers]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(targetIndex, 0, moved)
    onReorderGroup(groupType, next)
    setDragGroup(null)
    setDragIndex(null)
    setDropIndex(null)
  }

  if (layers.length === 0) {
    return (
      <p className="text-sm text-app-muted">
        No layers yet. Create one above.
      </p>
    )
  }

  return (
    <div className="card-flat !p-0 overflow-hidden">
      <div className="relative px-4 py-3 sm:px-5 border-b app-divider overflow-hidden">
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex flex-wrap items-center gap-2.5">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected
                }}
                onChange={toggleSelectAll}
                className="checkbox"
                aria-label={allSelected ? 'Clear layer selection' : 'Select all layers'}
              />
              <span className="text-xs font-medium text-app-text-secondary">Select all</span>
            </label>
            <h2 className="text-base font-semibold tracking-tight text-app-text">Layers</h2>
            <span className="inline-flex items-center rounded-full border border-app-border bg-app-subtle/70 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-app-text-secondary">
              {layers.length}
            </span>
            {selectedIds.size > 0 && (
              <span className="inline-flex items-center rounded-full border border-terra-500/30 bg-terra-500/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-terra-800 dark:text-terra-300">
                {selectedIds.size} selected
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {selectedIds.size > 0 && onBulkDelete && (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs font-medium px-3 py-1.5 rounded-full border border-app-border bg-app-surface/80 text-app-text-secondary hover:bg-app-subtle hover:text-app-text transition-colors"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleBulkDeleteClick}
                  disabled={deleteBusy}
                  className="text-xs font-medium px-3 py-1.5 rounded-full border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
                >
                  Delete selected
                </button>
              </>
            )}
            <label className="inline-flex items-center gap-2 rounded-full border border-app-border bg-app-surface/80 px-3 py-1.5 text-xs text-app-text-secondary cursor-pointer hover:border-app-border-strong transition-colors">
              <input
                type="checkbox"
                checked={showHidden}
                onChange={(e) => onShowHiddenChange(e.target.checked)}
                className="checkbox"
              />
              <span>Hidden{hiddenCount > 0 ? ` (${hiddenCount})` : ''}</span>
            </label>
            {canResetStack && (
              <button
                type="button"
                onClick={onResetDefault}
                disabled={reorderBusy}
                className="text-xs font-medium px-3 py-1.5 rounded-full border border-app-border bg-app-surface/80 text-app-text-secondary hover:bg-app-subtle hover:text-app-text disabled:opacity-50 transition-colors"
                title="Polygons under lines under points; within each type, larger coverage at the bottom"
              >
                Reset stack
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="divide-y divide-[var(--color-app-border)]">
        {groupedLayers.map((group) => {
          const groupCanDrag = group.activeLayers.length > 1 && !reorderBusy
          const showAll = Boolean(groupShowAll[group.type])
          const needsPaging = group.layers.length > GROUP_PAGE_SIZE
          const pageCount = Math.max(1, Math.ceil(group.layers.length / GROUP_PAGE_SIZE))
          const page = Math.min(Math.max(1, groupPages[group.type] ?? 1), pageCount)
          const pageLayers = showAll
            ? group.layers
            : group.layers.slice((page - 1) * GROUP_PAGE_SIZE, page * GROUP_PAGE_SIZE)

          return (
            <section key={group.type} className="bg-app-surface">
              <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3 bg-app-subtle/35">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-app-border bg-app-surface text-app-text-muted shrink-0">
                    {groupIcon(group.type)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-app-text">{group.label}</h3>
                      <span className="text-[11px] tabular-nums text-app-text-muted">
                        {group.layers.length}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {needsPaging && (
                    <button
                      type="button"
                      onClick={() => toggleGroupShowAll(group.type)}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-full border border-app-border bg-app-surface/80 text-app-text-secondary hover:bg-app-subtle hover:text-app-text transition-colors"
                      title={
                        showAll
                          ? `Show ${GROUP_PAGE_SIZE} per page`
                          : 'Show every layer in this group (easier drag reorder)'
                      }
                    >
                      {showAll ? `Pages of ${GROUP_PAGE_SIZE}` : 'Show all'}
                    </button>
                  )}
                  {groupCanDrag && (
                    <span className="hidden sm:inline text-[10px] font-medium uppercase tracking-[0.08em] text-app-text-muted">
                      Top = front
                    </span>
                  )}
                </div>
              </div>

              <ul className="app-divide-y">
                {pageLayers.map((layer) => {
                  const displayColor = layerDisplayColor(layer)
                  const activeIndex = group.activeLayers.findIndex((item) => item.id === layer.id)
                  const stackShort =
                    layer.is_active && group.activeLayers.length > 0 && activeIndex >= 0
                      ? shortStackLabel(activeIndex, group.activeLayers.length)
                      : null
                  const stackFull =
                    layer.is_active && group.activeLayers.length > 0 && activeIndex >= 0
                      ? stackPositionLabel(activeIndex, group.activeLayers.length)
                      : null
                  const canDrag = layer.is_active && groupCanDrag
                  const isDragging =
                    dragGroup === group.type && dragIndex === activeIndex && activeIndex >= 0
                  const isDropTarget =
                    dragGroup === group.type &&
                    dropIndex === activeIndex &&
                    activeIndex >= 0 &&
                    dragIndex !== activeIndex
                  const isHighlighted = highlightLayerId === layer.id
                  const isExpanded = expandedLayerId === layer.id
                  const uploadedAt = formatWhenShort(layer.last_uploaded_at)
                  const alt = alternateName(layer)

                  return (
                    <Fragment key={layer.id}>
                      <li>
                        <div
                          ref={isHighlighted ? highlightRowRef : undefined}
                          className={`group relative flex flex-col gap-3 px-4 py-3.5 sm:px-6 sm:py-4 transition-[background-color,opacity,box-shadow] duration-200 ${
                            !layer.is_active ? 'opacity-60' : ''
                          } ${isDragging ? 'opacity-40' : ''} ${
                            isDropTarget
                              ? 'bg-terra-500/8 shadow-[inset_3px_0_0_0_var(--color-terra-500,#22c55e)]'
                              : isHighlighted
                                ? 'bg-terra-500/10 shadow-[inset_3px_0_0_0_var(--color-terra-500,#22c55e)]'
                                : canDrag
                                  ? 'hover:bg-app-subtle/50'
                                  : 'hover:bg-app-subtle/30'
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
                            setDropIndex(null)
                          }}
                          onDragOver={(e) => {
                            if (!canDrag || dragGroup !== group.type || activeIndex < 0) return
                            e.preventDefault()
                            setDropIndex(activeIndex)
                          }}
                          onDragLeave={() => {
                            if (dropIndex === activeIndex) setDropIndex(null)
                          }}
                          onDrop={(e) => {
                            e.preventDefault()
                            if (activeIndex < 0) return
                            handleDrop(group.type, group.activeLayers, activeIndex)
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex items-center gap-2 pt-0.5 shrink-0">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(layer.id)}
                                onChange={() => toggleSelectLayer(layer.id)}
                                className="checkbox"
                                aria-label={`Select ${displayName(layer)}`}
                                onClick={(e) => e.stopPropagation()}
                              />
                              {canDrag ? (
                                <span
                                  className="inline-flex h-7 w-6 items-center justify-center rounded-md text-app-text-muted/70 group-hover:text-app-text-secondary select-none cursor-grab active:cursor-grabbing"
                                  title="Drag to reorder"
                                >
                                  <GripIcon />
                                </span>
                              ) : (
                                <span className="inline-block w-6" aria-hidden />
                              )}
                              <span
                                className="relative h-9 w-9 rounded-xl border border-black/5 dark:border-white/10 shadow-sm shrink-0"
                                style={{ backgroundColor: displayColor }}
                                aria-hidden
                              >
                                <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/25 to-transparent pointer-events-none" />
                              </span>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="font-medium text-app-text truncate">
                                  {displayName(layer)}
                                </span>
                                {layer.mineral_name && (
                                  <span
                                    className="text-[10px] font-medium uppercase tracking-wide px-1.5 py-px rounded-md bg-app-subtle text-app-text-muted border border-app-border truncate max-w-[10rem]"
                                    title={`Belongs to ${layer.mineral_name}`}
                                  >
                                    {layer.mineral_name}
                                  </span>
                                )}
                                {!layer.is_active && (
                                  <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-px rounded-md bg-app-subtle text-app-text-muted border border-app-border">
                                    Hidden
                                  </span>
                                )}
                                {stackShort && (
                                  <span
                                    className="inline-flex items-center gap-1 rounded-md bg-app-subtle/90 border border-app-border px-1.5 py-px text-[10px] font-medium text-app-text-muted"
                                    title={`${stackFull} · z${layer.z_index}`}
                                  >
                                    <span className="opacity-70">Stack</span>
                                    <span className="text-app-text-secondary tabular-nums">
                                      {stackShort}
                                    </span>
                                  </span>
                                )}
                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-app-text-muted">
                                <span className="tabular-nums text-app-text-secondary">
                                  {layer.feature_count.toLocaleString()}{' '}
                                  <span className="text-app-text-muted">
                                    {layer.feature_count === 1 ? 'feature' : 'features'}
                                  </span>
                                </span>
                                {(layer.last_uploaded_by_name || uploadedAt) && (
                                  <>
                                    <span className="text-app-text-muted/50" aria-hidden>
                                      ·
                                    </span>
                                    <span>
                                      {layer.last_uploaded_by_name ?? 'Upload'}
                                      {uploadedAt ? ` · ${uploadedAt}` : ''}
                                    </span>
                                  </>
                                )}
                                {alt && (
                                  <>
                                    <span className="text-app-text-muted/50" aria-hidden>
                                      ·
                                    </span>
                                    <span className="truncate max-w-[12rem]">{alt}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="shrink-0 pt-0.5">
                              <LayerActionsMenu
                                layer={layer}
                                layerLabel={displayName(layer)}
                                isOpen={openMenuLayerId === layer.id}
                                historyOpen={isExpanded}
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
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-2.5 pl-0 sm:pl-[3.25rem]">
                            <label
                              className={`col-span-2 sm:col-auto inline-flex items-center gap-2 rounded-xl border px-2.5 py-2 sm:py-1.5 transition-colors ${
                                layer.is_preview && layer.is_active
                                  ? 'border-terra-500/30 bg-terra-500/8'
                                  : 'border-app-border bg-app-subtle/40'
                              } ${!layer.is_active || updateBusy ? 'opacity-50' : 'cursor-pointer hover:border-app-border-strong'}`}
                              title={
                                layer.is_preview
                                  ? 'On free map. Click to hide'
                                  : 'Off free map. Click to show'
                              }
                            >
                              <input
                                type="checkbox"
                                checked={layer.is_preview}
                                disabled={updateBusy || !layer.is_active}
                                onChange={() => onTogglePreview(layer)}
                                className="checkbox"
                                aria-label={`Show ${displayName(layer)} on free map and legend`}
                              />
                              <span className="text-xs font-medium text-app-text-secondary whitespace-nowrap">
                                Free map
                              </span>
                            </label>

                            <button
                              type="button"
                              disabled={updateBusy}
                              onClick={() => setColorPickerLayerId(layer.id)}
                              className="inline-flex items-center gap-2 rounded-xl border border-app-border bg-app-subtle/40 px-2.5 py-1.5 hover:border-app-border-strong disabled:opacity-50"
                              title="Choose mineral color"
                            >
                              <span className="text-[10px] font-medium uppercase tracking-wide text-app-text-muted">
                                Color
                              </span>
                              <span
                                className="h-6 w-7 rounded-md border border-app-border"
                                style={{
                                  backgroundColor: displayColor.startsWith('#')
                                    ? displayColor
                                    : '#0D9488',
                                }}
                                aria-hidden
                              />
                              <span className="hidden md:inline text-[10px] font-mono text-app-text-muted tabular-nums">
                                {displayColor}
                              </span>
                            </button>

                            {layer.layer_type === 'line' && (
                              <label className="inline-flex items-center gap-2 rounded-xl border border-app-border bg-app-subtle/40 px-2.5 py-1.5">
                                <span className="text-[10px] font-medium uppercase tracking-wide text-app-text-muted whitespace-nowrap">
                                  Weight
                                </span>
                                <select
                                  value={resolveStructureRank(layer)}
                                  onChange={(e) =>
                                    onStructureRankChange(
                                      layer,
                                      Number(e.target.value) as StructureLineRank
                                    )
                                  }
                                  disabled={updateBusy}
                                  className="input !py-0.5 !px-1.5 !rounded-lg text-xs max-w-[8.5rem] !bg-transparent border-0 shadow-none focus:!shadow-none"
                                  aria-label={`Line weight for ${displayName(layer)}`}
                                >
                                  {STRUCTURE_RANK_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.shortLabel}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            )}

                            <label
                              className="inline-flex items-center gap-2 rounded-xl border border-app-border bg-app-subtle/40 px-2.5 py-1.5"
                              title="0–10 weight"
                            >
                              <span className="text-[10px] font-medium uppercase tracking-wide text-app-text-muted whitespace-nowrap">
                                Heat
                              </span>
                              <input
                                type="number"
                                min={LAYER_HEATMAP_WEIGHT_MIN}
                                max={LAYER_HEATMAP_WEIGHT_MAX}
                                step={1}
                                value={layer.heatmap_weight ?? LAYER_HEATMAP_WEIGHT_DEFAULT}
                                onChange={(e) => {
                                  const n = Number(e.target.value)
                                  if (Number.isFinite(n)) onHeatmapWeightChange(layer, n)
                                }}
                                onBlur={(e) => {
                                  const n = Number(e.target.value)
                                  if (!Number.isFinite(n)) {
                                    onHeatmapWeightChange(layer, LAYER_HEATMAP_WEIGHT_DEFAULT)
                                    return
                                  }
                                  const clamped = clampHeatmapWeight(n)
                                  if (clamped !== (layer.heatmap_weight ?? LAYER_HEATMAP_WEIGHT_DEFAULT)) {
                                    onHeatmapWeightChange(layer, clamped)
                                  }
                                }}
                                disabled={updateBusy}
                                className="input !py-0.5 !px-1.5 !rounded-lg text-xs w-[3.25rem] tabular-nums !bg-transparent"
                                aria-label={`Heatmap weight for ${displayName(layer)}`}
                              />
                            </label>

                            <label
                              className="inline-flex items-center gap-2 rounded-xl border border-app-border bg-app-subtle/40 px-2.5 py-1.5 whitespace-nowrap"
                              title={`Buffer radius (${formatBufferKmRange()}, empty = off)`}
                            >
                              <span className="text-[10px] font-medium uppercase tracking-wide text-app-text-muted">
                                Buffer
                              </span>
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
                                className="input !py-0.5 !px-1.5 !rounded-lg text-xs w-12 tabular-nums !bg-transparent"
                                aria-label={`Buffer for ${displayName(layer)}`}
                              />
                              <span className="text-[10px] text-app-text-muted">km</span>
                            </label>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-4 pb-4 sm:px-6 sm:pl-[4.75rem] bg-app-subtle/25 border-t app-divider">
                            {renderVersionHistory(layer.id)}
                          </div>
                        )}
                      </li>
                    </Fragment>
                  )
                })}
              </ul>
              {needsPaging && !showAll && (
                <div className="px-4 py-3 sm:px-6 border-t app-divider bg-app-subtle/20">
                  <ListPagination
                    page={page}
                    pageCount={pageCount}
                    total={group.layers.length}
                    pageSize={GROUP_PAGE_SIZE}
                    onPageChange={(next) => setGroupPage(group.type, next)}
                  />
                </div>
              )}
            </section>
          )
        })}
      </div>

      <MineralColorPickerModal
        open={colorPickerLayer != null}
        onClose={() => setColorPickerLayerId(null)}
        title={`Color · ${colorPickerLayer ? displayName(colorPickerLayer) : 'Layer'}`}
        layerName={colorPickerLayer ? displayName(colorPickerLayer) : ''}
        usedColors={usedColors}
        selectedColor={
          colorPickerLayer
            ? layerDisplayColor(colorPickerLayer)
            : '#0D9488'
        }
        onSelect={(hex) => {
          if (colorPickerLayer) onColorChange(colorPickerLayer, hex)
        }}
      />
    </div>
  )
}
