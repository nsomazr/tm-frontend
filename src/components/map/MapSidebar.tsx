import { Link } from 'react-router-dom'
import { useTranslation } from '../../i18n/LocaleContext'
import { useDisplayName } from '../../i18n/useDisplayName'
import { TerraAssistantAvatar } from '../assistant/AssistantIcons'
import AssistantMessageContent from '../assistant/AssistantMessageContent'
import type { AreaInsight, MineralSearchInsight } from '../../types'
import { formatAreaKm2 } from './mapFormat'

const FREE_REGION_PREVIEW = 3

function isRegionSearchResult(item: MineralSearchInsight) {
  return item.type === 'region' || item.type === 'region_boundary' || item.type === 'district_boundary' || item.type === 'ward_boundary' || item.type === 'village_boundary'
}

interface MapSidebarProps {
  debouncedSearch: string
  searchResults: MineralSearchInsight[]
  searchLoading?: boolean
  selectedMineral: MineralSearchInsight | null
  mineralFilter: string
  previewInsight: AreaInsight | null
  previewLoading?: boolean
  hasPaidAccess: boolean
  onSelectMineral: (mineral: MineralSearchInsight) => void
  onClearFilter: () => void
  onAskTerra: (item: MineralSearchInsight) => void
  askTerraLoading?: boolean
  isMobile?: boolean
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
      <div className="flex items-center gap-2 py-3 text-sm map-text-muted">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-terra-600 border-t-transparent" />
        {m.map.searching}
      </div>
    )
  }
  if (results.length === 0) {
    return <p className="text-sm map-text-muted py-2">{t('map.noResults', { query })}</p>
  }
  return (
    <ul className="space-y-2">
      {results.map((item) => {
        const isRegion = item.type === 'region' || item.type === 'region_boundary' || item.type === 'district_boundary' || item.type === 'ward_boundary' || item.type === 'village_boundary'
        const isLayer = item.type === 'layer'
        const isDistrict = item.type === 'district_boundary'
        const isWard = item.type === 'ward_boundary'
        const isVillage = item.type === 'village_boundary'
        const preview = isRegion
          ? item.top_minerals?.slice(0, 3).map((min) => displayName(min)).join(', ')
          : item.top_regions?.slice(0, 3).map((r) => r.region).join(', ')
        const typeLabel = isVillage
          ? m.map.searchVillageBoundary
          : isDistrict
          ? m.map.searchDistrictBoundary
          : isWard
            ? m.map.searchWardBoundary
          : item.type === 'region_boundary'
            ? m.map.searchRegionBoundary
            : isRegion
              ? m.map.region
              : isLayer
                ? m.map.commodityLayer
                : m.map.mineralType
        return (
          <li key={`${item.type}-${item.id}`}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              className="w-full text-left rounded-lg px-3 py-2.5 hover:bg-app-subtle transition-colors border border-transparent hover:border-app-border"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-semibold map-text">{displayName(item)}</span>
                <span className="text-[10px] uppercase tracking-wide map-text-muted ml-auto shrink-0">
                  {typeLabel}
                </span>
              </div>
              {preview && (
                <p className="text-xs map-text-secondary mt-1 ml-5 line-clamp-2">
                  {isRegion ? m.map.mineralsInRegion : m.map.regionsWithMineral}: {preview}
                </p>
              )}
              {item.feature_count > 0 && (
                <p className="text-xs map-text-muted mt-0.5 ml-5">
                  {item.feature_count} {m.map.zones}
                  {item.layer_count > 0 && ` · ${item.layer_count} ${m.map.layers}`}
                </p>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function layerTypeLabel(layerType: string | undefined, m: ReturnType<typeof useTranslation>['m']) {
  if (layerType === 'point') return m.map.points
  if (layerType === 'line') return m.map.lines
  if (layerType === 'polygon') return m.map.polygons
  const fromDesc = (layerType || '').replace(/^uploaded\s+/i, '').replace(/\s+layer$/i, '')
  if (fromDesc) return fromDesc.charAt(0).toUpperCase() + fromDesc.slice(1)
  return m.map.commodityLayer
}

function formatLayerDescription(description: string | undefined, m: ReturnType<typeof useTranslation>['m']) {
  if (!description?.trim()) return null
  const match = description.trim().match(/^Uploaded\s+(\w+)\s+layer$/i)
  if (match) return `${layerTypeLabel(match[1].toLowerCase(), m)} layer`
  return description.trim()
}

function SubscribeInsightBanner({ message }: { message?: string }) {
  const { m } = useTranslation()
  return (
    <div className="rounded-xl border border-terra-200/80 bg-terra-50/40 dark:bg-terra-950/20 dark:border-terra-800/50 p-3">
      <p className="text-xs map-text-secondary leading-relaxed">
        {message || m.map.subscribeForInsights}
      </p>
      <Link
        to="/subscriptions"
        className="mt-2 inline-block text-xs font-semibold text-terra-700 dark:text-terra-400 hover:text-terra-800"
      >
        {m.map.viewPlans} →
      </Link>
    </div>
  )
}

function PreviewInsightBlock({
  insight,
  loading,
  hasPaidAccess,
}: {
  insight: AreaInsight | null
  loading?: boolean
  hasPaidAccess: boolean
}) {
  const { m } = useTranslation()

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm map-text-muted py-1">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-terra-600 border-t-transparent" />
        {m.map.analyzing}
      </div>
    )
  }

  if (!insight?.ai_insight) return null

  return (
    <div className="rounded-lg border app-divider bg-app-subtle/50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide map-text-muted mb-2">
        {hasPaidAccess ? m.map.aiAnalysis : m.map.mapPreviewInsight}
      </p>
      <AssistantMessageContent
        content={insight.ai_insight}
        role="assistant"
        compact
        className="map-text-secondary"
      />
      {!hasPaidAccess && insight.insight_tier === 'basic' && (
        <p className="text-[11px] map-text-muted mt-2">{m.map.previewOnly}</p>
      )}
    </div>
  )
}

function RegionList({
  regions,
  hasPaidAccess,
}: {
  regions: { region: string; count: number }[]
  hasPaidAccess: boolean
}) {
  const { m, t } = useTranslation()
  const limit = hasPaidAccess ? regions.length : FREE_REGION_PREVIEW
  const visible = regions.slice(0, limit)
  const hidden = regions.length - visible.length

  if (regions.length === 0) return null

  return (
    <div className="mt-3">
      <p className="text-xs font-semibold uppercase tracking-wide map-text-muted mb-2">
        {m.map.whereToFind}
      </p>
      <ul className="space-y-1.5">
        {visible.map((r) => (
          <li key={r.region} className="flex justify-between gap-2 text-sm">
            <span className="map-text">{r.region}</span>
            <span className="map-text-muted shrink-0">
              {r.count} {m.map.zones}
            </span>
          </li>
        ))}
      </ul>
      {!hasPaidAccess && hidden > 0 && (
        <p className="text-xs map-text-muted mt-2">{t('map.moreRegionsLocked', { count: hidden })}</p>
      )}
    </div>
  )
}

function AskTerraButton({
  label,
  loading,
  onClick,
}: {
  label: string
  loading?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-terra-600 text-white text-sm font-medium px-3 py-2.5 hover:bg-terra-700 transition-colors disabled:opacity-60"
    >
      {loading ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
      ) : (
        <TerraAssistantAvatar className="h-5 w-5" />
      )}
      {label}
    </button>
  )
}

function MineralDetailCard({
  mineral,
  onClear,
  onAskTerra,
  askTerraLoading,
  hasPaidAccess,
  previewInsight,
  previewLoading,
}: {
  mineral: MineralSearchInsight
  onClear: () => void
  onAskTerra: () => void
  askTerraLoading?: boolean
  hasPaidAccess: boolean
  previewInsight: AreaInsight | null
  previewLoading?: boolean
}) {
  const { t, m } = useTranslation()
  const displayName = useDisplayName()
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-terra-200/80 bg-terra-50/30 dark:bg-terra-950/20 dark:border-terra-800/50 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: mineral.color }} />
            <div className="min-w-0">
              <span className="font-semibold map-text block">{displayName(mineral)}</span>
              {mineral.feature_count > 0 && (
                <p className="text-xs map-text-muted mt-0.5">
                  {t('map.mappedZonesInView', { count: mineral.feature_count })}
                  {mineral.layer_count > 0 && ` · ${mineral.layer_count} ${m.map.layers}`}
                </p>
              )}
            </div>
          </div>
          <button type="button" onClick={onClear} className="text-xs map-text-muted hover:text-app-secondary shrink-0">
            {m.map.clear}
          </button>
        </div>

        {mineral.description?.trim() && (
          <p className="text-sm map-text-secondary mt-2 leading-relaxed">{mineral.description.trim()}</p>
        )}

        <RegionList regions={mineral.top_regions} hasPaidAccess={hasPaidAccess} />

        {mineral.feature_count === 0 && (
          <p className="text-sm map-text-muted mt-2">{m.map.noMappedZones}</p>
        )}
      </div>

      <PreviewInsightBlock
        insight={previewInsight}
        loading={previewLoading}
        hasPaidAccess={hasPaidAccess}
      />

      {!hasPaidAccess && mineral.feature_count > 0 && (
        <SubscribeInsightBanner message={previewInsight?.upgrade_message} />
      )}

      <p className="text-xs map-text-muted leading-relaxed">{m.map.searchDetailHint}</p>

      <AskTerraButton
        label={t('map.askTerraAbout', { name: displayName(mineral) })}
        loading={askTerraLoading}
        onClick={onAskTerra}
      />
    </div>
  )
}

function LayerDetailCard({
  layer,
  onClear,
  onAskTerra,
  askTerraLoading,
  hasPaidAccess,
  previewInsight,
  previewLoading,
}: {
  layer: MineralSearchInsight
  onClear: () => void
  onAskTerra: () => void
  askTerraLoading?: boolean
  hasPaidAccess: boolean
  previewInsight: AreaInsight | null
  previewLoading?: boolean
}) {
  const { t, m } = useTranslation()
  const displayName = useDisplayName()
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-terra-200/80 bg-terra-50/30 dark:bg-terra-950/20 dark:border-terra-800/50 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: layer.color }} />
            <div className="min-w-0">
              <span className="font-semibold map-text block">{displayName(layer)}</span>
              <p className="text-xs map-text-muted mt-0.5">{m.map.commodityLayer}</p>
              {layer.feature_count > 0 && (
                <p className="text-xs map-text-secondary mt-1">
                  {t('map.mappedZonesInView', { count: layer.feature_count })}
                </p>
              )}
            </div>
          </div>
          <button type="button" onClick={onClear} className="text-xs map-text-muted hover:text-app-secondary shrink-0">
            {m.map.clear}
          </button>
        </div>

        {layer.description?.trim() && (
          <p className="text-sm map-text-secondary mt-2 leading-relaxed">
            {formatLayerDescription(layer.description, m)}
          </p>
        )}

        <RegionList regions={layer.top_regions} hasPaidAccess={hasPaidAccess} />

        {layer.feature_count === 0 && (
          <p className="text-sm map-text-muted mt-2">{m.map.noMappedZones}</p>
        )}
      </div>

      <PreviewInsightBlock
        insight={previewInsight}
        loading={previewLoading}
        hasPaidAccess={hasPaidAccess}
      />

      {!hasPaidAccess && layer.feature_count > 0 && (
        <SubscribeInsightBanner message={previewInsight?.upgrade_message} />
      )}

      <p className="text-xs map-text-muted leading-relaxed">{m.map.searchDetailHint}</p>

      <AskTerraButton
        label={t('map.askTerraAbout', { name: displayName(layer) })}
        loading={askTerraLoading}
        onClick={onAskTerra}
      />
    </div>
  )
}

function RegionDetailCard({
  region,
  onClear,
  onAskTerra,
  askTerraLoading,
  hasPaidAccess,
  previewInsight,
  previewLoading,
}: {
  region: MineralSearchInsight
  onClear: () => void
  onAskTerra: () => void
  askTerraLoading?: boolean
  hasPaidAccess: boolean
  previewInsight: AreaInsight | null
  previewLoading?: boolean
}) {
  const { t, m } = useTranslation()
  const displayName = useDisplayName()
  const minerals = region.top_minerals ?? []
  const mineralLimit = hasPaidAccess ? minerals.length : FREE_REGION_PREVIEW
  const visibleMinerals = minerals.slice(0, mineralLimit)
  const hiddenMinerals = minerals.length - visibleMinerals.length
  const isDistrict = region.type === 'district_boundary'
  const isWard = region.type === 'ward_boundary'
  const isVillage = region.type === 'village_boundary'

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-app-border p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="font-semibold map-text block">{displayName(region)}</span>
            <p className="text-xs map-text-muted mt-0.5">
              {isVillage
                ? m.map.searchVillageBoundary
                : isDistrict
                ? m.map.searchDistrictBoundary
                : isWard
                  ? m.map.searchWardBoundary
                  : m.map.searchRegionBoundary}
              {region.description?.trim() ? ` · ${region.description.trim()}` : ''}
            </p>
            {region.feature_count > 0 && (
              <p className="text-xs map-text-secondary mt-1">
                {t('map.mappedZonesInView', { count: region.feature_count })}
              </p>
            )}
          </div>
          <button type="button" onClick={onClear} className="text-xs map-text-muted hover:text-app-secondary shrink-0">
            {m.map.clear}
          </button>
        </div>

        {region.description?.trim() && region.type === 'region' && (
          <p className="text-sm map-text-secondary mt-2">{region.description.trim()}</p>
        )}

        {minerals.length > 0 ? (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide map-text-muted mb-2">
              {m.map.mineralsInThisRegion}
            </p>
            <ul className="space-y-1.5">
              {visibleMinerals.map((min) => (
                <li key={min.slug} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: min.color }} />
                    <span className="map-text truncate">{displayName(min)}</span>
                  </span>
                  <span className="map-text-muted shrink-0 text-right">
                    {min.count} {m.map.zones}
                    {hasPaidAccess && min.area_km2 != null && min.area_km2 > 0 && (
                      <> · {formatAreaKm2(min.area_km2)}</>
                    )}
                  </span>
                </li>
              ))}
            </ul>
            {!hasPaidAccess && hiddenMinerals > 0 && (
              <p className="text-xs map-text-muted mt-2">
                {t('map.moreRegionsLocked', { count: hiddenMinerals })}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm map-text-muted mt-2">{m.map.noMappedZones}</p>
        )}
      </div>

      <PreviewInsightBlock
        insight={previewInsight}
        loading={previewLoading}
        hasPaidAccess={hasPaidAccess}
      />

      {!hasPaidAccess && region.feature_count > 0 && (
        <SubscribeInsightBanner message={previewInsight?.upgrade_message} />
      )}

      <p className="text-xs map-text-muted leading-relaxed">{m.map.regionDetailHint}</p>

      <AskTerraButton
        label={t('map.askTerraRegion', { name: displayName(region) })}
        loading={askTerraLoading}
        onClick={onAskTerra}
      />
    </div>
  )
}

function MobileSheetHandle() {
  return (
    <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
      <div className="h-1 w-10 rounded-full bg-app-border" />
    </div>
  )
}

export default function MapSidebar({
  debouncedSearch,
  searchResults,
  searchLoading,
  selectedMineral,
  mineralFilter,
  previewInsight,
  previewLoading,
  hasPaidAccess,
  onSelectMineral,
  onClearFilter,
  onAskTerra,
  askTerraLoading,
  isMobile = false,
  onClose,
}: MapSidebarProps) {
  const { m } = useTranslation()

  const showSearch = debouncedSearch.length >= 2 || !!selectedMineral
  const mobileBottom = 'bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))]'

  return (
    <aside
      className={`fixed z-50 flex flex-col bg-app-surface shadow-2xl animate-fade-in overflow-hidden
        left-[max(0.75rem,env(safe-area-inset-left,0px))]
        right-[max(0.75rem,env(safe-area-inset-right,0px))]
        w-auto rounded-2xl border border-app-border-strong
        ${mobileBottom}
        ${isMobile ? 'max-h-[min(55vh,360px)]' : ''}
        sm:static sm:inset-auto sm:z-10 sm:w-[24rem] sm:max-h-none sm:rounded-none sm:border-t-0 sm:border-r sm:shadow-lg sm:shrink-0 sm:h-full sm:bottom-auto sm:overflow-visible`}
    >
      <MobileSheetHandle />
      <div className="shrink-0 px-3 py-2 sm:px-4 sm:py-3 flex items-center justify-between gap-2 border-b app-divider">
        <span className="text-sm font-semibold map-text truncate">{m.map.explore}</span>
        <button
          type="button"
          onClick={onClose}
          className="map-text-muted hover:text-app-secondary text-xl leading-none p-1 rounded hover:bg-app-subtle shrink-0"
          aria-label={m.map.closePanel}
        >
          ×
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {showSearch &&
          (selectedMineral && isRegionSearchResult(selectedMineral) ? (
            <RegionDetailCard
              region={selectedMineral}
              onClear={onClearFilter}
              onAskTerra={() => onAskTerra(selectedMineral)}
              askTerraLoading={askTerraLoading}
              hasPaidAccess={hasPaidAccess}
              previewInsight={previewInsight}
              previewLoading={previewLoading}
            />
          ) : selectedMineral?.type === 'layer' ? (
            <LayerDetailCard
              layer={selectedMineral}
              onClear={onClearFilter}
              onAskTerra={() => onAskTerra(selectedMineral)}
              askTerraLoading={askTerraLoading}
              hasPaidAccess={hasPaidAccess}
              previewInsight={previewInsight}
              previewLoading={previewLoading}
            />
          ) : selectedMineral && (mineralFilter || selectedMineral.type === 'mineral') ? (
            <MineralDetailCard
              mineral={selectedMineral}
              onClear={onClearFilter}
              onAskTerra={() => onAskTerra(selectedMineral)}
              askTerraLoading={askTerraLoading}
              hasPaidAccess={hasPaidAccess}
              previewInsight={previewInsight}
              previewLoading={previewLoading}
            />
          ) : (
            <SearchResultsList
              results={searchResults}
              loading={searchLoading}
              query={debouncedSearch}
              onSelect={onSelectMineral}
            />
          ))}
      </div>
    </aside>
  )
}
