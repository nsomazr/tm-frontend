import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { adminApi, analyticsApi, paymentsApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { useDisplayName } from '../../i18n/useDisplayName'

type Mineral = {
  name: string
  name_sw?: string
  slug: string
  color: string
  layer_count: number
  report_count: number
}

type InvestorResponse = {
  layers: unknown[]
  minerals: Mineral[]
}

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
      <p className="text-xs font-semibold uppercase tracking-wide text-app-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-app-text">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-app-text-muted">{hint}</p>}
      {link && linkLabel && (
        <Link
          to={link}
          className="mt-2 inline-block text-xs text-terra-600 hover:underline dark:text-terra-400"
        >
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

  const { data: investor } = useQuery<InvestorResponse>({
    queryKey: ['investor'],
    queryFn: () => analyticsApi.investor().then((r) => r.data),
  })

  const { data: hotspots } = useQuery({
    queryKey: ['hotspots'],
    queryFn: () => analyticsApi.hotspots().then((r) => r.data),
  })

  const regions = (hotspots?.hotspots ?? []) as {
    region: string
    feature_count: number
  }[]

  const topRegion = regions[0]
  const mappedLayerCount = investor?.layers.length ?? 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-app-text">Overview</h1>
        <p className="mt-1 text-sm text-app-muted">
          {isAdmin
            ? 'Platform health, revenue, and geological data at a glance.'
            : 'Your assigned minerals, layers, and map coverage.'}
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isAdmin && (
          <>
            <StatCard
              label="Total revenue"
              value={`${Number(
                revenue?.total_revenue ?? 0,
              ).toLocaleString()} TZS`}
              link="/admin/revenue"
              linkLabel="View revenue →"
            />

            <StatCard
              label="Users"
              value={users?.count ?? 0}
              link="/admin/users"
              linkLabel="Manage users →"
            />
          </>
        )}

        <StatCard
          label="Mapped layers"
          value={mappedLayerCount}
          link="/admin/coverage"
          linkLabel="View coverage →"
        />

        <StatCard
          label="Top region"
          value={topRegion?.region ?? '-'}
          hint={
            topRegion
              ? `${topRegion.feature_count} mapped zones`
              : 'No mapped data yet. Upload layers in Admin'
          }
        />
      </div>

      {isAdmin && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/admin/analytics"
            className="rounded-xl bg-app-surface p-4 transition-colors hover:bg-app-subtle"
          >
            <p className="text-sm font-medium text-app-text">Business analytics</p>
            <p className="mt-1 text-xs text-app-muted">Users, revenue, subscriptions</p>
          </Link>
          <Link
            to="/admin/mineral-analytics"
            className="rounded-xl bg-app-surface p-4 transition-colors hover:bg-app-subtle"
          >
            <p className="text-sm font-medium text-app-text">Mineral analytics</p>
            <p className="mt-1 text-xs text-app-muted">Commodity coverage & exploration interest</p>
          </Link>
          <Link
            to="/admin/user-activity"
            className="rounded-xl bg-app-surface p-4 transition-colors hover:bg-app-subtle"
          >
            <p className="text-sm font-medium text-app-text">User activity</p>
            <p className="mt-1 text-xs text-app-muted">Searches, explorations, Ask Terra usage</p>
          </Link>
        </div>
      )}

      {isAdmin && (
        <div className="mb-8 rounded-xl bg-app-surface p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-app-text">Map settings</h2>
              <p className="mt-0.5 text-sm text-app-muted">
                Coordinate reference system (Arc 1960, UTM zones, WGS 84) for the public map.
              </p>
            </div>
            <Link
              to="/admin/map-settings"
              className="shrink-0 rounded-lg bg-terra-500/10 px-4 py-2 text-sm font-medium text-terra-600 transition-colors hover:bg-terra-500/15 dark:text-terra-400"
            >
              Change CRS →
            </Link>
          </div>
        </div>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/admin/layers"
          className="rounded-xl bg-app-surface p-4 transition-colors hover:bg-app-subtle"
        >
          <p className="text-sm font-medium text-app-text">Manage layers</p>
          <p className="mt-1 text-xs text-app-muted">
            Upload shapefiles and configure map layers
          </p>
        </Link>

        <Link
          to="/admin/reports"
          className="rounded-xl bg-app-surface p-4 transition-colors hover:bg-app-subtle"
        >
          <p className="text-sm font-medium text-app-text">
            Write & upload reports
          </p>
          <p className="mt-1 text-xs text-app-muted">
            Draft with the assistant or attach PDF / Word documents
          </p>
        </Link>

        <Link
          to="/admin/coordinates"
          className="rounded-xl bg-app-surface p-4 transition-colors hover:bg-app-subtle"
        >
          <p className="text-sm font-medium text-app-text">
            Edit coordinates
          </p>
          <p className="mt-1 text-xs text-app-muted">
            Adjust prospect zone geometry
          </p>
        </Link>
      </div>

      {investor?.minerals?.some((m) => m.layer_count > 0) && (
        <div className="rounded-xl bg-app-surface p-5">
          <h2 className="mb-4 font-semibold text-app-text">
            Mapped minerals
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            {investor.minerals
              .filter((m) => m.layer_count > 0)
              .map((m) => (
                <div
                  key={m.slug}
                  className="flex items-center gap-3 py-2"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: m.color }}
                  />

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-app-text">
                      {displayName(m)}
                    </p>

                    <p className="text-xs text-app-muted">
                      {m.layer_count} mapped layer
                      {m.layer_count !== 1 ? 's' : ''} ·{' '}
                      {m.report_count} report
                      {m.report_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}