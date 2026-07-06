import { hexToRgba, resolveColorHex } from '../../lib/mineralColorUtils'
import type { MineralHeatmapSpec } from './mineralHeatmapLayer'

interface MineralHeatmapColorbarProps {
  spec: MineralHeatmapSpec
  className?: string
}

export default function MineralHeatmapColorbar({ spec, className = '' }: MineralHeatmapColorbarProps) {
  const color = resolveColorHex(spec.color, '#E87722')
  const gradient = `linear-gradient(to right, ${hexToRgba(color, 0.08)}, ${hexToRgba(color, 0.95)})`

  return (
    <div
      className={`map-chrome pointer-events-none rounded-xl px-3 py-2.5 shadow-md ${className}`}
      aria-label={`${spec.name ?? spec.slug} density scale`}
    >
      <div className="flex items-center gap-2 mb-1.5 min-w-0">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
          style={{ backgroundColor: color }}
        />
        <span className="truncate text-xs font-semibold map-text">{spec.name ?? spec.slug}</span>
        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide map-text-muted">
          Heatmap
        </span>
      </div>
      <div className="h-2 w-[min(11rem,42vw)] rounded-full ring-1 ring-black/5" style={{ background: gradient }} />
      <div className="mt-1 flex w-[min(11rem,42vw)] justify-between text-[10px] map-text-muted">
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
  )
}
