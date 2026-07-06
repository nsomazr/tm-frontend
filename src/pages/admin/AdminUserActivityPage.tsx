import { useQuery } from '@tanstack/react-query'
import { DonutChart, VerticalBarChart } from '../../components/analytics/Charts'
import { fmt } from '../../components/analytics/chartTheme'
import { analyticsApi } from '../../api'
import type { AdminUserActivityAnalytics } from '../../types'

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-app-border bg-app-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-app-muted">{label}</p>
      <p className="font-bold text-app-text mt-1 tabular-nums text-2xl">{value}</p>
      {hint && <p className="text-xs text-app-text-muted mt-1">{hint}</p>}
    </div>
  )
}

function kindLabel(kind: string) {
  return kind.replace(/_/g, ' ')
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString()
}

function UserActivity({ data }: { data: AdminUserActivityAnalytics }) {
  const { summary } = data
  const exploredChart = data.explored_minerals_30d.map((row) => ({
    name: row.mineral_slug,
    value: row.explorations,
  }))
  const assistantChart = data.assistant_by_kind.map((row) => ({
    name: kindLabel(row.kind),
    value: row.credits,
  }))
  const explorationTrend = data.exploration_trend.map((row) => ({
    name: row.month,
    value: row.count,
  }))
  const assistantTrend = data.assistant_trend.map((row) => ({
    name: row.month,
    value: row.count,
  }))

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Mineral explorations"
          value={fmt(summary.explorations_30d)}
          hint={`${summary.unique_explorers_30d} unique users (30d)`}
        />
        <KpiCard
          label="Map insights"
          value={fmt(summary.map_insights_30d)}
          hint="Area searches & map clicks (30d)"
        />
        <KpiCard
          label="Ask Terra chats"
          value={fmt(summary.assistant_chats_30d)}
          hint={`${summary.active_assistant_users_30d} active users`}
        />
        <KpiCard
          label="Terra credits used"
          value={fmt(summary.assistant_credits_30d)}
          hint={`${summary.report_exports_30d} report exports`}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-app-border bg-app-surface p-5">
          <h2 className="font-semibold text-app-text mb-1">Explored minerals (30d)</h2>
          <p className="text-sm text-app-text-muted mb-4">
            Commodities users opened for deep coverage or heatmap views.
          </p>
          {exploredChart.length > 0 ? (
            <VerticalBarChart data={exploredChart} color="#22c55e" layout="horizontal" />
          ) : (
            <p className="text-sm text-app-text-muted">No mineral explorations in the last 30 days.</p>
          )}
        </section>

        <section className="rounded-xl border border-app-border bg-app-surface p-5">
          <h2 className="font-semibold text-app-text mb-1">Assistant usage (30d)</h2>
          <p className="text-sm text-app-text-muted mb-4">
            Map insights, chat messages, and exported reports by credit type.
          </p>
          {assistantChart.length > 0 ? (
            <DonutChart data={assistantChart} height={260} />
          ) : (
            <p className="text-sm text-app-text-muted">No assistant activity in the last 30 days.</p>
          )}
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-app-border bg-app-surface p-5">
          <h2 className="font-semibold text-app-text mb-1">Exploration trend</h2>
          <p className="text-sm text-app-text-muted mb-4">Monthly mineral deep-explore events.</p>
          {explorationTrend.length > 0 ? (
            <VerticalBarChart data={explorationTrend} color="#3b82f6" />
          ) : (
            <p className="text-sm text-app-text-muted">No exploration history yet.</p>
          )}
        </section>

        <section className="rounded-xl border border-app-border bg-app-surface p-5">
          <h2 className="font-semibold text-app-text mb-1">Assistant activity trend</h2>
          <p className="text-sm text-app-text-muted mb-4">Monthly Terra assistant usage events.</p>
          {assistantTrend.length > 0 ? (
            <VerticalBarChart data={assistantTrend} color="#8b5cf6" />
          ) : (
            <p className="text-sm text-app-text-muted">No assistant usage history yet.</p>
          )}
        </section>
      </div>

      {data.top_active_users.length > 0 && (
        <section className="rounded-xl border border-app-border bg-app-surface p-5">
          <h2 className="font-semibold text-app-text mb-1">Most active users (30d)</h2>
          <p className="text-sm text-app-text-muted mb-4">
            Combined exploration and assistant credit activity.
          </p>
          <ul className="space-y-2">
            {data.top_active_users.map((user, index) => (
              <li key={user.user_id} className="flex items-center justify-between text-sm gap-3">
                <span className="text-app-text-muted w-6">#{index + 1}</span>
                <span className="font-medium text-app-text flex-1 truncate">{user.username}</span>
                <span className="tabular-nums text-app-text-muted">{fmt(user.activity_score)} pts</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-app-border bg-app-surface overflow-hidden">
          <div className="px-5 py-4 border-b app-divider">
            <h2 className="font-semibold text-app-text">Recent explorations</h2>
            <p className="text-sm text-app-text-muted mt-0.5">Latest mineral deep-explore events.</p>
          </div>
          {data.recent_explorations.length === 0 ? (
            <p className="px-5 py-8 text-sm text-app-text-muted">No explorations logged yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>User</th>
                    <th>Mineral</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_explorations.map((row, index) => (
                    <tr key={`${row.created_at}-${index}`}>
                      <td className="text-app-text-muted whitespace-nowrap">{formatWhen(row.created_at)}</td>
                      <td>{row.username}</td>
                      <td className="capitalize">{row.mineral_slug.replace(/-/g, ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-app-border bg-app-surface overflow-hidden">
          <div className="px-5 py-4 border-b app-divider">
            <h2 className="font-semibold text-app-text">Recent assistant usage</h2>
            <p className="text-sm text-app-text-muted mt-0.5">Map insights, chats, and exports.</p>
          </div>
          {data.recent_assistant_usage.length === 0 ? (
            <p className="px-5 py-8 text-sm text-app-text-muted">No assistant usage logged yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>User</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_assistant_usage.map((row, index) => (
                    <tr key={`${row.created_at}-${index}`}>
                      <td className="text-app-text-muted whitespace-nowrap">{formatWhen(row.created_at)}</td>
                      <td>{row.username}</td>
                      <td className="capitalize">
                        {kindLabel(row.kind)}
                        {row.credits > 1 ? ` (${row.credits} credits)` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <p className="text-xs text-app-text-muted">
        Map insight events include area searches and location-based analysis on the public map.
        Exploration logs track when users open mineral coverage or heatmap views.
      </p>
    </div>
  )
}

export default function AdminUserActivityPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-user-activity'],
    queryFn: () => analyticsApi.adminUserActivity().then((r) => r.data),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-app-text">User activity</h1>
        <p className="text-sm text-app-muted mt-1 max-w-2xl">
          How users explore minerals, search the map, and use Ask Terra, to guide product and
          business decisions.
        </p>
      </div>

      {isLoading && <p className="text-sm text-app-text-muted">Loading user activity…</p>}
      {isError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">Could not load user activity.</p>
          <button type="button" onClick={() => refetch()} className="btn-secondary text-sm mt-3">
            Retry
          </button>
        </div>
      )}
      {data && <UserActivity data={data} />}
    </div>
  )
}
