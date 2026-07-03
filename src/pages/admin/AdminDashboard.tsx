import { useQuery } from '@tanstack/react-query'
import { adminApi, paymentsApi, analyticsApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { useDisplayName } from '../../i18n/useDisplayName'
import { Link } from 'react-router-dom'

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
        <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
        <p className="text-slate-500 text-sm mt-1">
          {isAdmin
            ? 'Platform health, revenue, and geological data at a glance.'
            : 'Your assigned minerals, layers, and map coverage.'}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isAdmin && (
          <>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total revenue</p>
              <p className="text-2xl font-bold text-terra-700 mt-1 tabular-nums">
                {Number(revenue?.total_revenue || 0).toLocaleString()} TZS
              </p>
              <Link to="/admin/revenue" className="text-xs text-terra-600 hover:underline mt-2 inline-block">
                View revenue →
              </Link>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Users</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{users?.count || 0}</p>
              <Link to="/admin/users" className="text-xs text-terra-600 hover:underline mt-2 inline-block">
                Manage users →
              </Link>
            </div>
          </>
        )}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Minerals tracked</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{investor?.minerals?.length || 0}</p>
          <Link to="/admin/coverage" className="text-xs text-terra-600 hover:underline mt-2 inline-block">
            View coverage →
          </Link>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Top region</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{topRegion?.region || 'N/A'}</p>
          {topRegion && (
            <p className="text-xs text-slate-500 mt-1">{topRegion.feature_count} prospect zones</p>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 mb-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-slate-900">Platform analytics</h2>
              <p className="text-sm text-slate-500 mt-0.5">Users, conversions, revenue, subscriptions, and B2B pipeline.</p>
            </div>
            <Link
              to="/admin/analytics"
              className="shrink-0 text-sm font-medium text-terra-600 hover:text-terra-700 px-4 py-2 rounded-lg bg-terra-50 hover:bg-terra-100"
            >
              Open analytics →
            </Link>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <Link
          to="/admin/layers"
          className="rounded-xl border border-slate-200 bg-white p-4 hover:border-terra-300 hover:shadow-sm transition-all"
        >
          <p className="font-medium text-slate-900 text-sm">Manage layers</p>
          <p className="text-xs text-slate-500 mt-1">Upload shapefiles and configure map layers</p>
        </Link>
        <Link
          to="/admin/coordinates"
          className="rounded-xl border border-slate-200 bg-white p-4 hover:border-terra-300 hover:shadow-sm transition-all"
        >
          <p className="font-medium text-slate-900 text-sm">Edit coordinates</p>
          <p className="text-xs text-slate-500 mt-1">Adjust prospect zone geometry</p>
        </Link>
      </div>

      {investor?.minerals && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Mineral inventory</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {investor.minerals.map((m: { name: string; name_sw?: string; slug: string; color: string; layer_count: number; report_count: number }) => (
              <div key={m.slug} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-900">{displayName(m)}</p>
                  <p className="text-xs text-slate-500">{m.layer_count} layers · {m.report_count} reports</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
