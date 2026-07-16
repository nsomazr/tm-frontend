import { useEffect, useMemo, useState } from 'react'
import { resolveColorHex } from '../../lib/mineralColorUtils'
import { useTranslation } from '../../i18n/LocaleContext'
import type { MineralHeatmapSpec } from './mineralHeatmapLayer'

export type HeatmapMode = 'single' | 'multi'

interface MineralHeatmapColorbarProps {
  spec: MineralHeatmapSpec | null
  loading?: boolean
  /** Stretch gradient to container width (left dock / sheet). */
  embedded?: boolean
  className?: string
  anomalyOnly?: boolean
  onAnomalyOnlyChange?: (value: boolean) => void
  showAnomalyContour?: boolean
  onShowAnomalyContourChange?: (value: boolean) => void
}

function markerPercent(value: number, min: number, max: number): number | null {
  if (!Number.isFinite(value) || max <= min) return null
  const pct = ((value - min) / (max - min)) * 100
  if (!Number.isFinite(pct)) return null
  return Math.min(100, Math.max(0, pct))
}

export default function MineralHeatmapColorbar({
  spec,
  loading = false,
  embedded = false,
  className = '',
  anomalyOnly = false,
  onAnomalyOnlyChange,
  showAnomalyContour = true,
  onShowAnomalyContourChange,
}: MineralHeatmapColorbarProps) {
  const { m } = useTranslation()
  const [shown, setShown] = useState<MineralHeatmapSpec | null>(null)

  useEffect(() => {
    if (!spec?.points?.length && !spec?.emptyReason) {
      setShown(null)
      return
    }
    setShown(spec)
  }, [spec])

  const cutoffPercent = useMemo(() => {
    if (!shown?.points?.length || shown.concentrationStats?.cutoff == null) return null
    const weights = shown.points.map((point) => point.weight)
    const min = Math.min(...weights)
    const max = Math.max(...weights)
    return markerPercent(shown.concentrationStats.cutoff, min, max)
  }, [shown])

  const showCutoffToggles = Boolean(
    shown?.points?.length &&
      shown?.concentrationStats?.cutoff != null &&
      (onAnomalyOnlyChange || onShowAnomalyContourChange),
  )
  const emptyMessage =
    shown?.emptyDetail ||
    (shown?.emptyReason ? m.map.heatmapNoOverlap : null)

  if (!shown && !loading) return null

  const color = resolveColorHex(shown?.color, '#E87722')
  const gradient =
    'linear-gradient(to right, rgba(0,228,0,.15), rgba(255,255,0,.75), rgba(255,126,0,.9), rgba(255,0,0,.95), rgba(192,0,192,1))'
  const barWidth = embedded ? 'w-full' : 'w-[min(11rem,42vw)]'
  const hasScale = Boolean(shown?.points?.length)

  return (
    <div
      className={`map-chrome rounded-xl px-3 py-2 shadow-md ${
        showCutoffToggles ? 'pointer-events-auto' : 'pointer-events-none'
      } ${className}`}
      aria-label={
        loading
          ? 'Loading mineral concentration heatmap'
          : `${shown?.name ?? shown?.slug ?? 'Mineral'} concentration scale`
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

      {!loading && emptyMessage && !hasScale && (
        <p className="text-[11px] leading-snug map-text-muted">{emptyMessage}</p>
      )}

      {(loading || hasScale) && (
        <div className={`relative h-3 ${barWidth}`}>
          <div
            className={`absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full ring-1 ring-black/5 ${loading ? 'animate-pulse bg-app-subtle' : ''}`}
            style={loading ? undefined : { background: gradient }}
          />
          {!loading && cutoffPercent != null && (
            <span
              className="absolute top-0 z-20 h-3 w-0.5 -translate-x-1/2 bg-red-600 shadow-sm"
              style={{ left: `${cutoffPercent}%` }}
            title={`Peak zone: mean + 2SD = ${shown?.concentrationStats?.cutoff?.toFixed(2) ?? ''}`}
            aria-label="Peak zone threshold"
            />
          )}
        </div>
      )}

      {!loading && hasScale && (
        <>
          <div className={`mt-1.5 flex items-center justify-between text-[10px] map-text-muted ${barWidth}`}>
            <span>{m.map.heatmapLow}</span>
            <span>{m.map.heatmapHigh}</span>
          </div>

          {(shown?.concentrationStats?.cutoff != null || showCutoffToggles) && (
            <div
              className={`mt-2 space-y-1 border-t border-app-border/50 pt-2 text-[10px] map-text-muted ${barWidth}`}
            >
              {shown?.concentrationStats?.cutoff != null && (
                <span className="block font-medium text-orange-700 dark:text-orange-300">
                  {m.map.heatmapPeakZoneHint} = {shown.concentrationStats.cutoff.toFixed(2)}
                </span>
              )}
              {showCutoffToggles && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
                  {onAnomalyOnlyChange && (
                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] map-text">
                      <input
                        type="checkbox"
                        className="checkbox checkbox--sm"
                        checked={anomalyOnly}
                        onChange={(event) => onAnomalyOnlyChange(event.target.checked)}
                      />
                      {m.map.heatmapAnomaliesOnly}
                    </label>
                  )}
                  {onShowAnomalyContourChange && (
                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] map-text">
                      <input
                        type="checkbox"
                        className="checkbox checkbox--sm"
                        checked={showAnomalyContour}
                        onChange={(event) =>
                          onShowAnomalyContourChange(event.target.checked)
                        }
                      />
                      {m.map.heatmapShowPeakOutline}
                    </label>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
