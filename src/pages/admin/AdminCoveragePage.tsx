import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { DonutChart, VerticalBarChart } from '../../components/analytics/Charts'
import { LayerTypeGrid } from '../../components/analytics/AnalyticsViz'
import { fmt } from '../../components/analytics/chartTheme'
import { analyticsApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { useDisplayName } from '../../i18n/useDisplayName'
import { formatAreaKm2 } from '../../components/map/mapFormat'

const LAYER_TYPE_LABELS: Record<string, string> = {
  polygon: 'Polygon',
  point: 'Point',
  line: 'Line',
}

type LayerHotspotRow = {
  slug: string
  name: string
  name_sw?: string
  color: string
  feature_count: number
  layer_type: string
  area_km2?: number
  hotspots: { region: string; feature_count: number; area_km2?: number }[]
}

export default function AdminCoveragePage() {
  const { isAdmin } = useAuth()
  const displayName = useDisplayName()
  const { data: hotspots, isLoading: hotspotsLoading } = useQuery({
    queryKey: ['hotspots'],
    queryFn: () => analyticsApi.hotspots().then((r) => r.data),
  })

  const { data: investor, isLoading: investorLoading } = useQuery({
    queryKey: ['investor'],
    queryFn: () => analyticsApi.investor().then((r) => r.data),
  })

  const layerHotspots = (hotspots?.layer_hotspots ?? []) as LayerHotspotRow[]
  const mineralHotspots = (hotspots?.mineral_hotspots ?? layerHotspots) as LayerHotspotRow[]
  const layers = (hotspots?.layers ?? investor?.layers ?? []) as {
    slug: string
    name: string
    name_sw?: string
    color: string
    feature_count: number
    layer_type: string
    area_km2?: number
    mineral_name?: string
  }[]
  const layerStats = (hotspots?.layer_stats ?? []) as { layer_type: string; count: number }[]

  const [selectedLayerSlug, setSelectedLayerSlug] = useState('')

  useEffect(() => {
    if (mineralHotspots.length === 0) {
      setSelectedLayerSlug('')
      return
    }
    if (!selectedLayerSlug || !mineralHotspots.some((layer) => layer.slug === selectedLayerSlug)) {
      setSelectedLayerSlug(mineralHotspots[0].slug)
    }
  }, [mineralHotspots, selectedLayerSlug])

  const selectedLayer = useMemo(
    () => mineralHotspots.find((layer) => layer.slug === selectedLayerSlug) ?? mineralHotspots[0],
    [mineralHotspots, selectedLayerSlug]
  )

  const isLoading = hotspotsLoading || investorLoading
  const totalProspects = hotspots?.total_prospects ?? layers.reduce((s, layer) => s + layer.feature_count, 0)
  const totalCoverageArea = hotspots?.total_area_km2 as number | undefined
  const regionsWithData = (selectedLayer?.hotspots ?? []).filter((r) => r.region !== 'Unknown').length

  const regionChart = (selectedLayer?.hotspots ?? []).slice(0, 10).map((r) => ({
    name: r.region,
    value: r.feature_count,
  }))

  const layerChart = layers.map((layer) => ({
    name: displayName(layer),
    value: layer.feature_count,
    color: layer.color,
  }))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-app-text">Map coverage</h1>
        <p className="text-sm text-app-muted mt-1">
          Prospect zones, uploaded layers, and regional distribution on the map.
        </p>
        {isAdmin && (
          <p className="text-xs text-app-text-muted mt-2">
            Related:{' '}
            <Link to="/admin/mineral-analytics" className="text-terra-600 dark:text-terra-400 hover:underline">
              Mineral analytics
            </Link>
            {' · '}
            <Link to="/admin/user-activity" className="text-terra-600 dark:text-terra-400 hover:underline">
              User activity
            </Link>
          </p>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-app-muted">Loading coverage data…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl bg-app-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-app-muted">Mapped zones</p>
              <p className="text-2xl font-bold text-app-text mt-1 tabular-nums">{fmt(totalProspects)}</p>
            </div>
            <div className="rounded-xl bg-app-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-app-muted">Polygon coverage</p>
              <p className="text-2xl font-bold text-app-text mt-1 tabular-nums">
                {totalCoverageArea && totalCoverageArea > 0 ? formatAreaKm2(totalCoverageArea) : '-'}
              </p>
            </div>
            <div className="rounded-xl bg-app-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-app-muted">Uploaded layers</p>
              <p className="text-2xl font-bold text-app-text mt-1 tabular-nums">{fmt(layers.length)}</p>
            </div>
            <div className="rounded-xl bg-app-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-app-muted">Regions in layer</p>
              <p className="text-2xl font-bold text-app-text mt-1 tabular-nums">{fmt(regionsWithData)}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <section className="rounded-xl bg-app-surface p-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-semibold text-app-text mb-1">Regional hotspots</h2>
                  <p className="text-sm text-app-muted">
                    Zone counts and polygon coverage per region for the selected layer.
                  </p>
                </div>
                {mineralHotspots.length > 0 && (
                  <label className="shrink-0 min-w-[12rem]">
                    <span className="sr-only">Layer</span>
                    <select
                      value={selectedLayerSlug}
                      onChange={(e) => setSelectedLayerSlug(e.target.value)}
                      className="input text-sm w-full"
                    >
                      {mineralHotspots.map((layer) => (
                        <option key={layer.slug} value={layer.slug}>
                          {displayName(layer)} ({fmt(layer.feature_count)})
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              {regionChart.length === 0 ? (
                <p className="text-sm text-app-muted">No regional data for this layer yet.</p>
              ) : (
                <VerticalBarChart
                  data={regionChart}
                  color={selectedLayer?.color ?? '#f59e0b'}
                  layout="horizontal"
                  height={Math.max(220, regionChart.length * 34 + 40)}
                />
              )}
            </section>

            <section className="rounded-xl bg-app-surface p-5">
              <h2 className="font-semibold text-app-text mb-1">Uploaded layers</h2>
              <p className="text-sm text-app-muted mb-4">Share of mapped zones per layer you uploaded.</p>
              {layerChart.length === 0 ? (
                <p className="text-sm text-app-muted">No uploaded layers yet.</p>
              ) : (
                <DonutChart data={layerChart} height={300} />
              )}
            </section>
          </div>

          {layerStats.length > 0 && (
            <section className="rounded-xl bg-app-surface p-5">
              <h2 className="font-semibold text-app-text mb-1">Layer geometry</h2>
              <p className="text-sm text-app-muted mb-4">Uploaded polygon, point, and line layers.</p>
              <LayerTypeGrid items={layerStats} />
            </section>
          )}

          <section className="rounded-xl bg-app-surface overflow-hidden">
            <div className="px-5 py-4 border-b app-divider">
              <h2 className="font-semibold text-app-text">Layer inventory</h2>
              <p className="text-sm text-app-muted mt-0.5">Each uploaded layer, its zone count, and geometry type.</p>
            </div>
            {layers.length === 0 ? (
              <p className="px-5 py-6 text-sm text-app-muted">No shapefiles uploaded yet.</p>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b app-divider text-left text-app-muted">
                    <th className="px-5 py-3 font-medium">Layer</th>
                    <th className="px-5 py-3 font-medium">Geometry</th>
                    <th className="px-5 py-3 font-medium text-right">Coverage</th>
                    <th className="px-5 py-3 font-medium text-right">Zones</th>
                    <th className="px-5 py-3 font-medium text-right">Top region</th>
                  </tr>
                </thead>
                <tbody>
                  {layers.map((layer) => {
                    const layerRegions = layerHotspots.find((row) => row.slug === layer.slug)?.hotspots ?? []
                    const topRegion = layerRegions[0]
                    return (
                      <tr key={layer.slug} className="border-b app-divider last:border-0">
                        <td className="px-5 py-3 text-app-text">
                          <span className="inline-flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: layer.color }} />
                            {displayName(layer)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-app-text-secondary capitalize">
                          {LAYER_TYPE_LABELS[layer.layer_type] ?? layer.layer_type}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-app-text-secondary">
                          {'area_km2' in layer && layer.area_km2 && layer.area_km2 > 0
                            ? formatAreaKm2(layer.area_km2)
                            : '-'}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums font-medium text-app-text">{fmt(layer.feature_count)}</td>
                        <td className="px-5 py-3 text-right text-app-text-secondary">
                          {topRegion
                            ? `${topRegion.region} (${fmt(topRegion.feature_count)}${topRegion.area_km2 ? ` · ${formatAreaKm2(topRegion.area_km2)}` : ''})`
                            : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            )}
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
