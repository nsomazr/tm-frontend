import { useQuery } from '@tanstack/react-query'
import { adminApi, paymentsApi, analyticsApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { useDisplayName } from '../../i18n/useDisplayName'
import { Link } from 'react-router-dom'

function StatCard({
  label,
  value,
  hint,
  link,
  linkLabel,
}: {
  label: string
  value: string | number
  hint?: string
  link?: string
  linkLabel?: string
}) {
  return (
    <div className="rounded-xl bg-app-surface p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-app-muted">{label}</p>
      <p className="text-2xl font-bold text-app-text mt-1 tabular-nums">{value}</p>
      {hint && <p className="text-xs text-app-text-muted mt-1">{hint}</p>}
      {link && linkLabel && (
        <Link to={link} className="text-xs text-terra-600 dark:text-terra-400 hover:underline mt-2 inline-block">
          {linkLabel}
        </Link>
      )}
    </div>
  )
}

export default function AdminDashboard() {
  const { isAdmin } = useAuth()
  const displayName = useDisplayName()

  const { data: revenue } = useQuery({
    queryKey: ['revenue'],
    queryFn: () => paymentsApi.revenue().then((r) => r.data),
    enabled: isAdmin,
  })

  const { data: users } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.users().then((r) => r.data),
    enabled: isAdmin,
  })

  const { data: investor } = useQuery({
    queryKey: ['investor'],
    queryFn: () => analyticsApi.investor().then((r) => r.data),
  })

  const { data: hotspots } = useQuery({
    queryKey: ['hotspots'],
    queryFn: () => analyticsApi.hotspots().then((r) => r.data),
  })

  const regions = (hotspots?.hotspots ?? []) as { region: string; feature_count: number }[]
  const topRegion = regions[0]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-app-text">Overview</h1>
        <p className="text-app-muted text-sm mt-1">
          {isAdmin
            ? 'Platform health, revenue, and geological data at a glance.'
            : 'Your assigned minerals, layers, and map coverage.'}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isAdmin && (
          <>
            <StatCard
              label="Total revenue"
              value={`${Number(revenue?.total_revenue || 0).toLocaleString()} TZS`}
              link="/admin/revenue"
              linkLabel="View revenue →"
            />
            <StatCard
              label="Users"
              value={users?.count || 0}
              link="/admin/users"
              linkLabel="Manage users →"
            />
          </>
        )}
        <StatCard
          label="Minerals tracked"
          value={investor?.minerals?.length || 0}
          link="/admin/coverage"
          linkLabel="View coverage →"
        />
        <StatCard
          label="Top region"
          value={topRegion?.region || 'N/A'}
          hint={topRegion ? `${topRegion.feature_count} prospect zones` : undefined}
        />
      </div>

      {isAdmin && (
        <div className="rounded-xl bg-app-surface p-5 mb-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-app-text">Platform analytics</h2>
              <p className="text-sm text-app-muted mt-0.5">
                Users, conversions, revenue, subscriptions, and B2B pipeline.
              </p>
            </div>
            <Link
              to="/admin/analytics"
              className="shrink-0 text-sm font-medium text-terra-600 dark:text-terra-400 px-4 py-2 rounded-lg bg-terra-500/10 hover:bg-terra-500/15 transition-colors"
            >
              Open analytics →
            </Link>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <Link
          to="/admin/layers"
          className="rounded-xl bg-app-surface p-4 hover:bg-app-subtle transition-colors"
        >
          <p className="font-medium text-app-text text-sm">Manage layers</p>
          <p className="text-xs text-app-muted mt-1">Upload shapefiles and configure map layers</p>
        </Link>
        <Link
          to="/admin/coordinates"
          className="rounded-xl bg-app-surface p-4 hover:bg-app-subtle transition-colors"
        >
          <p className="font-medium text-app-text text-sm">Edit coordinates</p>
          <p className="text-xs text-app-muted mt-1">Adjust prospect zone geometry</p>
        </Link>
      </div>

      {investor?.minerals && (
        <div className="rounded-xl bg-app-surface p-5">
          <h2 className="font-semibold text-app-text mb-4">Mineral inventory</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {investor.minerals.map(
              (m: {
                name: string
                name_sw?: string
                slug: string
                color: string
                layer_count: number
                report_count: number
              }) => (
                <div key={m.slug} className="flex items-center gap-3 py-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-app-text">{displayName(m)}</p>
                    <p className="text-xs text-app-muted">
                      {m.layer_count} layers · {m.report_count} reports
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  )
}
