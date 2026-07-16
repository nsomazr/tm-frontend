import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { analyticsApi } from '../../api'
import { mineralHeatmapQueryOptions } from '../../lib/mineralHeatmapQuery'
import { useTranslation } from '../../i18n/LocaleContext'
import { useDisplayName } from '../../i18n/useDisplayName'
import { DEFAULT_COUNTRY_CODE } from '../map/countryFocus'
import type { MineralCatalogEntry } from '../../types'
import type { HeatmapMode } from '../map/MineralHeatmapColorbar'

interface MineralsNavMenuProps {
  className?: string
}

function parseMultiMinerals(raw: string | null): string[] {
  if (!raw) return []
  return [...new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))]
}

export default function MineralsNavMenu({ className = '' }: MineralsNavMenuProps) {
  const { m } = useTranslation()
  const displayName = useDisplayName()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const selectedSlug = searchParams.get('mineral')
  const urlMode: HeatmapMode = searchParams.get('heatmap') === 'multi' ? 'multi' : 'single'
  const multiSlugs = useMemo(
    () => parseMultiMinerals(searchParams.get('minerals')),
    [searchParams],
  )
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data, refetch } = useQuery({
    queryKey: ['mineral-catalog-nav', DEFAULT_COUNTRY_CODE],
    queryFn: () => analyticsApi.mineralCatalog(DEFAULT_COUNTRY_CODE).then((r) => r.data),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })

  const minerals = useMemo(
    () =>
      (data?.minerals ?? []).filter(
        (entry: MineralCatalogEntry) => entry.is_mapped && entry.slug !== 'general',
      ),
    [data?.minerals],
  )

  useEffect(() => {
    if (!open) return
    void refetch()
  }, [open, refetch])

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

  const writeParams = (mutate: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams)
    mutate(next)
    const qs = next.toString()
    navigate(qs ? `/?${qs}` : '/', { replace: true })
  }

  const setMode = (mode: HeatmapMode) => {
    writeParams((next) => {
      if (mode === 'multi') {
        next.set('heatmap', 'multi')
        next.delete('mineral')
        if (!next.get('minerals') && selectedSlug) {
          next.set('minerals', selectedSlug)
        }
      } else {
        next.delete('heatmap')
        next.delete('minerals')
      }
    })
  }

  const selectSingleMineral = (slug: string) => {
    setOpen(false)
    writeParams((next) => {
      next.delete('heatmap')
      next.delete('minerals')
      next.set('mineral', slug)
    })
  }

  const toggleMultiMineral = (slug: string) => {
    writeParams((next) => {
      next.set('heatmap', 'multi')
      next.delete('mineral')
      const current = parseMultiMinerals(next.get('minerals'))
      const has = current.includes(slug)
      const updated = has ? current.filter((s) => s !== slug) : [...current, slug]
      if (updated.length === 0) next.delete('minerals')
      else next.set('minerals', updated.join(','))
    })
  }

  const prefetchHeatmap = (slug: string) => {
    void queryClient.prefetchQuery(
      mineralHeatmapQueryOptions({ slug, countryCode: DEFAULT_COUNTRY_CODE, layerIds: undefined }),
    )
  }

  const clearHeatmap = () => {
    setOpen(false)
    writeParams((next) => {
      next.delete('mineral')
      next.delete('heatmap')
      next.delete('minerals')
    })
  }

  const buttonLabel = (() => {
    if (urlMode === 'multi') {
      if (multiSlugs.length >= 2) {
        return `${m.nav.heatmapMulti} (${multiSlugs.length})`
      }
      return m.nav.heatmap
    }
    if (selectedEntry) return displayName(selectedEntry)
    return m.nav.heatmap
  })()

  const hasActiveSelection =
    urlMode === 'multi' ? multiSlugs.length > 0 : Boolean(selectedSlug)

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`nav-link flex items-center gap-1 max-w-[11rem] sm:max-w-[14rem] ${
          open || hasActiveSelection ? 'nav-link-active' : ''
        }`}
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
          className="absolute left-0 top-full z-[60] mt-1.5 w-[min(20rem,calc(100vw-2rem))] max-h-[min(28rem,70vh)] overflow-y-auto rounded-xl border border-app-border bg-app-surface shadow-xl py-2 scrollbar-pane"
          role="dialog"
          aria-label={m.nav.heatmap}
        >
          <div className="px-3 pb-2">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-app-text-muted">
              {m.nav.heatmap}
            </p>
            <div className="segmented w-full" role="radiogroup" aria-label={m.nav.heatmapMode}>
              <button
                type="button"
                role="radio"
                aria-checked={urlMode === 'single'}
                onClick={() => setMode('single')}
                className={`segmented-btn flex-1 px-2 py-1.5 text-[11px] ${
                  urlMode === 'single' ? 'segmented-btn-active' : ''
                }`}
              >
                {m.nav.heatmapSingle}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={urlMode === 'multi'}
                onClick={() => setMode('multi')}
                className={`segmented-btn flex-1 px-2 py-1.5 text-[11px] ${
                  urlMode === 'multi' ? 'segmented-btn-active' : ''
                }`}
              >
                {m.nav.heatmapMulti}
              </button>
            </div>
            <p className="mt-1.5 text-[10px] leading-snug text-app-text-muted">
              {urlMode === 'multi' ? m.nav.heatmapMultiHint : m.nav.heatmapSingleHint}
            </p>
          </div>

          {minerals.length === 0 ? (
            <p className="px-3 py-2 text-sm text-app-text-muted">{m.nav.heatmapEmpty}</p>
          ) : (
            <>
              {hasActiveSelection && (
                <button
                  type="button"
                  onClick={clearHeatmap}
                  className="flex w-full items-center gap-2.5 border-y app-divider px-3 py-2 text-left text-sm text-app-text-muted transition-colors hover:bg-app-subtle hover:text-app-text"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-dashed border-app-border" />
                  <span className="font-medium">{m.nav.heatmapClear}</span>
                </button>
              )}
              <ul className="py-1" role="listbox" aria-multiselectable={urlMode === 'multi'}>
                {minerals.map((entry) => {
                  const isSelected =
                    urlMode === 'multi'
                      ? multiSlugs.includes(entry.slug)
                      : entry.slug === selectedSlug
                  return (
                    <li key={entry.slug}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() =>
                          urlMode === 'multi'
                            ? toggleMultiMineral(entry.slug)
                            : selectSingleMineral(entry.slug)
                        }
                        onMouseEnter={() => prefetchHeatmap(entry.slug)}
                        onFocus={() => prefetchHeatmap(entry.slug)}
                        className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                          isSelected
                            ? 'bg-terra-500/10 text-terra-700 dark:text-terra-300'
                            : 'hover:bg-app-subtle'
                        }`}
                      >
                        {urlMode === 'multi' ? (
                          <input
                            type="checkbox"
                            readOnly
                            checked={isSelected}
                            className="checkbox checkbox--sm pointer-events-none"
                            tabIndex={-1}
                            aria-hidden
                          />
                        ) : (
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                            style={{ backgroundColor: entry.color || '#E87722' }}
                          />
                        )}
                        <span className="min-w-0 flex-1 truncate font-medium text-app-text">
                          {displayName(entry)}
                        </span>
                        {entry.feature_count > 0 && (
                          <span className="shrink-0 text-[10px] tabular-nums text-app-text-muted">
                            {entry.feature_count}
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
              {urlMode === 'multi' && multiSlugs.length > 0 && multiSlugs.length < 2 && (
                <p className="border-t app-divider px-3 py-2 text-[10px] text-app-text-muted">
                  {m.nav.heatmapPickTwo}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
