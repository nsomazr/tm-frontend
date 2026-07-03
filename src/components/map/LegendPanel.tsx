import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from '../../i18n/LocaleContext'
import { useDisplayName } from '../../i18n/useDisplayName'
import type { MapLayer } from '../../types'

interface LegendPanelProps {
  layers: MapLayer[]
  embedded?: boolean
}

const TYPE_SYMBOL: Record<string, { render: (color: string) => ReactNode }> = {
  polygon: {
    render: (color) => (
      <span
        className="w-4 h-3.5 rounded-sm border border-black/10 shrink-0 mt-0.5"
        style={{ backgroundColor: color }}
      />
    ),
  },
  line: {
    render: () => (
      <span className="w-4 h-0.5 bg-neutral-700 shrink-0 mt-2 rounded-full opacity-70" />
    ),
  },
  point: {
    render: (color) => (
      <span
        className="w-2.5 h-2.5 rounded-full border border-white shadow shrink-0 mt-1"
        style={{ backgroundColor: color }}
      />
    ),
  },
}

export default function LegendPanel({ layers, embedded }: LegendPanelProps) {
  const { m } = useTranslation()
  const displayName = useDisplayName()
  const [open, setOpen] = useState(true)

  const entries = useMemo(() => {
    return [...layers]
      .sort((a, b) => a.z_index - b.z_index)
      .map((layer) => ({
        id: layer.id,
        name: displayName(layer),
        type: layer.layer_type,
        color: (layer.style?.fill as string) || '#888',
      }))
  }, [layers, displayName])

  const count = entries.length

  return (
    <div className={embedded ? 'w-full' : 'absolute bottom-12 right-3 z-10 w-64 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200'}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2.5 font-semibold text-sm text-slate-800 flex justify-between items-center gap-2 hover:bg-slate-50/80"
      >
        <span className="text-left">
          {m.map.legendTitle}
          {count > 0 && (
            <span className="ml-1.5 text-xs font-normal text-slate-400">({count})</span>
          )}
        </span>
        <span className="text-slate-400 shrink-0">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="border-t border-slate-100">
          {count === 0 ? (
            <p className="text-xs text-slate-500 px-3 py-3 leading-relaxed">{m.map.legendEmpty}</p>
          ) : (
            <ul className="max-h-[min(42vh,320px)] overflow-y-auto p-2 space-y-1 text-xs">
              {entries.map((entry) => {
                const sym = TYPE_SYMBOL[entry.type] ?? TYPE_SYMBOL.polygon
                return (
                  <li key={entry.id} className="flex items-start gap-2 px-1.5 py-1 rounded-lg hover:bg-slate-50">
                    {sym.render(entry.color)}
                    <span className="text-slate-800 leading-snug break-words min-w-0">{entry.name}</span>
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
