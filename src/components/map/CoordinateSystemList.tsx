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
      <div className={compact ? 'px-2 pb-2' : 'px-5 pb-3'}>
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
      </div>

      <div className={compact ? 'px-2 pb-2' : 'px-5 pb-3'}>
        <p
          className={
            compact
              ? 'mb-1.5 text-[10px] font-semibold uppercase tracking-wide map-text-muted'
              : 'mb-2 text-xs font-semibold uppercase tracking-wide text-app-muted'
          }
        >
          WGS 84 UTM zone
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs">
            <span className={compact ? 'map-text-muted' : 'text-app-muted'}>Zone</span>
            <input
              type="number"
              min={1}
              max={60}
              value={utmZone}
              onChange={(e) => {
                const next = Number(e.target.value)
                if (Number.isFinite(next)) setUtmZone(Math.min(60, Math.max(1, Math.round(next))))
              }}
              className={
                compact
                  ? 'w-14 rounded-md border border-app-border bg-app-surface px-1.5 py-1 text-xs map-text'
                  : 'input w-16 py-1.5 text-sm'
              }
            />
          </label>
          <div className="inline-flex rounded-md border border-app-border p-0.5">
            {([false, true] as const).map((south) => (
              <button
                key={south ? 's' : 'n'}
                type="button"
                onClick={() => setUtmSouth(south)}
                className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                  utmSouth === south
                    ? 'bg-terra-600 text-white'
                    : compact
                      ? 'map-text-muted hover:bg-app-subtle'
                      : 'text-app-muted hover:bg-app-subtle'
                }`}
              >
                {south ? 'South' : 'North'}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelect(wgs84UtmId(utmZone, utmSouth))}
            className={
              compact
                ? 'rounded-md bg-terra-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-terra-700 disabled:opacity-60'
                : 'btn-secondary text-xs py-1.5'
            }
          >
            Use UTM {utmZone}
            {utmSouth ? 'S' : 'N'}
          </button>
        </div>
      </div>

      <ul className={compact ? 'max-h-52 overflow-y-auto border-t app-divider p-1' : 'max-h-[28rem] overflow-y-auto divide-y divide-app-border/40'}>
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
            <li key={group.key} className={compact ? '' : ''}>
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
