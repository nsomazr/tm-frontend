import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { analyticsApi } from '../../api'
import { useTranslation } from '../../i18n/LocaleContext'
import type { AssistantMessage } from '../../types'
import type { TerraAssistantMapContext } from './TerraAssistantPanel'
import { toast } from '../ui/toast'

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
  getMapSnapshot?: () => Promise<string | null>
  onCreditsRefresh?: () => void
  compact?: boolean
}

export default function TerraInsightExportControls({
  hasPaidAccess,
  mode,
  messages,
  mapContext,
  mapSnapshot,
  getMapSnapshot,
  onCreditsRefresh,
  compact = false,
}: TerraInsightExportControlsProps) {
  const { m } = useTranslation()
  const ta = m.assistant
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [sections, setSections] = useState<Set<InsightExportSection>>(
    () => new Set(['overview', 'minerals', 'regions', 'analytics', 'chat'])
  )

  const sectionLabels: Record<InsightExportSection, string> = {
    overview: ta.exportSectionOverview,
    minerals: ta.exportSectionMinerals,
    regions: ta.exportSectionRegions,
    analytics: ta.exportSectionAnalytics,
    chat: ta.exportSectionChat,
    map_snapshot: ta.exportSectionMap,
  }

  const mapSnapshotAvailable = mode === 'map' && !!(mapSnapshot || getMapSnapshot)

  const visibleSections = useMemo(
    () => SECTION_KEYS.filter((key) => key !== 'map_snapshot' || mapSnapshotAvailable),
    [mapSnapshotAvailable]
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
        !!(mapContext?.fromMapClick || mapContext?.mineralSlug || mapContext?.regionId != null)

      const snapshot =
        sections.has('map_snapshot') && (getMapSnapshot || mapSnapshot)
          ? (await getMapSnapshot?.()) ?? mapSnapshot ?? undefined
          : undefined

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
        boundaryId: mapContext?.boundaryId,
        countryCode: mapContext?.countryCode,
      })
      const stamp = new Date().toISOString().slice(0, 16).replace(':', '-')
      downloadBlob(new Blob([data]), `terra-insight-${stamp}.pdf`)
      toast.success(ta.exportSuccess)
      onCreditsRefresh?.()
      setOpen(false)
    } catch (err) {
      if (isAxiosError(err)) {
        const detail = (err.response?.data as { detail?: string })?.detail
        if (typeof detail === 'string') {
          toast.error(detail)
          setExporting(false)
          return
        }
      }
      toast.error(ta.exportFailed)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div
      className={
        compact
          ? 'py-1'
          : 'shrink-0 border-b border-app-border/60 px-3 sm:px-4 py-2 bg-app-subtle/30'
      }
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-app-text-secondary">{ta.exportReportShort}</span>
        <div className="flex items-center gap-2 shrink-0">
          {hasPaidAccess && open && (
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={exporting}
              className="text-xs font-medium text-terra-600 dark:text-terra-400 hover:underline disabled:opacity-50"
            >
              {exporting ? ta.exportGenerating : ta.exportDownload}
            </button>
          )}
          <button
            type="button"
            role="switch"
            aria-checked={open}
            aria-label={ta.exportReportShort}
            onClick={() => setOpen((v) => !v)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terra-500 ${
              open ? 'bg-terra-600 dark:bg-terra-500' : 'bg-app-border-strong'
            }`}
          >
            <span
              aria-hidden
              className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                open ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {open && (
        <div className={`space-y-2 ${compact ? 'mt-2 rounded-lg border border-app-border/70 bg-app-subtle/50 p-2.5' : 'mt-2'}`}>
          {!hasPaidAccess ? (
            <p className="text-[11px] text-app-text-secondary leading-snug">
              {ta.exportPaidOnly}{' '}
              <Link to="/subscriptions" className="font-medium text-terra-600 dark:text-terra-400 hover:underline">
                {ta.viewPlans}
              </Link>
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {visibleSections.map((key) => (
                  <label
                    key={key}
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] cursor-pointer transition-colors ${
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
              <p className="text-[10px] text-app-muted">
                {ta.exportCreditCost.replace('{count}', String(EXPORT_CREDIT_COST))}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
