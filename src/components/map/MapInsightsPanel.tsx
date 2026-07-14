import { Link } from 'react-router-dom'
import { useTranslation } from '../../i18n/LocaleContext'
import { useDisplayName } from '../../i18n/useDisplayName'
import AssistantMessageContent from '../assistant/AssistantMessageContent'
import type { AreaInsight } from '../../types'

interface MapInsightsPanelProps {
  insight: AreaInsight | null
  loading: boolean
  hasFullAccess: boolean
  onClose: () => void
}

export default function MapInsightsPanel({
  insight,
  loading,
  hasFullAccess,
  onClose,
}: MapInsightsPanelProps) {
  const { m } = useTranslation()
  const displayName = useDisplayName()

  if (!insight && !loading) return null

  const hasMapped = insight?.has_mapped_data !== false && (insight?.feature_count ?? 0) > 0
  const isUnmapped = insight?.insight_tier === 'none' || !hasMapped

  return (
    <div className="absolute bottom-14 right-3 z-20 w-[min(100%,20rem)] bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 text-sm">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
        <span className="font-semibold text-slate-800">{m.map.areaInsights}</span>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 text-lg leading-none"
          aria-label={m.map.closePanel}
        >
          ×
        </button>
      </div>

      <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
        {loading && (
          <div className="flex items-center gap-2 text-slate-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-terra-600 border-t-transparent" />
            {m.map.analyzing}
          </div>
        )}

        {insight && !loading && (
          <>
            {hasMapped && insight!.region && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">{m.map.region}</p>
                <p className="font-medium text-slate-800">{insight!.region}</p>
              </div>
            )}

            {isUnmapped && (
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-xs text-amber-900">
                <p className="font-semibold">{m.map.noMappedAtClick}</p>
                <p className="mt-1 text-amber-800/90 leading-relaxed">{m.map.clickInsideZone}</p>
              </div>
            )}

            {hasMapped && insight!.minerals.length > 0 ? (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">{m.map.mineralsNearby}</p>
                <ul className="space-y-1">
                  {insight!.minerals.map((mineral) => (
                    <li key={mineral.slug} className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: mineral.color }}
                      />
                      <span>{displayName(mineral)}</span>
                      <span className="text-slate-400 text-xs ml-auto">
                        {mineral.occurrence_count != null || mineral.polygon_count != null
                          ? [
                              mineral.occurrence_count
                                ? `${mineral.occurrence_count} pts`
                                : null,
                              mineral.polygon_count
                                ? `${mineral.polygon_count} ${m.map.zones}`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(' · ') || `${mineral.count} ${m.map.zones}`
                          : `${mineral.count} ${m.map.zones}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-slate-500 text-xs">{m.map.noMappedZones}</p>
            )}

            {insight!.structure_orientations?.dominant_trend_label ? (
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                  {m.map.structureTrendTitle}: {insight.structure_orientations.dominant_trend_label}
                  {insight.structure_orientations.mean_trend_deg != null
                    ? ` · ${Math.round(insight.structure_orientations.mean_trend_deg)}°`
                    : ''}
                </span>
              </div>
            ) : null}

            {insight!.ai_insight ? (
              <div className="pt-2 border-t border-slate-100">
                <AssistantMessageContent
                  content={insight!.ai_insight}
                  role="assistant"
                  compact
                  className="text-slate-700 text-xs"
                />
              </div>
            ) : insight!.requires_subscription ? (
              <div className="pt-2 border-t border-slate-100 bg-terra-50/80 -mx-4 px-4 py-3 rounded-b-xl">
                <p className="text-xs text-slate-600 mb-2">
                  {insight.upgrade_message || m.map.subscriberUpsell}
                </p>
                <Link to="/subscriptions" className="btn-primary text-xs !py-1.5 !px-3 inline-block">
                  {m.map.viewPlans}
                </Link>
              </div>
            ) : null}

            {!hasFullAccess && hasMapped && insight!.feature_count > 0 && (
              <p className="text-[11px] text-slate-400">{m.map.previewOnly}</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
