import { useMemo } from 'react'
import type { MapLayer } from '../../types'
import SelectionChipList from './SelectionChipList'
import SearchPickList from './SearchPickList'

interface ReportLayerPickerProps {
  layers: MapLayer[]
  selectedIds: number[]
  primaryLayerId: string
  loading?: boolean
  displayName: (layer: MapLayer) => string
  onChange: (next: { layerIds: number[]; primaryLayerId: string; mineral: string }) => void
}

export default function ReportLayerPicker({
  layers,
  selectedIds,
  primaryLayerId,
  loading = false,
  displayName,
  onChange,
}: ReportLayerPickerProps) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const primaryLayer = layers.find((layer) => String(layer.id) === primaryLayerId)

  const selectedLayers = useMemo(
    () =>
      selectedIds
        .map((id) => layers.find((layer) => layer.id === id))
        .filter(Boolean) as MapLayer[],
    [selectedIds, layers]
  )

  const listItems = useMemo(
    () =>
      layers.map((layer) => ({
        id: layer.id,
        label: displayName(layer),
        sublabel: [layer.mineral_name, layer.region_name].filter(Boolean).join(' · ') || undefined,
        badge: String(layer.id) === primaryLayerId ? 'Primary' : undefined,
      })),
    [layers, displayName, primaryLayerId]
  )

  function applySelection(nextIds: number[], nextPrimaryId: string) {
    const primary = layers.find((layer) => String(layer.id) === nextPrimaryId)
    onChange({
      layerIds: nextIds,
      primaryLayerId: nextPrimaryId,
      mineral: primary ? String(primary.mineral) : '',
    })
  }

  function toggleLayer(id: number) {
    const layer = layers.find((row) => row.id === id)
    if (!layer) return

    if (selectedSet.has(id)) {
      const nextIds = selectedIds.filter((rowId) => rowId !== id)
      let nextPrimary = primaryLayerId
      if (String(id) === primaryLayerId) {
        nextPrimary = nextIds[0] ? String(nextIds[0]) : ''
      }
      applySelection(nextIds, nextPrimary)
      return
    }

    const nextIds = [...selectedIds, id]
    applySelection(nextIds, primaryLayerId || String(id))
  }

  function removeLayer(id: number) {
    toggleLayer(id)
  }

  function setPrimary(id: number) {
    applySelection(selectedIds, String(id))
  }

  return (
    <div className="space-y-3">
      {selectedLayers.length > 0 && (
        <SelectionChipList
          items={selectedLayers.map((layer) => ({
            id: layer.id,
            label: displayName(layer),
            badge: String(layer.id) === primaryLayerId ? 'Primary' : undefined,
          }))}
          onRemove={(id) => removeLayer(Number(id))}
        />
      )}

      <SearchPickList
        items={listItems}
        selectedIds={selectedSet}
        onToggle={toggleLayer}
        loading={loading}
        placeholder="Search layers…"
        emptyLabel="No layers available"
      />

      {selectedLayers.length > 1 && (
        <p className="text-xs text-app-text-muted">
          {selectedLayers
            .filter((layer) => String(layer.id) !== primaryLayerId)
            .map((layer) => (
              <button
                key={layer.id}
                type="button"
                onClick={() => setPrimary(layer.id)}
                className="text-terra-600 dark:text-terra-400 hover:underline mr-3"
              >
                Set {displayName(layer)} as primary
              </button>
            ))}
        </p>
      )}

      {primaryLayer &&
        selectedLayers.some((layer) => layer.mineral !== primaryLayer.mineral) && (
          <p className="text-xs text-amber-800 dark:text-amber-200">
            Commodity follows primary layer ({primaryLayer.mineral_name}).
          </p>
        )}
    </div>
  )
}
