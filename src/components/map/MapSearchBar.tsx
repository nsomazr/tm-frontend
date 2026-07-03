import { useTranslation } from '../../i18n/LocaleContext'

interface MapSearchBarProps {
  search: string
  onSearchChange: (value: string) => void
}

export default function MapSearchBar({ search, onSearchChange }: MapSearchBarProps) {
  const { m } = useTranslation()

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-[min(100%,28rem)] px-3 pointer-events-none">
      <div className="relative pointer-events-auto">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none"
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
          className="w-full h-12 pl-11 pr-4 text-sm font-medium bg-white border border-slate-200 rounded-full shadow-lg placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-terra-500 focus:ring-2 focus:ring-terra-500/25"
        />
      </div>
    </div>
  )
}
