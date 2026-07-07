import TerraAssistantPanel, {
  type TerraAssistantMapContext,
} from '../assistant/TerraAssistantPanel'
import { TerraAssistantAvatar } from '../assistant/AssistantIcons'
import { useTranslation } from '../../i18n/LocaleContext'
import type { AreaInsight } from '../../types'
import TerraAssistantButton from './TerraAssistantButton'

import type { InsightSnapshotContext } from './insightSnapshot'

interface TerraAssistantLauncherProps {
  open: boolean
  onToggle: () => void
  onClose: () => void
  areaInsight: AreaInsight | null
  insightLoading: boolean
  insightLoadingTerrainView?: boolean
  hasPaidAccess: boolean
  mapContext: TerraAssistantMapContext | null
  mapSnapshot?: string | null
  getMapSnapshot?: (ctx: InsightSnapshotContext) => Promise<string | null>
  onRefreshInsight?: () => void
  refreshInsightPending?: boolean
  onExploreSimilarArea?: (lat: number, lng: number, boundaryId?: number) => void
  className?: string
  /** Render the launcher button full-width (mobile dock). */
  fullWidthButton?: boolean
  /** On mobile with fullWidthButton, open as a bottom sheet above the dock. */
  centerOnMobile?: boolean
  /** Extra bottom offset when another dock panel (e.g. country) is expanded on mobile. */
  countryPanelOpen?: boolean
}

export default function TerraAssistantLauncher({
  open,
  onToggle,
  onClose,
  areaInsight,
  insightLoading,
  hasPaidAccess,
  mapContext,
  mapSnapshot = null,
  getMapSnapshot,
  onRefreshInsight,
  refreshInsightPending = false,
  onExploreSimilarArea,
  insightLoadingTerrainView = false,
  className = '',
  fullWidthButton = false,
  countryPanelOpen = false,
}: TerraAssistantLauncherProps) {
  const { m } = useTranslation()

  const mobileBottomClass = countryPanelOpen
    ? 'max-md:bottom-[calc(15.5rem+env(safe-area-inset-bottom))]'
    : 'max-md:bottom-[calc(7.5rem+env(safe-area-inset-bottom))]'
  const mobileHeightClass = countryPanelOpen
    ? 'max-md:h-[min(calc(100dvh-20rem),520px)]'
    : 'max-md:h-[min(calc(100dvh-12rem),560px)]'

  const mobileSheetClass = fullWidthButton
    ? `max-md:fixed max-md:inset-x-0 ${mobileBottomClass} max-md:z-50 max-md:w-full max-md:max-w-none max-md:rounded-b-none max-md:rounded-t-2xl ${mobileHeightClass}`
    : ''

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label={m.map.closePanel}
          className={`fixed inset-0 z-40 bg-black/20 ${fullWidthButton ? 'max-md:bg-black/40' : ''} md:bg-transparent`}
          onClick={onClose}
        />
      )}

      <div className={`pointer-events-auto flex flex-col items-end gap-3 ${fullWidthButton ? 'w-full' : 'inline-flex'} ${className}`}>
        {open && !fullWidthButton && (
          <div
            className="z-50 flex w-60 flex-col overflow-hidden rounded-2xl border border-app-border-strong bg-app-surface shadow-2xl animate-fade-in max-md:hidden md:fixed md:right-3 md:top-3 md:bottom-28"
            role="dialog"
            aria-label={m.assistant.chatTitle}
          >
            <div className="shrink-0 flex items-center justify-between gap-2 border-b app-divider px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <TerraAssistantAvatar className="h-6 w-6" />
                <span className="truncate text-sm font-semibold map-text">{m.assistant.chatTitle}</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded p-1 text-xl leading-none map-text-muted hover:bg-app-subtle hover:text-app-secondary"
                aria-label={m.map.closePanel}
              >
                ×
              </button>
            </div>
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
              <TerraAssistantPanel
                insight={areaInsight}
                loading={insightLoading}
                hasPaidAccess={hasPaidAccess}
                mapContext={mapContext}
                mode="map"
                layout="compact"
                mobileSheet
                insightExport
                mapSnapshot={mapSnapshot}
                getMapSnapshot={getMapSnapshot}
                onRefreshInsight={onRefreshInsight}
                refreshInsightPending={refreshInsightPending}
                onExploreSimilarArea={onExploreSimilarArea}
                loadingTerrainView={insightLoadingTerrainView}
              />
            </div>
          </div>
        )}

        <TerraAssistantButton
          active={open}
          onClick={onToggle}
          compact={fullWidthButton}
          className={fullWidthButton ? 'w-full' : ''}
        />
      </div>

      {open && fullWidthButton && (
        <div
          className={`md:hidden z-50 flex flex-col overflow-hidden rounded-2xl border border-app-border-strong bg-app-surface shadow-2xl animate-fade-in ${mobileSheetClass}`}
          role="dialog"
          aria-label={m.assistant.chatTitle}
        >
          <div className="shrink-0 flex items-center justify-between gap-2 border-b app-divider px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <TerraAssistantAvatar className="h-6 w-6" />
              <span className="truncate text-sm font-semibold map-text">{m.assistant.chatTitle}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded p-1 text-xl leading-none map-text-muted hover:bg-app-subtle hover:text-app-secondary"
              aria-label={m.map.closePanel}
            >
              ×
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <TerraAssistantPanel
              insight={areaInsight}
              loading={insightLoading}
              hasPaidAccess={hasPaidAccess}
              mapContext={mapContext}
              mode="map"
              layout="compact"
              mobileSheet
              insightExport
              mapSnapshot={mapSnapshot}
              getMapSnapshot={getMapSnapshot}
              onRefreshInsight={onRefreshInsight}
              refreshInsightPending={refreshInsightPending}
              onExploreSimilarArea={onExploreSimilarArea}
              loadingTerrainView={insightLoadingTerrainView}
            />
          </div>
        </div>
      )}
    </>
  )
}
