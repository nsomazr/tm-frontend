import { useEffect, useMemo, useState } from 'react'
import {
  COORDINATE_SYSTEM_REGION_LABELS,
  COORDINATE_SYSTEMS,
  allCoordinateSystemOptions,
  recommendedCoordinateSystems,
  searchCoordinateSystems,
  suggestedUtmForCountry,
  type CoordinateSystemId,
  type CoordinateSystemOption,
  type CoordinateSystemRegion,
  wgs84UtmId,
  wgs84UtmOption,
} from './coordinateSystems'

type CoordinateSystemListProps = {
  value: CoordinateSystemId
  onSelect: (id: CoordinateSystemId) => void
  countryCode?: string
  countryCenter?: { lat: number; lng: number } | null
  disabled?: boolean
  compact?: boolean
  className?: string
}

function optionMatches(option: CoordinateSystemOption, query: string) {
  return searchCoordinateSystems(query, [option]).length > 0
}

function clampZone(value: number) {
  if (!Number.isFinite(value)) return 1
  return Math.min(60, Math.max(1, Math.round(value)))
}

function UtmZoneBuilder({
  zone,
  south,
  onZoneChange,
  onSouthChange,
  onApply,
  disabled,
  compact,
  selected,
  suggestedLabel,
}: {
  zone: number
  south: boolean
  onZoneChange: (zone: number) => void
  onSouthChange: (south: boolean) => void
  onApply: () => void
  disabled?: boolean
  compact?: boolean
  selected: boolean
  suggestedLabel?: string | null
}) {
  const preview = wgs84UtmOption(zone, south)
  const stepperBtn = compact
    ? 'flex h-8 w-8 items-center justify-center rounded-lg border border-app-border bg-app-surface text-sm font-semibold map-text hover:bg-app-subtle disabled:opacity-50'
    : 'flex h-10 w-10 items-center justify-center rounded-xl border border-app-border bg-app-surface text-base font-semibold text-app-text hover:bg-app-subtle disabled:opacity-50'

  return (
    <div
      className={
        compact
          ? 'rounded-xl border border-app-border bg-app-subtle/40 p-2.5'
          : 'rounded-2xl border border-app-border bg-gradient-to-br from-app-subtle/80 to-app-surface p-4'
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={
              compact
                ? 'text-[10px] font-semibold uppercase tracking-wide map-text-muted'
                : 'text-xs font-semibold uppercase tracking-wide text-app-muted'
            }
          >
            Build UTM zone
          </p>
          <p className={compact ? 'mt-0.5 text-[11px] map-text-muted' : 'mt-1 text-sm text-app-muted'}>
            WGS 84 projected metres
            {suggestedLabel ? ` · suggested ${suggestedLabel}` : ''}
          </p>
        </div>
        {selected ? (
          <span
            className={
              compact
                ? 'shrink-0 rounded-md bg-terra-600/15 px-1.5 py-0.5 text-[10px] font-semibold text-terra-800 dark:text-terra-300'
                : 'shrink-0 rounded-full bg-terra-600/12 px-2.5 py-1 text-[11px] font-semibold text-terra-800 dark:text-terra-300'
            }
          >
            Active
          </span>
        ) : null}
      </div>

      <div className={`mt-3 grid gap-3 ${compact ? '' : 'sm:grid-cols-[1fr_1fr_auto] sm:items-end'}`}>
        <div>
          <label
            className={
              compact
                ? 'mb-1 block text-[10px] font-medium map-text-muted'
                : 'mb-1.5 block text-xs font-medium text-app-muted'
            }
            htmlFor={compact ? 'utm-zone-compact' : 'utm-zone'}
          >
            Zone (1–60)
          </label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className={stepperBtn}
              disabled={disabled || zone <= 1}
              onClick={() => onZoneChange(zone - 1)}
              aria-label="Decrease zone"
            >
              −
            </button>
            <input
              id={compact ? 'utm-zone-compact' : 'utm-zone'}
              type="number"
              min={1}
              max={60}
              value={zone}
              disabled={disabled}
              onChange={(e) => onZoneChange(clampZone(Number(e.target.value)))}
              className={
                compact
                  ? 'h-8 w-full min-w-0 rounded-lg border border-app-border bg-app-surface px-2 text-center text-sm font-semibold tabular-nums map-text focus:border-terra-500 focus:outline-none focus:ring-2 focus:ring-terra-500/25'
                  : 'input h-10 w-full min-w-0 py-0 text-center text-base font-semibold tabular-nums'
              }
            />
            <button
              type="button"
              className={stepperBtn}
              disabled={disabled || zone >= 60}
              onClick={() => onZoneChange(zone + 1)}
              aria-label="Increase zone"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <p
            className={
              compact
                ? 'mb-1 text-[10px] font-medium map-text-muted'
                : 'mb-1.5 text-xs font-medium text-app-muted'
            }
            id={compact ? 'utm-hemi-compact' : 'utm-hemi'}
          >
            Hemisphere
          </p>
          <div
            role="group"
            aria-labelledby={compact ? 'utm-hemi-compact' : 'utm-hemi'}
            className={
              compact
                ? 'grid grid-cols-2 rounded-lg border border-app-border bg-app-surface p-0.5'
                : 'grid grid-cols-2 rounded-xl border border-app-border bg-app-surface p-1'
            }
          >
            {([false, true] as const).map((nextSouth) => {
              const active = south === nextSouth
              return (
                <button
                  key={nextSouth ? 's' : 'n'}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSouthChange(nextSouth)}
                  className={`${compact ? 'rounded-md px-2 py-1.5 text-[11px]' : 'rounded-lg px-3 py-2 text-sm'} font-semibold transition-colors disabled:opacity-50 ${
                    active
                      ? 'bg-terra-600 text-white shadow-sm'
                      : compact
                        ? 'map-text-muted hover:bg-app-subtle'
                        : 'text-app-muted hover:bg-app-subtle'
                  }`}
                >
                  {nextSouth ? 'South' : 'North'}
                </button>
              )
            })}
          </div>
        </div>

        <div className={compact ? '' : 'sm:min-w-[9.5rem]'}>
          {!compact ? (
            <p className="mb-1.5 text-xs font-medium text-app-muted">Selection</p>
          ) : null}
          <button
            type="button"
            disabled={disabled}
            onClick={onApply}
            className={
              compact
                ? `flex w-full items-center justify-center rounded-lg px-2.5 py-2 text-[11px] font-semibold disabled:opacity-60 ${
                    selected
                      ? 'border border-terra-600/30 bg-terra-600/10 text-terra-800 dark:text-terra-300'
                      : 'bg-terra-600 text-white hover:bg-terra-700'
                  }`
                : `btn-primary flex w-full items-center justify-center gap-2 text-sm ${
                    selected ? '!bg-terra-700' : ''
                  }`
            }
          >
            {selected ? 'Using' : 'Use'} {preview.label.replace('WGS 84 / ', '')}
          </button>
        </div>
      </div>

      <div
        className={
          compact
            ? 'mt-2 flex items-center justify-between gap-2 border-t border-app-border/70 pt-2 text-[10px] map-text-muted'
            : 'mt-3 flex flex-wrap items-center justify-between gap-2 border-t app-divider pt-3 text-xs text-app-muted'
        }
      >
        <span className="font-medium tabular-nums text-app-text-secondary">{preview.epsg}</span>
        <span>Projected · metres</span>
      </div>
    </div>
  )
}

export default function CoordinateSystemList({
  value,
  onSelect,
  countryCode = 'TZ',
  countryCenter = null,
  disabled = false,
  compact = false,
  className = '',
}: CoordinateSystemListProps) {
  const [query, setQuery] = useState('')
  const [utmZone, setUtmZone] = useState(36)
  const [utmSouth, setUtmSouth] = useState(true)

  const suggestedUtm = useMemo(
    () => suggestedUtmForCountry(countryCode, countryCenter),
    [countryCode, countryCenter],
  )

  useEffect(() => {
    if (!suggestedUtm) return
    const match = suggestedUtm.id.match(/utm(\d+)/)
    if (match) setUtmZone(Number(match[1]))
    setUtmSouth(suggestedUtm.id.endsWith('s'))
  }, [suggestedUtm])

  const catalog = useMemo(() => {
    const extra = suggestedUtm ?? wgs84UtmOption(utmZone, utmSouth)
    return allCoordinateSystemOptions(extra)
  }, [suggestedUtm, utmZone, utmSouth])

  const recommended = useMemo(
    () => recommendedCoordinateSystems(countryCode, countryCenter),
    [countryCode, countryCenter],
  )

  const filtered = useMemo(() => {
    if (!query.trim()) return null
    const fromCatalog = searchCoordinateSystems(query, catalog)
    const customUtm = wgs84UtmOption(utmZone, utmSouth)
    if (optionMatches(customUtm, query) && !fromCatalog.some((o) => o.id === customUtm.id)) {
      return [...fromCatalog, customUtm]
    }
    return fromCatalog
  }, [query, catalog, utmZone, utmSouth])

  const grouped = useMemo(() => {
    if (filtered) return null
    const groups: { key: string; label: string; items: CoordinateSystemOption[] }[] = [
      {
        key: 'recommended',
        label: `Recommended for ${countryCode.toUpperCase()}`,
        items: recommended,
      },
    ]
    const byRegion = new Map<CoordinateSystemRegion, CoordinateSystemOption[]>()
    for (const option of COORDINATE_SYSTEMS) {
      if (recommended.some((r) => r.id === option.id)) continue
      const list = byRegion.get(option.region) ?? []
      list.push(option)
      byRegion.set(option.region, list)
    }
    for (const [region, items] of byRegion) {
      groups.push({
        key: region,
        label: COORDINATE_SYSTEM_REGION_LABELS[region],
        items,
      })
    }
    return groups
  }, [filtered, recommended, countryCode])

  const activeUtmId = wgs84UtmId(utmZone, utmSouth)

  const renderOption = (option: CoordinateSystemOption) => {
    const selected = option.id === value
    return (
      <li key={option.id}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelect(option.id)}
          className={`flex w-full items-start gap-2 text-left transition-colors disabled:opacity-60 ${
            compact
              ? `rounded-md px-2 py-1.5 text-xs ${
                  selected
                    ? 'bg-app-accent-soft text-terra-800 dark:text-terra-300 font-medium'
                    : 'hover:bg-app-subtle map-text-secondary'
                }`
              : `px-5 py-3.5 ${
                  selected ? 'bg-terra-500/8' : 'hover:bg-app-subtle/80'
                }`
          }`}
        >
          {!compact && (
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                selected
                  ? 'border-terra-600 bg-terra-600 text-white'
                  : 'border-app-border-strong bg-app-surface'
              }`}
              aria-hidden
            >
              {selected && (
                <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M2.5 6l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
          )}
          {compact && (
            <span className="w-4 shrink-0 text-center text-xs">{selected ? '✓' : ''}</span>
          )}
          <span className="min-w-0 flex-1">
            <span className={`block ${compact ? 'font-medium map-text' : 'font-medium text-app-text'}`}>
              {option.label}
            </span>
            <span
              className={`block ${
                compact ? 'text-[10px] map-text-muted' : 'text-xs text-app-text-muted mt-0.5'
              }`}
            >
              {option.epsg}
              {' · '}
              {option.kind === 'geographic' ? 'Geographic' : 'Projected'}
            </span>
          </span>
        </button>
      </li>
    )
  }

  return (
    <div className={className}>
      <div className={compact ? 'space-y-2.5 px-2 pb-2' : 'space-y-4 px-5 pb-4'}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search CRS, EPSG, country…"
          className={
            compact
              ? 'w-full rounded-md border border-app-border bg-app-surface px-2 py-1.5 text-xs map-text focus:border-terra-500 focus:outline-none focus:ring-2 focus:ring-terra-500/25'
              : 'input w-full text-sm'
          }
          aria-label="Search coordinate systems"
        />

        <UtmZoneBuilder
          zone={utmZone}
          south={utmSouth}
          onZoneChange={setUtmZone}
          onSouthChange={setUtmSouth}
          onApply={() => onSelect(activeUtmId)}
          disabled={disabled}
          compact={compact}
          selected={value === activeUtmId}
          suggestedLabel={suggestedUtm?.label.replace('WGS 84 / ', '') ?? null}
        />
      </div>

      <ul
        className={
          compact
            ? 'max-h-52 overflow-y-auto border-t app-divider p-1'
            : 'max-h-[28rem] overflow-y-auto divide-y divide-app-border/40 border-t app-divider'
        }
      >
        {filtered ? (
          filtered.length === 0 ? (
            <li className={compact ? 'px-2 py-3 text-xs map-text-muted' : 'px-5 py-6 text-sm text-app-muted'}>
              No matching coordinate systems.
            </li>
          ) : (
            filtered.map(renderOption)
          )
        ) : (
          grouped?.map((group) => (
            <li key={group.key}>
              <div
                className={
                  compact
                    ? 'sticky top-0 z-[1] bg-app-surface px-2 py-1 text-[10px] font-semibold uppercase tracking-wide map-text-muted'
                    : 'sticky top-0 z-[1] bg-app-subtle/95 px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-app-muted backdrop-blur-sm'
                }
              >
                {group.label}
              </div>
              <ul>{group.items.map(renderOption)}</ul>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
