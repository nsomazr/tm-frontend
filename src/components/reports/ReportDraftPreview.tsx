import Logo from '../brand/Logo'
import ReportHtmlContent from './ReportHtmlContent'
import { stripReportChangeHighlights } from './reportEditorChanges'

interface ReportDraftPreviewProps {
  title: string
  contextLine?: string
  executiveSummary: string
  approved?: boolean
  canApprove?: boolean
  approveError?: string | null
  loading?: boolean
  onApprove?: () => void
}

export default function ReportDraftPreview({
  title,
  contextLine,
  executiveSummary,
  approved = false,
  canApprove = false,
  approveError = null,
  loading = false,
  onApprove,
}: ReportDraftPreviewProps) {
  const previewHtml = stripReportChangeHighlights(executiveSummary)

  return (
    <div className="report-preview-shell">
      <div className="report-preview-shell__scroll">
        <article className="report-preview-page">
          <div className="report-preview-page__watermark" aria-hidden>
            DRAFT
          </div>

          <header className="report-preview-page__header">
            <Logo variant="wordmark" className="h-8 w-auto" />
            <div className="report-preview-page__rule" aria-hidden />
          </header>

          <div className="report-preview-page__body">
            <h1 className="report-preview-page__title">{title.trim() || 'Untitled report'}</h1>
            {contextLine && <p className="report-preview-page__context">{contextLine}</p>}
            <ReportHtmlContent html={previewHtml} className="report-preview-page__content" />
          </div>

          <footer className="report-preview-page__footer">
            <div>
              <p className="report-preview-page__footer-title">Terra Meta · Mineral Intelligence</p>
              <p className="report-preview-page__footer-meta">© Terra Meta · 5G Geology Futures · terrameta.5ggeology.com</p>
            </div>
            <Logo variant="icon" className="report-preview-page__footer-icon" />
          </footer>
        </article>
      </div>

      <div className="report-preview-actions">
        {approved ? (
          <p className="report-preview-actions__done" role="status">
            Content approved. Continue to publish settings when ready.
          </p>
        ) : (
          <>
            <p className="report-preview-actions__copy">
              Happy with the layout? Approve to continue to publish settings.
            </p>
            {approveError && <p className="report-preview-actions__error">{approveError}</p>}
            {onApprove && (
              <button
                type="button"
                onClick={onApprove}
                disabled={!canApprove || loading}
                className="btn-primary text-sm report-preview-actions__btn"
              >
                Approve content
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
