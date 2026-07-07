import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import type { MapLayer } from '../../types'

function layerSublabel(layer: MapLayer, label: string) {
  const parts: string[] = []

  const mineral = layer.mineral_name?.trim()
  if (
    mineral &&
    mineral.toLowerCase() !== 'general' &&
    mineral.toLowerCase() !== label.toLowerCase()
  ) {
    parts.push(mineral)
  }

  const region = layer.region_name?.trim()
  if (region && region.toLowerCase() !== 'general') {
    parts.push(region)
  }

  if (layer.layer_type === 'point') parts.push('Mineral')
  else if (layer.layer_type === 'line') parts.push('Structures')
  else if (layer.layer_type === 'polygon') parts.push('Areas')

  if (layer.feature_count > 0) {
    parts.push(`${layer.feature_count.toLocaleString()} features`)
  }

  return parts.length ? parts.join(' · ') : undefined
}

interface LayerPickListProps {
  layers: MapLayer[]
  selectedIds: Set<number>
  primaryLayerId: string
  displayName: (layer: MapLayer) => string
  onToggle: (id: number) => void
  loading?: boolean
}

function LayerRow({
  layer,
  label,
  checked,
  isPrimary,
  onToggle,
}: {
  layer: MapLayer
  label: string
  checked: boolean
  isPrimary: boolean
  onToggle: () => void
}) {
  const sublabel = layerSublabel(layer, label)

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className={`layer-picker__row ${checked ? 'layer-picker__row--selected' : ''}`}
      >
        <span className={`layer-picker__check ${checked ? 'layer-picker__check--on' : ''}`} aria-hidden>
          {checked ? '✓' : ''}
        </span>
        <span className="layer-picker__copy">
          <span className="layer-picker__label">{label}</span>
          {sublabel && <span className="layer-picker__meta">{sublabel}</span>}
        </span>
        {isPrimary && checked && <span className="layer-picker__badge">Primary</span>}
      </button>
    </li>
  )
}

export default function LayerPickList({
  layers,
  selectedIds,
  primaryLayerId,
  displayName,
  onToggle,
  loading = false,
}: LayerPickListProps) {
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState<CSSProperties>({ top: 0, left: 0, width: 0, visibility: 'hidden' })

  const filteredLayers = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = q
      ? layers.filter((layer) => {
          const label = displayName(layer)
          const haystack = [label, layer.mineral_name, layer.region_name, layer.layer_type, layer.slug]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
          return haystack.includes(q)
        })
      : layers

    return [...base].sort((a, b) => {
      const aSelected = selectedIds.has(a.id) ? -1 : 1
      const bSelected = selectedIds.has(b.id) ? -1 : 1
      if (aSelected !== bSelected) return aSelected - bSelected
      return displayName(a).localeCompare(displayName(b))
    })
  }, [layers, query, displayName, selectedIds])

  const triggerLabel =
    selectedIds.size > 0 ? `${selectedIds.size} layer${selectedIds.size === 1 ? '' : 's'} selected` : 'Select layers'

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return

    const updatePosition = () => {
      const trigger = triggerRef.current
      const panel = panelRef.current
      if (!trigger) return

      const rect = trigger.getBoundingClientRect()
      const panelHeight = panel?.offsetHeight ?? 280
      const margin = 8
      const spaceBelow = window.innerHeight - rect.bottom
      const placeAbove = spaceBelow < panelHeight + margin && rect.top > panelHeight + margin
      const top = placeAbove ? rect.top - panelHeight - 4 : rect.bottom + 4
      const width = Math.max(rect.width, 280)
      let left = rect.left
      left = Math.max(margin, Math.min(left, window.innerWidth - width - margin))

      setCoords({ top, left, width, visibility: 'visible' })
    }

    updatePosition()
    const frame = requestAnimationFrame(updatePosition)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, filteredLayers.length, query])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="layer-picker__trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        disabled={loading}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="layer-picker__trigger-label">{loading ? 'Loading layers…' : triggerLabel}</span>
        <span className={`layer-picker__chevron ${open ? 'layer-picker__chevron--open' : ''}`} aria-hidden>
          ▾
        </span>
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            id={listId}
            role="listbox"
            aria-multiselectable="true"
            className="layer-picker__dropdown"
            style={coords}
          >
            <div className="layer-picker__dropdown-search">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search layers…"
                className="input w-full text-sm"
                autoComplete="off"
                autoFocus
              />
            </div>

            {filteredLayers.length === 0 ? (
              <p className="layer-picker__dropdown-empty">No layers match your search</p>
            ) : (
              <ul className="layer-picker__dropdown-list">
                {filteredLayers.map((layer) => {
                  const label = displayName(layer)
                  return (
                    <LayerRow
                      key={layer.id}
                      layer={layer}
                      label={label}
                      checked={selectedIds.has(layer.id)}
                      isPrimary={String(layer.id) === primaryLayerId}
                      onToggle={() => onToggle(layer.id)}
                    />
                  )
                })}
              </ul>
            )}
          </div>,
          document.body,
        )}
    </>
  )
}

export { layerSublabel }
