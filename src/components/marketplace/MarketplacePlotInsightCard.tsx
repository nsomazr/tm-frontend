import { Link } from 'react-router-dom'
import AssistantMessageContent from '../assistant/AssistantMessageContent'
import InsightGenerationLoader from '../assistant/InsightGenerationLoader'
import { TerraAssistantAvatar } from '../assistant/AssistantIcons'
import { formatAreaKm2 } from '../map/mapFormat'
import { useDisplayName } from '../../i18n/useDisplayName'
import type { AreaInsight } from '../../types'

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-app-bg/80 px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-app-muted">{label}</p>
      <p className="mt-0.5 truncate text-xs font-semibold text-app-text" title={value}>
        {value}
      </p>
    </div>
  )
}

interface MarketplacePlotInsightCardProps {
  signedIn: boolean
  loginNext: string
  loading: boolean
  error: string | null
  insight: AreaInsight | null
  onGenerate: () => void
  onClear: () => void
  className?: string
}

export default function MarketplacePlotInsightCard({
  signedIn,
  loginNext,
  loading,
  error,
  insight,
  onGenerate,
  onClear,
  className = '',
}: MarketplacePlotInsightCardProps) {
  const displayName = useDisplayName()
  const terrain = insight?.terrain_context
  const minerals = insight?.minerals ?? []
  const region =
    insight?.region ||
    insight?.geographic_region ||
    insight?.region_boundary?.name ||
    insight?.district_boundary?.name ||
    null
  const hasMapped = insight?.has_mapped_data !== false && (insight?.feature_count ?? 0) > 0

  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border border-terra-200/70 bg-gradient-to-b from-terra-50/90 to-app-surface shadow-sm dark:border-terra-500/20 dark:from-terra-950/40 dark:to-app-surface ${className}`}
    >
      <div className="flex shrink-0 items-start gap-3 px-3.5 pt-3.5">
        <TerraAssistantAvatar className="mt-0.5 h-9 w-9 shadow-sm shadow-terra-600/10" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-app-text">Ask Terra</h3>
              <p className="mt-0.5 text-xs leading-relaxed text-app-muted">
                Geology and mapped data around this plot.
              </p>
            </div>
            {insight && !loading ? (
              <button
                type="button"
                onClick={onClear}
                className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] text-app-muted transition-colors hover:bg-app-subtle hover:text-app-text"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3.5 pb-3.5 pt-3">
        {!signedIn ? (
          <p className="rounded-xl border border-dashed border-app-border bg-app-bg/60 px-3 py-2.5 text-sm text-app-muted">
            <Link to={loginNext} className="font-medium text-terra-700 hover:underline dark:text-terra-300">
              Sign in
            </Link>{' '}
            to generate a Terra summary for this plot.
          </p>
        ) : loading ? (
          <div className="rounded-xl border app-divider bg-app-surface/80 px-2 py-2">
            <InsightGenerationLoader variant="insight" compact />
          </div>
        ) : (
          <button
            type="button"
            className={`${insight ? 'btn-secondary' : 'btn-primary'} w-full text-sm`}
            onClick={onGenerate}
          >
            {insight ? 'Refresh summary' : 'Get plot summary'}
          </button>
        )}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {insight && !loading ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {region ? <StatChip label="Region" value={region} /> : null}
              <StatChip
                label="Mapped areas"
                value={hasMapped ? String(insight.feature_count) : 'None nearby'}
              />
              {insight.total_area_km2 != null && insight.total_area_km2 > 0 ? (
                <StatChip label="Coverage" value={formatAreaKm2(insight.total_area_km2)} />
              ) : null}
              {terrain ? (
                <StatChip
                  label="Elevation"
                  value={`${Math.round(terrain.elevation_m)} m · ${terrain.relief_class}`}
                />
              ) : (
                <StatChip
                  label="Location"
                  value={`${insight.lat.toFixed(3)}, ${insight.lng.toFixed(3)}`}
                />
              )}
            </div>

            {terrain ? (
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-app-subtle px-2 py-0.5 text-[11px] text-app-text-secondary">
                  {terrain.slope_class} slope
                </span>
                <span className="rounded-full bg-app-subtle px-2 py-0.5 text-[11px] text-app-text-secondary">
                  {terrain.landform_hint}
                </span>
                <span className="rounded-full bg-app-subtle px-2 py-0.5 text-[11px] text-app-text-secondary">
                  Relief {Math.round(terrain.relief_m)} m
                </span>
                {insight.structure_orientations?.dominant_trend_label ? (
                  <span className="rounded-full bg-app-subtle px-2 py-0.5 text-[11px] text-app-text-secondary">
                    Trend {insight.structure_orientations.dominant_trend_label}
                    {insight.structure_orientations.mean_trend_deg != null
                      ? ` · ${Math.round(insight.structure_orientations.mean_trend_deg)}°`
                      : ''}
                  </span>
                ) : null}
              </div>
            ) : insight.structure_orientations?.dominant_trend_label ? (
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-app-subtle px-2 py-0.5 text-[11px] text-app-text-secondary">
                  Trend {insight.structure_orientations.dominant_trend_label}
                  {insight.structure_orientations.mean_trend_deg != null
                    ? ` · ${Math.round(insight.structure_orientations.mean_trend_deg)}°`
                    : ''}
                </span>
              </div>
            ) : null}

            {minerals.length > 0 ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-app-muted">
                  Commodities nearby
                </p>
                <ul className="mt-1.5 space-y-1">
                  {minerals.slice(0, 6).map((mineral) => (
                    <li
                      key={mineral.slug}
                      className="flex items-center gap-2 rounded-lg bg-app-subtle/60 px-2 py-1.5 text-xs text-app-text"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: mineral.color }}
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">{displayName(mineral)}</span>
                      <span className="shrink-0 text-app-muted">
                        {[
                          mineral.occurrence_count
                            ? `${mineral.occurrence_count} pts`
                            : null,
                          mineral.polygon_count
                            ? `${mineral.polygon_count} areas`
                            : null,
                          !mineral.occurrence_count && !mineral.polygon_count
                            ? String(mineral.count)
                            : null,
                          mineral.area_km2 != null && mineral.area_km2 > 0
                            ? formatAreaKm2(mineral.area_km2)
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                No mapped mineral zones at this plot yet. Terra can still summarize local context.
              </p>
            )}

            {insight.ai_insight ? (
              <div className="border-t app-divider pt-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-app-muted">
                  Terra narrative
                </p>
                <AssistantMessageContent
                  content={insight.ai_insight}
                  role="assistant"
                  className="text-app-text text-[15px] leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0"
                />
              </div>
            ) : insight.requires_subscription ? (
              <div className="rounded-lg bg-terra-50/90 px-3 py-2.5 dark:bg-terra-500/10">
                <p className="text-xs text-app-text-secondary">
                  {insight.upgrade_message || 'Upgrade to unlock the full Terra narrative for this plot.'}
                </p>
                <Link to="/subscriptions" className="btn-primary mt-2 inline-flex text-xs !py-1.5 !px-3">
                  View plans
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}
