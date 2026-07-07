import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { adsApi } from '../../../api'
import { adStatusBadgeClass } from './adAdminUtils'

export default function AdsPerformancePage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-ads-stats'],
    queryFn: () => adsApi.adminStats().then((r) => r.data),
  })

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ['admin-ads'],
    queryFn: () => adsApi.adminList(),
  })

  const sortedCampaigns = [...campaigns].sort(
    (a, b) => b.impression_count - a.impression_count || b.click_count - a.click_count,
  )

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-app-text">Ad performance</h1>
        <p className="text-sm text-app-text-muted mt-1">
          Reach, clicks, and click-through rate across placements and campaigns.
        </p>
      </div>

      {statsLoading ? (
        <p className="text-sm text-app-text-muted">Loading metrics…</p>
      ) : stats ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-6">
            {[
              { label: 'Campaigns', value: stats.campaigns },
              { label: 'Live now', value: stats.live_campaigns },
              { label: 'Reach', value: stats.reach.toLocaleString() },
              { label: 'Clicks', value: stats.clicks.toLocaleString() },
              { label: 'CTR', value: `${stats.ctr}%` },
            ].map((item) => (
              <div key={item.label} className="card-flat !p-4">
                <p className="text-xs text-app-text-muted">{item.label}</p>
                <p className="text-xl font-semibold text-app-text tabular-nums mt-1">{item.value}</p>
              </div>
            ))}
          </div>

          <section className="card-flat mb-6">
            <h2 className="font-semibold text-app-text mb-4">By placement</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-app-text-muted border-b app-divider">
                    <th className="pb-2 font-medium">Placement</th>
                    <th className="pb-2 font-medium">Impressions</th>
                    <th className="pb-2 font-medium">Clicks</th>
                    <th className="pb-2 font-medium">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.by_placement.map((row) => (
                    <tr key={row.placement} className="border-b app-divider last:border-0">
                      <td className="py-2.5">{row.label}</td>
                      <td className="py-2.5 tabular-nums">{row.impressions.toLocaleString()}</td>
                      <td className="py-2.5 tabular-nums">{row.clicks.toLocaleString()}</td>
                      <td className="py-2.5 tabular-nums">{row.ctr}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      <section className="card-flat !p-0 overflow-hidden">
        <div className="px-5 py-4 border-b app-divider">
          <h2 className="font-semibold text-app-text">Campaign metrics</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-app-text-muted border-b app-divider">
                <th className="px-4 py-3 font-medium">Campaign</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Impressions</th>
                <th className="px-4 py-3 font-medium">Clicks</th>
                <th className="px-4 py-3 font-medium">CTR</th>
              </tr>
            </thead>
            <tbody>
              {campaignsLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-app-text-muted">
                    Loading…
                  </td>
                </tr>
              ) : sortedCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-app-text-muted">
                    No campaigns yet.{' '}
                    <Link to="/admin/ads/campaigns" className="text-terra-600 hover:underline">
                      Create one
                    </Link>
                  </td>
                </tr>
              ) : (
                sortedCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-b app-divider last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-app-text">{campaign.title}</p>
                      <p className="text-xs text-app-text-muted">{campaign.company_name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${adStatusBadgeClass(campaign.status_label)}`}
                      >
                        {campaign.status_label}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {campaign.impression_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{campaign.click_count.toLocaleString()}</td>
                    <td className="px-4 py-3 tabular-nums">{campaign.click_through_rate}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
