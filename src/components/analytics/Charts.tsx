import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ChartDatum } from './chartTheme'
import { fmt, useChartTheme, withChartColors } from './chartTheme'

type ValueFormatter = (value: number) => string

function ChartTooltip({
  active,
  payload,
  valueFormatter = fmt,
}: {
  active?: boolean
  payload?: { name?: string; value?: number; payload?: ChartDatum }[]
  valueFormatter?: ValueFormatter
}) {
  const theme = useChartTheme()
  if (!active || !payload?.length) return null
  const item = payload[0]
  const value = Number(item.value ?? 0)
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-soft dark:shadow-soft-dark"
      style={{
        backgroundColor: theme.tooltipBg,
        border: `1px solid ${theme.tooltipBorder}`,
        color: theme.text,
      }}
    >
      <p className="font-medium text-app-text">{item.name ?? item.payload?.name}</p>
      <p className="tabular-nums mt-0.5">{valueFormatter(value)}</p>
    </div>
  )
}

function PieTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean
  payload?: { name?: string; value?: number }[]
  total: number
}) {
  const theme = useChartTheme()
  if (!active || !payload?.length) return null
  const item = payload[0]
  const value = Number(item.value ?? 0)
  const share = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-soft dark:shadow-soft-dark"
      style={{
        backgroundColor: theme.tooltipBg,
        border: `1px solid ${theme.tooltipBorder}`,
        color: theme.text,
      }}
    >
      <p className="font-medium">{item.name}</p>
      <p className="tabular-nums mt-0.5">
        {fmt(value)} · {share}%
      </p>
    </div>
  )
}

export function VerticalBarChart({
  data,
  height = 260,
  color = '#22c55e',
  valueFormatter = fmt,
  layout = 'vertical',
}: {
  data: ChartDatum[]
  height?: number
  color?: string
  valueFormatter?: ValueFormatter
  layout?: 'vertical' | 'horizontal'
}) {
  const theme = useChartTheme()
  const colored = withChartColors(data)

  if (!colored.length) {
    return <p className="text-sm text-app-muted">No data yet.</p>
  }

  const isHorizontal = layout === 'horizontal'

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart
          data={colored}
          layout={isHorizontal ? 'vertical' : 'horizontal'}
          margin={isHorizontal ? { top: 4, right: 16, left: 4, bottom: 4 } : { top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={!isHorizontal} horizontal={isHorizontal} />
          {isHorizontal ? (
            <>
              <XAxis type="number" tick={{ fill: theme.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={valueFormatter} />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={{ fill: theme.text, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="name"
                tick={{ fill: theme.text, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={colored.length > 6 ? -25 : 0}
                textAnchor={colored.length > 6 ? 'end' : 'middle'}
                height={colored.length > 6 ? 56 : 32}
              />
              <YAxis tick={{ fill: theme.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={valueFormatter} width={56} />
            </>
          )}
          <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} cursor={{ fill: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)' }} />
          <Bar dataKey="value" radius={isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={isHorizontal ? 28 : 48}>
            {colored.map((entry) => (
              <Cell key={entry.name} fill={entry.color ?? color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DonutChart({
  data,
  height = 280,
  innerRadius = 58,
  outerRadius = 92,
  showLegend = true,
}: {
  data: ChartDatum[]
  height?: number
  innerRadius?: number
  outerRadius?: number
  showLegend?: boolean
}) {
  const theme = useChartTheme()
  const colored = withChartColors(data)
  const total = colored.reduce((sum, item) => sum + item.value, 0)

  if (!colored.length || total <= 0) {
    return <p className="text-sm text-app-muted">No data yet.</p>
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={colored}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            stroke="transparent"
          >
            {colored.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<PieTooltip total={total} />} />
          {showLegend && (
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, color: theme.text, paddingTop: 12 }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ConversionFunnelChart({ data, height = 300 }: { data: ChartDatum[]; height?: number }) {
  const theme = useChartTheme()
  const colored = withChartColors(data)

  if (!colored.length) {
    return <p className="text-sm text-app-muted">No funnel data yet.</p>
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <FunnelChart margin={{ top: 8, right: 80, left: 8, bottom: 8 }}>
          <Tooltip content={<ChartTooltip />} />
          <Funnel dataKey="value" data={colored} isAnimationActive>
            <LabelList
              position="right"
              fill={theme.text}
              stroke="none"
              dataKey="name"
              fontSize={11}
            />
            {colored.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </div>
  )
}

export function StackedMetricBars({
  data,
  height = 220,
}: {
  data: ChartDatum[]
  height?: number
}) {
  return <VerticalBarChart data={data} height={height} layout="horizontal" />
}

export { fmt }
