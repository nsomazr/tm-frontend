import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  AnalyticsRankedBars,
  buildAnalyticsInsight,
  fmt,
  LayerTypeGrid,
  MineralMixStrip,
  pct,
} from '../../components/analytics/AnalyticsViz'
import { analyticsApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { useDisplayName } from '../../i18n/useDisplayName'
import { EmptyState, PageHeader, StatCard } from './DashboardUi'

function AnalyticsSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-app-subtle" />
        ))}
      </div>
      <div className="h-16 rounded-xl bg-app-subtle" />
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="h-72 rounded-2xl bg-app-subtle" />
        <div className="h-72 rounded-2xl bg-app-subtle" />
      </div>
    </div>
  )
}

export default function DashboardAnalytics() {
  const { hasPaidAccess } = useAuth()
  const displayName = useDisplayName()

  const { data: hotspots, isLoading } = useQuery({
    queryKey: ['hotspots'],
    queryFn: () => analyticsApi.hotspots().then((r) => r.data),
    enabled: hasPaidAccess,
  })

  const { data: investor } = useQuery({
    queryKey: ['investor'],
    queryFn: () => analyticsApi.investor().then((r) => r.data),
    enabled: hasPaidAccess,
  })

  const regionList = (hotspots?.hotspots ?? []) as { region: string; feature_count: number }[]
  const mineralList = (hotspots?.minerals ?? []) as {
    name: string
    name_sw?: string
    color: string
    count: number
    slug?: string
  }[]
  const layerStats = (hotspots?.layer_stats ?? []) as { layer_type: string; count: number }[]
  const inventory = (investor?.minerals ?? []) as {
    name: string
    name_sw?: string
    slug: string
    color: string
    layer_count: number
    report_count: number
  }[]

  const sortedMinerals = useMemo(
    () => [...mineralList].sort((a, b) => b.count - a.count),
    [mineralList]
  )

  const totalZones = useMemo(
    () => sortedMinerals.reduce((s, m) => s + m.count, 0),
    [sortedMinerals]
  )

  const topRegion = regionList[0]
  const topMineral = sortedMinerals[0]
  const insight = useMemo(
    () => buildAnalyticsInsight(regionList, sortedMinerals, totalZones),
    [regionList, sortedMinerals, totalZones]
  )

  const mineralBars = sortedMinerals.map((m) => ({
    label: displayName(m),
    value: m.count,
    color: m.color,
  }))

  const regionBars = regionList.slice(0, 8).map((r) => ({
    label: r.region,
    value: r.feature_count,
  }))

  if (!hasPaidAccess) {
    return (
      <>
        <PageHeader title="Analytics" description="Regional mineral hotspot data." />
        <EmptyState
          message="Analytics are included with a paid subscription."
          action={
            <Link to="/subscriptions" className="btn-primary text-sm">
              Upgrade your plan
            </Link>
          }
        />
      </>
    )
  }

  return (
    <div className="max-w-4xl animate-fade-in">
      <PageHeader
        title="Analytics"
        description="Mapped zone concentration across Tanzania: where minerals and regions stand out."
      />

      {isLoading ? (
        <AnalyticsSkeleton />
      ) : (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Mapped zones" value={fmt(totalZones)} hint="Active prospect features" />
            <StatCard
              label="Leading region"
              value={topRegion?.region ?? 'N/A'}
              hint={topRegion ? `${topRegion.feature_count} zones · ${pct(topRegion.feature_count, totalZones)}%` : undefined}
            />
            <StatCard
              label="Top commodity"
              value={topMineral ? displayName(topMineral) : 'N/A'}
              hint={topMineral ? `${topMineral.count} zones · ${pct(topMineral.count, totalZones)}%` : undefined}
            />
            <StatCard label="Regions covered" value={fmt(regionList.length)} hint="With mapped data" />
          </div>

          {insight && (
            <div className="rounded-xl bg-terra-500/10 px-4 py-3 text-sm text-app-text leading-relaxed">
              {insight}
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-4">
            <section className="rounded-2xl bg-app-surface p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-app-text">Regional hotspots</h2>
              <p className="text-xs text-app-muted mt-0.5 mb-4">Zones per region, ranked by count</p>
              {regionBars.length === 0 ? (
                <p className="text-sm text-app-muted">No regional data yet.</p>
              ) : (
                <AnalyticsRankedBars items={regionBars} />
              )}
            </section>

            <section className="rounded-2xl bg-app-surface p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-app-text">Mineral mix</h2>
              <p className="text-xs text-app-muted mt-0.5 mb-2">Share of mapped zones by commodity</p>
              {mineralBars.length === 0 ? (
                <p className="text-sm text-app-muted">No mineral data yet.</p>
              ) : (
                <MineralMixStrip items={mineralBars} />
              )}
            </section>
          </div>

          {layerStats.length > 0 && (
            <section className="rounded-2xl bg-app-surface p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-app-text">Map layers</h2>
              <p className="text-xs text-app-muted mt-0.5 mb-3">Active geometry types on the platform</p>
              <LayerTypeGrid items={layerStats} />
            </section>
          )}

          {inventory.length > 0 && (
            <section className="rounded-2xl bg-app-surface overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b app-divider">
                <h2 className="text-sm font-semibold text-app-text">Commodity inventory</h2>
                <p className="text-xs text-app-muted mt-0.5">Layers and reports per mineral</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b app-divider text-left text-app-muted">
                      <th className="px-4 sm:px-5 py-2.5 font-medium text-xs uppercase tracking-wide">Mineral</th>
                      <th className="px-3 py-2.5 font-medium text-xs uppercase tracking-wide text-right">Zones</th>
                      <th className="px-3 py-2.5 font-medium text-xs uppercase tracking-wide text-right">Layers</th>
                      <th className="px-4 sm:px-5 py-2.5 font-medium text-xs uppercase tracking-wide text-right">Reports</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory
                      .map((m) => ({
                        ...m,
                        zoneCount:
                          sortedMinerals.find((x) => x.slug === m.slug || x.name === m.name)?.count ?? 0,
                      }))
                      .sort((a, b) => b.zoneCount - a.zoneCount)
                      .map((m) => (
                        <tr key={m.slug} className="border-b app-divider last:border-0">
                          <td className="px-4 sm:px-5 py-2.5">
                            <span className="inline-flex items-center gap-2 font-medium text-app-text">
                              <span
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: m.color }}
                              />
                              {displayName(m)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-app-text">
                            {m.zoneCount}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-app-secondary">{m.layer_count}</td>
                          <td className="px-4 sm:px-5 py-2.5 text-right tabular-nums text-app-secondary">
                            {m.report_count}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <div className="flex flex-wrap gap-3 pt-1">
            <Link to="/maps" className="btn-primary text-sm">
              Explore on map
            </Link>
            <Link
              to="/downloads"
              className="rounded-xl bg-app-surface px-4 py-2 text-sm font-medium text-app-text hover:bg-app-subtle transition-colors"
            >
              Browse reports
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
