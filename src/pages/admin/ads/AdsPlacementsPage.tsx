import { Link } from 'react-router-dom'
import { AD_PLACEMENTS } from '../../../constants/adPlacements'

const PLACEMENT_DETAILS: Record<string, { summary: string; surfaces: string[] }> = {
  map_sidebar: {
    summary: 'Sponsored card inside the map explore sidebar when users search minerals or areas.',
    surfaces: ['Map page', 'Explore panel'],
  },
  map_overlay: {
    summary: 'Floating promo on the map canvas (reserved for high-visibility partner messages).',
    surfaces: ['Map page'],
  },
  downloads_banner: {
    summary: 'Banner above the public report catalog on the downloads page.',
    surfaces: ['Downloads / Reports'],
  },
  subscriptions_banner: {
    summary: 'Promo below the pricing hero for exploration services and partner offers.',
    surfaces: ['Subscriptions / Pricing'],
  },
  dashboard_card: {
    summary: 'Sponsored card on the subscriber dashboard overview.',
    surfaces: ['User dashboard'],
  },
  about_banner: {
    summary: 'Partner message on the about page below the hero.',
    surfaces: ['About'],
  },
}

export default function AdsPlacementsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-app-text">Ad placements</h1>
        <p className="text-sm text-app-text-muted mt-1">
          Choose where each campaign appears when you create or edit it under{' '}
          <Link to="/admin/ads/campaigns" className="text-terra-600 hover:underline">
            Campaigns
          </Link>
          . Higher priority wins when multiple ads target the same slot.
        </p>
      </div>

      <div className="space-y-3">
        {AD_PLACEMENTS.map((placement) => {
          const detail = PLACEMENT_DETAILS[placement.value]
          return (
            <article key={placement.value} className="card-flat !p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="font-semibold text-app-text">{placement.label}</h2>
                <code className="text-[11px] text-app-text-muted bg-app-subtle px-2 py-0.5 rounded">
                  {placement.value}
                </code>
              </div>
              {detail && (
                <>
                  <p className="text-sm text-app-text-muted mt-2 leading-relaxed">{detail.summary}</p>
                  <p className="text-xs text-app-text-muted mt-2">
                    Surfaces: {detail.surfaces.join(' · ')}
                  </p>
                </>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
