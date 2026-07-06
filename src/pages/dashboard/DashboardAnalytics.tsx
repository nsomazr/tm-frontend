import { useEffect, useMemo, useState } from 'react'
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
import { formatAreaKm2 } from '../../components/map/mapFormat'
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

  const layerHotspots = (hotspots?.layer_hotspots ?? []) as {
    slug: string
    name: string
    name_sw?: string
    color: string
    feature_count: number
    hotspots: { region: string; feature_count: number; area_km2?: number }[]
  }[]

  const mineralHotspots = (hotspots?.mineral_hotspots ?? layerHotspots) as typeof layerHotspots

  const totalCoverageArea = hotspots?.total_area_km2 as number | undefined

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

  const regionList = selectedLayer?.hotspots ?? (hotspots?.hotspots ?? []) as {
    region: string
    feature_count: number
    area_km2?: number
  }[]
  const layerList = (hotspots?.layers ?? investor?.layers ?? []) as {
    name: string
    name_sw?: string
    color: string
    feature_count: number
    area_km2?: number
    slug?: string
    layer_type?: string
  }[]
  const layerStats = (hotspots?.layer_stats ?? []) as { layer_type: string; count: number }[]
  const inventory = (investor?.layers ?? []) as {
    name: string
    name_sw?: string
    slug: string
    color: string
    feature_count: number
    layer_type: string
    area_km2?: number
  }[]

  const sortedLayers = useMemo(
    () => [...layerList].sort((a, b) => b.feature_count - a.feature_count),
    [layerList]
  )

  const totalZones = useMemo(
    () => hotspots?.total_prospects ?? sortedLayers.reduce((s, layer) => s + layer.feature_count, 0),
    [hotspots?.total_prospects, sortedLayers]
  )

  const topRegion = regionList[0]
  const topLayer = sortedLayers[0]
  const selectedLayerZones = selectedLayer?.feature_count ?? totalZones
  const insight = useMemo(
    () => buildAnalyticsInsight(regionList, sortedLayers, selectedLayerZones),
    [regionList, sortedLayers, selectedLayerZones]
  )

  const layerBars = sortedLayers.map((layer) => ({
    label: displayName(layer),
    value: layer.feature_count,
    color: layer.color,
  }))

  const regionBars = regionList.slice(0, 8).map((r) => ({
    label: r.region,
    value: r.feature_count,
    color: selectedLayer?.color,
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
        description="Mapped zone concentration on the map: where uploaded layers and regions stand out."
      />

      {isLoading ? (
        <AnalyticsSkeleton />
      ) : (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Mapped zones" value={fmt(totalZones)} hint={totalZones > 0 ? 'Active prospect features' : 'Upload layers in Admin'} />
            <StatCard
              label="Polygon coverage"
              value={totalCoverageArea && totalCoverageArea > 0 ? formatAreaKm2(totalCoverageArea) : '-'}
              hint={totalCoverageArea && totalCoverageArea > 0 ? 'Total mapped polygon area' : 'Polygon layers only'}
            />
            <StatCard
              label="Leading region"
              value={topRegion?.region ?? '-'}
              hint={
                topRegion
                  ? `${topRegion.feature_count} zones${topRegion.area_km2 ? ` · ${formatAreaKm2(topRegion.area_km2)}` : ''} · ${pct(topRegion.feature_count, selectedLayerZones)}%`
                  : 'No regional data yet'
              }
            />
            <StatCard
              label="Top layer"
              value={topLayer ? displayName(topLayer) : '-'}
              hint={
                topLayer
                  ? `${topLayer.feature_count} zones${topLayer.area_km2 ? ` · ${formatAreaKm2(topLayer.area_km2)}` : ''} · ${pct(topLayer.feature_count, totalZones)}%`
                  : 'No layer data yet'
              }
            />
          </div>

          {insight && (
            <div className="rounded-xl bg-terra-500/10 px-4 py-3 text-sm text-app-text leading-relaxed">
              {insight}
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-4">
            <section className="rounded-2xl bg-app-surface p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-app-text">Regional hotspots</h2>
                  <p className="text-xs text-app-muted mt-0.5">Zones per region for the selected layer</p>
                </div>
                {mineralHotspots.length > 0 && (
                  <select
                    value={selectedLayerSlug}
                    onChange={(e) => setSelectedLayerSlug(e.target.value)}
                    className="input text-xs sm:text-sm min-w-[10rem] max-w-full"
                  >
                    {mineralHotspots.map((layer) => (
                      <option key={layer.slug} value={layer.slug}>
                        {displayName(layer)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {regionBars.length === 0 ? (
                <p className="text-sm text-app-muted">No regional data yet.</p>
              ) : (
                <AnalyticsRankedBars items={regionBars} />
              )}
            </section>

            <section className="rounded-2xl bg-app-surface p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-app-text">Uploaded layers</h2>
              <p className="text-xs text-app-muted mt-0.5 mb-2">Share of mapped zones by layer</p>
              {layerBars.length === 0 ? (
                <p className="text-sm text-app-muted">No layer data yet.</p>
              ) : (
                <MineralMixStrip items={layerBars} />
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
                <h2 className="text-sm font-semibold text-app-text">Layer inventory</h2>
                <p className="text-xs text-app-muted mt-0.5">Uploaded layers and zone counts</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b app-divider text-left text-app-muted">
                      <th className="px-4 sm:px-5 py-2.5 font-medium text-xs uppercase tracking-wide">Layer</th>
                      <th className="px-3 py-2.5 font-medium text-xs uppercase tracking-wide">Geometry</th>
                      <th className="px-4 sm:px-5 py-2.5 font-medium text-xs uppercase tracking-wide text-right">Coverage</th>
                      <th className="px-4 sm:px-5 py-2.5 font-medium text-xs uppercase tracking-wide text-right">Zones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory
                      .slice()
                      .sort((a, b) => b.feature_count - a.feature_count)
                      .map((layer) => (
                        <tr key={layer.slug} className="border-b app-divider last:border-0">
                          <td className="px-4 sm:px-5 py-2.5">
                            <span className="inline-flex items-center gap-2 font-medium text-app-text">
                              <span
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: layer.color }}
                              />
                              {displayName(layer)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 capitalize text-app-secondary">{layer.layer_type}</td>
                          <td className="px-4 sm:px-5 py-2.5 text-right tabular-nums text-app-secondary">
                            {layer.area_km2 && layer.area_km2 > 0 ? formatAreaKm2(layer.area_km2) : '-'}
                          </td>
                          <td className="px-4 sm:px-5 py-2.5 text-right tabular-nums font-semibold text-app-text">
                            {layer.feature_count}
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
