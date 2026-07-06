import { Link } from 'react-router-dom'
import { useTranslation } from '../../i18n/LocaleContext'
import { interpolate } from '../../i18n/utils'
import type { Report } from '../../types'
import ReportDocumentChrome from './ReportDocumentChrome'
import ReportHtmlContent from './ReportHtmlContent'
import { reportPreviewText } from './reportEditorText'
import ReportPaywall from './ReportPaywall'

interface ReportPreviewContentProps {
  report: Report
  user: { id: number } | null
  onPurchase: () => void
  onDownload: () => void
  purchasePending?: boolean
  downloadError?: string
}

export default function ReportPreviewContent({
  report,
  user,
  onPurchase,
  onDownload,
  purchasePending,
  downloadError,
}: ReportPreviewContentProps) {
  const { m } = useTranslation()
  const r = m.reports

  const hasFullAccess = report.has_full_access === true
  const canDownload = report.can_download === true
  const summaryText = report.ai_summary?.summary ?? ''
  const findings = report.ai_summary?.key_findings ?? []
  const findingsCount = report.key_findings_count ?? findings.length

  return (
    <article className="card overflow-hidden !p-0">
      <ReportDocumentChrome report={report}>
        <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 px-5 sm:px-6 pt-5 pb-5 border-b app-divider">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                  hasFullAccess
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
                    : 'bg-amber-50 text-amber-800 ring-1 ring-amber-600/20'
                }`}
              >
                {hasFullAccess ? r.fullAccessBadge : r.previewBadge}
              </span>
              {report.mineral_name && <span className="text-xs map-text-muted">{report.mineral_name}</span>}
              {report.region_name && <span className="text-xs map-text-muted">· {report.region_name}</span>}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold map-text tracking-tight">{report.title}</h1>
            {report.description && (
              <p className="mt-2 text-sm map-text-secondary max-w-3xl">{report.description}</p>
            )}
          </div>

          <div className="shrink-0 flex flex-col items-stretch sm:items-end gap-2 min-w-[10rem]">
            {!hasFullAccess && (
              <p className="font-bold text-terra-700 text-lg sm:text-right">
                {Number(report.price).toLocaleString()} {report.currency}
              </p>
            )}
            {canDownload ? (
              <button type="button" onClick={onDownload} className="btn-primary text-sm">
                {report.is_purchased || report.download_source === 'purchase'
                  ? r.downloadCta
                  : report.download_source === 'subscription'
                    ? r.useIncludedDownload
                    : r.downloadCta}
              </button>
            ) : hasFullAccess ? (
              <>
                <p className="text-xs map-text-muted sm:text-right">{r.quotaUsedPurchase}</p>
                <button
                  type="button"
                  onClick={onPurchase}
                  disabled={purchasePending}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  {r.purchaseCta}
                </button>
              </>
            ) : null}
            {downloadError && <p className="text-xs text-red-600 sm:text-right">{downloadError}</p>}
          </div>
        </header>

        {hasFullAccess ? (
          <div className="px-5 sm:px-6 py-6 space-y-6">
            {summaryText && <ReportHtmlContent html={summaryText} />}
            {findings.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-emerald-800 mb-3">{r.keyFindingsTitle}</h2>
                <ul className="space-y-2">
                  {findings.map((finding, i) => (
                    <li key={i} className="flex gap-2 text-sm map-text-secondary">
                      <span className="text-terra-600 shrink-0">✓</span>
                      <span>{finding}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        ) : (
          <div className="px-5 sm:px-6 py-6">
            <div className="relative">
              <div className="space-y-5">
                {summaryText && <ReportHtmlContent html={summaryText} className="report-html-content--preview" />}

                {findingsCount > 0 && (
                  <section className="space-y-2" aria-hidden>
                    <h2 className="text-sm font-semibold map-text-muted">{r.keyFindingsTitle}</h2>
                    {Array.from({ length: Math.min(4, findingsCount) }).map((_, i) => (
                      <div key={i} className="h-4 rounded bg-app-subtle" style={{ width: `${88 - i * 12}%` }} />
                    ))}
                  </section>
                )}
              </div>

              <div className="report-preview-fade absolute inset-x-0 top-[38%] bottom-0 z-10" aria-hidden />
            </div>

            <div className="relative z-20 -mt-2 pt-2">
              <ReportPaywall
                report={report}
                user={user}
                onPurchase={onPurchase}
                purchasePending={purchasePending}
              />
            </div>

            {findingsCount > 0 && (
              <p className="mt-4 text-center text-xs map-text-muted">
                🔒 {interpolate(r.findingsLocked, { count: findingsCount })}
              </p>
            )}
          </div>
        )}
      </ReportDocumentChrome>
    </article>
  )
}

export function ReportCatalogTeaser({ report }: { report: Report }) {
  const { m } = useTranslation()
  const r = m.reports
  const hasFullAccess = report.has_full_access === true
  const summaryText = report.ai_summary?.summary ?? ''
  const previewText = reportPreviewText(summaryText, 220)
  const findingsCount = report.key_findings_count ?? 0

  return (
    <article className="card overflow-hidden hover:border-terra-200/80 transition-colors">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                hasFullAccess
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
                  : 'bg-amber-50 text-amber-800 ring-1 ring-amber-600/20'
              }`}
            >
              {hasFullAccess ? r.fullAccessBadge : r.previewBadge}
            </span>
            {report.mineral_name && <span className="text-xs map-text-muted">{report.mineral_name}</span>}
            {report.region_name && <span className="text-xs map-text-muted">· {report.region_name}</span>}
          </div>

          <h2 className="text-lg font-bold map-text">
            <Link to={`/downloads/${report.slug}`} className="hover:text-terra-600 dark:hover:text-terra-400">
              {report.title}
            </Link>
          </h2>

          {previewText && (
            <div className="mt-3 relative">
              <p className="text-sm map-text-secondary leading-relaxed line-clamp-3">{previewText}</p>
              <div className="report-teaser-fade absolute inset-x-0 bottom-0 h-8" aria-hidden />
            </div>
          )}

          {!hasFullAccess && findingsCount > 0 && (
            <p className="mt-2 text-xs map-text-muted">
              🔒 {interpolate(r.findingsLocked, { count: findingsCount })}
            </p>
          )}
        </div>

        <div className="shrink-0 flex flex-col items-stretch md:items-end gap-2 min-w-[9rem]">
          {!hasFullAccess && (
            <p className="font-bold text-terra-700 text-lg md:text-right">
              {Number(report.price).toLocaleString()} {report.currency}
            </p>
          )}
          <Link to={`/downloads/${report.slug}`} className="btn-primary text-sm text-center">
            {hasFullAccess ? r.openFullReport : r.openPreview}
          </Link>
        </div>
      </div>
    </article>
  )
}
