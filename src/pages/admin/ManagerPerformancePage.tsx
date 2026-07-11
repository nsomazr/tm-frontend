import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { analyticsApi } from '../../api'
import ActionMenu, { ActionMenuItem } from '../../components/ui/ActionMenu'
import type { ManagerPerformanceRow } from '../../types'

function fmt(n: number) {
  return Number(n).toLocaleString()
}

function fmtDate(iso: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-app-border bg-app-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-app-muted">{label}</p>
      <p className="font-bold text-app-text mt-1 tabular-nums text-2xl">{value}</p>
      {hint && <p className="text-xs text-app-text-muted mt-1">{hint}</p>}
    </div>
  )
}

function ManagerRow({ row }: { row: ManagerPerformanceRow }) {
  const displayName = row.full_name || row.username
  const minerals = row.mineral_names.join(', ') || '-'

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 border-b border-app-border/40 last:border-0 hover:bg-app-subtle/50">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className="w-8 shrink-0 text-sm font-semibold tabular-nums text-app-text-muted pt-0.5">
          #{row.rank}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-app-text">{displayName}</p>
            {!row.is_active && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                Inactive
              </span>
            )}
            {row.can_publish && (
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                Can publish
              </span>
            )}
          </div>
          <p className="text-xs text-app-text-muted mt-0.5 break-all">{row.email}</p>
          <p className="text-xs text-app-text-muted mt-1">
            {row.assigned_minerals} {row.assigned_minerals === 1 ? 'commodity' : 'commodities'}
            {minerals !== '-' && <> · {minerals}</>}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between sm:justify-start gap-4 sm:gap-6 md:gap-8 text-sm pl-11 sm:pl-0">
        <div className="text-center min-w-0 sm:min-w-[4.5rem]">
          <p className="font-medium tabular-nums text-app-text">{fmt(row.features.total)}</p>
          <p className="text-xs text-app-text-muted">Features</p>
        </div>
        <div className="text-center min-w-0 sm:min-w-[4.5rem]">
          <p className="font-medium tabular-nums text-app-text">{fmt(row.uploads.completed)}</p>
          <p className="text-xs text-app-text-muted">
            Uploads{row.uploads.failed > 0 ? ` (${row.uploads.failed} failed)` : ''}
          </p>
        </div>
        <div className="text-center min-w-0 sm:min-w-[4.5rem]">
          <p className="font-semibold tabular-nums text-terra-700 dark:text-terra-300">
            {fmt(row.contribution_score)}
          </p>
          <p className="text-xs text-app-text-muted">Score</p>
        </div>
        <div className="text-center min-w-0 sm:min-w-[5.5rem]">
          <p className="text-app-text-muted whitespace-nowrap">{fmtDate(row.last_activity)}</p>
          <p className="text-xs text-app-text-muted">Last active</p>
        </div>
      </div>

      <div className="shrink-0 self-end sm:self-auto sm:ml-auto pl-11 sm:pl-0">
        <ActionMenu label={`Actions for ${displayName}`} minWidth="11rem">
          <ActionMenuItem to="/admin/managers">Manage assignment</ActionMenuItem>
          <ActionMenuItem to={`/admin/users?q=${encodeURIComponent(row.username)}`}>
            Open user
          </ActionMenuItem>
          <ActionMenuItem to="/admin/layer-activity">Layer activity</ActionMenuItem>
        </ActionMenu>
      </div>
    </div>
  )
}

export default function ManagerPerformancePage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-manager-performance'],
    queryFn: () => analyticsApi.adminManagerPerformance().then((r) => r.data),
  })

  const summary = useMemo(() => {
    const managers = data?.managers ?? []
    const totals = managers.reduce(
      (acc, row) => {
        acc.features += row.features.total
        acc.uploads += row.uploads.completed
        return acc
      },
      { features: 0, uploads: 0 }
    )
    return { count: managers.length, ...totals }
  }, [data])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-app-text">Manager performance</h1>
          <p className="text-app-muted text-sm mt-0.5">
            Features added, uploads, and scores.
          </p>
        </div>
        <Link to="/admin/managers" className="btn-secondary text-sm shrink-0">
          Manage assignments
        </Link>
      </div>

      {isLoading && (
        <p className="text-sm text-app-text-muted py-8 text-center">Loading performance data…</p>
      )}

      {isError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">Could not load manager performance.</p>
          <button type="button" onClick={() => refetch()} className="btn-secondary text-sm mt-3">
            Retry
          </button>
        </div>
      )}

      {data && (
        <>
          <div className="grid sm:grid-cols-3 gap-4">
            <KpiCard label="Managers" value={fmt(summary.count)} />
            <KpiCard label="Features added" value={fmt(summary.features)} hint="Personally created map features" />
            <KpiCard label="Uploads" value={fmt(summary.uploads)} hint="Completed layer imports" />
          </div>

          <section className="rounded-xl border border-app-border bg-app-surface overflow-hidden">
            <div className="px-5 py-4 border-b app-divider">
              <h2 className="font-semibold text-app-text">Leaderboard</h2>
              <p className="text-xs text-app-text-muted mt-0.5">
                Updated {fmtDate(data.generated_at)}
              </p>
            </div>
            {data.managers.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-app-text-muted">
                No mineral managers yet.{' '}
                <Link to="/admin/managers" className="text-terra-600 hover:underline">
                  Assign managers
                </Link>
              </p>
            ) : (
              <div>
                {data.managers.map((row) => (
                  <ManagerRow key={row.user_id} row={row} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
