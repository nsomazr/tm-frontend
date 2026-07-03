import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from '../../i18n/LocaleContext'
import { useDisplayName } from '../../i18n/useDisplayName'
import type { MapLayer } from '../../types'
import type { BasemapId } from './basemaps'
import { BASEMAPS, saveBasemapPreference } from './basemaps'
import LegendPanel from './LegendPanel'
import LayerTypeSymbol from './LayerTypeSymbol'
import { TerraAssistantAvatar } from '../assistant/AssistantIcons'

interface MapBottomControlsProps {
  layers: MapLayer[]
  visibleLayers: Set<number>
  onToggleLayer: (id: number) => void
  onToggleLayerType: (type: string, visible: boolean) => void
  basemap: BasemapId
  onBasemapChange: (id: BasemapId) => void
  legendLayers: MapLayer[]
  onZoomIn: () => void
  onZoomOut: () => void
  onOpenAssistant?: () => void
  assistantActive?: boolean
}

type Panel = 'layers' | 'basemap' | 'legend' | null

const TYPE_ORDER = ['polygon', 'point', 'line']

const SHEET_CLASS_EXTRA = 'max-h-[min(36vh,260px)]'
const LAYERS_SHEET_CLASS_EXTRA = 'max-h-[min(58vh,420px)]'

function ZoomControls({ onZoomIn, onZoomOut, zoomInLabel, zoomOutLabel }: {
  onZoomIn: () => void
  onZoomOut: () => void
  zoomInLabel: string
  zoomOutLabel: string
}) {
  const btnClass =
    'flex flex-1 items-center justify-center text-lg font-medium map-text-secondary transition-colors active:bg-app-subtle hover:bg-app-surface/80'
  return (
    <div className="map-chrome flex w-11 shrink-0 flex-col self-stretch overflow-hidden rounded-xl">
      <button type="button" aria-label={zoomInLabel} onClick={onZoomIn} className={btnClass}>
        +
      </button>
      <div className="h-px shrink-0 bg-app-border" />
      <button type="button" aria-label={zoomOutLabel} onClick={onZoomOut} className={btnClass}>
        −
      </button>
    </div>
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
      className={`relative flex min-h-full min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 transition-all duration-200 active:scale-[0.97] ${
        active
          ? 'bg-gradient-to-b from-terra-600 to-terra-700 text-white shadow-md shadow-terra-600/25'
          : 'map-text-secondary hover:bg-app-subtle/80'
      }`}
    >
      <span className={`flex h-5 w-5 items-center justify-center ${active ? 'text-white' : 'map-text-muted'}`}>
        {icon}
      </span>
      {adornment}
      <span
        className={`max-w-full truncate px-0.5 text-[10px] font-semibold leading-tight ${
          active ? 'text-white' : 'map-text'
        }`}
      >
        {label}
      </span>
      {badge != null && badge > 0 && (
        <span
          className={`absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none ${
            active ? 'bg-white/20 text-white' : 'bg-app-accent-soft text-terra-700 dark:text-terra-300'
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
  legendLayers,
  onZoomIn,
  onZoomOut,
  onOpenAssistant,
  assistantActive = false,
}: MapBottomControlsProps) {
  const { m } = useTranslation()
  const displayName = useDisplayName()
  const [panel, setPanel] = useState<Panel>(null)

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

  const togglePanel = (next: Panel) => setPanel((p) => (p === next ? null : next))
  const currentBasemap = BASEMAPS.find((b) => b.id === basemap) ?? BASEMAPS[0]

  const sheetClass =
    'pointer-events-auto mb-2 overflow-hidden rounded-2xl map-chrome'

  const renderSheet = (content: ReactNode, tall = false) => (
    <div
      className={`${sheetClass} ${tall ? LAYERS_SHEET_CLASS_EXTRA : SHEET_CLASS_EXTRA} flex flex-col overflow-hidden`}
    >
      {content}
    </div>
  )

  return (
    <>
      {panel && (
        <button
          type="button"
          aria-label={m.map.closePanel}
          className="absolute inset-0 z-30 bg-slate-900/30 backdrop-blur-[2px] md:hidden"
          onClick={() => setPanel(null)}
        />
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex flex-col px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
        {panel === 'layers' &&
          renderSheet(
            <>
              <SheetHandle />
              <p className="shrink-0 px-4 pb-2 text-sm font-semibold map-text">{m.map.layersTitle}</p>
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-6 pr-3 scrollbar-pane">
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
                          <button
                            type="button"
                            onClick={() => onToggleLayerType(type, !allOn)}
                            className="text-xs font-semibold text-terra-700 dark:text-terra-400 whitespace-nowrap"
                          >
                            {allOn ? m.map.hideAll : m.map.showAll}
                          </button>
                        </div>
                        {type === 'line' && (
                          <p className="text-xs map-text-secondary mt-1 leading-snug">{m.map.linesOffByDefault}</p>
                        )}
                      </div>
                      <ul className="space-y-0.5">
                        {typeLayers.map((layer) => (
                          <li key={layer.id} className="flex items-center gap-2.5 rounded-lg py-1.5 px-1 active:bg-app-subtle">
                            <input
                              type="checkbox"
                              checked={visibleLayers.has(layer.id)}
                              onChange={() => onToggleLayer(layer.id)}
                              className="rounded border-app-border-strong text-terra-600 focus:ring-terra-500/30 shrink-0 size-3.5"
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
            </>,
            true
          )}

        {panel === 'basemap' &&
          renderSheet(
            <>
              <SheetHandle />
              <p className="shrink-0 px-4 pb-2 text-sm font-semibold map-text">{m.map.basemapLabel}</p>
              <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
                {BASEMAPS.map((bm) => (
                  <li key={bm.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onBasemapChange(bm.id)
                        saveBasemapPreference(bm.id)
                        setPanel(null)
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                        bm.id === basemap
                          ? 'bg-app-accent-soft font-medium text-terra-800 dark:text-terra-300'
                          : 'map-text-secondary active:bg-app-subtle'
                      }`}
                    >
                      <span
                        className="h-7 w-7 shrink-0 rounded-md border border-slate-200 shadow-inner"
                        style={{ background: bm.preview }}
                      />
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

        {panel === 'legend' &&
          renderSheet(
            <>
              <SheetHandle />
              <p className="shrink-0 px-4 pb-1 text-sm font-semibold map-text">
                {m.map.legendTitle}
                {legendLayers.length > 0 && (
                  <span className="ml-1.5 text-xs font-normal map-text-muted">({legendLayers.length})</span>
                )}
              </p>
              <LegendPanel layers={legendLayers} embedded sheetMode />
            </>
          )}

        <div className="pointer-events-auto flex flex-col items-center gap-1">
          {onOpenAssistant && (
            <button
              type="button"
              onClick={onOpenAssistant}
              aria-pressed={assistantActive}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-md transition-all active:scale-[0.97] ${
                assistantActive
                  ? 'bg-gradient-to-r from-terra-600 to-terra-700 text-white ring-2 ring-terra-400/40'
                  : 'map-chrome map-text hover:bg-app-subtle/90'
              }`}
            >
              <TerraAssistantAvatar className="h-5 w-5" />
              {m.assistant.buttonLabel}
            </button>
          )}

          <div className="map-chrome flex w-full items-stretch gap-1.5 rounded-2xl p-1.5">
          <ZoomControls
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            zoomInLabel={m.map.zoomIn}
            zoomOutLabel={m.map.zoomOut}
          />
          <nav className="grid min-w-0 flex-1 grid-cols-3 gap-1">
            <ToolbarButton
              active={panel === 'layers'}
              onClick={() => togglePanel('layers')}
              icon={<LayersIcon className="h-5 w-5" />}
              label={m.map.layersShort}
              badge={layers.length}
            />
            <ToolbarButton
              active={panel === 'basemap'}
              onClick={() => togglePanel('basemap')}
              icon={<MapIcon className="h-5 w-5" />}
              label={currentBasemap.label}
              adornment={
                <span
                  className="-mt-0.5 h-1 w-7 rounded-full border border-black/5 shadow-inner"
                  style={{ background: currentBasemap.preview }}
                />
              }
            />
            <ToolbarButton
              active={panel === 'legend'}
              onClick={() => togglePanel('legend')}
              icon={<LegendIcon className="h-5 w-5" />}
              label={m.map.legendTitle}
              badge={legendLayers.length}
            />
          </nav>
        </div>
        </div>
      </div>
    </>
  )
}
