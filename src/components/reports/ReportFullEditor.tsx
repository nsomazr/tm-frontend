import ReportRichEditor from './ReportRichEditor'
import ReportMetricsPanel from './ReportMetricsPanel'
import { reportFindingsCount, reportWordCount } from './reportEditorText'

interface ReportFullEditorProps {
  title: string
  titlePlaceholder?: string
  contextLine?: string
  onTitleChange: (value: string) => void
  executiveSummary: string
  onExecutiveSummaryChange: (value: string) => void
  generating?: boolean
  words?: number
  approved?: boolean
  empty?: boolean
  hideToolbar?: boolean
  fitWorkspace?: boolean
}

export default function ReportFullEditor({
  title,
  titlePlaceholder = 'Report title',
  contextLine,
  onTitleChange,
  executiveSummary,
  onExecutiveSummaryChange,
  generating = false,
  words: wordsProp,
  approved = false,
  empty = false,
  hideToolbar = false,
  fitWorkspace = false,
}: ReportFullEditorProps) {
  const words = wordsProp ?? reportWordCount(executiveSummary)
  const findingsCount = reportFindingsCount(executiveSummary)

  return (
    <section
      className={`report-canvas report-canvas--full ${fitWorkspace ? 'report-canvas--fit-workspace' : ''} ${generating ? 'report-canvas--generating' : ''}`}
    >
      {!hideToolbar && (
        <div className="report-canvas__toolbar">
          {contextLine && <span className="report-canvas__context">{contextLine}</span>}
          <ReportMetricsPanel words={words} findingsCount={findingsCount} approved={approved} compact />
        </div>
      )}

      <div className="report-canvas__surface">
        <article className="report-canvas__content">
          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder={titlePlaceholder}
            className="report-canvas__title"
            disabled={generating}
            aria-label="Report title"
          />

          <div className="report-canvas__divider" aria-hidden />

          {empty && !generating && (
            <p className="report-canvas__empty-hint">
              Write directly below, or use <strong>Generate</strong> at the bottom to draft all sections with AI.
            </p>
          )}

          <ReportRichEditor
            variant="body"
            value={executiveSummary}
            onChange={onExecutiveSummaryChange}
            placeholder="Report body: headings, lists, links, colors, and standard sections available in the toolbar."
            minHeight={fitWorkspace ? '100%' : 'min(62vh, 680px)'}
            disabled={generating}
          />
        </article>
      </div>

      {generating && (
        <div className="report-canvas__overlay" aria-hidden>
          <p>Generating draft…</p>
        </div>
      )}
    </section>
  )
}

export function wordCount(text: string) {
  return reportWordCount(text)
}
