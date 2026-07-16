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
  /** When true, never show the subscribe upsell (admin / paid / manager). */
  hasFullAccess?: boolean
  className?: string
}

/** Compact Ask Terra block — grows only when a summary is present. */
export default function MarketplacePlotInsightCard({
  signedIn,
  loginNext,
  loading,
  error,
  insight,
  onGenerate,
  onClear,
  hasFullAccess = false,
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
  const hasInsightBody = Boolean(insight && !loading)

  return (
    <section
      className={`overflow-hidden rounded-xl border border-terra-500/20 bg-terra-500/[0.06] ${className}`}
    >
      <div className="flex items-center gap-3 px-3.5 py-3">
        <TerraAssistantAvatar className="h-8 w-8 shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-app-text">Ask Terra</h3>
          <p className="text-xs text-app-muted">Geology near this plot</p>
        </div>
        {hasInsightBody ? (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 text-[11px] font-medium text-app-muted hover:text-app-text"
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="space-y-3 border-t border-terra-500/15 px-3.5 py-3">
        {!signedIn ? (
          <p className="text-sm leading-relaxed text-app-muted">
            <Link
              to={loginNext}
              className="font-semibold text-terra-700 hover:underline dark:text-terra-300"
            >
              Sign in
            </Link>{' '}
            to generate a Terra summary for this plot.
          </p>
        ) : loading ? (
          <InsightGenerationLoader variant="insight" compact />
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

        {hasInsightBody ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {region ? <StatChip label="Region" value={region} /> : null}
              <StatChip
                label="Mapped areas"
                value={hasMapped ? String(insight!.feature_count) : 'None nearby'}
              />
              {insight!.total_area_km2 != null && insight!.total_area_km2 > 0 ? (
                <StatChip label="Coverage" value={formatAreaKm2(insight!.total_area_km2)} />
              ) : null}
              {terrain ? (
                <StatChip
                  label="Elevation"
                  value={`${Math.round(terrain.elevation_m)} m · ${terrain.relief_class}`}
                />
              ) : (
                <StatChip
                  label="Location"
                  value={`${insight!.lat.toFixed(3)}, ${insight!.lng.toFixed(3)}`}
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
              </div>
            ) : null}

            {minerals.length > 0 ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-app-muted">
                  Nearby commodities
                </p>
                <ul className="mt-1.5 space-y-1">
                  {minerals.slice(0, 6).map((mineral) => (
                    <li
                      key={mineral.slug}
                      className="flex items-center gap-2 rounded-lg bg-app-bg/70 px-2 py-1.5 text-xs text-app-text"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: mineral.color }}
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">{displayName(mineral)}</span>
                      <span className="shrink-0 text-app-muted">
                        {[
                          mineral.occurrence_count ? `${mineral.occurrence_count} pts` : null,
                          mineral.polygon_count ? `${mineral.polygon_count} areas` : null,
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
              <p className="text-xs text-app-muted">No mapped mineral zones at this plot yet.</p>
            )}

            {insight!.ai_insight ? (
              <div className="border-t border-terra-500/15 pt-3">
                <AssistantMessageContent
                  content={insight!.ai_insight}
                  role="assistant"
                  className="text-[14px] leading-relaxed text-app-text [&_p]:mb-2.5 [&_p:last-child]:mb-0"
                />
              </div>
            ) : insight!.requires_subscription && !hasFullAccess ? (
              <div className="rounded-lg bg-terra-50/90 px-3 py-2.5 dark:bg-terra-500/10">
                <p className="text-xs text-app-text-secondary">
                  {insight!.upgrade_message ||
                    'Upgrade to unlock the full Terra narrative for this plot.'}
                </p>
                <Link
                  to="/subscriptions"
                  className="btn-primary mt-2 inline-flex text-xs !px-3 !py-1.5"
                >
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
