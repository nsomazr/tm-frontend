import { useTranslation } from '../../i18n/LocaleContext'

interface MapSearchBarProps {
  search: string
  onSearchChange: (value: string) => void
}

export default function MapSearchBar({ search, onSearchChange }: MapSearchBarProps) {
  const { m } = useTranslation()

  return (
    <div className="absolute top-2 sm:top-3 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-1rem)] max-w-md pointer-events-none">
      <div className="relative pointer-events-auto">
        <svg
          className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 map-text-muted pointer-events-none"
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
          placeholder={m.map.searchPlaceholder}
          className="map-chrome-input h-9 sm:h-11 pl-10 sm:pl-11 pr-3 sm:pr-4 text-sm"
        />
      </div>
    </div>
  )
}
