import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { marketplaceApi } from '../api'
import MarketplaceMap from '../components/marketplace/MarketplaceMap'
import MarketplaceListingDetailSheet from '../components/marketplace/MarketplaceListingDetailSheet'
import MarketplaceMineralsLegend, {
  buildMarketplaceLegendMinerals,
  listingMatchesVisibleMinerals,
} from '../components/marketplace/MarketplaceMineralsLegend'
import BasemapSwitcher from '../components/map/BasemapSwitcher'
import {
  themeDefaultBasemap,
  type BasemapId,
} from '../components/map/basemaps'
import { matchGeologicalColor } from '../constants/geologicalMineralColors'
import { useTheme } from '../theme/ThemeContext'

export default function MarketplacePage() {
  const { theme } = useTheme()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedSlug = searchParams.get('listing')
  const [query, setQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [visibleMinerals, setVisibleMinerals] = useState<Set<string> | null>(null)
  const [basemap, setBasemap] = useState<BasemapId>(() => themeDefaultBasemap(theme))
  const [basemapTouched, setBasemapTouched] = useState(false)

  useEffect(() => {
    if (basemapTouched) return
    setBasemap(themeDefaultBasemap(theme))
  }, [theme, basemapTouched])

  const listQuery = useQuery({
    queryKey: ['marketplace-listings', query],
    queryFn: () =>
      marketplaceApi
        .listings(query.trim() ? { q: query.trim() } : undefined)
        .then((r) => r.data),
  })

  const geoQuery = useQuery({
    queryKey: ['marketplace-geojson', query],
    queryFn: () =>
      marketplaceApi
        .geojson(query.trim() ? { q: query.trim() } : undefined)
        .then((r) => r.data),
  })

  const detailQuery = useQuery({
    queryKey: ['marketplace-detail', selectedSlug],
    queryFn: () => marketplaceApi.detail(selectedSlug!).then((r) => r.data),
    enabled: !!selectedSlug,
  })

  const listings = listQuery.data ?? []
  const legendMinerals = useMemo(() => {
    const fromList = buildMarketplaceLegendMinerals(listings)
    if (fromList.length > 0) return fromList
    const fromGeo = (geoQuery.data?.features ?? []).map((f) => f.properties)
    return buildMarketplaceLegendMinerals(fromGeo)
  }, [listings, geoQuery.data])
  const legendKeySignature = useMemo(
    () =>
      legendMinerals
        .map((m) => m.name.trim().toLowerCase())
        .sort()
        .join('|'),
    [legendMinerals],
  )

  // Default all legend minerals on; keep prior checks when the set changes.
  useEffect(() => {
    const keys = legendKeySignature ? legendKeySignature.split('|') : []
    if (keys.length === 0) return
    setVisibleMinerals((prev) => {
      if (prev == null) return new Set(keys)
      const known = keys.filter((k) => prev.has(k))
      if (known.length === 0) return new Set(keys)
      const next = new Set(known)
      for (const key of keys) {
        if (!prev.has(key)) next.add(key)
      }
      return next
    })
  }, [legendKeySignature])

  const filteredListings = useMemo(
    () => listings.filter((item) => listingMatchesVisibleMinerals(item, visibleMinerals)),
    [listings, visibleMinerals],
  )

  const filteredGeojson = useMemo(() => {
    if (!geoQuery.data) return geoQuery.data
    // Show all plots until the legend checkbox state is ready.
    if (visibleMinerals == null) return geoQuery.data
    return {
      ...geoQuery.data,
      features: geoQuery.data.features.filter((feature) =>
        listingMatchesVisibleMinerals(feature.properties, visibleMinerals),
      ),
    }
  }, [geoQuery.data, visibleMinerals])

  // Close detail if the selected plot was hidden via legend checkboxes.
  useEffect(() => {
    if (!selectedSlug || !detailQuery.data || visibleMinerals == null) return
    if (!listingMatchesVisibleMinerals(detailQuery.data, visibleMinerals)) {
      const next = new URLSearchParams(searchParams)
      next.delete('listing')
      setSearchParams(next, { replace: true })
    }
  }, [visibleMinerals, selectedSlug, detailQuery.data, searchParams, setSearchParams])

  const selectSlug = (slug: string | null, source: 'list' | 'map' = 'list') => {
    if (slug && source === 'map') {
      void marketplaceApi.trackEvent(slug, 'map_click').catch(() => undefined)
    }
    const next = new URLSearchParams(searchParams)
    if (slug) next.set('listing', slug)
    else next.delete('listing')
    setSearchParams(next, { replace: true })
  }

  const showSearchResults = searchFocused && query.trim().length > 0
  const detailOpen = !!selectedSlug
  const emptyMap =
    !listQuery.isLoading &&
    !geoQuery.isLoading &&
    (filteredGeojson?.features?.length ?? 0) === 0

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-app-bg">
      <MarketplaceMap
        geojson={filteredGeojson}
        selectedSlug={selectedSlug}
        onSelectSlug={(slug) => selectSlug(slug, slug ? 'map' : 'list')}
        basemap={basemap}
        className="absolute inset-0 h-full w-full"
      />

      {/* Top-center search — shrink when detail sheet is open so it clears the right panel */}
      <div
        className={`map-search-bar-anchor pointer-events-none absolute left-1/2 top-[max(0.5rem,env(safe-area-inset-top,0px))] z-40 -translate-x-1/2 px-3 sm:top-[max(0.75rem,env(safe-area-inset-top,0px))] sm:px-4 ${
          detailOpen
            ? 'w-[min(100%,22rem)] sm:w-[min(100%,24rem)] sm:max-w-sm'
            : 'w-[min(100%,28rem)] sm:w-[min(100%,36rem)] sm:max-w-lg'
        }`}
      >
        <div
          className={`map-search-unified pointer-events-auto map-chrome w-full overflow-hidden ${
            searchFocused || showSearchResults ? 'map-search-unified--active' : ''
          } ${showSearchResults ? 'rounded-2xl' : 'rounded-full'}`}
        >
          <div className="flex h-11 items-center sm:h-12">
            <label className="relative flex h-full min-w-0 flex-1 items-center">
              <span className="sr-only">Search listings</span>
              <svg
                className="pointer-events-none absolute left-3 h-4 w-4 map-text-muted sm:left-3.5 sm:h-[1.125rem] sm:w-[1.125rem]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
                />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => {
                  window.setTimeout(() => setSearchFocused(false), 150)
                }}
                placeholder="Search title or mineral…"
                className="h-full w-full min-w-0 border-0 bg-transparent pl-9 pr-8 text-sm font-medium map-text placeholder:font-normal placeholder:map-text-muted focus:outline-none focus:ring-0 sm:pl-10"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 flex h-5 w-5 items-center justify-center rounded text-app-muted hover:bg-app-subtle hover:text-app-text"
                  aria-label="Clear search"
                >
                  ×
                </button>
              ) : null}
            </label>
          </div>

          {showSearchResults ? (
            <div className="max-h-64 overflow-y-auto border-t app-divider">
              {listQuery.isLoading ? (
                <p className="px-3.5 py-3 text-xs map-text-muted">Searching…</p>
              ) : filteredListings.length === 0 ? (
                <p className="px-3.5 py-3 text-xs map-text-muted">No listings match.</p>
              ) : (
                <ul className="py-1">
                  {filteredListings.slice(0, 8).map((item) => {
                    const primary =
                      (item.primary_mineral || '').trim() ||
                      (item.commodity_labels || [])[0] ||
                      ''
                    const color = matchGeologicalColor(primary)?.hex ?? '#0f766e'
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3.5 py-2 text-left hover:bg-app-subtle"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            selectSlug(item.slug)
                            setSearchFocused(false)
                          }}
                        >
                          {primary ? (
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-sm border border-black/10"
                              style={{ backgroundColor: color }}
                              aria-hidden
                            />
                          ) : null}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium map-text">
                              {item.title}
                            </span>
                            {primary ? (
                              <span className="block truncate text-[11px] map-text-muted">
                                {primary}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="pointer-events-none absolute left-3 top-[max(0.5rem,env(safe-area-inset-top,0px))] z-30 sm:top-[max(0.75rem,env(safe-area-inset-top,0px))]">
        <Link
          to="/dashboard/marketplace"
          className="pointer-events-auto inline-flex rounded-full map-chrome px-3 py-2 text-[11px] font-medium text-terra-700 dark:text-terra-300"
        >
          My listings
        </Link>
      </div>

      {/* Right dock — basemap + minerals legend */}
      <div
        className={`pointer-events-none absolute right-3 top-3 z-20 flex max-h-[calc(100%-4rem)] w-[min(15rem,calc(100vw-1.5rem))] flex-col gap-1.5 overflow-y-auto md:w-60 ${
          detailOpen ? 'max-lg:hidden' : ''
        }`}
      >
        <div className="pointer-events-auto shrink-0 map-chrome overflow-hidden rounded-xl">
          <BasemapSwitcher
            value={basemap}
            onChange={(id) => {
              setBasemapTouched(true)
              setBasemap(id)
            }}
            embedded
          />
        </div>
        <div className="pointer-events-auto shrink-0">
          <MarketplaceMineralsLegend
            minerals={legendMinerals}
            visibleMinerals={visibleMinerals}
            onVisibleMineralsChange={setVisibleMinerals}
            defaultOpen
          />
        </div>
      </div>

      {!detailOpen ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-app-bg/80 via-app-bg/25 to-transparent px-4 pb-16 pt-12 md:pb-4">
          <p className="text-center text-xs text-app-muted sm:text-sm">
            {emptyMap
              ? query.trim() || (visibleMinerals != null && visibleMinerals.size < legendMinerals.length)
                ? 'No matching plots on the map.'
                : 'No public plots on the map yet.'
              : 'Click a map polygon to inspect the area'}
          </p>
        </div>
      ) : null}

      {detailOpen ? (
        <div className="absolute inset-x-0 bottom-0 z-30 flex h-[min(78vh,44rem)] flex-col overflow-hidden border-t border-app-border/80 shadow-[0_-18px_50px_-24px_rgba(0,0,0,0.55)] sm:inset-x-auto sm:top-3 sm:bottom-0 sm:right-0 sm:h-auto sm:w-[min(20rem,calc(100vw-1.25rem))] sm:rounded-none sm:rounded-tl-2xl sm:border sm:border-b-0 sm:border-r-0 map-chrome">
          {detailQuery.isLoading ? (
            <div className="flex flex-1 items-center justify-center bg-app-surface/95 px-4 py-10 backdrop-blur-md">
              <p className="text-sm text-app-muted">Loading listing…</p>
            </div>
          ) : null}
          {detailQuery.isError ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-app-surface/95 px-4 py-10 backdrop-blur-md">
              <p className="text-sm text-app-muted">Listing not found or no longer public.</p>
              <button type="button" className="btn-secondary text-sm" onClick={() => selectSlug(null)}>
                Close
              </button>
            </div>
          ) : null}
          {detailQuery.data ? (
            <MarketplaceListingDetailSheet
              listing={detailQuery.data}
              onClose={() => selectSlug(null)}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
