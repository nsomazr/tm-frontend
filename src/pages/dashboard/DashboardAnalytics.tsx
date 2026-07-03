import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { useDisplayName } from '../../i18n/useDisplayName'
import { Link } from 'react-router-dom'
import { EmptyState, PageHeader } from './DashboardUi'

export default function DashboardAnalytics() {
  const { hasPaidAccess } = useAuth()
  const displayName = useDisplayName()

  const { data: hotspots, isLoading } = useQuery({
    queryKey: ['hotspots'],
    queryFn: () => analyticsApi.hotspots().then((r) => r.data),
    enabled: hasPaidAccess,
  })

  if (!hasPaidAccess) {
    return (
      <>
        <PageHeader title="Analytics" description="Regional mineral hotspot data." />
        <EmptyState
          message="Analytics are included with a paid subscription."
          action={
            <Link to="/subscriptions" className="btn-primary text-sm">
              Upgrade your plan
            </Link>
          }
        />
      </>
    )
  }

  const regionList = (hotspots?.hotspots ?? []) as { region: string; feature_count: number }[]
  const mineralList = (hotspots?.minerals ?? []) as {
    name: string
    name_sw?: string
    color: string
    count: number
    slug?: string
  }[]

  return (
    <>
      <PageHeader title="Analytics" description="Where mapped mineral zones concentrate across Tanzania." />

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="text-sm font-semibold text-slate-800 mb-3">By region</h2>
            {regionList.length === 0 ? (
              <p className="text-sm text-slate-500">No hotspot data yet.</p>
            ) : (
              <ul className="rounded-xl bg-white border border-slate-200 divide-y divide-slate-100">
                {regionList.map((h) => (
                  <li key={h.region} className="flex justify-between items-center px-5 py-3 text-sm">
                    <span className="font-medium text-slate-800">{h.region}</span>
                    <span className="text-terra-600 font-semibold tabular-nums">{h.feature_count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {mineralList.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-800 mb-3">By mineral</h2>
              <ul className="rounded-xl bg-white border border-slate-200 divide-y divide-slate-100">
                {mineralList.map((mineral) => (
                  <li key={mineral.slug ?? mineral.name} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: mineral.color }} />
                    <span className="flex-1 font-medium text-slate-800">{displayName(mineral)}</span>
                    <span className="text-slate-500 tabular-nums">{mineral.count}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Link to="/" className="inline-block text-sm text-terra-600 hover:text-terra-700 font-medium">
            Explore regions on the map →
          </Link>
        </div>
      )}
    </>
  )
}
