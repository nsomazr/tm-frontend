import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import {
  ConversionFunnelChart,
  DonutChart,
  VerticalBarChart,
} from '../../components/analytics/Charts'
import { fmt as chartFmt } from '../../components/analytics/chartTheme'
import { analyticsApi } from '../../api'
import type { AdminPlatformAnalytics } from '../../types'

function fmt(n: number) {
  return Number(n).toLocaleString()
}

function fmtPct(n: number) {
  return `${n.toFixed(1)}%`
}

function KpiCard({
  label,
  value,
  hint,
  compact,
}: {
  label: string
  value: string
  hint?: string
  compact?: boolean
}) {
  return (
    <div className={`rounded-xl bg-app-surface ${compact ? 'p-3.5' : 'p-5'}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-app-muted">{label}</p>
      <p className={`font-bold text-app-text mt-1 tabular-nums ${compact ? 'text-lg' : 'text-2xl'}`}>{value}</p>
      {hint && <p className="text-xs text-app-text-muted mt-1">{hint}</p>}
    </div>
  )
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl bg-app-surface overflow-hidden">
      <div className="px-5 py-4 border-b app-divider">
        <h2 className="font-semibold text-app-text">{title}</h2>
        {description && <p className="text-sm text-app-muted mt-0.5">{description}</p>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function MetricHighlight({
  value,
  label,
  tone,
}: {
  value: string
  label: string
  tone: 'emerald' | 'blue' | 'violet'
}) {
  const tones = {
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    blue: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
  }
  return (
    <div className={`rounded-lg px-4 py-3 text-sm ${tones[tone]}`}>
      <p className="font-semibold tabular-nums">{value}</p>
      <p className="text-xs mt-0.5 opacity-80">{label}</p>
    </div>
  )
}

function StatusChip({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'emerald' | 'amber' | 'slate' | 'red'
}) {
  const tones = {
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-800 dark:text-amber-400',
    slate: 'bg-app-subtle text-app-text-secondary',
    red: 'bg-red-500/10 text-red-700 dark:text-red-400',
  }
  return (
    <div className={`rounded-lg px-4 py-3 ${tones[tone]}`}>
      <p className="text-xl font-bold tabular-nums">{fmt(value)}</p>
      <p className="text-xs mt-0.5 opacity-80">{label}</p>
    </div>
  )
}

function BarChart({
  items,
  labelKey,
  valueKey,
  color = '#22c55e',
  layout = 'vertical' as const,
  valueFormatter = chartFmt,
}: {
  items: Record<string, string | number>[]
  labelKey: string
  valueKey: string
  color?: string
  layout?: 'vertical' | 'horizontal'
  valueFormatter?: (value: number) => string
}) {
  const data = items.map((item) => ({
    name: String(item[labelKey]).replace(/_/g, ' '),
    value: Number(item[valueKey]) || 0,
  }))
  return <VerticalBarChart data={data} color={color} layout={layout} valueFormatter={valueFormatter} />
}

function FunnelSection({ data }: { data: AdminPlatformAnalytics }) {
  const funnelData = [
    { name: 'Free users', value: data.conversions.free_users, color: '#64748b' },
    { name: 'Paying subscribers', value: data.conversions.paying_subscribers, color: '#22c55e' },
    { name: 'Active subs', value: data.subscriptions.active, color: '#3b82f6' },
    { name: 'Checkout success', value: data.orders.completed, color: '#8b5cf6' },
  ]

  return <ConversionFunnelChart data={funnelData} height={280} />
}

function PlatformAnalytics({ data }: { data: AdminPlatformAnalytics }) {
  const roleChart = data.users.by_role.map((r) => ({
    role: r.role,
    count: r.count,
  }))

  const revenueChart = data.revenue.monthly_trend.map((m) => ({
    month: m.month,
    total: m.total,
  }))

  const signupChart = data.users.signup_trend.map((m) => ({
    month: m.month,
    count: m.count,
  }))

  return (
    <div className="space-y-8">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total users" value={fmt(data.users.total)} hint={`+${data.users.new_30d} last 30 days`} />
        <KpiCard
          label="Active subscriptions"
          value={fmt(data.subscriptions.active)}
          hint={data.subscriptions.expiring_soon > 0 ? `${data.subscriptions.expiring_soon} expiring soon` : undefined}
        />
        <KpiCard
          label="Total revenue"
          value={`${fmt(data.revenue.total)} TZS`}
          hint={`${fmt(data.revenue.last_30_days)} TZS last 30d`}
        />
        <KpiCard
          label="Checkout success"
          value={fmtPct(data.conversions.checkout_success_rate)}
          hint={`${data.orders.completed} of ${data.orders.total} orders`}
        />
      </div>

      <Section title="Conversion funnel" description="From free users to paying subscribers and successful checkouts.">
        <div className="grid lg:grid-cols-2 gap-6 items-start">
          <div>
            <p className="text-xs font-medium text-app-muted mb-3 uppercase tracking-wide">Funnel stages</p>
            <FunnelSection data={data} />
          </div>
          <div>
            <p className="text-xs font-medium text-app-muted mb-3 uppercase tracking-wide">Key conversion rates</p>
            <div className="grid gap-4 text-sm">
              <MetricHighlight
                value={fmtPct(data.conversions.subscriber_rate)}
                label="Free → subscriber conversion"
                tone="emerald"
              />
              <MetricHighlight
                value={fmtPct(data.conversions.subscription_checkout_rate)}
                label="Subscription checkout completion"
                tone="blue"
              />
              <MetricHighlight
                value={`${fmt(data.subscriptions.mrr_estimate)} TZS`}
                label="Estimated monthly recurring revenue"
                tone="violet"
              />
            </div>
          </div>
        </div>
      </Section>

      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="Users & growth" description="Registrations and role distribution.">
          {signupChart.length > 0 ? (
            <div className="mb-6">
              <p className="text-xs font-medium text-app-muted mb-3 uppercase tracking-wide">Signups by month</p>
              <BarChart items={signupChart} labelKey="month" valueKey="count" color="#3b82f6" />
            </div>
          ) : (
            <p className="text-sm text-app-muted mb-4">No signup history yet.</p>
          )}
          <p className="text-xs font-medium text-app-muted mb-3 uppercase tracking-wide">By role</p>
          {roleChart.length > 0 ? (
            <DonutChart
              data={roleChart.map((r) => ({
                name: r.role.replace(/_/g, ' '),
                value: r.count,
              }))}
              height={260}
            />
          ) : (
            <p className="text-sm text-app-muted">No role data yet.</p>
          )}
          {data.users.recent.length > 0 && (
            <div className="mt-6 pt-4 border-t app-divider">
              <p className="text-xs font-medium text-app-muted mb-3 uppercase tracking-wide">Recent signups</p>
              <ul className="space-y-2">
                {data.users.recent.map((u) => (
                  <li key={u.username} className="flex justify-between text-sm gap-2">
                    <span className="truncate">
                      <span className="font-medium text-app-text">{u.username}</span>
                      {u.organization && <span className="text-app-text-muted ml-1">· {u.organization}</span>}
                    </span>
                    <span className="text-app-text-muted shrink-0 capitalize">{u.role.replace(/_/g, ' ')}</span>
                  </li>
                ))}
              </ul>
              <Link to="/admin/users" className="inline-block mt-3 text-sm text-terra-600 dark:text-terra-400 hover:underline">
                Manage all users →
              </Link>
            </div>
          )}
        </Section>

        <Section title="Revenue" description="Completed payments and trends.">
          {revenueChart.length > 0 ? (
            <div className="mb-6">
              <p className="text-xs font-medium text-app-muted mb-3 uppercase tracking-wide">Monthly revenue (TZS)</p>
              <BarChart
                items={revenueChart}
                labelKey="month"
                valueKey="total"
                color="#22c55e"
                valueFormatter={(v) => `${chartFmt(v)} TZS`}
              />
            </div>
          ) : (
            <p className="text-sm text-app-muted mb-4">No revenue recorded yet.</p>
          )}
          <p className="text-xs font-medium text-app-muted mb-3 uppercase tracking-wide">By order type</p>
          {data.revenue.by_type.length > 0 ? (
            <DonutChart
              data={data.revenue.by_type.map((row) => ({
                name: row.order_type.replace(/_/g, ' '),
                value: row.total,
              }))}
              height={240}
            />
          ) : (
            <p className="text-sm text-app-muted">No revenue breakdown yet.</p>
          )}
          <Link to="/admin/revenue" className="inline-block mt-4 text-sm text-terra-600 dark:text-terra-400 hover:underline">
            Full revenue details →
          </Link>
        </Section>
      </div>

      <Section title="Subscriptions" description="Plan mix and subscription health.">
        <div className="grid lg:grid-cols-2 gap-6 items-start mb-5">
          <div>
            <p className="text-xs font-medium text-app-muted mb-3 uppercase tracking-wide">Status breakdown</p>
            <DonutChart
              data={[
                { name: 'Active', value: data.subscriptions.active, color: '#22c55e' },
                { name: 'Pending', value: data.subscriptions.pending, color: '#f59e0b' },
                { name: 'Expired', value: data.subscriptions.expired, color: '#64748b' },
                { name: 'Cancelled', value: data.subscriptions.cancelled, color: '#ef4444' },
              ].filter((item) => item.value > 0)}
              height={260}
            />
          </div>
          {data.subscriptions.by_plan.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-app-muted mb-3 uppercase tracking-wide">Active plans</p>
              <BarChart
                items={data.subscriptions.by_plan.map((p) => ({
                  plan: `${p.plan} (${p.billing_cycle})`,
                  count: p.count,
                }))}
                labelKey="plan"
                valueKey="count"
                color="#3b82f6"
                layout="horizontal"
              />
            </div>
          ) : (
            <p className="text-sm text-app-muted">No active plan mix yet.</p>
          )}
        </div>
        <div className="grid sm:grid-cols-4 gap-3">
          <StatusChip label="Active" value={data.subscriptions.active} tone="emerald" />
          <StatusChip label="Pending" value={data.subscriptions.pending} tone="amber" />
          <StatusChip label="Expired" value={data.subscriptions.expired} tone="slate" />
          <StatusChip label="Cancelled" value={data.subscriptions.cancelled} tone="red" />
        </div>
      </Section>

      {(data.geology.layers?.length || data.geology.minerals.length > 0) && (
        <Section title="Geological coverage" description="Prospects, layers, and regional distribution on the map.">
          <div className="grid lg:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium text-app-muted mb-3 uppercase tracking-wide">
                {data.geology.layers?.length ? 'Zones by uploaded layer' : 'Prospects by mineral'}
              </p>
              <DonutChart
                data={
                  data.geology.layers?.length
                    ? data.geology.layers.map((layer) => ({
                        name: layer.name,
                        value: layer.feature_count,
                        color: layer.color,
                      }))
                    : data.geology.minerals.map((m) => ({
                        name: m.name,
                        value: m.feature_count,
                        color: m.color,
                      }))
                }
                height={280}
              />
            </div>
            <div>
              <p className="text-xs font-medium text-app-muted mb-3 uppercase tracking-wide">Top regions</p>
              <BarChart
                items={data.geology.hotspots_by_region.slice(0, 8).map((r) => ({
                  region: r.region,
                  count: r.count,
                }))}
                labelKey="region"
                valueKey="count"
                color="#f59e0b"
                layout="horizontal"
              />
            </div>
          </div>
          {data.geology.layer_by_type.length > 0 && (
            <div className="mt-6 pt-4 border-t app-divider">
              <p className="text-xs font-medium text-app-muted mb-3 uppercase tracking-wide">Layer geometry</p>
              <BarChart
                items={data.geology.layer_by_type.map((l) => ({
                  layer_type: l.layer_type,
                  count: l.count,
                }))}
                labelKey="layer_type"
                valueKey="count"
                color="#8b5cf6"
              />
            </div>
          )}
          <Link
            to="/admin/coverage"
            className="inline-block mt-4 text-sm text-terra-600 dark:text-terra-400 hover:underline"
          >
            Full coverage details →
          </Link>
        </Section>
      )}

      {!data.geology.layers?.length && !data.geology.minerals.length && (
      <section className="rounded-xl bg-app-surface px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold text-app-text text-sm">Geological coverage</h2>
          <p className="text-sm text-app-text-secondary mt-0.5">
            {fmt(data.geology.total_prospects)} prospects · {data.geology.regions_covered} regions · {data.geology.total_layers} layers
          </p>
        </div>
        <Link
          to="/admin/coverage"
          className="shrink-0 text-sm font-medium text-terra-600 dark:text-terra-400 px-4 py-2 rounded-lg bg-app-elevated hover:bg-app-subtle transition-colors"
        >
          View coverage →
        </Link>
      </section>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="Report sales" description="Pay-per-download prospectivity reports.">
          <div className="grid grid-cols-3 gap-3 mb-5">
            <KpiCard compact label="Catalog" value={fmt(data.reports.catalog_size)} />
            <KpiCard compact label="Downloads sold" value={fmt(data.reports.total_downloads)} />
            <KpiCard compact label="Download revenue" value={`${fmt(data.reports.download_revenue)} TZS`} />
          </div>
          {data.reports.top_reports.length > 0 ? (
            <>
              <p className="text-xs font-medium text-app-muted mb-3 uppercase tracking-wide">Top reports by revenue</p>
              <BarChart
                items={data.reports.top_reports.map((r) => ({
                  title: r.title.length > 28 ? `${r.title.slice(0, 28)}…` : r.title,
                  revenue: r.revenue,
                }))}
                labelKey="title"
                valueKey="revenue"
                color="#22c55e"
                layout="horizontal"
                valueFormatter={(v) => `${chartFmt(v)} TZS`}
              />
            </>
          ) : (
            <p className="text-sm text-app-muted">No report purchases yet.</p>
          )}
          <Link to="/admin/reports" className="inline-block mt-3 text-sm text-terra-600 dark:text-terra-400 hover:underline">
            Manage reports →
          </Link>
        </Section>

        <Section title="B2B licenses" description="Enterprise license agreements and pipeline.">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <KpiCard compact label="Total agreements" value={fmt(data.licenses.total)} />
            <KpiCard compact label="Active licenses" value={fmt(data.licenses.active)} />
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-amber-700 dark:text-amber-400">{data.licenses.pending} pending / draft</span>
            <span className="text-blue-700 dark:text-blue-400">{data.licenses.approved} approved</span>
          </div>
          <Link to="/admin/compliance" className="inline-block mt-4 text-sm text-terra-600 dark:text-terra-400 hover:underline">
            Compliance & licenses →
          </Link>
        </Section>
      </div>

      <p className="text-xs text-app-text-muted text-center">
        Snapshot generated {new Date(data.generated_at).toLocaleString()}
      </p>
    </div>
  )
}

export default function AdminAnalyticsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-platform-analytics'],
    queryFn: () => analyticsApi.adminPlatform().then((r) => r.data),
    retry: 1,
  })

  const errorDetail =
    error && typeof error === 'object' && error !== null && 'response' in error
      ? (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail
      : null

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-app-text">Platform analytics</h1>
        <p className="text-app-muted text-sm mt-1">
          Users, conversions, revenue, subscriptions, and commercial performance.
        </p>
      </div>

      {isLoading && <p className="text-sm text-app-muted">Loading analytics…</p>}
      {error && (
        <p className="text-sm text-red-500">
          Could not load analytics.
          {typeof errorDetail === 'string' ? ` ${errorDetail}` : ''}
        </p>
      )}
      {data && <PlatformAnalytics data={data} />}
    </div>
  )
}
