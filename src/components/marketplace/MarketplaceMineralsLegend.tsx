import { useMemo, useState } from 'react'
import { matchGeologicalColor } from '../../constants/geologicalMineralColors'

export interface MarketplaceLegendMineral {
  name: string
  count: number
  color: string
}

interface MarketplaceMineralsLegendProps {
  minerals: MarketplaceLegendMineral[]
  /** Lowercased mineral names currently visible. null = not initialized (show all). */
  visibleMinerals: Set<string> | null
  onVisibleMineralsChange: (next: Set<string>) => void
  className?: string
  defaultOpen?: boolean
}

function mineralKey(name: string) {
  return name.trim().toLowerCase()
}

export function buildMarketplaceLegendMinerals(
  listings: Array<{
    primary_mineral?: string
    other_minerals?: string[]
    commodity_labels?: string[]
  }>,
): MarketplaceLegendMineral[] {
  const counts = new Map<string, number>()

  for (const listing of listings) {
    const names = new Set<string>()
    const primary = (listing.primary_mineral || '').trim()
    if (primary) names.add(primary)
    for (const other of listing.other_minerals || []) {
      const clean = other.trim()
      if (clean) names.add(clean)
    }
    if (names.size === 0) {
      for (const label of listing.commodity_labels || []) {
        const clean = label.trim()
        if (clean) names.add(clean)
      }
    }
    for (const name of names) {
      counts.set(name, (counts.get(name) || 0) + 1)
    }
  }

  return [...counts.entries()]
    .map(([name, count]) => ({
      name,
      count,
      color: matchGeologicalColor(name)?.hex ?? '#0f766e',
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export function listingMineralKeys(listing: {
  primary_mineral?: string
  other_minerals?: string[]
  commodity_labels?: string[]
}): string[] {
  const names = new Set<string>()
  const primary = (listing.primary_mineral || '').trim()
  if (primary) names.add(mineralKey(primary))
  for (const other of listing.other_minerals || []) {
    const clean = other.trim()
    if (clean) names.add(mineralKey(clean))
  }
  if (names.size === 0) {
    for (const label of listing.commodity_labels || []) {
      const clean = label.trim()
      if (clean) names.add(mineralKey(clean))
    }
  }
  return [...names]
}

export function listingMatchesVisibleMinerals(
  listing: {
    primary_mineral?: string
    other_minerals?: string[]
    commodity_labels?: string[]
  },
  visibleMinerals: Set<string> | null,
): boolean {
  // null = legend not initialized yet → show everything
  if (visibleMinerals == null) return true
  if (visibleMinerals.size === 0) return false
  const keys = listingMineralKeys(listing)
  if (keys.length === 0) return true
  return keys.some((key) => visibleMinerals.has(key))
}

export default function MarketplaceMineralsLegend({
  minerals,
  visibleMinerals,
  onVisibleMineralsChange,
  className,
  defaultOpen = true,
}: MarketplaceMineralsLegendProps) {
  const [open, setOpen] = useState(defaultOpen)
  const count = minerals.length

  const allKeys = useMemo(() => minerals.map((m) => mineralKey(m.name)), [minerals])
  const effectiveVisible = visibleMinerals ?? new Set(allKeys)
  const checkedCount = useMemo(
    () => allKeys.filter((key) => effectiveVisible.has(key)).length,
    [allKeys, effectiveVisible],
  )
  const allChecked = count > 0 && checkedCount === count
  const noneChecked = checkedCount === 0

  const hint = count === 0 ? 'No minerals on public listings yet.' : null

  const toggleMineral = (name: string) => {
    const key = mineralKey(name)
    const next = new Set(effectiveVisible)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onVisibleMineralsChange(next)
  }

  return (
    <div className={`map-chrome overflow-hidden rounded-xl ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left text-xs font-semibold map-text hover:bg-app-subtle/80"
      >
        <span>
          Minerals
          {count > 0 ? (
            <span className="ml-1 text-[10px] font-normal map-text-muted">
              ({checkedCount}/{count})
            </span>
          ) : null}
        </span>
        <span className="shrink-0 text-xs map-text-muted">{open ? '−' : '+'}</span>
      </button>

      {open ? (
        <div className="border-t app-divider">
          {hint ? (
            <p className="px-2.5 py-2 text-[11px] leading-snug map-text-muted">{hint}</p>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b app-divider px-2.5 py-1.5">
                <button
                  type="button"
                  className="text-[10px] font-medium text-terra-700 hover:underline disabled:opacity-40 dark:text-terra-300"
                  onClick={() => onVisibleMineralsChange(new Set(allKeys))}
                  disabled={allChecked}
                >
                  All
                </button>
                <span className="text-[10px] map-text-muted">·</span>
                <button
                  type="button"
                  className="text-[10px] font-medium text-terra-700 hover:underline disabled:opacity-40 dark:text-terra-300"
                  onClick={() => onVisibleMineralsChange(new Set())}
                  disabled={noneChecked}
                >
                  None
                </button>
              </div>
              <ul className="max-h-[min(42vh,280px)] space-y-0.5 overflow-y-auto p-1.5 text-[11px]">
                {minerals.map((entry) => {
                  const key = mineralKey(entry.name)
                  const checked = effectiveVisible.has(key)
                  const inputId = `mp-legend-${key.replace(/[^a-z0-9]+/g, '-')}`
                  return (
                    <li key={entry.name}>
                      <label
                        htmlFor={inputId}
                        className={`flex cursor-pointer items-center gap-1.5 rounded-md px-1 py-1 transition-colors ${
                          checked
                            ? 'hover:bg-app-subtle'
                            : 'opacity-55 hover:bg-app-subtle hover:opacity-80'
                        }`}
                      >
                        <input
                          id={inputId}
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleMineral(entry.name)}
                          className="h-3.5 w-3.5 shrink-0 rounded border-app-border text-terra-600 focus:ring-terra-500/30"
                        />
                        <span
                          className="h-3.5 w-4 shrink-0 rounded-sm border border-black/10"
                          style={{ backgroundColor: entry.color }}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 break-words leading-snug map-text">
                          {entry.name}
                        </span>
                        <span className="shrink-0 tabular-nums map-text-muted">{entry.count}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
