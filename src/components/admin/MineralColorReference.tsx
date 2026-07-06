import { useMemo, useState, type ReactNode } from 'react'
import {
  GEOLOGICAL_MINERAL_COLORS,
  MINERAL_COLOR_CATEGORY_ORDER,
  matchGeologicalColor,
  type GeologicalColorCategory,
} from '../../constants/geologicalMineralColors'
import { normalizeHex } from '../../lib/mineralColorUtils'

const CATEGORY_LABELS: Record<GeologicalColorCategory, string> = {
  precious: 'Precious',
  base: 'Base metals',
  industrial: 'Industrial',
  energy: 'Energy',
  gem: 'Gems',
  battery: 'Battery / critical',
  hydro: 'Hydrogeology',
}

const POPULAR_SLUGS = [
  'gold',
  'copper',
  'iron-ore',
  'nickel',
  'lithium',
  'cobalt',
  'uranium',
  'graphite',
  'tin',
  'zinc',
  'diamond',
  'coal',
]

interface MineralColorReferenceProps {
  usedColors?: string[]
  selectedColor?: string
  layerName?: string
  onSelect: (hex: string) => void
  className?: string
  /** inline = compact list for modals; panel = standalone with browse toggle */
  variant?: 'inline' | 'panel'
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
  onSelect,
  className = '',
  variant = 'panel',
}: MineralColorReferenceProps) {
  const [filter, setFilter] = useState('')
  const [category, setCategory] = useState<GeologicalColorCategory | 'all'>('all')
  const [browseAll, setBrowseAll] = useState(variant === 'inline')

  const used = useMemo(() => normalizeUsed(usedColors), [usedColors])
  const matched = useMemo(() => matchGeologicalColor(layerName), [layerName])
  const selected = normalizeHex(selectedColor || matched?.hex || '#0D9488')

  const popular = useMemo(
    () =>
      POPULAR_SLUGS.map((slug) => GEOLOGICAL_MINERAL_COLORS.find((e) => e.slug === slug)).filter(
        Boolean
      ) as typeof GEOLOGICAL_MINERAL_COLORS,
    []
  )

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
    }).sort((a, b) => a.label.localeCompare(b.label))
  }, [filter, category])

  const showCatalog = browseAll || filter.trim().length > 0

  return (
    <div className={`space-y-3 ${className}`}>
      {variant === 'panel' && !showCatalog && (
        <p className="text-xs text-app-text-muted">
          Pick a standard geological color, or use the color picker above.
        </p>
      )}

      {matched && (
        <button
          type="button"
          onClick={() => onSelect(matched.hex)}
          className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
            selected.toLowerCase() === matched.hex.toLowerCase()
              ? 'border-terra-500 bg-terra-500/8'
              : 'border-app-border hover:bg-app-subtle/60'
          }`}
        >
          <ColorDot hex={matched.hex} size="md" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-app-text">{matched.label}</span>
            <span className="block text-xs text-app-text-muted">Suggested from layer name</span>
          </span>
          {selected.toLowerCase() === matched.hex.toLowerCase() && (
            <span className="text-xs font-medium text-terra-600 dark:text-terra-400">Selected</span>
          )}
        </button>
      )}

      {!showCatalog && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-app-text-muted mb-2">
            Common
          </p>
          <div className="flex flex-wrap gap-1.5">
            {popular.map((entry) => (
              <ColorChip
                key={entry.slug}
                entry={entry}
                active={selected.toLowerCase() === entry.hex.toLowerCase()}
                taken={used.has(entry.hex.toLowerCase())}
                onSelect={() => onSelect(entry.hex)}
              />
            ))}
          </div>
        </div>
      )}

      {variant === 'panel' && !showCatalog && (
        <button
          type="button"
          onClick={() => setBrowseAll(true)}
          className="text-xs font-medium text-terra-600 dark:text-terra-400 hover:underline"
        >
          Browse all minerals ({GEOLOGICAL_MINERAL_COLORS.length})
        </button>
      )}

      {showCatalog && (
        <div className="rounded-lg border border-app-border overflow-hidden">
          <div className="px-3 py-2.5 border-b app-divider bg-app-subtle/30 space-y-2">
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search minerals…"
              className="input text-sm w-full"
              autoFocus={variant === 'inline'}
            />
            <div className="flex flex-wrap gap-1">
              <FilterChip active={category === 'all'} onClick={() => setCategory('all')}>
                All
              </FilterChip>
              {MINERAL_COLOR_CATEGORY_ORDER.map((key) => (
                <FilterChip key={key} active={category === key} onClick={() => setCategory(key)}>
                  {CATEGORY_LABELS[key]}
                </FilterChip>
              ))}
            </div>
          </div>

          <ul className="max-h-52 overflow-y-auto divide-y divide-app-border/40">
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-app-text-muted">No matches</li>
            ) : (
              filtered.map((entry) => (
                <ColorListRow
                  key={entry.slug}
                  entry={entry}
                  active={selected.toLowerCase() === entry.hex.toLowerCase()}
                  taken={used.has(entry.hex.toLowerCase())}
                  onSelect={() => onSelect(entry.hex)}
                />
              ))
            )}
          </ul>

          {variant === 'panel' && (
            <div className="px-3 py-2 border-t app-divider">
              <button
                type="button"
                onClick={() => {
                  setBrowseAll(false)
                  setFilter('')
                  setCategory('all')
                }}
                className="text-xs text-app-text-muted hover:text-app-text"
              >
                Show less
              </button>
            </div>
          )}
        </div>
      )}

      {usedColors.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-app-text-muted mb-1.5">
            On your map
          </p>
          <div className="flex flex-wrap gap-1">
            {usedColors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onSelect(color)}
                title={normalizeHex(color)}
                className={`h-6 w-6 rounded-md border transition-transform hover:scale-110 ${
                  selected.toLowerCase() === normalizeHex(color).toLowerCase()
                    ? 'border-terra-500 ring-2 ring-terra-500/30'
                    : 'border-app-border'
                } ${isLightSwatch(color) ? 'ring-1 ring-inset ring-black/10' : ''}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ColorDot({ hex, size = 'sm' }: { hex: string; size?: 'sm' | 'md' }) {
  const dim = size === 'md' ? 'h-9 w-9' : 'h-5 w-5'
  return (
    <span
      className={`${dim} shrink-0 rounded-md border border-app-border ${isLightSwatch(hex) ? 'ring-1 ring-inset ring-black/10' : ''}`}
      style={{ backgroundColor: hex }}
    />
  )
}

function ColorChip({
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
  return (
    <button
      type="button"
      onClick={onSelect}
      title={entry.note}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs transition-colors ${
        active
          ? 'border-terra-500 bg-terra-500/10 text-terra-800 dark:text-terra-200'
          : taken
            ? 'border-amber-400/60 bg-amber-500/5 text-app-text-secondary'
            : 'border-app-border bg-app-subtle/50 text-app-text-secondary hover:border-app-border-strong'
      }`}
    >
      <ColorDot hex={entry.hex} />
      <span className="font-medium">{entry.label}</span>
    </button>
  )
}

function ColorListRow({
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
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        title={entry.note}
        className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
          active ? 'bg-terra-500/8' : 'hover:bg-app-subtle/60'
        }`}
      >
        <ColorDot hex={entry.hex} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-app-text">{entry.label}</span>
          <span className="block text-[11px] text-app-text-muted">{CATEGORY_LABELS[entry.category]}</span>
        </span>
        {taken && !active && (
          <span className="text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
            Used
          </span>
        )}
        {active && (
          <span className="text-xs font-medium text-terra-600 dark:text-terra-400">✓</span>
        )}
      </button>
    </li>
  )
}

function FilterChip({
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
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
        active
          ? 'bg-terra-600 text-white dark:bg-terra-500'
          : 'bg-app-subtle text-app-text-muted hover:text-app-text'
      }`}
    >
      {children}
    </button>
  )
}
