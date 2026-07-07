import type { ReactNode } from 'react'
import Logo from '../brand/Logo'
import type { Report } from '../../types'

interface ReportDocumentChromeProps {
  report: Report
  children: ReactNode
}

export default function ReportDocumentChrome({ report, children }: ReportDocumentChromeProps) {
  const isFree = report.access_type === 'free'
  const isPreview = !report.has_full_access

  return (
    <div className="report-document">
      {isPreview && (
        <div className="report-document__watermark report-document__watermark--preview" aria-hidden>
          PREVIEW
        </div>
      )}
      {isFree && !isPreview && (
        <div className="report-document__watermark report-document__watermark--free" aria-hidden>
          <Logo variant="icon" className="h-24 w-24 opacity-[0.08]" />
        </div>
      )}

      <header className="report-document__header">
        <Logo variant="wordmark" className="h-9 w-auto" />
        <div className="report-document__header-rule" aria-hidden />
      </header>

      <div className="report-document__body">{children}</div>

      <footer className="report-document__footer">
        <div className="report-document__footer-copy">
          <p className="report-document__footer-title">Terra Meta · Mineral Intelligence</p>
          <p className="report-document__footer-meta">© Terra Meta · 5G Geology Futures · terrameta.5ggeology.com</p>
        </div>
        <Logo variant="icon" className="report-document__footer-icon" />
      </footer>
    </div>
  )
}
