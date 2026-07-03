import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { subscriptionsApi, paymentsApi, analyticsApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { PageHeader, StatCard } from './DashboardUi'

export default function DashboardOverview() {
  const { user, hasPaidAccess } = useAuth()

  const { data: subscription } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: () => subscriptionsApi.me().then((r) => r.data).catch(() => null),
  })

  const { data: invoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => paymentsApi.invoices().then((r) => r.data),
  })

  const { data: purchases } = useQuery({
    queryKey: ['purchases'],
    queryFn: () =>
      subscriptionsApi.purchases().then((r) => {
        const data = r.data
        if (Array.isArray(data)) return data
        if (data && typeof data === 'object' && 'results' in data && Array.isArray((data as { results: unknown }).results)) {
          return (data as { results: unknown[] }).results
        }
        return []
      }),
  })

  const { data: hotspots } = useQuery({
    queryKey: ['hotspots'],
    queryFn: () => analyticsApi.hotspots().then((r) => r.data),
    enabled: hasPaidAccess,
  })

  const planName = subscription?.is_active ? subscription.plan_detail.name : 'Free preview'
  const topRegion = hotspots?.hotspots?.[0] as { region: string; feature_count: number } | undefined

  return (
    <>
      <PageHeader
        title={`Hello, ${user?.first_name || user?.username}`}
        description="Your mineral intelligence at a glance."
      />

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Plan"
          value={planName}
          hint={subscription?.days_until_expiry != null ? `${subscription.days_until_expiry} days left` : undefined}
        />
        <StatCard label="Reports owned" value={String(purchases?.length ?? 0)} />
        <StatCard
          label="Top region"
          value={hasPaidAccess && topRegion ? topRegion.region : 'N/A'}
          hint={hasPaidAccess && topRegion ? `${topRegion.feature_count} zones` : 'Subscribe for analytics'}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Link
          to="/dashboard/subscription"
          className="card p-4 hover:border-terra-300 hover:shadow-sm transition-all"
        >
          <p className="font-medium text-app-text text-sm">Manage subscription</p>
          <p className="text-xs text-app-muted mt-1">View plan status and renewal</p>
        </Link>
        <Link
          to="/"
          className="card p-4 hover:border-terra-300 hover:shadow-sm transition-all"
        >
          <p className="font-medium text-app-text text-sm">Explore the map</p>
          <p className="text-xs text-app-muted mt-1">Search minerals and view layers</p>
        </Link>
        <Link
          to="/downloads"
          className="card p-4 hover:border-terra-300 hover:shadow-sm transition-all"
        >
          <p className="font-medium text-app-text text-sm">Browse reports</p>
          <p className="text-xs text-app-muted mt-1">Pay-per-download prospectivity PDFs</p>
        </Link>
        <Link
          to="/dashboard/analytics"
          className="card p-4 hover:border-terra-300 hover:shadow-sm transition-all"
        >
          <p className="font-medium text-app-text text-sm">View analytics</p>
          <p className="text-xs text-app-muted mt-1">Regional mineral hotspots</p>
        </Link>
      </div>

      {(invoices?.length ?? 0) > 0 && (
        <p className="text-xs text-slate-400 mt-6">
          {invoices!.length} invoice{invoices!.length !== 1 ? 's' : ''} on file.{' '}
          <Link to="/dashboard/billing" className="text-terra-600 hover:underline">
            view billing
          </Link>
        </p>
      )}
    </>
  )
}
