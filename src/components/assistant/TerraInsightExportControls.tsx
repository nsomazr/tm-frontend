import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { useQueryClient } from '@tanstack/react-query'
import { analyticsApi } from '../../api'
import { useTranslation } from '../../i18n/LocaleContext'
import type { AssistantMessage } from '../../types'
import type { TerraAssistantMapContext } from './TerraAssistantPanel'
import type { InsightSnapshotContext } from '../map/insightSnapshot'
import { toast } from '../ui/toast'
import { compressSnapshotForExport } from '../map/snapshotCompress'

export type InsightExportSection =
  | 'overview'
  | 'minerals'
  | 'regions'
  | 'analytics'
  | 'chat'
  | 'map_snapshot'

const SECTION_KEYS: InsightExportSection[] = [
  'overview',
  'minerals',
  'regions',
  'analytics',
  'chat',
  'map_snapshot',
]

const EXPORT_CREDIT_COST = 5

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}

interface TerraInsightExportControlsProps {
  hasPaidAccess: boolean
  mode: 'map' | 'account'
  messages: AssistantMessage[]
  mapContext?: TerraAssistantMapContext | null
  mapSnapshot?: string | null
  getMapSnapshot?: (ctx: InsightSnapshotContext) => Promise<string | null>
  analysisAreaKm2?: number
  onCreditsRefresh?: () => void
  /** Inline footer trigger (no card chrome). */
  inline?: boolean
}

export default function TerraInsightExportControls({
  hasPaidAccess,
  mode,
  messages,
  mapContext,
  mapSnapshot,
  getMapSnapshot,
  analysisAreaKm2,
  onCreditsRefresh,
  inline = false,
}: TerraInsightExportControlsProps) {
  const { m } = useTranslation()
  const qc = useQueryClient()
  const ta = m.assistant
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [sections, setSections] = useState<Set<InsightExportSection>>(() => {
    const defaults: InsightExportSection[] = ['overview', 'minerals', 'regions', 'analytics']
    if (mode === 'map') defaults.push('map_snapshot')
    return new Set(defaults)
  })

  const sectionLabels: Record<InsightExportSection, string> = {
    overview: ta.exportSectionOverview,
    minerals: ta.exportSectionMinerals,
    regions: ta.exportSectionRegions,
    analytics: ta.exportSectionAnalytics,
    chat: ta.exportSectionChat,
    map_snapshot: ta.exportSectionMap,
  }

  const mapSnapshotAvailable =
    mode === 'map' && !!(mapSnapshot || mapContext?.lat != null || getMapSnapshot)

  const visibleSections = useMemo(
    () => SECTION_KEYS.filter((key) => key !== 'map_snapshot' || mapSnapshotAvailable),
    [mapSnapshotAvailable],
  )

  function toggleSection(key: InsightExportSection) {
    setSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handleExport() {
    if (!hasPaidAccess) {
      setOpen(true)
      return
    }
    if (sections.size === 0) {
      toast.error(ta.exportPickSection)
      return
    }
    setExporting(true)
    try {
      const useMapMode =
        hasPaidAccess &&
        mode === 'map' &&
        !!(
          mapContext?.fromMapClick ||
          mapContext?.mineralSlug ||
          mapContext?.regionId != null ||
          mapContext?.explorationGeometry ||
          (mapContext?.lat != null && mapContext?.lng != null)
        )

      let snapshot = sections.has('map_snapshot') && mapSnapshot ? mapSnapshot : undefined

      if (
        sections.has('map_snapshot') &&
        !snapshot &&
        getMapSnapshot &&
        mapContext?.lat != null &&
        mapContext?.lng != null
      ) {
        try {
          const raw = await getMapSnapshot({
            lat: mapContext.lat,
            lng: mapContext.lng,
            zoom: mapContext.zoom,
            analysisAreaKm2,
            explorationGeometry: mapContext.explorationGeometry,
            countryCode: mapContext.countryCode,
          })
          if (raw) {
            try {
              snapshot = await compressSnapshotForExport(raw)
            } catch {
              snapshot = raw
            }
          }
        } catch {
          /* server renders snapshot when client capture fails */
        }
      }

      const { data } = await analyticsApi.exportInsightReport({
        mode: useMapMode ? 'map' : 'account',
        sections: Array.from(sections),
        messages: sections.has('chat') ? messages : [],
        mapSnapshot: snapshot,
        lat: mapContext?.lat,
        lng: mapContext?.lng,
        zoom: mapContext?.zoom,
        featureIds: mapContext?.featureIds,
        mineralSlug: mapContext?.mineralSlug,
        regionId: mapContext?.regionId,
        boundaryId: mapContext?.explorationGeometry ? undefined : mapContext?.boundaryId,
        countryCode: mapContext?.countryCode,
        explorationGeometry: mapContext?.explorationGeometry,
        analysisAreaKm2,
        basemap: mapContext?.basemap,
      })
      const stamp = new Date().toISOString().slice(0, 16).replace(':', '-')
      downloadBlob(new Blob([data]), `terra-insight-${stamp}.pdf`)
      toast.success(ta.exportSuccess)
      void qc.invalidateQueries({ queryKey: ['purchases'] })
      onCreditsRefresh?.()
      setOpen(false)
    } catch (err) {
      if (isAxiosError(err)) {
        const detail = (err.response?.data as { detail?: string })?.detail
        if (typeof detail === 'string') {
          toast.error(detail)
          return
        }
      }
      toast.error(ta.exportFailed)
    } finally {
      setExporting(false)
    }
  }

  const trigger = (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      aria-expanded={open}
      className={`text-[11px] font-medium transition-colors ${
        open
          ? 'text-terra-700 dark:text-terra-300'
          : 'map-text-muted hover:text-terra-700 dark:hover:text-terra-300'
      }`}
    >
      {open ? 'Close' : 'PDF'}
      {!open && hasPaidAccess ? (
        <span className="font-normal text-app-muted"> · {EXPORT_CREDIT_COST}</span>
      ) : null}
    </button>
  )

  const panel = open ? (
    <div
      className={
        inline
          ? 'mt-2 space-y-2 rounded-xl border border-app-border bg-app-subtle/50 px-2.5 py-2'
          : 'mt-2 space-y-2.5'
      }
    >
      {!hasPaidAccess ? (
        <p className="text-[11px] leading-snug text-app-text-secondary">
          {ta.exportPaidOnly}{' '}
          <Link
            to="/subscriptions"
            className="font-medium text-terra-600 hover:underline dark:text-terra-400"
          >
            {ta.viewPlans}
          </Link>
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1">
            {visibleSections.map((key) => (
              <label
                key={key}
                className={`inline-flex cursor-pointer items-center rounded-full border px-2 py-0.5 text-[10px] transition-colors ${
                  sections.has(key)
                    ? 'border-terra-500/40 bg-terra-500/10 text-terra-800 dark:text-terra-200'
                    : 'border-app-border text-app-text-muted hover:border-terra-300'
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={sections.has(key)}
                  onChange={() => toggleSection(key)}
                />
                {sectionLabels[key]}
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={exporting || sections.size === 0}
            className="btn-primary w-full text-xs !py-1.5 disabled:opacity-50"
          >
            {exporting ? ta.exportGenerating : ta.exportDownload}
          </button>
        </>
      )}
    </div>
  ) : null

  if (inline) {
    return (
      <div className="mt-1 w-full min-w-0">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`text-[11px] font-medium transition-colors ${
            open
              ? 'text-terra-700 dark:text-terra-300'
              : 'map-text-muted hover:text-terra-700 dark:hover:text-terra-300'
          }`}
        >
          {open ? 'Close PDF options' : hasPaidAccess ? `Export PDF · ${EXPORT_CREDIT_COST} credits` : 'Export PDF'}
        </button>
        {open ? (
          <div className="mt-1.5 space-y-2 rounded-xl border border-app-border bg-app-subtle/40 px-2.5 py-2">
            {!hasPaidAccess ? (
              <p className="text-[11px] leading-snug text-app-text-secondary">
                {ta.exportPaidOnly}{' '}
                <Link
                  to="/subscriptions"
                  className="font-medium text-terra-600 hover:underline dark:text-terra-400"
                >
                  {ta.viewPlans}
                </Link>
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-1">
                  {visibleSections.map((key) => (
                    <label
                      key={key}
                      className={`inline-flex cursor-pointer items-center rounded-full border px-2 py-0.5 text-[10px] transition-colors ${
                        sections.has(key)
                          ? 'border-terra-500/40 bg-terra-500/10 text-terra-800 dark:text-terra-200'
                          : 'border-app-border text-app-text-muted hover:border-terra-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={sections.has(key)}
                        onChange={() => toggleSection(key)}
                      />
                      {sectionLabels[key]}
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => void handleExport()}
                  disabled={exporting || sections.size === 0}
                  className="btn-primary w-full text-xs !py-1.5 disabled:opacity-50"
                >
                  {exporting ? ta.exportGenerating : ta.exportDownload}
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="shrink-0">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] map-text-muted">{ta.exportReportShort}</p>
        {trigger}
      </div>
      {panel}
    </div>
  )
}
