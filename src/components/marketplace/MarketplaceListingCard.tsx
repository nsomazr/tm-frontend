import type { MarketplaceListingPublic } from '../../types'

function PlotGlyph({ selected }: { selected: boolean }) {
  return (
    <svg
      viewBox="0 0 120 72"
      className="h-full w-full"
      aria-hidden
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="mp-card-sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={selected ? '#fef3c7' : '#ecfdf5'} />
          <stop offset="100%" stopColor={selected ? '#ffedd5' : '#d1fae5'} />
        </linearGradient>
        <pattern id="mp-card-grid" width="12" height="12" patternUnits="userSpaceOnUse">
          <path
            d="M12 0H0V12"
            fill="none"
            stroke={selected ? 'rgba(194,65,12,0.12)' : 'rgba(15,118,110,0.12)'}
            strokeWidth="0.75"
          />
        </pattern>
      </defs>
      <rect width="120" height="72" fill="url(#mp-card-sky)" />
      <rect width="120" height="72" fill="url(#mp-card-grid)" />
      <path
        d="M18 54 L38 28 L58 46 L78 22 L102 48 L102 60 L18 60 Z"
        fill={selected ? 'rgba(194,65,12,0.28)' : 'rgba(15,118,110,0.28)'}
        stroke={selected ? '#c2410c' : '#0f766e'}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface MarketplaceListingCardProps {
  listing: MarketplaceListingPublic
  selected: boolean
  onSelect: () => void
}

export default function MarketplaceListingCard({
  listing,
  selected,
  onSelect,
}: MarketplaceListingCardProps) {
  const commodities = listing.commodity_labels ?? []
  const meta = [listing.geometry_type, listing.buffer_km ? `${listing.buffer_km} km buffer` : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group flex h-full w-full flex-col overflow-hidden rounded-2xl border text-left transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra-500/40 ${
        selected
          ? 'border-terra-500/50 bg-app-surface shadow-[0_12px_28px_-16px_rgba(15,118,110,0.55)] ring-1 ring-terra-500/25'
          : 'border-app-border bg-app-surface hover:-translate-y-0.5 hover:border-terra-400/40 hover:shadow-[0_14px_28px_-18px_rgba(15,23,42,0.35)]'
      }`}
    >
      <div className="relative h-28 w-full overflow-hidden border-b border-app-border/70">
        <PlotGlyph selected={selected} />
        {selected ? (
          <span className="absolute left-3 top-3 rounded-md bg-terra-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            Selected
          </span>
        ) : null}
        {meta ? (
          <span className="absolute bottom-2.5 right-2.5 rounded-md bg-app-surface/90 px-2 py-0.5 text-[10px] font-medium text-app-muted backdrop-blur-sm">
            {meta}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 px-3.5 py-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold tracking-tight text-app-text">{listing.title}</h3>
          {listing.summary ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-app-muted">{listing.summary}</p>
          ) : (
            <p className="mt-1 text-xs text-app-muted">Exploration / licence area</p>
          )}
        </div>

        {commodities.length > 0 ? (
          <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
            {commodities.slice(0, 3).map((label) => (
              <span
                key={label}
                className="rounded-md bg-terra-50 px-2 py-0.5 text-[11px] font-medium text-terra-800 dark:bg-terra-500/15 dark:text-terra-300"
              >
                {label}
              </span>
            ))}
            {commodities.length > 3 ? (
              <span className="rounded-md bg-app-subtle px-2 py-0.5 text-[11px] text-app-muted">
                +{commodities.length - 3}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </button>
  )
}
