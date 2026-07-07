import TerraAssistantPanel, {
  type TerraAssistantMapContext,
} from '../assistant/TerraAssistantPanel'
import { TerraAssistantAvatar } from '../assistant/AssistantIcons'
import { useTranslation } from '../../i18n/LocaleContext'
import type { AreaInsight } from '../../types'
import MapZoomControls from './MapZoomControls'
import TerraAssistantButton from './TerraAssistantButton'

import type { InsightSnapshotContext } from './insightSnapshot'

interface MapZoomHandlers {
  onZoomIn: () => void
  onZoomOut: () => void
  onResetView?: () => void
}

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
  /** Mobile dock shows a sponsored card above the country row. */
  mobileDockAdVisible?: boolean
  /** Desktop map zoom controls — shown to the left of the panel when chat is open. */
  zoomControls?: MapZoomHandlers | null
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
  mobileDockAdVisible = false,
  zoomControls = null,
}: TerraAssistantLauncherProps) {
  const { m } = useTranslation()

  const mobileBottomClass =
    countryPanelOpen && mobileDockAdVisible
      ? 'max-md:bottom-[calc(22rem+env(safe-area-inset-bottom))]'
      : countryPanelOpen
        ? 'max-md:bottom-[calc(18rem+env(safe-area-inset-bottom))]'
        : mobileDockAdVisible
          ? 'max-md:bottom-[calc(12.5rem+env(safe-area-inset-bottom))]'
          : 'max-md:bottom-[calc(8.5rem+env(safe-area-inset-bottom))]'
  const mobileHeightClass = countryPanelOpen
    ? 'max-md:h-[min(calc(100dvh-20rem),520px)]'
    : 'max-md:h-[min(calc(100dvh-12rem),560px)]'

  const mobileSheetClass = fullWidthButton
    ? `max-md:fixed max-md:left-3 max-md:right-3 max-md:mx-auto ${mobileBottomClass} max-md:z-50 max-md:w-auto max-md:max-w-md max-md:rounded-2xl max-md:border max-md:border-app-border-strong max-md:shadow-2xl ${mobileHeightClass}`
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

      <div
        className={`pointer-events-none flex flex-col ${
          fullWidthButton ? 'h-full w-full justify-stretch' : 'items-end gap-3'
        } ${open && !fullWidthButton ? 'md:flex-1' : ''} ${className}`}
      >
        {open && !fullWidthButton && (
          <div className="pointer-events-auto map-assistant-desktop-row hidden min-h-0 flex-1 items-end gap-2 md:flex">
            {zoomControls ? (
              <MapZoomControls
                onZoomIn={zoomControls.onZoomIn}
                onZoomOut={zoomControls.onZoomOut}
                onResetView={zoomControls.onResetView}
                className="shrink-0 self-end"
              />
            ) : null}
            <div
              className="map-assistant-desktop flex h-full min-h-0 w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-app-border-strong bg-app-surface shadow-2xl animate-fade-in"
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
          </div>
        )}

        {!open && !fullWidthButton && zoomControls ? (
          <MapZoomControls
            onZoomIn={zoomControls.onZoomIn}
            onZoomOut={zoomControls.onZoomOut}
            onResetView={zoomControls.onResetView}
            className="pointer-events-auto hidden shrink-0 md:flex"
          />
        ) : null}

        <TerraAssistantButton
          active={open}
          onClick={onToggle}
          compact={fullWidthButton}
          className={`${fullWidthButton ? 'w-full' : ''} pointer-events-auto`}
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
