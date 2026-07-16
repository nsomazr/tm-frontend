import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from '../../i18n/LocaleContext'
import { interpolate } from '../../i18n/utils'
import { useDisplayName } from '../../i18n/useDisplayName'
import type { MapLayer } from '../../types'
import { layerDisplayColor } from '../admin/layerColors'
import { resolveStructureRank, structureRankLegendHeight } from './structureLineRank'

interface LegendPanelProps {
  layers: MapLayer[]
  embedded?: boolean
  sheetMode?: boolean
  defaultOpen?: boolean
  /** Total free-map layers available (for rotation hint when only a subset is shown). */
  totalLayerCount?: number
  showRotationHint?: boolean
}

function lineLegendSymbol(color: string, layer?: MapLayer) {
  const rank = layer ? resolveStructureRank(layer) : 2
  const barHeight = structureRankLegendHeight(rank)
  return (
    <span
      className="w-4 h-4 shrink-0 flex items-center justify-center rounded border border-app-border-strong bg-app-surface shadow-sm"
      aria-hidden
    >
      <span
        className="block w-3 rounded-full"
        style={{
          height: barHeight,
          backgroundColor: color === '#888' ? '#1f2937' : color,
        }}
      />
    </span>
  )
}

const TYPE_SYMBOL: Record<string, { render: (color: string, layer?: MapLayer) => ReactNode }> = {
  polygon: {
    render: (color) => (
      <span
        className="w-4 h-3.5 rounded-sm border border-black/10 shrink-0 mt-0.5"
        style={{ backgroundColor: color }}
      />
    ),
  },
  line: {
    render: (color, layer) => lineLegendSymbol(color, layer),
  },
  point: {
    render: (color) => (
      <span
        className="w-3 h-2.5 shrink-0 mt-0.5"
        style={{
          backgroundColor: color,
          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
        }}
      />
    ),
  },
}

export default function LegendPanel({
  layers,
  embedded,
  sheetMode,
  defaultOpen = true,
  totalLayerCount,
  showRotationHint = false,
}: LegendPanelProps) {
  const { m } = useTranslation()
  const displayName = useDisplayName()
  const [open, setOpen] = useState(defaultOpen)

  const entries = useMemo(() => {
    return [...layers]
      .sort((a, b) => a.z_index - b.z_index)
      .map((layer) => ({
        layer,
        id: layer.id,
        name: displayName(layer),
        type: layer.layer_type,
        color: layerDisplayColor(layer),
      }))
  }, [layers, displayName])

  const count = entries.length
  const rotationHint =
    showRotationHint &&
    typeof totalLayerCount === 'number' &&
    totalLayerCount > count
      ? interpolate(m.map.layerRotationHint, { shown: count, total: totalLayerCount })
      : null

  if (sheetMode) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 scrollbar-pane">
        {rotationHint && (
          <p className="py-1.5 text-[11px] leading-snug map-text-muted">{rotationHint}</p>
        )}
        {count === 0 ? (
          <p className="py-2 text-xs leading-relaxed map-text-muted">{m.map.legendEmpty}</p>
        ) : (
          <ul className="space-y-0.5 text-xs">
            {entries.map((entry) => {
              const sym = TYPE_SYMBOL[entry.type] ?? TYPE_SYMBOL.polygon
              return (
                <li key={entry.id} className="flex items-center gap-2 rounded-md px-1 py-1.5">
                  {sym.render(entry.color, entry.layer)}
                  <span className="min-w-0 leading-snug map-text break-words">{entry.name}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className={embedded ? 'w-full' : 'absolute bottom-12 right-3 z-10 w-64 map-chrome rounded-xl'}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-2.5 py-2 font-semibold text-xs map-text flex justify-between items-center gap-2 hover:bg-app-subtle/80"
      >
        <span className="text-left">
          {m.map.legendTitle}
          {count > 0 && (
            <span className="ml-1 text-[10px] font-normal map-text-muted">({count})</span>
          )}
        </span>
        <span className="map-text-muted shrink-0 text-xs">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="border-t app-divider">
          {rotationHint && (
            <p className="text-[10px] map-text-muted px-2.5 pt-2 pb-0.5 leading-snug">{rotationHint}</p>
          )}
          {count === 0 ? (
            <p className="text-[11px] map-text-muted px-2.5 py-2 leading-snug">{m.map.legendEmpty}</p>
          ) : (
            <ul className="max-h-[min(30vh,210px)] overflow-y-auto p-1.5 space-y-0.5 text-[11px]">
              {entries.map((entry) => {
                const sym = TYPE_SYMBOL[entry.type] ?? TYPE_SYMBOL.polygon
                return (
                  <li key={entry.id} className="flex items-start gap-1.5 rounded-md px-1 py-[1px] hover:bg-app-subtle">
                    {sym.render(entry.color, entry.layer)}
                    <span className="map-text leading-snug break-words min-w-0">{entry.name}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
