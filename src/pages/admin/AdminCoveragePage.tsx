import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { DonutChart, VerticalBarChart } from '../../components/analytics/Charts'
import { LayerTypeGrid } from '../../components/analytics/AnalyticsViz'
import { fmt } from '../../components/analytics/chartTheme'
import { analyticsApi } from '../../api'
import { useDisplayName } from '../../i18n/useDisplayName'

export default function AdminCoveragePage() {
  const displayName = useDisplayName()
  const { data: hotspots, isLoading: hotspotsLoading } = useQuery({
    queryKey: ['hotspots'],
    queryFn: () => analyticsApi.hotspots().then((r) => r.data),
  })

  const { data: investor, isLoading: investorLoading } = useQuery({
    queryKey: ['investor'],
    queryFn: () => analyticsApi.investor().then((r) => r.data),
  })

  const isLoading = hotspotsLoading || investorLoading
  const regions = (hotspots?.hotspots ?? []) as { region: string; feature_count: number }[]
  const minerals = (hotspots?.minerals ?? []) as { name: string; name_sw?: string; color: string; count: number; slug?: string }[]
  const layerStats = (hotspots?.layer_stats ?? []) as { layer_type: string; count: number }[]
  const inventory = (investor?.minerals ?? []) as {
    name: string
    name_sw?: string
    slug: string
    color: string
    layer_count: number
    report_count: number
  }[]

  const totalProspects = minerals.reduce((s, m) => s + m.count, 0)
  const totalLayers = inventory.reduce((s, m) => s + m.layer_count, 0)

  const regionChart = regions.slice(0, 10).map((r) => ({
    name: r.region,
    value: r.feature_count,
  }))

  const mineralChart = minerals.map((m) => ({
    name: displayName(m),
    value: m.count,
    color: m.color,
  }))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-app-text">Geological coverage</h1>
        <p className="text-app-muted text-sm mt-1">
          Prospect zones, layer inventory, and regional distribution across Tanzania.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-app-muted">Loading coverage data…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-app-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-app-muted">Mapped prospects</p>
              <p className="text-2xl font-bold text-app-text mt-1 tabular-nums">{fmt(totalProspects)}</p>
            </div>
            <div className="rounded-xl bg-app-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-app-muted">Active layers</p>
              <p className="text-2xl font-bold text-app-text mt-1 tabular-nums">{fmt(totalLayers)}</p>
            </div>
            <div className="rounded-xl bg-app-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-app-muted">Regions with data</p>
              <p className="text-2xl font-bold text-app-text mt-1 tabular-nums">{fmt(regions.length)}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <section className="rounded-xl bg-app-surface p-5">
              <h2 className="font-semibold text-app-text mb-1">Regional hotspots</h2>
              <p className="text-sm text-app-muted mb-4">Where prospect features concentrate.</p>
              {regionChart.length === 0 ? (
                <p className="text-sm text-app-muted">No regional data yet.</p>
              ) : (
                <VerticalBarChart data={regionChart} color="#f59e0b" layout="horizontal" height={Math.max(220, regionChart.length * 34 + 40)} />
              )}
            </section>

            <section className="rounded-xl bg-app-surface p-5">
              <h2 className="font-semibold text-app-text mb-1">Mineral mix</h2>
              <p className="text-sm text-app-muted mb-4">Share of mapped prospects by commodity.</p>
              {mineralChart.length === 0 ? (
                <p className="text-sm text-app-muted">No mineral data yet.</p>
              ) : (
                <DonutChart data={mineralChart} height={300} />
              )}
            </section>
          </div>

          {layerStats.length > 0 && (
            <section className="rounded-xl bg-app-surface p-5">
              <h2 className="font-semibold text-app-text mb-1">Layer geometry</h2>
              <p className="text-sm text-app-muted mb-4">Polygon, point, and line layers on the map.</p>
              <LayerTypeGrid items={layerStats} />
            </section>
          )}

          <section className="rounded-xl bg-app-surface overflow-hidden">
            <div className="px-5 py-4 border-b app-divider">
              <h2 className="font-semibold text-app-text">Mineral inventory</h2>
              <p className="text-sm text-app-muted mt-0.5">Prospects, layers, and reports per commodity.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b app-divider text-left text-app-muted">
                    <th className="px-5 py-3 font-medium">Mineral</th>
                    <th className="px-5 py-3 font-medium text-right">Prospects</th>
                    <th className="px-5 py-3 font-medium text-right">Layers</th>
                    <th className="px-5 py-3 font-medium text-right">Reports</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((m) => {
                    const prospectCount = minerals.find((x) => x.slug === m.slug || x.name === m.name)?.count ?? 0
                    return (
                      <tr key={m.slug} className="border-b app-divider last:border-0">
                        <td className="px-5 py-3 text-app-text">
                          <span className="inline-flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                            {displayName(m)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums font-medium text-app-text">{prospectCount}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-app-text-secondary">{m.layer_count}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-app-text-secondary">{m.report_count}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t app-divider flex flex-wrap gap-4">
              <Link to="/admin/layers" className="text-sm text-terra-600 dark:text-terra-400 hover:underline">Manage layers →</Link>
              <Link to="/admin/coordinates" className="text-sm text-terra-600 dark:text-terra-400 hover:underline">Edit coordinates →</Link>
              <Link to="/" className="text-sm text-terra-600 dark:text-terra-400 hover:underline">View on map →</Link>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
