import { useEffect, useMemo, useState } from 'react'
import { hexToRgba, resolveColorHex } from '../../lib/mineralColorUtils'
import { useTranslation } from '../../i18n/LocaleContext'
import type { MineralHeatmapSpec } from './mineralHeatmapLayer'

interface MineralHeatmapColorbarProps {
  spec: MineralHeatmapSpec | null
  loading?: boolean
  /** Stretch gradient to container width (left dock / sheet). */
  embedded?: boolean
  className?: string
}

function markerPercent(value: number, min: number, max: number): number | null {
  if (!Number.isFinite(value) || max <= min) return null
  const pct = ((value - min) / (max - min)) * 100
  if (!Number.isFinite(pct)) return null
  return Math.min(100, Math.max(0, pct))
}

function DashedCircleIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`shrink-0 ${className}`}
      width={14}
      height={14}
      aria-hidden
    >
      <circle
        cx="8"
        cy="8"
        r="5.5"
        fill="none"
        stroke="#64748b"
        strokeWidth="1.5"
        strokeDasharray="3 2"
      />
    </svg>
  )
}

export default function MineralHeatmapColorbar({
  spec,
  loading = false,
  embedded = false,
  className = '',
}: MineralHeatmapColorbarProps) {
  const { m } = useTranslation()
  const [shown, setShown] = useState<MineralHeatmapSpec | null>(null)

  useEffect(() => {
    if (!spec?.points?.length) {
      setShown(null)
      return
    }
    setShown(spec)
  }, [spec])

  const markers = useMemo(() => {
    if (!shown?.points?.length || !shown.concentrationStats) return null
    const weights = shown.points.map((point) => point.weight)
    const min = Math.min(...weights)
    const max = Math.max(...weights)
    const mean = markerPercent(shown.concentrationStats.mean, min, max)
    const median = markerPercent(shown.concentrationStats.median, min, max)
    if (mean == null && median == null) return null
    return { mean, median }
  }, [shown])

  const hasConcentrationAreas = (shown?.contours?.length ?? 0) > 0

  if (!shown && !loading) return null

  const color = resolveColorHex(shown?.color, '#E87722')
  const gradient = `linear-gradient(to right, ${hexToRgba(color, 0.08)}, ${hexToRgba(color, 0.35)}, ${hexToRgba(color, 0.72)}, ${hexToRgba(color, 0.95)})`
  const barWidth = embedded ? 'w-full' : 'w-[min(11rem,42vw)]'

  return (
    <div
      className={`map-chrome pointer-events-none rounded-xl px-3 py-2 shadow-md ${className}`}
      aria-label={
        loading
          ? 'Loading mineral concentration heatmap'
          : `${shown?.name ?? shown?.slug} concentration scale`
      }
      aria-busy={loading}
    >
      <div className="mb-2 flex min-w-0 items-center gap-2">
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10 ${loading ? 'animate-pulse bg-app-subtle' : ''}`}
          style={loading ? undefined : { backgroundColor: color }}
        />
        <span className="truncate text-xs font-semibold map-text">
          {loading ? m.map.heatmapLoading : shown?.name ?? shown?.slug}
        </span>
      </div>

      <div className={`relative h-3 ${barWidth}`}>
        <div
          className={`absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full ring-1 ring-black/5 ${loading ? 'animate-pulse bg-app-subtle' : ''}`}
          style={loading ? undefined : { background: gradient }}
        />
        {!loading && markers?.mean != null && (
          <span
            className="absolute top-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm"
            style={{ left: `${markers.mean}%`, backgroundColor: color }}
            title={`${m.map.heatmapMean} (${shown?.concentrationStats?.mean?.toFixed(2) ?? ''})`}
            aria-label={m.map.heatmapMean}
          />
        )}
        {!loading && markers?.median != null && (
          <span
            className="absolute top-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-app-surface shadow-sm"
            style={{ left: `${markers.median}%`, borderColor: color }}
            title={`${m.map.heatmapMedian} (${shown?.concentrationStats?.median?.toFixed(2) ?? ''})`}
            aria-label={m.map.heatmapMedian}
          />
        )}
      </div>

      {!loading && (
        <>
          <div className={`mt-1.5 flex items-center justify-between text-[10px] map-text-muted ${barWidth}`}>
            <span>{m.map.heatmapLow}</span>
            <span>{m.map.heatmapHigh}</span>
          </div>

          {(markers || hasConcentrationAreas) && (
            <div
              className={`mt-2 space-y-1 border-t border-app-border/50 pt-2 text-[10px] map-text-muted ${barWidth}`}
            >
              {markers && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {markers.mean != null && (
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="inline-block h-2 w-2 rounded-full border border-white/80 shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                      {m.map.heatmapMean}
                    </span>
                  )}
                  {markers.median != null && (
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="inline-block h-2 w-2 rounded-full border-2 bg-app-surface"
                        style={{ borderColor: color }}
                      />
                      {m.map.heatmapMedian}
                    </span>
                  )}
                </div>
              )}
              {hasConcentrationAreas && (
                <span className="inline-flex items-center gap-1.5">
                  <DashedCircleIcon />
                  {m.map.heatmapConcentrationAreas}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
