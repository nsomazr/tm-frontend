import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from '../../i18n/LocaleContext'
import { useDisplayName } from '../../i18n/useDisplayName'
import type { AreaInsight, MapLayer } from '../../types'
import type { BasemapId } from './basemaps'
import { BASEMAPS, saveBasemapPreference } from './basemaps'
import LegendPanel from './LegendPanel'
import LayerTypeSymbol from './LayerTypeSymbol'
import MapZoomControls from './MapZoomControls'
import TerraAssistantLauncher from './TerraAssistantLauncher'
import MineralHeatmapColorbar from './MineralHeatmapColorbar'
import type { MineralHeatmapSpec } from './mineralHeatmapLayer'

import type { BoundaryLevelKey, BoundaryVisibility } from './adminBoundaryStyles'
import type { BoundaryFocus } from './boundaryFocus'
import CountryBoundaryPanel from './CountryBoundaryPanel'
import CoordinateSystemPicker from './CoordinateSystemPicker'
import type { CoordinateSystemId } from './coordinateSystems'
import type { CoordinateDisplayFormat } from './coordinateFormat'
import BoundaryVisibilityToggles from './BoundaryVisibilityToggles'
import type { Country } from '../../types'
import type { TerraAssistantMapContext } from '../assistant/TerraAssistantPanel'
import type { InsightSnapshotContext } from './insightSnapshot'
import AdPlacementSlot from '../ads/AdPlacementSlot'

interface MapBottomControlsProps {
  layers: MapLayer[]
  visibleLayers: Set<number>
  onToggleLayer: (id: number) => void
  onToggleLayerType: (type: string, visible: boolean) => void
  basemap: BasemapId
  onBasemapChange: (id: BasemapId) => void
  showBasemapLabels: boolean
  onShowBasemapLabelsChange: (next: boolean) => void
  showBoundaryLabels: boolean
  onShowBoundaryLabelsChange: (next: boolean) => void
  legendLayers: MapLayer[]
  onZoomIn: () => void
  onZoomOut: () => void
  onResetView?: () => void
  countries: Country[]
  countryCode: string
  onCountryChange: (code: string) => void
  availableBoundaryLevels: BoundaryLevelKey[]
  boundaryVisibility: BoundaryVisibility
  onBoundaryVisibilityChange: (next: BoundaryVisibility) => void
  boundaryFocus?: BoundaryFocus | null
  onClearBoundaryFocus?: () => void
  villagesLoading?: boolean
  villagesError?: boolean
  lockedBoundaryLevels?: BoundaryLevelKey[]
  staticMap?: boolean
  coordinateSystem: CoordinateSystemId
  onCoordinateSystemChange: (id: CoordinateSystemId) => void
  coordinateFormat?: CoordinateDisplayFormat
  onCoordinateFormatChange?: (format: CoordinateDisplayFormat) => void
  showCoordinateSystem?: boolean
  assistantOpen: boolean
  onAssistantToggle: () => void
  onAssistantClose: () => void
  areaInsight: AreaInsight | null
  insightLoading: boolean
  hasPaidAccess: boolean
  assistantMapContext: TerraAssistantMapContext | null
  mapSnapshot?: string | null
  getMapSnapshot?: (ctx: InsightSnapshotContext) => Promise<string | null>
  onRefreshInsight?: () => void
  refreshInsightPending?: boolean
  insightLoadingTerrainView?: boolean
  onExploreSimilarArea?: (lat: number, lng: number, boundaryId?: number) => void
  mineralHeatmap?: MineralHeatmapSpec | null
  mineralHeatmapLoading?: boolean
  showMapAds?: boolean
  /** When false, hide the layers toggle/sheet (e.g. top-nav mineral focus mode). */
  showLayersPanel?: boolean
}

type Panel = 'layers' | 'basemap' | 'legend' | null

const TYPE_ORDER = ['polygon', 'point', 'line']

const SHEET_CLASS_EXTRA = 'max-h-[min(36vh,260px)]'
const LAYERS_SHEET_CLASS_EXTRA = 'max-h-[min(42vh,320px)]'

const DOCK_CARD =
  'map-chrome min-w-0 overflow-hidden rounded-xl border border-app-border-strong bg-app-surface shadow-sm'

function BasemapSwatch({ preview, size = 'md' }: { preview: string; size?: 'xs' | 'sm' | 'md' }) {
  const dim = size === 'xs' ? 'h-2 w-2' : size === 'sm' ? 'h-1.5 w-5' : 'h-7 w-7'
  const radius = size === 'xs' ? 'rounded-full' : 'rounded-md'
  return (
    <span
      className={`${dim} ${radius} shrink-0 border border-slate-400/70 bg-white shadow-inner ring-1 ring-black/10`}
      style={{ background: preview }}
    />
  )
}

function ChevronToggle({ open }: { open: boolean }) {
  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-app-subtle text-xs font-semibold leading-none text-app-secondary"
      aria-hidden
    >
      {open ? '−' : '+'}
    </span>
  )
}

function LayersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4 3 8.5 12 13l9-4.5L12 4Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 12.5 9 4.5 9-4.5M3 16.5 12 21l9-4.5" />
    </svg>
  )
}

function MapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 4v14M15 6v14" />
    </svg>
  )
}

function LegendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h14" />
      <circle cx="18" cy="12" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="18" cy="18" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

function SheetHandle() {
  return (
    <div className="flex justify-center pt-2.5 pb-1">
      <div className="h-1 w-10 rounded-full bg-app-border" />
    </div>
  )
}

function ToolbarButton({
  active,
  onClick,
  icon,
  label,
  badge,
  adornment,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
  badge?: number
  adornment?: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex h-9 min-w-0 flex-1 flex-row items-center justify-center gap-1 rounded-lg px-1.5 transition-all duration-200 active:scale-[0.98] ${
        active
          ? 'bg-terra-600 text-white shadow-sm ring-1 ring-terra-500/30'
          : 'border border-transparent bg-app-subtle/50 map-text-secondary hover:border-app-border hover:bg-app-subtle'
      }`}
    >
      <span className={`flex h-4 w-4 shrink-0 items-center justify-center ${active ? 'text-white' : 'text-app-secondary'}`}>
        {icon}
      </span>
      {adornment}
      <span
        className={`min-w-0 truncate text-[10px] font-semibold leading-none ${
          active ? 'text-white' : 'text-app-text'
        }`}
      >
        {label}
      </span>
      {badge != null && badge > 0 && (
        <span
          className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[8px] font-bold leading-none ${
            active ? 'bg-white/25 text-white' : 'bg-app-accent-soft text-terra-700 dark:text-terra-300'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

export default function MapBottomControls({
  layers,
  visibleLayers,
  onToggleLayer,
  onToggleLayerType,
  basemap,
  onBasemapChange,
  showBasemapLabels,
  onShowBasemapLabelsChange,
  showBoundaryLabels,
  onShowBoundaryLabelsChange,
  legendLayers,
  onZoomIn,
  onZoomOut,
  onResetView,
  countries,
  countryCode,
  onCountryChange,
  availableBoundaryLevels,
  boundaryVisibility,
  onBoundaryVisibilityChange,
  boundaryFocus,
  onClearBoundaryFocus,
  villagesLoading = false,
  villagesError = false,
  lockedBoundaryLevels = [],
  staticMap = false,
  coordinateSystem,
  onCoordinateSystemChange,
  coordinateFormat = 'decimal',
  onCoordinateFormatChange,
  showCoordinateSystem = false,
  assistantOpen,
  onAssistantToggle,
  onAssistantClose,
  areaInsight,
  insightLoading,
  hasPaidAccess,
  assistantMapContext,
  mapSnapshot = null,
  getMapSnapshot,
  onRefreshInsight,
  refreshInsightPending = false,
  insightLoadingTerrainView = false,
  onExploreSimilarArea,
  mineralHeatmap = null,
  mineralHeatmapLoading = false,
  showMapAds = true,
  showLayersPanel = true,
}: MapBottomControlsProps) {
  const { m } = useTranslation()
  const displayName = useDisplayName()
  const [panel, setPanel] = useState<Panel>(null)
  const [countryPanelOpen, setCountryPanelOpen] = useState(false)

  useEffect(() => {
    if (assistantOpen) {
      setCountryPanelOpen(false)
      setPanel(null)
    }
  }, [assistantOpen])

  const typeLabels: Record<string, string> = {
    polygon: m.map.polygons,
    point: m.map.points,
    line: m.map.lines,
  }

  const grouped = useMemo(() => {
    const map = new Map<string, MapLayer[]>()
    for (const layer of layers) {
      const t = layer.layer_type || 'polygon'
      if (!map.has(t)) map.set(t, [])
      map.get(t)!.push(layer)
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.z_index - b.z_index)
    }
    return TYPE_ORDER.filter((t) => map.has(t)).map((t) => ({ type: t, layers: map.get(t)! }))
  }, [layers])

  const closeAllSections = () => {
    setCountryPanelOpen(false)
    setPanel(null)
    if (assistantOpen) onAssistantClose()
  }

  const toggleCountryPanel = () => {
    setCountryPanelOpen((open) => {
      const next = !open
      if (next) {
        setPanel(null)
        if (assistantOpen) onAssistantClose()
      }
      return next
    })
  }

  const togglePanel = (next: Panel) => {
    setCountryPanelOpen(false)
    if (assistantOpen) onAssistantClose()
    setPanel((p) => (p === next ? null : next))
  }

  const handleAssistantToggle = () => {
    if (!assistantOpen) {
      setCountryPanelOpen(false)
      setPanel(null)
    }
    onAssistantToggle()
  }

  const currentBasemap = BASEMAPS.find((b) => b.id === basemap) ?? BASEMAPS[0]
  // Paid users pick layers (the Layers panel doubles as the legend). Unpaid users
  // only get a read-only legend of what's shown on the map.
  const showLayersBtn = hasPaidAccess && layers.length > 0 && showLayersPanel
  const showLegendBtn = !hasPaidAccess && legendLayers.length > 0

  const sheetClass =
    'pointer-events-auto mb-2 overflow-hidden rounded-2xl map-chrome bg-app-surface/95 backdrop-blur-sm'

  const renderSheet = (content: ReactNode, tall = false) => (
    <div
      className={`${sheetClass} ${tall ? LAYERS_SHEET_CLASS_EXTRA : SHEET_CLASS_EXTRA} flex flex-col overflow-hidden`}
    >
      {content}
    </div>
  )

  return (
    <>
      {(panel || countryPanelOpen || assistantOpen) && (
        <button
          type="button"
          aria-label={m.map.closePanel}
          className="absolute inset-0 z-30 bg-slate-900/30 backdrop-blur-[2px] md:hidden"
          onClick={closeAllSections}
        />
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex max-h-[min(55vh,calc(100vh-5rem))] flex-col overflow-y-auto px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
        {panel === 'layers' &&
          renderSheet(
            <>
              <SheetHandle />
              <p className="shrink-0 px-3 pb-1 text-xs font-semibold map-text">{m.map.layersTitle}</p>
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 pr-2 scrollbar-pane">
                {grouped.map(({ type, layers: typeLayers }) => {
                  const allOn = typeLayers.every((l) => visibleLayers.has(l.id))
                  return (
                    <div key={type} className="mb-4 last:mb-0 not-first:pt-4 not-first:border-t not-first:app-divider">
                      <div className="mb-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold uppercase tracking-wide map-text">
                            {typeLabels[type] || type}
                            <span className="ml-1 font-normal normal-case tracking-normal text-app-muted">
                              ({typeLayers.length})
                            </span>
                          </span>
                          {!staticMap && (
                          <button
                            type="button"
                            onClick={() => onToggleLayerType(type, !allOn)}
                            className="text-xs font-semibold text-terra-700 dark:text-terra-400 whitespace-nowrap"
                          >
                            {allOn ? m.map.hideAll : m.map.showAll}
                          </button>
                          )}
                        </div>
                      </div>
                      <ul className="space-y-0.5">
                        {typeLayers.map((layer) => (
                          <li key={layer.id} className="flex items-center gap-2.5 rounded-lg py-1.5 px-1 active:bg-app-subtle">
                            <input
                              type="checkbox"
                              checked={visibleLayers.has(layer.id)}
                              disabled={staticMap}
                              onChange={() => onToggleLayer(layer.id)}
                              className="checkbox checkbox--sm disabled:opacity-70"
                            />
                            <LayerTypeSymbol layer={layer} />
                            <span className="text-sm font-medium leading-snug map-text min-w-0 break-words">{displayName(layer)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
                {layers.length === 0 && (
                  <p className="py-2 text-xs map-text-muted">{m.map.noLayers}</p>
                )}
              </div>
              {mineralHeatmap || mineralHeatmapLoading ? (
                <div className="shrink-0 border-t app-divider px-3 py-2.5">
                  <MineralHeatmapColorbar
                    embedded
                    spec={mineralHeatmap}
                    loading={mineralHeatmapLoading}
                  />
                </div>
              ) : null}
            </>,
            true
          )}

        {panel === 'basemap' &&
          renderSheet(
            <>
              <SheetHandle />
              <p className="shrink-0 px-3 pb-1 text-xs font-semibold map-text">{m.map.basemapLabel}</p>
              <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
                {BASEMAPS.map((bm) => (
                  <li key={bm.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onBasemapChange(bm.id)
                        saveBasemapPreference(bm.id)
                        setPanel(null)
                      }}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                        bm.id === basemap
                          ? 'bg-app-accent-soft font-medium text-terra-800 dark:text-terra-300 ring-1 ring-terra-500/25'
                          : 'map-text-secondary active:bg-app-subtle'
                      }`}
                    >
                      <BasemapSwatch preview={bm.preview} />
                      <span className="min-w-0 text-left">
                        <span className="block text-sm font-medium">{bm.label}</span>
                        <span className="block truncate text-[11px] map-text-muted">{bm.description}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

        {panel === 'legend' && showLegendBtn &&
          renderSheet(
            <>
              <SheetHandle />
              <p className="shrink-0 px-3 pb-0.5 text-xs font-semibold map-text">
                {m.map.legendTitle}
                {legendLayers.length > 0 && (
                  <span className="ml-1.5 text-xs font-normal map-text-muted">({legendLayers.length})</span>
                )}
              </p>
              <LegendPanel layers={legendLayers} embedded sheetMode />
              {showMapAds && (
                <div className="shrink-0 px-3 pb-3 pt-2 border-t app-divider">
                  <AdPlacementSlot placement="map_overlay" compact className="w-full" />
                </div>
              )}
            </>
          )}

        {hasPaidAccess && countries.length > 0 ? (
          <div className="pointer-events-auto mb-1.5 flex flex-col gap-1.5">
            <div className="grid grid-cols-2 gap-1">
              <div
                className={`${DOCK_CARD} ${countryPanelOpen ? 'ring-2 ring-terra-500/35 border-terra-500/40' : ''}`}
              >
                <button
                  type="button"
                  aria-expanded={countryPanelOpen}
                  className="flex h-9 w-full items-center justify-between gap-1.5 px-2.5 text-left text-xs font-semibold map-text"
                  onClick={toggleCountryPanel}
                >
                  <span className="truncate">{m.map.boundaryCountryLabel}</span>
                  <ChevronToggle open={countryPanelOpen} />
                </button>
              </div>
              <TerraAssistantLauncher
                open={assistantOpen}
                onToggle={handleAssistantToggle}
                onClose={onAssistantClose}
                areaInsight={areaInsight}
                insightLoading={insightLoading}
                hasPaidAccess={hasPaidAccess}
                mapContext={assistantMapContext}
                mapSnapshot={mapSnapshot}
                getMapSnapshot={getMapSnapshot}
                onRefreshInsight={onRefreshInsight}
                refreshInsightPending={refreshInsightPending}
                onExploreSimilarArea={onExploreSimilarArea}
                insightLoadingTerrainView={insightLoadingTerrainView}
                className="min-w-0"
                fullWidthButton
                countryPanelOpen={countryPanelOpen}
              />
            </div>
            {countryPanelOpen && (
              <div className={`${DOCK_CARD} px-1.5 pb-1.5 pt-0.5`}>
                <CountryBoundaryPanel
                  countries={countries}
                  countryCode={countryCode}
                  onCountryChange={onCountryChange}
                  availableBoundaryLevels={availableBoundaryLevels}
                  boundaryVisibility={boundaryVisibility}
                  onBoundaryVisibilityChange={onBoundaryVisibilityChange}
                  showBasemapLabels={showBasemapLabels}
                  onShowBasemapLabelsChange={onShowBasemapLabelsChange}
                  showBoundaryLabels={showBoundaryLabels}
                  onShowBoundaryLabelsChange={onShowBoundaryLabelsChange}
                  boundaryFocus={boundaryFocus}
                  onClearBoundaryFocus={onClearBoundaryFocus}
                  villagesLoading={villagesLoading}
                  villagesError={villagesError}
                  lockedBoundaryLevels={lockedBoundaryLevels}
                  compact
                  className="p-0"
                />
              </div>
            )}
          </div>
        ) : !hasPaidAccess ? (
          <div className="pointer-events-auto mb-1.5">
            <TerraAssistantLauncher
              open={assistantOpen}
              onToggle={handleAssistantToggle}
              onClose={onAssistantClose}
              areaInsight={areaInsight}
              insightLoading={insightLoading}
              hasPaidAccess={hasPaidAccess}
              mapContext={assistantMapContext}
              mapSnapshot={mapSnapshot}
              getMapSnapshot={getMapSnapshot}
              onRefreshInsight={onRefreshInsight}
              refreshInsightPending={refreshInsightPending}
              onExploreSimilarArea={onExploreSimilarArea}
              insightLoadingTerrainView={insightLoadingTerrainView}
              fullWidthButton
            />
          </div>
        ) : (
          <div className="pointer-events-auto mb-2 grid grid-cols-2 gap-2">
            <div className="map-chrome min-w-0 rounded-xl p-2">
              <span className="block text-[11px] font-semibold uppercase tracking-wide map-text-muted px-0.5 mb-1.5">
                {m.map.boundaryLayersTitle}
              </span>
              <BoundaryVisibilityToggles
                availableLevels={[]}
                value={boundaryVisibility}
                onChange={onBoundaryVisibilityChange}
                showBasemapLabels={showBasemapLabels}
                onShowBasemapLabelsChange={onShowBasemapLabelsChange}
                showBoundaryLabels={showBoundaryLabels}
                onShowBoundaryLabelsChange={onShowBoundaryLabelsChange}
                compact
              />
            </div>
            <TerraAssistantLauncher
              open={assistantOpen}
              onToggle={handleAssistantToggle}
              onClose={onAssistantClose}
              areaInsight={areaInsight}
              insightLoading={insightLoading}
              hasPaidAccess={hasPaidAccess}
              mapContext={assistantMapContext}
              mapSnapshot={mapSnapshot}
              getMapSnapshot={getMapSnapshot}
              onRefreshInsight={onRefreshInsight}
              refreshInsightPending={refreshInsightPending}
              onExploreSimilarArea={onExploreSimilarArea}
              insightLoadingTerrainView={insightLoadingTerrainView}
              className="min-w-0 self-start"
              fullWidthButton
            />
          </div>
        )}

        {showCoordinateSystem && (
          <div className="pointer-events-auto mb-1.5 map-chrome overflow-hidden rounded-xl">
            <CoordinateSystemPicker
              value={coordinateSystem}
              onChange={onCoordinateSystemChange}
              countryCode={countryCode}
              coordinateFormat={coordinateFormat}
              onCoordinateFormatChange={onCoordinateFormatChange}
            />
          </div>
        )}

        {panel !== 'layers' && (mineralHeatmap || mineralHeatmapLoading) && (
          <div className="pointer-events-none mb-1.5">
            <MineralHeatmapColorbar
              embedded
              spec={mineralHeatmap}
              loading={mineralHeatmapLoading}
              className="w-full"
            />
          </div>
        )}

        <div className="pointer-events-auto">
          <div className={`${DOCK_CARD} flex h-11 w-full items-center gap-1 p-1`}>
          <MapZoomControls
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            onResetView={onResetView}
            compact
          />
          <nav className="flex min-w-0 flex-1 gap-0.5">
            {showLayersBtn && (
            <ToolbarButton
              active={panel === 'layers'}
              onClick={() => togglePanel('layers')}
              icon={<LayersIcon className="h-4 w-4" />}
              label={m.map.layersShort}
              badge={layers.length}
            />
            )}
            <ToolbarButton
              active={panel === 'basemap'}
              onClick={() => togglePanel('basemap')}
              icon={<MapIcon className="h-4 w-4" />}
              label={currentBasemap.label}
              adornment={<BasemapSwatch preview={currentBasemap.preview} size="xs" />}
            />
            {showLegendBtn && (
            <ToolbarButton
              active={panel === 'legend'}
              onClick={() => togglePanel('legend')}
              icon={<LegendIcon className="h-4 w-4" />}
              label={m.map.legendTitle}
              badge={legendLayers.length}
            />
            )}
          </nav>
          </div>
        </div>
      </div>
    </>
  )
}
