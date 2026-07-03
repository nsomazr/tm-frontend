import { useTheme } from '../../theme/ThemeContext'

export interface ChartDatum {
  name: string
  value: number
  color?: string
}

export const CHART_PALETTE = [
  '#22c55e',
  '#3b82f6',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#6366f1',
  '#84cc16',
  '#64748b',
]

export function useChartTheme() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return {
    isDark,
    text: isDark ? '#a8a8a8' : '#475569',
    textMuted: isDark ? '#737373' : '#64748b',
    grid: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(148, 163, 184, 0.22)',
    tooltipBg: isDark ? '#232323' : '#ffffff',
    tooltipBorder: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(100, 116, 139, 0.28)',
    surface: isDark ? '#1c1c1c' : '#ffffff',
  }
}

export function withChartColors(data: ChartDatum[]): ChartDatum[] {
  return data.map((item, index) => ({
    ...item,
    color: item.color ?? CHART_PALETTE[index % CHART_PALETTE.length],
  }))
}

export function fmt(n: number) {
  return Number(n).toLocaleString()
}

export function pct(part: number, total: number) {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}
