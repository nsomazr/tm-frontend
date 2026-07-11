import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { DonutChart, VerticalBarChart } from '../../components/analytics/Charts'
import { fmt } from '../../components/analytics/chartTheme'
import { analyticsApi } from '../../api'
import ActionMenu, { ActionMenuItem } from '../../components/ui/ActionMenu'
import ListPagination from '../../components/ui/ListPagination'
import { usePagination } from '../../hooks/usePagination'
import type { AdminUserActivityAnalytics } from '../../types'

const ACTIVITY_LOG_PAGE_SIZE = 5

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
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function usersHref(username: string) {
  return `/admin/users?q=${encodeURIComponent(username)}`
}

function assistantActionHref(kind: string): { to: string; label: string } {
  const key = kind.toLowerCase()
  if (key.includes('export') || key.includes('report')) {
    return { to: '/admin/reports', label: 'Open reports' }
  }
  if (key.includes('map') || key.includes('insight') || key.includes('chat') || key.includes('area')) {
    return { to: '/', label: 'Open map' }
  }
  return { to: '/admin/user-activity', label: 'Activity overview' }
}

function PaginatedActivityTable<T>({
  title,
  subtitle,
  emptyMessage,
  items,
  columns,
  rowKey,
  renderRow,
}: {
  title: string
  subtitle: string
  emptyMessage: string
  items: T[]
  columns: string[]
  rowKey: (item: T, index: number) => string
  renderRow: (item: T) => ReactNode[]
}) {
  const pagination = usePagination(items, ACTIVITY_LOG_PAGE_SIZE)

  return (
    <section className="rounded-xl border border-app-border bg-app-surface overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b app-divider flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-app-text">{title}</h2>
          <p className="text-xs text-app-text-muted mt-0.5">{subtitle}</p>
        </div>
        {items.length > 0 && (
          <span className="text-[11px] text-app-text-muted tabular-nums shrink-0 pt-0.5">
            {items.length} total
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-6 text-xs text-app-text-muted">{emptyMessage}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="admin-table admin-table--compact w-full">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col} className={col === 'Actions' ? 'text-right' : undefined}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagination.pageItems.map((item, index) => (
                  <tr key={rowKey(item, index)}>{renderRow(item)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <ListPagination
            page={pagination.page}
            pageCount={pagination.pageCount}
            total={pagination.total}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setPage}
            className="px-4 py-2.5 border-t app-divider mt-auto"
          />
        </>
      )}
    </section>
  )
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
                <Link
                  to={usersHref(user.username)}
                  className="text-xs font-medium text-terra-600 dark:text-terra-400 hover:underline shrink-0"
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <PaginatedActivityTable
          title="Recent explorations"
          subtitle="Latest mineral deep-explore events"
          emptyMessage="No explorations logged yet."
          items={data.recent_explorations}
          columns={['When', 'User', 'Mineral', 'Actions']}
          rowKey={(row, index) => `${row.created_at}-${index}`}
          renderRow={(row) => [
            <td key="when" className="text-app-text-muted whitespace-nowrap tabular-nums">
              {formatWhen(row.created_at)}
            </td>,
            <td key="user" className="truncate max-w-[7rem]">
              {row.username}
            </td>,
            <td key="mineral" className="capitalize truncate max-w-[10rem]">
              {row.mineral_slug.replace(/-/g, ' ')}
            </td>,
            <td key="actions" className="text-right">
              <div className="inline-flex justify-end">
                <ActionMenu label={`Actions for ${row.mineral_slug}`} minWidth="11rem">
                  <ActionMenuItem to={`/?mineral=${encodeURIComponent(row.mineral_slug)}`}>
                    View on map
                  </ActionMenuItem>
                  <ActionMenuItem to="/admin/mineral-analytics">Mineral analytics</ActionMenuItem>
                  <ActionMenuItem to={usersHref(row.username)}>Open user</ActionMenuItem>
                </ActionMenu>
              </div>
            </td>,
          ]}
        />

        <PaginatedActivityTable
          title="Recent assistant usage"
          subtitle="Map insights, chats, and exports"
          emptyMessage="No assistant usage logged yet."
          items={data.recent_assistant_usage}
          columns={['When', 'User', 'Event', 'Actions']}
          rowKey={(row, index) => `${row.created_at}-${index}`}
          renderRow={(row) => {
            const dest = assistantActionHref(row.kind)
            return [
              <td key="when" className="text-app-text-muted whitespace-nowrap tabular-nums">
                {formatWhen(row.created_at)}
              </td>,
              <td key="user" className="truncate max-w-[7rem]">
                {row.username}
              </td>,
              <td key="action" className="capitalize truncate max-w-[12rem]">
                {kindLabel(row.kind)}
                {row.credits > 1 ? ` · ${row.credits} cr` : ''}
              </td>,
              <td key="actions" className="text-right">
                <div className="inline-flex justify-end">
                  <ActionMenu label={`Actions for ${row.kind}`} minWidth="11rem">
                    <ActionMenuItem to={dest.to}>{dest.label}</ActionMenuItem>
                    <ActionMenuItem to={usersHref(row.username)}>Open user</ActionMenuItem>
                  </ActionMenu>
                </div>
              </td>,
            ]
          }}
        />
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
        <p className="text-sm text-app-muted mt-0.5">
          Mineral explores, map search, and Ask Terra usage.
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
