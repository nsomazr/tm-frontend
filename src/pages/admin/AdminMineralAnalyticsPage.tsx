import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { DonutChart, VerticalBarChart } from '../../components/analytics/Charts'
import { LayerTypeGrid } from '../../components/analytics/AnalyticsViz'
import { fmt } from '../../components/analytics/chartTheme'
import { analyticsApi } from '../../api'
import ActionMenu, { ActionMenuItem } from '../../components/ui/ActionMenu'
import ListPagination from '../../components/ui/ListPagination'
import { usePagination } from '../../hooks/usePagination'
import type { AdminMineralAnalytics } from '../../types'

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-app-border bg-app-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-app-muted">{label}</p>
      <p className="font-bold text-app-text mt-1 tabular-nums text-2xl">{value}</p>
      {hint && <p className="text-xs text-app-text-muted mt-1">{hint}</p>}
    </div>
  )
}

function MineralAnalytics({ data }: { data: AdminMineralAnalytics }) {
  const { coverage } = data
  const mineralPagination = usePagination(coverage.minerals)
  const regionChart = coverage.hotspots_by_region.slice(0, 8).map((row) => ({
    name: row.region,
    value: row.count,
  }))
  const mineralChart = coverage.minerals.slice(0, 10).map((mineral) => ({
    name: mineral.name,
    value: mineral.feature_count,
    color: mineral.color,
  }))
  const interestChart = data.exploration_interest.slice(0, 10).map((row) => ({
    name: row.mineral_slug,
    value: row.explorations,
  }))

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Mapped areas" value={fmt(coverage.total_prospects)} />
        <KpiCard label="Active layers" value={fmt(coverage.total_layers)} hint={`${coverage.preview_layers} preview`} />
        <KpiCard label="Regions covered" value={fmt(coverage.regions_covered)} />
        <KpiCard
          label="Catalog layers"
          value={fmt(data.catalog.mapped_layer_count)}
          hint={`${data.catalog.layer_count} total in catalog`}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-app-border bg-app-surface p-5">
          <h2 className="font-semibold text-app-text mb-1">Prospects by mineral</h2>
          <p className="text-sm text-app-text-muted mb-4">Uploaded map data grouped by commodity.</p>
          {mineralChart.length > 0 ? (
            <DonutChart data={mineralChart} height={280} />
          ) : (
            <p className="text-sm text-app-text-muted">No mineral map data yet.</p>
          )}
        </section>

        <section className="rounded-xl border border-app-border bg-app-surface p-5">
          <h2 className="font-semibold text-app-text mb-1">User exploration interest</h2>
          <p className="text-sm text-app-text-muted mb-4">
            Minerals users deep-explore for coverage and heatmaps.
          </p>
          {interestChart.length > 0 ? (
            <VerticalBarChart data={interestChart} color="#3b82f6" layout="horizontal" />
          ) : (
            <p className="text-sm text-app-text-muted">No exploration activity recorded yet.</p>
          )}
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-app-border bg-app-surface p-5">
          <h2 className="font-semibold text-app-text mb-1">Top regions</h2>
          <p className="text-sm text-app-text-muted mb-4">Where mapped geological areas concentrate.</p>
          {regionChart.length > 0 ? (
            <VerticalBarChart data={regionChart} color="#f59e0b" layout="horizontal" />
          ) : (
            <p className="text-sm text-app-text-muted">No regional breakdown yet.</p>
          )}
        </section>

        {coverage.layer_by_type.length > 0 && (
          <section className="rounded-xl border border-app-border bg-app-surface p-5">
            <h2 className="font-semibold text-app-text mb-1">Layer geometry</h2>
            <p className="text-sm text-app-text-muted mb-4">Polygon and point layers on the map.</p>
            <LayerTypeGrid items={coverage.layer_by_type} />
          </section>
        )}
      </div>

      <section className="rounded-xl border border-app-border bg-app-surface overflow-hidden">
        <div className="px-5 py-4 border-b app-divider flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-app-text">Mineral inventory</h2>
            <p className="text-sm text-app-text-muted mt-0.5">
              Layers, mapped areas, and reports per commodity.
            </p>
          </div>
          <Link to="/admin/coverage" className="text-sm text-terra-600 dark:text-terra-400 hover:underline">
            Full coverage map →
          </Link>
        </div>
        {coverage.minerals.length === 0 ? (
          <p className="px-5 py-8 text-sm text-app-text-muted">No minerals in catalog yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Mineral</th>
                    <th className="text-right">Layers</th>
                    <th className="text-right">Areas</th>
                    <th className="text-right">Reports</th>
                    <th className="text-right">Explorations</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mineralPagination.pageItems.map((mineral) => {
                    const interest = data.exploration_interest.find(
                      (row) => row.mineral_slug === mineral.slug
                    )
                    return (
                      <tr key={mineral.slug}>
                        <td>
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: mineral.color }}
                            />
                            {mineral.name}
                          </span>
                        </td>
                        <td className="text-right tabular-nums">{fmt(mineral.layer_count)}</td>
                        <td className="text-right tabular-nums">{fmt(mineral.feature_count)}</td>
                        <td className="text-right tabular-nums">{fmt(mineral.report_count)}</td>
                        <td className="text-right tabular-nums text-app-text-muted">
                          {interest ? fmt(interest.explorations) : '-'}
                        </td>
                        <td className="text-right">
                          <div className="inline-flex justify-end">
                            <ActionMenu label={`Actions for ${mineral.name}`} minWidth="11rem">
                              <ActionMenuItem to={`/?mineral=${encodeURIComponent(mineral.slug)}`}>
                                View on map
                              </ActionMenuItem>
                              <ActionMenuItem to="/admin/minerals">Open commodities</ActionMenuItem>
                              <ActionMenuItem to="/admin/coverage">Coverage</ActionMenuItem>
                              <ActionMenuItem to="/admin/reports">Reports</ActionMenuItem>
                            </ActionMenu>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {mineralPagination.hasMultiplePages && (
              <div className="px-5 py-3 border-t app-divider bg-app-subtle/20">
                <ListPagination
                  page={mineralPagination.page}
                  pageCount={mineralPagination.pageCount}
                  total={mineralPagination.total}
                  pageSize={mineralPagination.pageSize}
                  onPageChange={mineralPagination.setPage}
                />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

export default function AdminMineralAnalyticsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-mineral-analytics'],
    queryFn: () => analyticsApi.adminMineralAnalytics().then((r) => r.data),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-app-text">Mineral analytics</h1>
        <p className="text-sm text-app-muted mt-0.5">
          Coverage, catalog depth, and explore trends.
        </p>
      </div>

      {isLoading && <p className="text-sm text-app-text-muted">Loading mineral analytics…</p>}
      {isError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">Could not load mineral analytics.</p>
          <button type="button" onClick={() => refetch()} className="btn-secondary text-sm mt-3">
            Retry
          </button>
        </div>
      )}
      {data && <MineralAnalytics data={data} />}
    </div>
  )
}
