import { useEffect, useMemo, useRef, useState } from 'react'
import type { Country } from '../../types'
import { useDisplayName } from '../../i18n/useDisplayName'
import { useTranslation } from '../../i18n/LocaleContext'

interface CountrySelectProps {
  countries: Country[]
  value: string
  onChange: (code: string) => void
  placeholder?: string
  compact?: boolean
  className?: string
  /** When false, hides the "{n} countries with boundaries" subtitle. */
  showCountHint?: boolean
}

export default function CountrySelect({
  countries,
  value,
  onChange,
  placeholder = 'Search countries…',
  compact = false,
  className = '',
  showCountHint = true,
}: CountrySelectProps) {
  const { m } = useTranslation()
  const displayName = useDisplayName()
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const sorted = useMemo(
    () => [...countries].sort((a, b) => a.name.localeCompare(b.name)),
    [countries]
  )

  const selected = sorted.find((c) => c.code === value) ?? sorted[0]
  const showSearch = sorted.length > 6

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter((c) => {
      const name = c.name.toLowerCase()
      const nameSw = c.name_sw?.toLowerCase() ?? ''
      return name.includes(q) || nameSw.includes(q) || c.code.toLowerCase().includes(q)
    })
  }, [sorted, query])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }
    if (showSearch) {
      const id = window.requestAnimationFrame(() => searchRef.current?.focus())
      return () => window.cancelAnimationFrame(id)
    }
  }, [open, showSearch])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('keydown', onKey)
      return () => document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const buttonClass = compact
    ? 'px-2 py-1.5 text-sm'
    : 'px-3 py-2 text-sm'

  if (sorted.length <= 1 && selected) {
    return (
      <div
        className={`flex items-center justify-between gap-2 rounded-lg border border-app-border bg-app-subtle/60 px-3 py-2 text-sm ${className}`}
      >
        <span className="truncate font-medium map-text">{displayName(selected)}</span>
        <span className="shrink-0 text-xs font-mono map-text-muted">{selected.code}</span>
      </div>
    )
  }

  return (
    <div ref={rootRef} className={className}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-2 rounded-lg border border-app-border bg-app-bg text-left map-text focus:border-terra-500 focus:outline-none focus:ring-2 focus:ring-terra-500/25 ${buttonClass}`}
      >
        {selected ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{displayName(selected)}</span>
              {showCountHint && sorted.length > 1 && (
                <span className="block text-[11px] map-text-muted">
                  {m.map.countriesWithBoundaries.replace('{count}', String(sorted.length))}
                </span>
              )}
            </span>
            <span className="shrink-0 text-xs font-mono map-text-muted">{selected.code}</span>
            <span className="shrink-0 text-sm map-text-muted" aria-hidden>
              {open ? '−' : '+'}
            </span>
          </>
        ) : (
          <span className="map-text-muted">Select country…</span>
        )}
      </button>

      {open && (
        <div className="mt-1 overflow-hidden rounded-lg border border-app-border bg-app-surface">
          {showSearch && (
            <div className="border-b border-app-border p-2">
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-md border border-app-border bg-app-bg px-2.5 py-1.5 text-sm map-text focus:border-terra-500 focus:outline-none focus:ring-2 focus:ring-terra-500/25"
              />
            </div>
          )}
          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm map-text-muted">No matches</li>
            ) : (
              filtered.map((c) => (
                <li key={c.code}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(c.code)
                      setOpen(false)
                    }}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-app-subtle ${
                      c.code === value
                        ? 'bg-app-accent-soft font-medium text-terra-800 dark:text-terra-300'
                        : 'map-text-secondary'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="w-4 shrink-0 text-center text-xs">
                        {c.code === value ? '✓' : ''}
                      </span>
                      <span className="truncate">{displayName(c)}</span>
                    </span>
                    <span className="shrink-0 text-[11px] font-mono map-text-muted">{c.code}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
