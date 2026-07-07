const WORDS_PER_PAGE = 400
const MIN_WORDS = 1200
const MAX_WORDS = 2000

interface ReportMetricsPanelProps {
  words: number
  findingsCount: number
  approved: boolean
  compact?: boolean
  preview?: boolean
}

function estimatedPages(words: number) {
  if (!words) return 0
  return Math.max(1, Math.round(words / WORDS_PER_PAGE))
}

export default function ReportMetricsPanel({
  words,
  findingsCount,
  approved,
  compact = false,
  preview = false,
}: ReportMetricsPanelProps) {
  const pages = estimatedPages(words)
  const progress = words ? Math.min(100, Math.round((words / MIN_WORDS) * 100)) : 0
  const status =
    words === 0 ? 'empty' : words < MIN_WORDS ? 'short' : words > MAX_WORDS ? 'long' : 'ok'

  if (compact) {
    return (
      <div className="report-metrics-bar">
        <div className="report-metrics-bar__group">
          <span className="report-metrics-bar__stat">
            <strong>{words > 0 ? words.toLocaleString() : '0'}</strong> words
          </span>
          <span className="report-metrics-bar__sep" aria-hidden />
          <span className="report-metrics-bar__stat">
            ~<strong>{pages || '-'}</strong> pages
          </span>
          {!preview && (
            <>
              <span className="report-metrics-bar__sep" aria-hidden />
              <span className="report-metrics-bar__stat">
                <strong>{findingsCount}</strong> findings
              </span>
            </>
          )}
        </div>

        {!preview && (
          <div className="report-metrics-bar__progress" aria-hidden>
            <div
              className={`report-metrics-bar__fill report-metrics-bar__fill--${status}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="report-metrics-bar__meta">
          {!preview && status === 'short' && words > 0 && (
            <span className="report-metrics-bar__warn">Below 3-page target</span>
          )}
          <span
            className={`report-metrics-bar__status ${approved ? 'report-metrics-bar__status--approved' : ''}`}
          >
            {approved ? 'Approved' : 'Draft'}
          </span>
        </div>
      </div>
    )
  }

  return (
    <aside className="report-metrics">
      <div className="report-metrics__card">
        <p className="report-metrics__label">Document length</p>
        <p className="report-metrics__value">
          {words > 0 ? words.toLocaleString() : '-'}
          <span className="report-metrics__unit">words</span>
        </p>
        <div className="report-metrics__track" aria-hidden>
          <div
            className={`report-metrics__fill report-metrics__fill--${status}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="report-metrics__hint">
          {words > 0 ? (
            <>
              ~{pages} page{pages === 1 ? '' : 's'} · target {MIN_WORDS.toLocaleString()}-
              {MAX_WORDS.toLocaleString()}
            </>
          ) : (
            <>Target 3-5 pages ({MIN_WORDS.toLocaleString()}-{MAX_WORDS.toLocaleString()} words)</>
          )}
        </p>
        {status === 'short' && (
          <p className="report-metrics__alert">Below 3-page minimum. Refine or add content.</p>
        )}
        {status === 'long' && (
          <p className="report-metrics__alert report-metrics__alert--muted">Above 5-page guideline.</p>
        )}
      </div>

      <div className="report-metrics__card">
        <p className="report-metrics__label">Key findings</p>
        <p className="report-metrics__value">
          {findingsCount}
          <span className="report-metrics__unit">bullets</span>
        </p>
        <p className="report-metrics__hint">Shown as a list in the exported PDF</p>
      </div>

      <div className="report-metrics__card">
        <p className="report-metrics__label">Status</p>
        <span
          className={`report-metrics__status ${approved ? 'report-metrics__status--approved' : 'report-metrics__status--draft'}`}
        >
          {approved ? 'Approved' : 'Draft'}
        </span>
      </div>
    </aside>
  )
}
