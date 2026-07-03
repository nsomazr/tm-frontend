import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { analyticsApi } from '../../api'
import type { AdminPlatformAnalytics } from '../../types'

function fmt(n: number) {
  return Number(n).toLocaleString()
}

function fmtPct(n: number) {
  return `${n.toFixed(1)}%`
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{value}</p>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  )
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function BarChart({
  items,
  labelKey,
  valueKey,
  color = 'bg-terra-500',
}: {
  items: Record<string, string | number>[]
  labelKey: string
  valueKey: string
  color?: string
}) {
  const max = Math.max(...items.map((i) => Number(i[valueKey]) || 0), 1)
  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const val = Number(item[valueKey]) || 0
        const pct = (val / max) * 100
        return (
          <div key={i}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-700 capitalize truncate pr-2">{String(item[labelKey]).replace(/_/g, ' ')}</span>
              <span className="font-medium tabular-nums text-slate-900 shrink-0">{fmt(val)}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function FunnelStep({ label, value, rate }: { label: string; value: number; rate?: string }) {
  return (
    <div className="flex-1 min-w-[120px] rounded-lg bg-slate-50 border border-slate-100 px-4 py-3 text-center">
      <p className="text-2xl font-bold text-slate-900 tabular-nums">{fmt(value)}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
      {rate && <p className="text-xs font-medium text-terra-600 mt-1">{rate}</p>}
    </div>
  )
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
      {/* KPI row */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total users" value={fmt(data.users.total)} hint={`+${data.users.new_30d} last 30 days`} />
        <KpiCard
          label="Active subscriptions"
          value={fmt(data.subscriptions.active)}
          hint={data.subscriptions.expiring_soon > 0 ? `${data.subscriptions.expiring_soon} expiring soon` : undefined}
        />
        <KpiCard label="Total revenue" value={`${fmt(data.revenue.total)} TZS`} hint={`${fmt(data.revenue.last_30_days)} TZS last 30d`} />
        <KpiCard
          label="Checkout success"
          value={fmtPct(data.conversions.checkout_success_rate)}
          hint={`${data.orders.completed} of ${data.orders.total} orders`}
        />
      </div>

      {/* Conversions */}
      <Section title="Conversion funnel" description="From free users to paying subscribers and successful checkouts.">
        <div className="flex flex-wrap gap-3 mb-6">
          <FunnelStep label="Free users" value={data.conversions.free_users} />
          <FunnelStep
            label="Paying subscribers"
            value={data.conversions.paying_subscribers}
            rate={fmtPct(data.conversions.subscriber_rate) + ' of free+paid'}
          />
          <FunnelStep label="Active subs" value={data.subscriptions.active} />
          <FunnelStep
            label="Checkout success"
            value={data.orders.completed}
            rate={fmtPct(data.conversions.checkout_success_rate) + ' of orders'}
          />
        </div>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div className="rounded-lg bg-emerald-50 px-4 py-3">
            <p className="text-emerald-800 font-semibold tabular-nums">{fmtPct(data.conversions.subscriber_rate)}</p>
            <p className="text-emerald-700/80 text-xs mt-0.5">Free → subscriber conversion</p>
          </div>
          <div className="rounded-lg bg-blue-50 px-4 py-3">
            <p className="text-blue-800 font-semibold tabular-nums">{fmtPct(data.conversions.subscription_checkout_rate)}</p>
            <p className="text-blue-700/80 text-xs mt-0.5">Subscription checkout completion</p>
          </div>
          <div className="rounded-lg bg-violet-50 px-4 py-3">
            <p className="text-violet-800 font-semibold tabular-nums">{fmt(data.subscriptions.mrr_estimate)} TZS</p>
            <p className="text-violet-700/80 text-xs mt-0.5">Estimated monthly recurring revenue</p>
          </div>
        </div>
      </Section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Users */}
        <Section title="Users & growth" description="Registrations and role distribution.">
          {signupChart.length > 0 ? (
            <div className="mb-6">
              <p className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wide">Signups by month</p>
              <BarChart items={signupChart} labelKey="month" valueKey="count" color="bg-blue-500" />
            </div>
          ) : (
            <p className="text-sm text-slate-500 mb-4">No signup history yet.</p>
          )}
          <p className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wide">By role</p>
          <BarChart items={roleChart} labelKey="role" valueKey="count" color="bg-slate-600" />
          {data.users.recent.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wide">Recent signups</p>
              <ul className="space-y-2">
                {data.users.recent.map((u) => (
                  <li key={u.username} className="flex justify-between text-sm gap-2">
                    <span className="truncate">
                      <span className="font-medium text-slate-800">{u.username}</span>
                      {u.organization && <span className="text-slate-400 ml-1">· {u.organization}</span>}
                    </span>
                    <span className="text-slate-400 shrink-0 capitalize">{u.role.replace(/_/g, ' ')}</span>
                  </li>
                ))}
              </ul>
              <Link to="/admin/users" className="inline-block mt-3 text-sm text-terra-600 hover:underline">
                Manage all users →
              </Link>
            </div>
          )}
        </Section>

        {/* Revenue */}
        <Section title="Revenue" description="Completed payments and trends.">
          {revenueChart.length > 0 ? (
            <div className="mb-6">
              <p className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wide">Monthly revenue (TZS)</p>
              <BarChart items={revenueChart} labelKey="month" valueKey="total" color="bg-emerald-500" />
            </div>
          ) : (
            <p className="text-sm text-slate-500 mb-4">No revenue recorded yet.</p>
          )}
          <p className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wide">By order type</p>
          <div className="space-y-2">
            {data.revenue.by_type.map((row) => (
              <div key={row.order_type} className="flex justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                <span className="capitalize text-slate-700">{row.order_type}</span>
                <span className="font-medium tabular-nums">{fmt(row.total)} TZS <span className="text-slate-400 font-normal">({row.count})</span></span>
              </div>
            ))}
          </div>
          <Link to="/admin/revenue" className="inline-block mt-4 text-sm text-terra-600 hover:underline">
            Full revenue details →
          </Link>
        </Section>
      </div>

      {/* Subscriptions */}
      <Section title="Subscriptions" description="Plan mix and subscription health.">
        <div className="grid sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Active', value: data.subscriptions.active, color: 'text-emerald-700 bg-emerald-50' },
            { label: 'Pending', value: data.subscriptions.pending, color: 'text-amber-700 bg-amber-50' },
            { label: 'Expired', value: data.subscriptions.expired, color: 'text-slate-600 bg-slate-50' },
            { label: 'Cancelled', value: data.subscriptions.cancelled, color: 'text-red-700 bg-red-50' },
          ].map((s) => (
            <div key={s.label} className={`rounded-lg px-4 py-3 ${s.color}`}>
              <p className="text-xl font-bold tabular-nums">{fmt(s.value)}</p>
              <p className="text-xs mt-0.5 opacity-80">{s.label}</p>
            </div>
          ))}
        </div>
        {data.subscriptions.by_plan.length > 0 && (
          <>
            <p className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wide">Active plans</p>
            <ul className="divide-y divide-slate-100">
              {data.subscriptions.by_plan.map((p) => (
                <li key={p.plan} className="flex justify-between py-2 text-sm">
                  <span className="text-slate-800">{p.plan} <span className="text-slate-400 capitalize">({p.billing_cycle})</span></span>
                  <span className="font-medium tabular-nums">{p.count}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>

      {/* Geology lives under Map & geology → Coverage for managers and admins */}
      <section className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold text-slate-900 text-sm">Geological coverage</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {fmt(data.geology.total_prospects)} prospects · {data.geology.regions_covered} regions · {data.geology.total_layers} layers
          </p>
        </div>
        <Link
          to="/admin/coverage"
          className="shrink-0 text-sm font-medium text-terra-600 hover:text-terra-700 px-4 py-2 rounded-lg bg-white border border-slate-200 hover:border-terra-300"
        >
          View coverage →
        </Link>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Reports */}
        <Section title="Report sales" description="Pay-per-download prospectivity reports.">
          <div className="grid grid-cols-3 gap-3 mb-5">
            <KpiCard label="Catalog" value={fmt(data.reports.catalog_size)} />
            <KpiCard label="Downloads sold" value={fmt(data.reports.total_downloads)} />
            <KpiCard label="Download revenue" value={`${fmt(data.reports.download_revenue)} TZS`} />
          </div>
          {data.reports.top_reports.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {data.reports.top_reports.map((r) => (
                <li key={r.id} className="flex justify-between py-2 text-sm gap-2">
                  <span className="text-slate-800 truncate">{r.title}</span>
                  <span className="shrink-0 tabular-nums text-slate-600">{r.purchases} · {fmt(r.revenue)} TZS</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No report purchases yet.</p>
          )}
          <Link to="/admin/reports" className="inline-block mt-3 text-sm text-terra-600 hover:underline">
            Manage reports →
          </Link>
        </Section>

        {/* B2B */}
        <Section title="B2B licenses" description="Enterprise license agreements and pipeline.">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <KpiCard label="Total agreements" value={fmt(data.licenses.total)} />
            <KpiCard label="Active licenses" value={fmt(data.licenses.active)} />
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-amber-700">{data.licenses.pending} pending / draft</span>
            <span className="text-blue-700">{data.licenses.approved} approved</span>
          </div>
          <Link to="/admin/compliance" className="inline-block mt-4 text-sm text-terra-600 hover:underline">
            Compliance & licenses →
          </Link>
        </Section>
      </div>

      <p className="text-xs text-slate-400 text-center">
        Snapshot generated {new Date(data.generated_at).toLocaleString()}
      </p>
    </div>
  )
}

export default function AdminAnalyticsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-platform-analytics'],
    queryFn: () => analyticsApi.adminPlatform().then((r) => r.data),
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Platform analytics</h1>
        <p className="text-slate-500 text-sm mt-1">
          Users, conversions, revenue, subscriptions, and commercial performance.
        </p>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading analytics…</p>}
      {error && <p className="text-sm text-red-600">Could not load analytics.</p>}
      {data && <PlatformAnalytics data={data} />}
    </div>
  )
}
