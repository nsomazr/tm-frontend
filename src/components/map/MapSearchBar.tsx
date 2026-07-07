import { useState, type ReactNode } from 'react'
import { useTranslation } from '../../i18n/LocaleContext'
import { useMediaQuery } from '../../hooks/useMediaQuery'

interface MapSearchBarProps {
  search: string
  onSearchChange: (value: string) => void
  searchEnabled?: boolean
  exploreEnabled?: boolean
  exploreOpen?: boolean
  onExploreOpenChange?: (open: boolean) => void
  explorePanel?: ReactNode
}

function ExploreIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Z" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

export default function MapSearchBar({
  search,
  onSearchChange,
  searchEnabled = true,
  exploreEnabled = false,
  exploreOpen = false,
  onExploreOpenChange,
  explorePanel,
}: MapSearchBarProps) {
  const { m } = useTranslation()
  const [searchFocused, setSearchFocused] = useState(false)
  const isCompact = useMediaQuery('(max-width: 639px)')

  if (!searchEnabled && !exploreEnabled) return null

  const barActive = searchFocused || exploreOpen
  const showExpandedChrome = exploreEnabled && (searchEnabled || exploreOpen)
  const placeholder = isCompact ? m.map.searchPlaceholderShort : m.map.searchPlaceholder

  return (
    <div
      className={`absolute top-[max(0.75rem,env(safe-area-inset-top,0px))] left-[max(0.75rem,env(safe-area-inset-left,0px))] right-[max(0.75rem,env(safe-area-inset-right,0px))] z-40 mx-auto w-full pointer-events-none ${
        showExpandedChrome ? 'max-w-xl sm:max-w-2xl' : 'max-w-md sm:max-w-lg'
      }`}
    >
      <div
        className={`map-search-unified pointer-events-auto map-chrome overflow-hidden ${
          showExpandedChrome ? (exploreOpen ? 'rounded-2xl' : 'rounded-2xl sm:rounded-[1.75rem]') : 'rounded-full'
        } ${barActive ? 'map-search-unified--active' : ''} ${exploreOpen ? 'map-search-unified--expanded' : ''}`}
      >
        <div className="flex h-11 items-center sm:h-12">
          {searchEnabled && (
            <label className="relative flex h-full min-w-0 flex-1 items-center">
              <svg
                className="pointer-events-none absolute left-3 h-4 w-4 map-text-muted sm:left-3.5 sm:h-[1.125rem] sm:w-[1.125rem]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder={placeholder}
                className="h-full w-full min-w-0 border-0 bg-transparent pl-9 pr-2 text-sm font-medium map-text placeholder:font-normal placeholder:map-text-muted focus:outline-none focus:ring-0 sm:pl-10 sm:pr-3"
              />
            </label>
          )}

          {exploreEnabled && (
            <>
              {searchEnabled && (
                <div className="mx-1 h-6 w-px shrink-0 self-center bg-app-border/80 sm:mx-1.5" aria-hidden />
              )}
              <button
                type="button"
                onClick={() => onExploreOpenChange?.(!exploreOpen)}
                aria-expanded={exploreOpen}
                aria-label={m.map.exploreArea}
                className={`group flex shrink-0 items-center justify-center transition-colors duration-300 ease-out ${
                  isCompact
                    ? `mx-1 h-9 w-9 rounded-xl ${
                        exploreOpen
                          ? 'bg-terra-500/12 text-terra-700 dark:text-terra-300'
                          : 'text-terra-600 hover:bg-app-subtle/70 dark:text-terra-400'
                      }`
                    : `gap-1.5 px-3 sm:px-4 ${
                        exploreOpen
                          ? 'bg-terra-500/12 text-terra-700 dark:text-terra-300'
                          : 'map-text-secondary hover:bg-app-subtle/70 hover:map-text'
                      }`
                }`}
              >
                <span
                  className={`flex items-center justify-center rounded-lg transition-all duration-300 ease-out ${
                    isCompact
                      ? 'h-7 w-7'
                      : 'h-7 w-7'
                  } ${
                    exploreOpen
                      ? 'bg-terra-600 text-white shadow-sm'
                      : 'bg-terra-500/10 text-terra-600 group-hover:bg-terra-500/15 dark:text-terra-400'
                  }`}
                >
                  <ExploreIcon className="h-3.5 w-3.5" />
                </span>
                {!isCompact && <span className="text-sm font-semibold">{m.map.exploreArea}</span>}
              </button>
            </>
          )}
        </div>

        {exploreEnabled && explorePanel && (
          <div
            className={`map-search-explore-panel ${exploreOpen ? 'map-search-explore-panel--open' : 'map-search-explore-panel--closed'}`}
            aria-hidden={!exploreOpen}
          >
            <div className="map-search-explore-panel-inner">
              <div className="map-search-explore-panel-content border-t app-divider">
                {explorePanel}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
