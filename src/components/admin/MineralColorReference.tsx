import { useMemo, useState, type ReactNode } from 'react'
import {
  GEOLOGICAL_MINERAL_COLORS,
  MINERAL_COLOR_CATEGORY_ORDER,
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

function isLightSwatch(hex: string) {
  const body = normalizeHex(hex).slice(1)
  const r = parseInt(body.slice(0, 2), 16)
  const g = parseInt(body.slice(2, 4), 16)
  const b = parseInt(body.slice(4, 6), 16)
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return luminance > 0.72
}

export default function MineralColorReference({
  usedColors = [],
  selectedColor,
  layerName = '',
  layerType = 'polygon',
  onSelect,
  className = '',
}: MineralColorReferenceProps) {
  const [filter, setFilter] = useState('')
  const [category, setCategory] = useState<GeologicalColorCategory | 'all'>('all')
  const used = useMemo(() => normalizeUsed(usedColors), [usedColors])
  const matched = useMemo(() => matchGeologicalColor(layerName), [layerName])
  const selected = normalizeHex(selectedColor || matched?.hex || '#0D9488')
  const record = colorRecordForLayer(selected, layerType)

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return GEOLOGICAL_MINERAL_COLORS.filter((entry) => {
      if (category !== 'all' && entry.category !== category) return false
      if (!q) return true
      return (
        entry.label.toLowerCase().includes(q) ||
        entry.slug.includes(q) ||
        entry.hex.toLowerCase().includes(q) ||
        entry.aliases.some((alias) => alias.includes(q))
      )
    })
  }, [filter, category])

  const grouped = useMemo(() => {
    const map = new Map<GeologicalColorCategory, typeof GEOLOGICAL_MINERAL_COLORS>()
    for (const entry of filtered) {
      const list = map.get(entry.category) ?? []
      list.push(entry)
      map.set(entry.category, list)
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.label.localeCompare(b.label))
    }
    return MINERAL_COLOR_CATEGORY_ORDER.filter((key) => map.has(key)).map((key) => ({
      key,
      entries: map.get(key)!,
    }))
  }, [filtered])

  return (
    <section
      className={`rounded-xl border border-app-border bg-app-surface shadow-sm overflow-hidden ${className}`}
    >
      <div className="px-4 py-3 border-b app-divider bg-app-subtle/30">
        <h3 className="text-sm font-semibold text-app-text">Suggested mineral colors</h3>
        <p className="text-xs text-app-text-muted mt-0.5 leading-relaxed">
          Standard geological colors for every commodity — select one to match global mapping conventions.
        </p>
      </div>

      <div className="px-4 py-3 space-y-3">
        {matched && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-terra-500/30 bg-terra-500/8 px-3 py-2.5">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span
                className={`h-10 w-10 shrink-0 rounded-lg shadow-sm ${isLightSwatch(matched.hex) ? 'ring-1 ring-inset ring-black/12' : ''}`}
                style={{ backgroundColor: matched.hex }}
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-terra-800 dark:text-terra-300">Suggested for this layer</p>
                <p className="text-sm font-medium text-app-text truncate">{matched.label}</p>
                <p className="text-[11px] font-mono text-app-text-muted">{matched.hex}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelect(matched.hex)}
              className="shrink-0 rounded-lg bg-terra-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-terra-700 dark:bg-terra-500 dark:hover:bg-terra-600 transition-colors"
            >
              Use {matched.label}
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-app-border bg-app-subtle/40 px-3 py-2">
          <span
            className={`h-8 w-8 shrink-0 rounded-lg ${isLightSwatch(record.hex) ? 'ring-1 ring-inset ring-black/12' : ''}`}
            style={{ backgroundColor: record.hex }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-app-text-muted">Current selection</p>
            <p className="text-xs font-mono text-app-text-secondary truncate">{formatColorCodes(record)}</p>
          </div>
        </div>

        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search minerals…"
          className="input text-sm w-full"
        />

        <div className="flex flex-wrap gap-1.5">
          <CategoryPill active={category === 'all'} onClick={() => setCategory('all')}>
            All ({GEOLOGICAL_MINERAL_COLORS.length})
          </CategoryPill>
          {MINERAL_COLOR_CATEGORY_ORDER.map((key) => {
            const count = GEOLOGICAL_MINERAL_COLORS.filter((e) => e.category === key).length
            if (!count) return null
            return (
              <CategoryPill key={key} active={category === key} onClick={() => setCategory(key)}>
                {CATEGORY_LABELS[key]} ({count})
              </CategoryPill>
            )
          })}
        </div>

        <div className="max-h-[min(22rem,50vh)] overflow-y-auto space-y-4 scrollbar-pane pr-0.5">
          {grouped.length === 0 ? (
            <p className="text-sm text-app-text-muted py-6 text-center">No minerals match your search.</p>
          ) : (
            grouped.map(({ key, entries }) => (
              <div key={key}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-app-text-muted mb-2">
                  {CATEGORY_LABELS[key]}
                </p>
                <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {entries.map((entry) => (
                    <MineralColorChip
                      key={entry.slug}
                      entry={entry}
                      active={selected.toLowerCase() === entry.hex.toLowerCase()}
                      taken={used.has(entry.hex.toLowerCase())}
                      onSelect={() => onSelect(entry.hex)}
                    />
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        {usedColors.length > 0 && (
          <div className="pt-2 border-t app-divider">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-app-text-muted mb-2">
              Already on your map
            </p>
            <div className="flex flex-wrap gap-1.5">
              {usedColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onSelect(color)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-app-border bg-app-subtle/60 px-2 py-1 text-[10px] font-mono text-app-text-secondary hover:border-terra-500/40 hover:bg-app-subtle transition-colors"
                >
                  <span
                    className={`h-3.5 w-3.5 rounded-full shrink-0 ${isLightSwatch(color) ? 'ring-1 ring-inset ring-black/10' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                  {normalizeHex(color)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function CategoryPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
        active
          ? 'bg-terra-600 text-white dark:bg-terra-500'
          : 'bg-app-subtle text-app-text-secondary hover:bg-app-subtle/80 hover:text-app-text border border-app-border/80'
      }`}
    >
      {children}
    </button>
  )
}

function MineralColorChip({
  entry,
  active,
  taken,
  onSelect,
}: {
  entry: (typeof GEOLOGICAL_MINERAL_COLORS)[number]
  active: boolean
  taken: boolean
  onSelect: () => void
}) {
  const light = isLightSwatch(entry.hex)

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        title={entry.note}
        className={`group flex w-full flex-col overflow-hidden rounded-xl border text-left transition-all ${
          active
            ? 'border-terra-500 ring-2 ring-terra-500/25 shadow-sm'
            : taken
              ? 'border-amber-400/50 hover:border-amber-400/70'
              : 'border-app-border/80 hover:border-app-border-strong hover:shadow-sm'
        }`}
      >
        <span
          className={`block h-11 w-full ${light ? 'ring-1 ring-inset ring-black/10' : ''}`}
          style={{ backgroundColor: entry.hex }}
        />
        <span className="flex flex-col gap-0.5 px-2 py-1.5 bg-app-surface">
          <span className="flex items-start justify-between gap-1">
            <span className="text-[11px] font-semibold text-app-text leading-tight line-clamp-2">{entry.label}</span>
            {taken && !active && (
              <span className="shrink-0 rounded px-1 py-px text-[8px] font-bold uppercase tracking-wide bg-amber-500/15 text-amber-800 dark:text-amber-300">
                Used
              </span>
            )}
          </span>
          <span className="text-[10px] font-mono text-app-text-muted">{entry.hex}</span>
        </span>
      </button>
    </li>
  )
}
