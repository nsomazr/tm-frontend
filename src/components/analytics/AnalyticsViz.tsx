import {
  ConversionFunnelChart,
  DonutChart,
  StackedMetricBars,
  VerticalBarChart,
} from './Charts'
import { fmt, pct, type ChartDatum } from './chartTheme'

export interface RankedItem {
  label: string
  value: number
  color?: string
}

function toChartData(items: RankedItem[]): ChartDatum[] {
  return items.map((item) => ({
    name: item.label,
    value: item.value,
    color: item.color,
  }))
}

export function AnalyticsRankedBars({
  items,
  valueSuffix = 'zones',
  barClass: _barClass = 'bg-terra-500',
}: {
  items: RankedItem[]
  valueSuffix?: string
  barClass?: string
}) {
  void valueSuffix
  return <StackedMetricBars data={toChartData(items)} height={Math.max(200, items.length * 36 + 48)} />
}

export function MineralMixStrip({ items }: { items: RankedItem[] }) {
  return <DonutChart data={toChartData(items)} height={300} />
}

export function LayerTypeGrid({
  items,
}: {
  items: { layer_type: string; count: number }[]
}) {
  const labels: Record<string, string> = {
    polygon: 'Polygons',
    point: 'Points',
    line: 'Lines',
  }

  const data = items.map((item) => ({
    name: labels[item.layer_type] ?? item.layer_type,
    value: item.count,
  }))

  return (
    <div className="grid lg:grid-cols-2 gap-6 items-center">
      <DonutChart data={data} height={240} innerRadius={48} outerRadius={78} />
      <VerticalBarChart data={data} height={220} color="#8b5cf6" />
    </div>
  )
}

export function buildAnalyticsInsight(
  regions: { region: string; feature_count: number }[],
  minerals: { name: string; count: number }[],
  totalZones: number
): string | null {
  if (totalZones <= 0 || regions.length === 0) return null
  const top = regions[0]
  const topShare = pct(top.feature_count, totalZones)
  const topMineral = [...minerals].sort((a, b) => b.count - a.count)[0]
  if (topMineral && topMineral.count > 0) {
    const mineralShare = pct(topMineral.count, totalZones)
    return `${top.region} leads with ${top.feature_count} mapped zones (${topShare}% of coverage). ${topMineral.name} is the most mapped commodity at ${mineralShare}%.`
  }
  return `${top.region} leads with ${top.feature_count} mapped zones (${topShare}% of national coverage).`
}

export {
  ConversionFunnelChart,
  DonutChart,
  VerticalBarChart,
  fmt,
  pct,
}
