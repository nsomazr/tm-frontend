import { Link, useSearchParams } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mapsApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import ListPagination from '../ui/ListPagination'
import { toast } from '../ui/toast'
import { ADMIN_LAYERS_KEY, useAdminLayers } from '../../hooks/useAdminLayers'
import { usePagination } from '../../hooks/usePagination'
import { useDisplayName } from '../../i18n/useDisplayName'
import LayersManageTable from './LayersManageTable'
import { layerStyleWithColor } from './layerColors'
import {
  layerStyleWithStructureRank,
  type StructureLineRank,
} from '../map/structureLineRank'
import {
  applyDefaultTypeStack,
  applyGroupOrder,
  sortLayersBottomToTop,
  uniqueLayerIds,
} from './layerOrder'
import type { MapLayer } from '../../types'

function invalidateLayerQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ADMIN_LAYERS_KEY })
  qc.invalidateQueries({ queryKey: ['layers'] })
  qc.invalidateQueries({ queryKey: ['map-layers'] })
  qc.invalidateQueries({ queryKey: ['layer-uploads'] })
  qc.invalidateQueries({ queryKey: ['layer-audit'] })
  qc.invalidateQueries({ queryKey: ['layer-versions'] })
}

function formatWhen(iso?: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString()
}

function LayerVersionHistory({ layerId, className = 'mt-3' }: { layerId: number; className?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['layer-versions', layerId],
    queryFn: () => mapsApi.versions({ layer: String(layerId) }).then((r) => r.data),
  })
  const versions = data?.results ?? []
  const pagination = usePagination(versions)

  if (isLoading) {
    return <p className={`text-xs text-app-text-muted ${className}`}>Loading upload history…</p>
  }

  if (!versions.length) {
    return <p className={`text-xs text-app-text-muted ${className}`}>No uploads recorded yet.</p>
  }

  return (
    <div className={`${className} rounded-lg border border-app-border/50 overflow-hidden`}>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Version</th>
            <th>Uploaded by</th>
            <th>Features</th>
            <th>When</th>
          </tr>
        </thead>
        <tbody>
          {pagination.pageItems.map((version) => (
            <tr key={version.id}>
              <td className="text-app-text">v{version.version_number}</td>
              <td>{version.uploaded_by_name ?? 'Unknown'}</td>
              <td className="tabular-nums">{version.feature_count}</td>
              <td className="text-app-text-muted">{formatWhen(version.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3 pb-3">
        <ListPagination
          page={pagination.page}
          pageCount={pagination.pageCount}
          total={pagination.total}
          pageSize={pagination.pageSize}
          onPageChange={pagination.setPage}
        />
      </div>
    </div>
  )
}

interface CommodityLayersPanelProps {
  onEditDetails?: (layer: MapLayer) => void
}

export default function CommodityLayersPanel({ onEditDetails }: CommodityLayersPanelProps) {
  const qc = useQueryClient()
  const { isAdmin } = useAuth()
  const displayName = useDisplayName()
  const [searchParams, setSearchParams] = useSearchParams()
  const focusLayerSlug = searchParams.get('layer')
  const [showHidden, setShowHidden] = useState(false)
  const [expandedLayerId, setExpandedLayerId] = useState<number | null>(null)
  const [highlightLayerId, setHighlightLayerId] = useState<number | null>(null)
  const highlightHandled = useRef(false)

  const { data: allLayers = [], isLoading } = useAdminLayers()

  useEffect(() => {
    if (!focusLayerSlug || highlightHandled.current || allLayers.length === 0) return
    const match = allLayers.find((layer) => layer.slug === focusLayerSlug)
    if (!match) return
    highlightHandled.current = true
    setExpandedLayerId(match.id)
    setHighlightLayerId(match.id)
    if (!match.is_active) setShowHidden(true)
    const next = new URLSearchParams(searchParams)
    next.delete('layer')
    setSearchParams(next, { replace: true })
    const timer = window.setTimeout(() => setHighlightLayerId(null), 4000)
    return () => window.clearTimeout(timer)
  }, [allLayers, focusLayerSlug, searchParams, setSearchParams])

  const visibleLayers = showHidden ? allLayers : allLayers.filter((l) => l.is_active)
  const stackableLayers = allLayers.filter((l) => l.is_active)

  const updateLayer = useMutation({
    mutationFn: ({ layer, data }: { layer: MapLayer; data: Partial<MapLayer> }) =>
      mapsApi.updateLayer(layer.slug, data, layer.mineral_slug),
    onSuccess: () => {
      invalidateLayerQueries(qc)
    },
    onError: (err: Error) => {
      toast.error('Update failed', { description: err.message })
    },
  })

  const deleteLayer = useMutation({
    mutationFn: (layer: MapLayer) => mapsApi.deleteLayer(layer.slug, layer.mineral_slug),
    onSuccess: () => {
      invalidateLayerQueries(qc)
      toast.success('Layer deleted')
    },
    onError: (err: Error) => {
      toast.error('Delete failed', { description: err.message })
    },
  })

  const persistLayerStack = async (orderedActive: MapLayer[]) => {
    const bottomToTop = sortLayersBottomToTop(orderedActive)
    const inactive = sortLayersBottomToTop(allLayers.filter((layer) => !layer.is_active))
    const layerIds = uniqueLayerIds([
      ...bottomToTop.map((layer) => layer.id),
      ...inactive.map((layer) => layer.id),
    ])
    if (layerIds.length === 0) return
    await mapsApi.reorder(layerIds)
  }

  const reorderStack = useMutation({
    mutationFn: (orderedActive: MapLayer[]) => persistLayerStack(orderedActive),
    onSuccess: () => {
      invalidateLayerQueries(qc)
      toast.success('Layer draw order updated')
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail ??
        (err instanceof Error ? err.message : 'Unknown error')
      toast.error('Could not update layer order', {
        description: typeof detail === 'string' ? detail : JSON.stringify(detail),
      })
    },
  })

  const handleReorderGroup = (groupType: string, orderedTopToBottom: MapLayer[]) => {
    const next = applyGroupOrder(stackableLayers, groupType, orderedTopToBottom)
    reorderStack.mutate(next)
  }

  const handleDefaultStack = () => {
    if (stackableLayers.length === 0) return
    reorderStack.mutate(applyDefaultTypeStack(stackableLayers))
  }

  const handleLayerColorChange = (layer: MapLayer, color: string) => {
    updateLayer.mutate({
      layer,
      data: {
        style: layerStyleWithColor(layer.style, layer.layer_type, color),
      },
    })
  }

  const handleStructureRankChange = (layer: MapLayer, rank: StructureLineRank) => {
    updateLayer.mutate({
      layer,
      data: {
        style: layerStyleWithStructureRank(layer.style, rank),
      },
    })
  }

  const handleBufferChange = (layer: MapLayer, bufferKm: number | null) => {
    updateLayer.mutate({
      layer,
      data: { buffer_km: bufferKm },
    })
  }

  const handleToggleActive = (layer: MapLayer) => {
    const nextActive = !layer.is_active
    toast.confirm(`${nextActive ? 'Show' : 'Hide'} "${displayName(layer)}" on the map?`, {
      confirmLabel: nextActive ? 'Show' : 'Hide',
      onConfirm: () => {
        updateLayer.mutate({ layer, data: { is_active: nextActive } })
        toast.info(nextActive ? `Showing ${displayName(layer)}` : `Hiding ${displayName(layer)}`)
      },
    })
  }

  const handleTogglePreview = (layer: MapLayer) => {
    updateLayer.mutate({ layer, data: { is_preview: !layer.is_preview } })
  }

  const handleDelete = (layer: MapLayer) => {
    toast.confirm(`Delete "${displayName(layer)}"?`, {
      description: `All ${layer.feature_count} features will be removed. This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteLayer.mutate(layer),
    })
  }

  if (isLoading) {
    return <p className="text-sm text-app-muted">Loading layers…</p>
  }

  if (visibleLayers.length === 0) {
    return (
      <p className="text-sm text-app-muted">
        {allLayers.length > 0
          ? 'No active layers. Check “Include hidden layers” to review or delete old layers.'
          : (
              <>
                No layers yet.{' '}
                <Link to="/admin/layers" className="text-terra-600 dark:text-terra-400 hover:underline">
                  Create a layer
                </Link>{' '}
                first, then return here to arrange and style it.
              </>
            )}
      </p>
    )
  }

  return (
    <LayersManageTable
      layers={visibleLayers}
      stackableLayers={stackableLayers}
      showHidden={showHidden}
      onShowHiddenChange={setShowHidden}
      expandedLayerId={expandedLayerId}
      highlightLayerId={highlightLayerId}
      onToggleExpanded={(layerId) =>
        setExpandedLayerId((current) => (current === layerId ? null : layerId))
      }
      onReorderGroup={handleReorderGroup}
      onResetDefault={handleDefaultStack}
      onColorChange={handleLayerColorChange}
      onStructureRankChange={handleStructureRankChange}
      onBufferChange={handleBufferChange}
      onToggleActive={handleToggleActive}
      onTogglePreview={handleTogglePreview}
      onDelete={handleDelete}
      onEditDetails={onEditDetails}
      renderVersionHistory={(layerId) => (
        <LayerVersionHistory layerId={layerId} className="mx-1" />
      )}
      isAdmin={isAdmin}
      reorderBusy={reorderStack.isPending}
      updateBusy={updateLayer.isPending}
      deleteBusy={deleteLayer.isPending}
    />
  )
}
