import { matchGeologicalColor } from '../../constants/geologicalMineralColors'
import type { MarketplaceListingPublic } from '../../types'

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
  const primary =
    (listing.primary_mineral || '').trim() || (listing.commodity_labels || [])[0] || ''
  const others = (listing.other_minerals || []).filter(Boolean)
  const commodities =
    primary || others.length
      ? [primary, ...others].filter(Boolean)
      : listing.commodity_labels ?? []

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group w-full rounded-xl border px-3 py-2.5 text-left transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra-500/40 ${
        selected
          ? 'border-terra-500/50 bg-terra-50/80 ring-1 ring-terra-500/20 dark:bg-terra-500/10'
          : 'border-transparent bg-transparent hover:bg-app-subtle'
      }`}
    >
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold tracking-tight text-app-text">
          {listing.title}
        </h3>
        {listing.summary ? (
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-app-muted">
            {listing.summary}
          </p>
        ) : null}
      </div>

      {commodities.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {commodities.slice(0, 3).map((label) => {
            const color = matchGeologicalColor(label)?.hex ?? '#0f766e'
            return (
              <span
                key={label}
                className="inline-flex items-center gap-1 rounded-md bg-app-subtle px-1.5 py-0.5 text-[10px] font-medium text-app-text-secondary"
              >
                <span
                  className="h-1.5 w-1.5 rounded-sm"
                  style={{ backgroundColor: color }}
                  aria-hidden
                />
                {label}
              </span>
            )
          })}
          {commodities.length > 3 ? (
            <span className="rounded-md bg-app-subtle px-1.5 py-0.5 text-[10px] text-app-muted">
              +{commodities.length - 3}
            </span>
          ) : null}
        </div>
      ) : null}
    </button>
  )
}
