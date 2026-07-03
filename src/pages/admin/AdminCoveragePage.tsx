import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { analyticsApi } from '../../api'
import { useDisplayName } from '../../i18n/useDisplayName'

function fmt(n: number) {
  return Number(n).toLocaleString()
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
        return (
          <div key={i}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-700 capitalize truncate pr-2">{String(item[labelKey])}</span>
              <span className="font-medium tabular-nums text-slate-900 shrink-0">{fmt(val)}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className={`h-full rounded-full ${color}`} style={{ width: `${(val / max) * 100}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

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
  const minerals = (hotspots?.minerals ?? []) as { name: string; color: string; count: number; slug?: string }[]
  const layerStats = (hotspots?.layer_stats ?? []) as { layer_type: string; count: number }[]
  const inventory = (investor?.minerals ?? []) as {
    name: string
    slug: string
    color: string
    layer_count: number
    report_count: number
  }[]

  const totalProspects = minerals.reduce((s, m) => s + m.count, 0)
  const totalLayers = inventory.reduce((s, m) => s + m.layer_count, 0)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Geological coverage</h1>
        <p className="text-slate-500 text-sm mt-1">
          Prospect zones, layer inventory, and regional distribution across Tanzania.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading coverage data…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Mapped prospects</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{fmt(totalProspects)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Active layers</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{fmt(totalLayers)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Regions with data</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{fmt(regions.length)}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="font-semibold text-slate-900 mb-1">Regional hotspots</h2>
              <p className="text-sm text-slate-500 mb-4">Where prospect features concentrate.</p>
              {regions.length === 0 ? (
                <p className="text-sm text-slate-500">No regional data yet.</p>
              ) : (
                <BarChart
                  items={regions.map((r) => ({ region: r.region, count: r.feature_count }))}
                  labelKey="region"
                  valueKey="count"
                  color="bg-amber-500"
                />
              )}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="font-semibold text-slate-900 mb-1">Layer geometry</h2>
              <p className="text-sm text-slate-500 mb-4">Polygon, point, and line layers on the map.</p>
              {layerStats.length === 0 ? (
                <p className="text-sm text-slate-500">No layers yet.</p>
              ) : (
                <BarChart
                  items={layerStats.map((l) => ({ layer_type: l.layer_type, count: l.count }))}
                  labelKey="layer_type"
                  valueKey="count"
                  color="bg-violet-500"
                />
              )}
            </section>
          </div>

          <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Mineral inventory</h2>
              <p className="text-sm text-slate-500 mt-0.5">Prospects, layers, and reports per commodity.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-slate-500">
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
                      <tr key={m.slug} className="border-b border-slate-50 last:border-0">
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                            {displayName(m)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums font-medium">{prospectCount}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-600">{m.layer_count}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-600">{m.report_count}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex flex-wrap gap-4">
              <Link to="/admin/layers" className="text-sm text-terra-600 hover:underline">Manage layers →</Link>
              <Link to="/admin/coordinates" className="text-sm text-terra-600 hover:underline">Edit coordinates →</Link>
              <Link to="/" className="text-sm text-terra-600 hover:underline">View on map →</Link>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
