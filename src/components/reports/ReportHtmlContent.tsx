import { looksLikeHtml, sanitizeReportHtml } from './reportEditorText'

interface ReportHtmlContentProps {
  html: string
  className?: string
}

export default function ReportHtmlContent({ html, className = '' }: ReportHtmlContentProps) {
  if (!html.trim()) return null

  if (!looksLikeHtml(html)) {
    return (
      <div className={`report-html-content ${className}`.trim()}>
        {html.split(/\n{2,}/).map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    )
  }

  return (
    <div
      className={`report-html-content ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: sanitizeReportHtml(html) }}
    />
  )
}
