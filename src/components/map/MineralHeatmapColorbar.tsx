import { useEffect, useState } from 'react'
import { hexToRgba, resolveColorHex } from '../../lib/mineralColorUtils'
import type { MineralHeatmapSpec } from './mineralHeatmapLayer'

interface MineralHeatmapColorbarProps {
  spec: MineralHeatmapSpec | null
  /** Stretch gradient to container width (left dock / sheet). */
  embedded?: boolean
  className?: string
}

const FADE_MS = 320

export default function MineralHeatmapColorbar({
  spec,
  embedded = false,
  className = '',
}: MineralHeatmapColorbarProps) {
  const [shown, setShown] = useState<MineralHeatmapSpec | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (spec?.points?.length) {
      setShown(spec)
      const frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    }
    setVisible(false)
    const timer = window.setTimeout(() => setShown(null), FADE_MS)
    return () => window.clearTimeout(timer)
  }, [spec])

  if (!shown) return null

  const color = resolveColorHex(shown.color, '#E87722')
  const gradient = `linear-gradient(to right, ${hexToRgba(color, 0.08)}, ${hexToRgba(color, 0.95)})`
  const barWidth = embedded ? 'w-full' : 'w-[min(11rem,42vw)]'

  return (
    <div
      className={`map-chrome pointer-events-none rounded-xl px-3 py-2.5 shadow-md transition-all duration-300 ease-out ${className} ${
        visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-[0.98]'
      }`}
      aria-label={`${shown.name ?? shown.slug} density scale`}
    >
      <div className="flex items-center gap-2 mb-1.5 min-w-0">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
          style={{ backgroundColor: color }}
        />
        <span className="truncate text-xs font-semibold map-text">{shown.name ?? shown.slug}</span>
        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide map-text-muted">
          Heatmap
        </span>
      </div>
      <div className={`h-2 rounded-full ring-1 ring-black/5 ${barWidth}`} style={{ background: gradient }} />
      <div className={`mt-1 flex justify-between text-[10px] map-text-muted ${barWidth}`}>
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
  )
}
