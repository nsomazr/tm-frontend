import { useMemo, useState } from 'react'
import {
  GEOLOGICAL_MINERAL_COLORS,
  matchGeologicalColor,
  type GeologicalColorCategory,
} from '../../constants/geologicalMineralColors'
import { colorRecordForLayer, formatColorCodes, normalizeHex } from '../../lib/mineralColorUtils'

const CATEGORY_LABELS: Record<GeologicalColorCategory, string> = {
  precious: 'Precious',
  base: 'Base metals',
  industrial: 'Industrial',
  energy: 'Energy',
  gem: 'Gems',
  battery: 'Battery / critical',
  hydro: 'Hydrogeology',
}

interface MineralColorReferenceProps {
  usedColors?: string[]
  selectedColor?: string
  layerName?: string
  layerType?: string
  onSelect: (hex: string) => void
  className?: string
}

function normalizeUsed(colors: string[]) {
  return new Set(colors.map((c) => normalizeHex(c).toLowerCase()))
}

export default function MineralColorReference({
  usedColors = [],
  selectedColor,
  layerName = '',
  layerType = 'polygon',
  onSelect,
  className = '',
}: MineralColorReferenceProps) {
  const [open, setOpen] = useState(true)
  const [filter, setFilter] = useState('')
  const used = useMemo(() => normalizeUsed(usedColors), [usedColors])
  const matched = useMemo(() => matchGeologicalColor(layerName), [layerName])
  const selected = normalizeHex(selectedColor || matched?.hex || '#0D9488')
  const record = colorRecordForLayer(selected, layerType)

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return GEOLOGICAL_MINERAL_COLORS
    return GEOLOGICAL_MINERAL_COLORS.filter(
      (entry) =>
        entry.label.toLowerCase().includes(q) ||
        entry.slug.includes(q) ||
        entry.aliases.some((alias) => alias.includes(q))
    )
  }, [filter])

  const grouped = useMemo(() => {
    const map = new Map<GeologicalColorCategory, typeof GEOLOGICAL_MINERAL_COLORS>()
    for (const entry of filtered) {
      const list = map.get(entry.category) ?? []
      list.push(entry)
      map.set(entry.category, list)
    }
    return map
  }, [filtered])

  return (
    <section className={`rounded-xl border border-app-border bg-app-subtle/40 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div>
          <h3 className="text-sm font-semibold text-app-text">Geological color reference</h3>
          <p className="text-xs text-app-text-muted mt-0.5">
            Standard commodity colors — pick one to avoid clashes with existing layers.
          </p>
        </div>
        <span className="text-app-text-muted text-lg leading-none">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="border-t app-divider px-4 pb-4 pt-3 space-y-3">
          {matched && (
            <p className="text-xs rounded-lg bg-terra-500/10 text-terra-800 dark:text-terra-300 px-3 py-2">
              Suggested for “{layerName.trim()}”: <strong>{matched.label}</strong> ({matched.hex})
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className="inline-block h-6 w-6 rounded-md border border-app-border shrink-0"
              style={{ backgroundColor: record.hex }}
            />
            <span className="font-mono text-app-text-secondary">{formatColorCodes(record)}</span>
          </div>

          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search gold, copper, lithium…"
            className="input text-sm w-full"
          />

          <div className="max-h-64 overflow-y-auto space-y-3 scrollbar-pane pr-1">
            {[...grouped.entries()].map(([category, entries]) => (
              <div key={category}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-app-text-muted mb-1.5">
                  {CATEGORY_LABELS[category]}
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {entries.map((entry) => {
                    const taken = used.has(entry.hex.toLowerCase())
                    const active = selected.toLowerCase() === entry.hex.toLowerCase()
                    return (
                      <li key={entry.slug}>
                        <button
                          type="button"
                          onClick={() => onSelect(entry.hex)}
                          title={entry.note}
                          className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs transition-colors ${
                            active
                              ? 'border-terra-500 bg-terra-500/10'
                              : taken
                                ? 'border-amber-400/60 bg-amber-500/5'
                                : 'border-app-border/70 hover:bg-app-subtle'
                          }`}
                        >
                          <span
                            className="h-5 w-5 shrink-0 rounded border border-black/10"
                            style={{ backgroundColor: entry.hex }}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="font-medium text-app-text block truncate">{entry.label}</span>
                            <span className="font-mono text-[10px] text-app-text-muted">{entry.hex}</span>
                          </span>
                          {taken && !active && (
                            <span className="text-[9px] font-semibold uppercase text-amber-700 dark:text-amber-400 shrink-0">
                              In use
                            </span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>

          {usedColors.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-app-text-muted mb-1.5">
                Colors already on your map
              </p>
              <div className="flex flex-wrap gap-1.5">
                {usedColors.map((color) => (
                  <span
                    key={color}
                    className="inline-flex items-center gap-1 rounded-full border border-app-border bg-app-surface px-2 py-0.5 text-[10px] font-mono text-app-text-muted"
                  >
                    <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: color }} />
                    {normalizeHex(color)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
