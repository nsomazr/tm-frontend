import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { analyticsApi } from '../../api'
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
  return (
    <tr className="border-b border-app-border/40 last:border-0 hover:bg-app-subtle/50">
      <td className="px-4 py-3 text-sm tabular-nums text-app-text-muted">#{row.rank}</td>
      <td className="px-4 py-3 min-w-[10rem]">
        <p className="font-medium text-app-text">{displayName}</p>
        <p className="text-xs text-app-text-muted">{row.email}</p>
        {!row.is_active && (
          <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            Inactive
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm">
        <p className="text-app-text">{row.assigned_minerals} commodities</p>
        <p className="text-xs text-app-text-muted mt-0.5 line-clamp-2" title={row.mineral_names.join(', ')}>
          {row.mineral_names.join(', ') || '-'}
        </p>
        {row.can_publish && (
          <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
            Can publish
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm tabular-nums text-center">{fmt(row.features.points)}</td>
      <td className="px-4 py-3 text-sm tabular-nums text-center">{fmt(row.features.lines)}</td>
      <td className="px-4 py-3 text-sm tabular-nums text-center">{fmt(row.features.polygons)}</td>
      <td className="px-4 py-3 text-sm tabular-nums text-center font-medium">{fmt(row.features.total)}</td>
      <td className="px-4 py-3 text-sm tabular-nums text-center text-app-text-muted">
        {fmt(row.features.recent_30d)}
      </td>
      <td className="px-4 py-3 text-sm tabular-nums text-center">
        <span className="text-app-text">{fmt(row.uploads.completed)}</span>
        {row.uploads.failed > 0 && (
          <span className="block text-xs text-red-500">{row.uploads.failed} failed</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm tabular-nums text-center">{fmt(row.layers_managed)}</td>
      <td className="px-4 py-3 text-sm tabular-nums text-center">{fmt(row.reports_published)}</td>
      <td className="px-4 py-3 text-sm text-app-text-muted whitespace-nowrap">
        {fmtDate(row.last_activity)}
      </td>
      <td className="px-4 py-3 text-sm tabular-nums text-right font-semibold text-terra-700 dark:text-terra-300">
        {fmt(row.contribution_score)}
      </td>
    </tr>
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
        acc.points += row.features.points
        acc.lines += row.features.lines
        acc.polygons += row.features.polygons
        acc.uploads += row.uploads.completed
        acc.recent += row.features.recent_30d
        return acc
      },
      { points: 0, lines: 0, polygons: 0, uploads: 0, recent: 0 }
    )
    return { count: managers.length, ...totals }
  }, [data])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-app-text">Manager performance</h1>
          <p className="text-app-muted text-sm mt-1 max-w-2xl">
            Review mineral managers by features added (points, structures, polygons), layer uploads,
            layers managed, and recent activity. Scores weight polygons and uploads more heavily.
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard label="Managers" value={fmt(summary.count)} />
            <KpiCard label="Points added" value={fmt(summary.points)} hint="Personally created features" />
            <KpiCard label="Structures added" value={fmt(summary.lines)} hint="Line features" />
            <KpiCard label="Polygons added" value={fmt(summary.polygons)} />
            <KpiCard
              label="Features (30d)"
              value={fmt(summary.recent)}
              hint={`${fmt(summary.uploads)} completed uploads total`}
            />
          </div>

          <section className="rounded-xl border border-app-border bg-app-surface overflow-hidden">
            <div className="px-5 py-4 border-b app-divider flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold text-app-text">Leaderboard</h2>
                <p className="text-xs text-app-text-muted mt-0.5">
                  Updated {fmtDate(data.generated_at)}
                </p>
              </div>
              <p className="text-xs text-app-text-muted max-w-md">
                Personal counts track features a manager created after this update. Layer totals on
                managed commodities appear in scope columns on the API.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[72rem] text-left">
                <thead>
                  <tr className="border-b app-divider text-xs font-semibold uppercase tracking-wide text-app-muted">
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Manager</th>
                    <th className="px-4 py-3">Commodities</th>
                    <th className="px-4 py-3 text-center">Points</th>
                    <th className="px-4 py-3 text-center">Structures</th>
                    <th className="px-4 py-3 text-center">Polygons</th>
                    <th className="px-4 py-3 text-center">Total</th>
                    <th className="px-4 py-3 text-center">30d</th>
                    <th className="px-4 py-3 text-center">Uploads</th>
                    <th className="px-4 py-3 text-center">Layers</th>
                    <th className="px-4 py-3 text-center">Reports</th>
                    <th className="px-4 py-3">Last active</th>
                    <th className="px-4 py-3 text-right">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {data.managers.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="px-4 py-10 text-center text-sm text-app-text-muted">
                        No mineral managers yet.{' '}
                        <Link to="/admin/managers" className="text-terra-600 hover:underline">
                          Assign managers
                        </Link>
                      </td>
                    </tr>
                  ) : (
                    data.managers.map((row) => <ManagerRow key={row.user_id} row={row} />)
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
