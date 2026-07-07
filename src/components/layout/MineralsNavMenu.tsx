import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { analyticsApi } from '../../api'
import { mineralHeatmapQueryOptions } from '../../lib/mineralHeatmapQuery'
import { useTranslation } from '../../i18n/LocaleContext'
import { useDisplayName } from '../../i18n/useDisplayName'
import { DEFAULT_COUNTRY_CODE } from '../map/countryFocus'
import type { MineralCatalogEntry } from '../../types'

interface MineralsNavMenuProps {
  className?: string
}

export default function MineralsNavMenu({ className = '' }: MineralsNavMenuProps) {
  const { m } = useTranslation()
  const displayName = useDisplayName()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const selectedSlug = searchParams.get('mineral')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data } = useQuery({
    queryKey: ['mineral-catalog-nav', DEFAULT_COUNTRY_CODE],
    queryFn: () => analyticsApi.mineralCatalog(DEFAULT_COUNTRY_CODE).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const minerals = useMemo(
    () => (data?.minerals ?? []).filter((entry: MineralCatalogEntry) => entry.is_mapped),
    [data?.minerals],
  )

  const selectedEntry = useMemo(
    () => minerals.find((entry) => entry.slug === selectedSlug) ?? null,
    [minerals, selectedSlug],
  )

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const selectMineral = (slug: string) => {
    setOpen(false)
    navigate(`/?mineral=${encodeURIComponent(slug)}`)
  }

  const prefetchHeatmap = (slug: string) => {
    void queryClient.prefetchQuery(
      mineralHeatmapQueryOptions({ slug, countryCode: DEFAULT_COUNTRY_CODE, layerIds: undefined }),
    )
  }

  const clearMineral = () => {
    setOpen(false)
    const next = new URLSearchParams(searchParams)
    next.delete('mineral')
    const qs = next.toString()
    navigate(qs ? `/?${qs}` : '/', { replace: true })
  }

  const buttonLabel = selectedEntry ? displayName(selectedEntry) : m.nav.minerals

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`nav-link flex items-center gap-1 max-w-[10rem] sm:max-w-[12rem] ${open || selectedEntry ? 'nav-link-active' : ''}`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="truncate">{buttonLabel}</span>
        <span className="text-[10px] opacity-70 shrink-0" aria-hidden>
          {open ? '▴' : '▾'}
        </span>
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-[60] mt-1.5 w-[min(18rem,calc(100vw-2rem))] max-h-[min(24rem,60vh)] overflow-y-auto rounded-xl border border-app-border bg-app-surface shadow-xl py-1 scrollbar-pane"
          role="listbox"
        >
          {minerals.length === 0 ? (
            <p className="px-3 py-2 text-sm text-app-text-muted">{m.nav.mineralsEmpty}</p>
          ) : (
            <>
              {selectedSlug && (
                <button
                  type="button"
                  onClick={clearMineral}
                  className="flex w-full items-center gap-2.5 border-b app-divider px-3 py-2 text-left text-sm text-app-text-muted transition-colors hover:bg-app-subtle hover:text-app-text"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-dashed border-app-border" />
                  <span className="font-medium">{m.nav.mineralsClear}</span>
                </button>
              )}
              {minerals.map((entry) => {
                const isSelected = entry.slug === selectedSlug
                return (
                  <button
                    key={entry.slug}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => selectMineral(entry.slug)}
                    onMouseEnter={() => prefetchHeatmap(entry.slug)}
                    onFocus={() => prefetchHeatmap(entry.slug)}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                      isSelected ? 'bg-terra-500/10 text-terra-700 dark:text-terra-300' : 'hover:bg-app-subtle'
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                      style={{ backgroundColor: entry.color || '#E87722' }}
                    />
                    <span className="min-w-0 flex-1 truncate font-medium text-app-text">
                      {displayName(entry)}
                    </span>
                    {entry.feature_count > 0 && (
                      <span className="shrink-0 text-[10px] tabular-nums text-app-text-muted">
                        {entry.feature_count}
                      </span>
                    )}
                  </button>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}
