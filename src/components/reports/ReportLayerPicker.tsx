import { useMemo } from 'react'
import type { MapLayer } from '../../types'
import LayerPickList, { layerSublabel } from './LayerPickList'
import SelectionChipList from './SelectionChipList'

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
    <div className="report-layer-setup">
      <div className="report-layer-setup__controls">
        <div className="report-layer-setup__picker">
          <LayerPickList
            layers={layers}
            selectedIds={selectedSet}
            primaryLayerId={primaryLayerId}
            displayName={displayName}
            onToggle={toggleLayer}
            loading={loading}
          />
        </div>
        {selectedLayers.length > 1 && (
          <SelectionChipList
            items={selectedLayers.map((layer) => ({
              id: layer.id,
              label: displayName(layer),
              meta: layerSublabel(layer, displayName(layer)),
              badge: String(layer.id) === primaryLayerId ? 'Primary' : undefined,
            }))}
            onRemove={(id) => removeLayer(Number(id))}
          />
        )}
      </div>

      {primaryLayer && (
        <div className="report-layer-setup__primary">
          <div className="report-layer-setup__primary-copy">
            <p className="report-layer-setup__primary-label">Primary layer</p>
            <p className="report-layer-setup__primary-name">{displayName(primaryLayer)}</p>
            <p className="report-layer-setup__primary-meta">
              {layerSublabel(primaryLayer, displayName(primaryLayer))}
            </p>
          </div>
          {primaryLayer.mineral_name && (
            <span className="report-layer-setup__primary-badge">{primaryLayer.mineral_name}</span>
          )}
        </div>
      )}

      {selectedLayers.length > 1 && (
        <div className="report-layer-setup__notes">
          {selectedLayers
            .filter((layer) => String(layer.id) !== primaryLayerId)
            .map((layer) => (
              <button
                key={layer.id}
                type="button"
                onClick={() => setPrimary(layer.id)}
                className="report-layer-setup__link"
              >
                Make {displayName(layer)} primary
              </button>
            ))}
        </div>
      )}

      {primaryLayer &&
        selectedLayers.some((layer) => layer.mineral !== primaryLayer.mineral) && (
          <p className="report-layer-setup__warn">
            Report commodity follows the primary layer ({primaryLayer.mineral_name}).
          </p>
        )}
    </div>
  )
}
