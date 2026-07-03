import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import TerraAssistantPanel, { type TerraAssistantMapContext } from '../assistant/TerraAssistantPanel'
import { TerraAssistantAvatar } from '../assistant/AssistantIcons'
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
  onAskTerra: (item: MineralSearchInsight) => void
  askTerraLoading?: boolean
  areaInsight: AreaInsight | null
  insightLoading: boolean
  hasPaidAccess: boolean
  mapContext: TerraAssistantMapContext | null
  assistantOpen?: boolean
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
        const isRegion = item.type === 'region'
        const preview = isRegion
          ? item.top_minerals?.slice(0, 3).map((min) => displayName(min)).join(', ')
          : item.top_regions?.slice(0, 3).map((r) => r.region).join(', ')
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
                  {isRegion ? m.map.region : m.map.mineralType}
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
}: {
  mineral: MineralSearchInsight
  onClear: () => void
  onAskTerra: () => void
  askTerraLoading?: boolean
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

        {mineral.top_regions.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide map-text-muted mb-2">
              {m.map.whereToFind}
            </p>
            <ul className="space-y-1.5">
              {mineral.top_regions.map((r) => (
                <li key={r.region} className="flex justify-between gap-2 text-sm">
                  <span className="map-text">{r.region}</span>
                  <span className="map-text-muted shrink-0">
                    {r.count} {m.map.zones}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {mineral.feature_count === 0 && (
          <p className="text-sm map-text-muted mt-2">{m.map.noMappedZones}</p>
        )}
      </div>

      <p className="text-xs map-text-muted leading-relaxed">{m.map.searchDetailHint}</p>

      <AskTerraButton
        label={t('map.askTerraAbout', { name: displayName(mineral) })}
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
}: {
  region: MineralSearchInsight
  onClear: () => void
  onAskTerra: () => void
  askTerraLoading?: boolean
}) {
  const { t, m } = useTranslation()
  const displayName = useDisplayName()
  const minerals = region.top_minerals ?? []

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-app-border p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="font-semibold map-text block">{displayName(region)}</span>
            <p className="text-xs map-text-muted mt-0.5">{m.map.region}</p>
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

        {region.description?.trim() && (
          <p className="text-sm map-text-secondary mt-2">{region.description.trim()}</p>
        )}

        {minerals.length > 0 ? (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide map-text-muted mb-2">
              {m.map.mineralsInThisRegion}
            </p>
            <ul className="space-y-1.5">
              {minerals.map((min) => (
                <li key={min.slug} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: min.color }} />
                    <span className="map-text truncate">{displayName(min)}</span>
                  </span>
                  <span className="map-text-muted shrink-0">
                    {min.count} {m.map.zones}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm map-text-muted mt-2">{m.map.noMappedZones}</p>
        )}
      </div>

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
    <div className="flex justify-center pt-2 pb-0.5">
      <div className="h-1 w-8 rounded-full bg-app-border" />
    </div>
  )
}

function AssistantHeader({
  title,
  onClose,
  closeLabel,
}: {
  title: string
  onClose: () => void
  closeLabel: string
}) {
  return (
    <div className="shrink-0 px-3 py-2 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <TerraAssistantAvatar className="h-6 w-6" />
        <span className="text-sm font-semibold map-text truncate">{title}</span>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="map-text-muted hover:text-app-secondary text-xl leading-none p-1 rounded hover:bg-app-subtle shrink-0"
        aria-label={closeLabel}
      >
        ×
      </button>
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
  onAskTerra,
  askTerraLoading,
  areaInsight,
  insightLoading,
  hasPaidAccess,
  mapContext,
  assistantOpen = false,
  isMobile = false,
  onClose,
}: MapSidebarProps) {
  const { m } = useTranslation()
  const assistantRef = useRef<HTMLDivElement>(null)

  const showAssistant = assistantOpen || insightLoading || !!areaInsight
  const showSearch = !assistantOpen && (debouncedSearch.length >= 2 || !!selectedMineral)
  const panelTitle = showAssistant ? m.assistant.sectionTitle : m.map.explore
  const useMobileSheet = isMobile && showAssistant

  useEffect(() => {
    if (!useMobileSheet || insightLoading) return
    assistantRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [areaInsight, insightLoading, useMobileSheet])

  const assistantBody = (
    <TerraAssistantPanel
      insight={areaInsight}
      loading={insightLoading}
      hasPaidAccess={hasPaidAccess}
      mapContext={mapContext}
      mode="map"
      layout="compact"
      mobileSheet={useMobileSheet}
    />
  )

  if (useMobileSheet) {
    return createPortal(
      <>
        <button
          type="button"
          aria-label={m.map.closePanel}
          className="fixed inset-0 z-40 bg-black/25"
          onClick={onClose}
        />
        <aside className="map-assistant-sheet animate-fade-in">
          <MobileSheetHandle />
          <AssistantHeader title={panelTitle} onClose={onClose} closeLabel={m.map.closePanel} />
          <div ref={assistantRef} className="relative flex min-h-0 flex-1 flex-col overflow-hidden h-full">
            {assistantBody}
          </div>
        </aside>
      </>,
      document.body
    )
  }

  const mobileBottom = 'bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))]'

  return (
    <aside
      className={`fixed z-50 flex flex-col bg-app-surface shadow-2xl animate-fade-in overflow-hidden
        left-[max(0.75rem,env(safe-area-inset-left,0px))]
        right-[max(0.75rem,env(safe-area-inset-right,0px))]
        w-auto rounded-2xl border border-app-border-strong
        ${mobileBottom}
        ${isMobile && !showAssistant ? 'max-h-[min(55vh,360px)]' : isMobile && showAssistant ? 'h-[min(72vh,520px)] max-h-[min(72vh,520px)]' : ''}
        sm:static sm:inset-auto sm:z-10 sm:w-[24rem] sm:max-h-none sm:rounded-none sm:border-t-0 sm:border-r sm:shadow-lg sm:shrink-0 sm:h-full sm:bottom-auto sm:overflow-visible`}
    >
    <div className={`shrink-0 px-3 py-2 sm:px-4 sm:py-3 flex items-center justify-between gap-2 ${showAssistant ? '' : 'border-b app-divider'}`}>
        <div className="flex items-center gap-2 min-w-0">
          {showAssistant && <TerraAssistantAvatar className="h-6 w-6 sm:h-7 sm:w-7" />}
          <span className="text-sm font-semibold map-text truncate">{panelTitle}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="map-text-muted hover:text-app-secondary text-xl leading-none p-1 rounded hover:bg-app-subtle shrink-0"
          aria-label={m.map.closePanel}
        >
          ×
        </button>
      </div>

      {showAssistant ? (
        <div ref={assistantRef} className="relative flex min-h-0 flex-1 flex-col overflow-hidden h-full">
          {assistantBody}
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {showSearch &&
            (selectedMineral?.type === 'region' ? (
              <RegionDetailCard
                region={selectedMineral}
                onClear={onClearFilter}
                onAskTerra={() => onAskTerra(selectedMineral)}
                askTerraLoading={askTerraLoading}
              />
            ) : selectedMineral && mineralFilter ? (
              <MineralDetailCard
                mineral={selectedMineral}
                onClear={onClearFilter}
                onAskTerra={() => onAskTerra(selectedMineral)}
                askTerraLoading={askTerraLoading}
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
      )}
    </aside>
  )
}
