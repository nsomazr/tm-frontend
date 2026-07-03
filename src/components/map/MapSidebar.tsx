import { Link } from 'react-router-dom'
import { useTranslation } from '../../i18n/LocaleContext'
import { useDisplayName } from '../../i18n/useDisplayName'
import type { AreaInsight, MineralSearchInsight } from '../../types'

interface MapSidebarProps {
  debouncedSearch: string
  searchResults: MineralSearchInsight[]
  searchLoading?: boolean
  selectedMineral: MineralSearchInsight | null
  mineralFilter: string
  onSelectMineral: (mineral: MineralSearchInsight) => void
  onClearFilter: () => void
  areaInsight: AreaInsight | null
  insightLoading: boolean
  hasDetailAccess: boolean
  onClose: () => void
}

function SearchResultsList({
  results,
  loading,
  query,
  onSelect,
}: {
  results: MineralSearchInsight[]
  loading?: boolean
  query: string
  onSelect: (m: MineralSearchInsight) => void
}) {
  const { t, m } = useTranslation()
  const displayName = useDisplayName()

  if (query.length < 2) return null
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-slate-500">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-terra-600 border-t-transparent" />
        {m.map.searching}
      </div>
    )
  }
  if (results.length === 0) {
    return <p className="text-sm text-slate-500 py-2">{t('map.noResults', { query })}</p>
  }
  return (
    <ul className="space-y-2">
      {results.map((item) => (
        <li key={`${item.type ?? 'mineral'}-${item.id}`}>
          <button
            type="button"
            onClick={() => onSelect(item)}
            className="w-full text-left rounded-lg border border-slate-200 p-3 hover:border-terra-300 hover:bg-terra-50/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="font-semibold text-slate-900">{displayName(item)}</span>
            </div>
            {item.top_regions.length > 0 && (
              <p className="text-xs text-slate-600 mt-1.5">
                {item.top_regions.map((r) => `${r.region} (${r.count})`).join(' · ')}
              </p>
            )}
            <p className="text-xs text-slate-400 mt-1">
              {item.type === 'region' ? m.map.region : `${item.feature_count} ${m.map.zones}`}
              {item.type !== 'region' && (
                <> · {item.layer_count} {m.map.layers}</>
              )}
            </p>
          </button>
        </li>
      ))}
    </ul>
  )
}

function MineralDetailCard({ mineral, onClear }: { mineral: MineralSearchInsight; onClear: () => void }) {
  const { m } = useTranslation()
  const displayName = useDisplayName()

  return (
    <div className="rounded-lg border border-terra-200 bg-terra-50/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: mineral.color }} />
          <span className="font-semibold text-slate-900">{displayName(mineral)}</span>
        </div>
        <button type="button" onClick={onClear} className="text-xs text-terra-700 hover:underline shrink-0">
          {m.map.clear}
        </button>
      </div>
      {mineral.description && (
        <p className="text-xs text-slate-600 mt-2 leading-relaxed">{mineral.description}</p>
      )}
      {mineral.top_regions.length > 0 && (
        <ul className="mt-2 space-y-1">
          {mineral.top_regions.map((r) => (
            <li key={r.region} className="flex justify-between text-xs">
              <span className="text-slate-700">{r.region}</span>
              <span className="text-slate-500">{r.count} {m.map.zones}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AnalysisSection({
  insight,
  loading,
  hasDetailAccess,
}: {
  insight: AreaInsight | null
  loading: boolean
  hasDetailAccess: boolean
}) {
  const { m, t } = useTranslation()
  const displayName = useDisplayName()

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-slate-500">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-terra-600 border-t-transparent" />
        {m.map.analyzingMap}
      </div>
    )
  }

  if (!insight) return null

  const hasMapped = insight.has_mapped_data !== false && insight.feature_count > 0
  const isHighlight = insight.insight_tier === 'highlight'
  const isFull = insight.insight_tier === 'full'
  const isUnmapped = insight.insight_tier === 'none' || !hasMapped

  return (
    <div className="space-y-3">
      {hasMapped && insight.region && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{m.map.region}</p>
          <p className="text-sm font-semibold text-slate-900">{insight.region}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('map.mappedZonesInView', { count: insight.feature_count })}
          </p>
        </div>
      )}

      {isUnmapped && (
        <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
          <p className="text-xs font-semibold text-amber-900">{m.map.noMappedAtClick}</p>
          <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">{m.map.clickInsideZone}</p>
        </div>
      )}

      {hasMapped && insight.minerals.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1.5">{m.map.mineralsNearby}</p>
          <ul className="space-y-1.5">
            {insight.minerals.map((mineral) => (
              <li key={mineral.slug} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: mineral.color }} />
                <span className="text-slate-800">{displayName(mineral)}</span>
                <span className="text-slate-400 text-xs ml-auto">{mineral.count} {m.map.zones}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {insight.labels && insight.labels.length > 0 && hasDetailAccess && hasMapped && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">{m.map.zoneLabels}</p>
          <p className="text-xs text-slate-600">{insight.labels.join(', ')}</p>
        </div>
      )}

      {insight.ai_insight && (
        <div className={`rounded-lg border p-3 ${isUnmapped ? 'bg-slate-50 border-slate-200' : 'bg-slate-50 border-slate-100'}`}>
          {!isUnmapped && (
            <p className="text-xs font-semibold text-terra-800 mb-1.5">
              {isFull ? m.map.detailedAnalysis : m.map.highlightInsight}
            </p>
          )}
          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{insight.ai_insight}</p>
        </div>
      )}

      {isHighlight && !hasDetailAccess && hasMapped && (
        <div className="rounded-lg bg-terra-50/60 border border-terra-100 p-3 space-y-2">
          <p className="text-[11px] text-slate-600 leading-relaxed">
            {m.map.subscriberUpsell}{' '}
            <Link to="/subscriptions" className="text-terra-600 hover:underline font-medium">
              {m.map.learnMore}
            </Link>
          </p>
          <Link
            to="/downloads"
            className="inline-flex text-[11px] font-medium text-terra-700 hover:text-terra-800"
          >
            {m.map.reportExploreUpsell} →
          </Link>
        </div>
      )}
    </div>
  )
}

export default function MapSidebar({
  debouncedSearch,
  searchResults,
  searchLoading,
  selectedMineral,
  mineralFilter,
  onSelectMineral,
  onClearFilter,
  areaInsight,
  insightLoading,
  hasDetailAccess,
  onClose,
}: MapSidebarProps) {
  const { m } = useTranslation()

  return (
    <aside className="w-80 sm:w-[22rem] shrink-0 flex flex-col bg-white border-r border-slate-200 h-full z-10 shadow-lg animate-fade-in">
      <div className="shrink-0 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-800">{m.map.explore}</span>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 text-xl leading-none p-1 rounded hover:bg-slate-50"
          aria-label={m.map.closePanel}
        >
          ×
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <section className="p-4 border-b border-slate-100">
          {selectedMineral && mineralFilter ? (
            <MineralDetailCard mineral={selectedMineral} onClear={onClearFilter} />
          ) : (
            <SearchResultsList
              results={searchResults}
              loading={searchLoading}
              query={debouncedSearch}
              onSelect={onSelectMineral}
            />
          )}
        </section>

        {(insightLoading || areaInsight) && (
          <section className="p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
              {m.map.clickToAnalyze}
            </h3>
            <AnalysisSection
              insight={areaInsight}
              loading={insightLoading}
              hasDetailAccess={hasDetailAccess}
            />
          </section>
        )}
      </div>
    </aside>
  )
}
