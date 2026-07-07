import ReportContentModeTabs, { type ReportContentMode } from './ReportContentModeTabs'

export type ReportStageView = 'edit' | 'preview'

interface ReportStageBarProps {
  view?: ReportStageView
  onViewChange?: (view: ReportStageView) => void
  contextLine?: string
  contentMode?: ReportContentMode
  onContentModeChange?: (mode: ReportContentMode) => void
  showViewToggle?: boolean
}

export default function ReportStageBar({
  view = 'edit',
  onViewChange,
  contextLine,
  contentMode,
  onContentModeChange,
  showViewToggle = true,
}: ReportStageBarProps) {
  const showContentModes = Boolean(contentMode && onContentModeChange)
  const showEditPreview = showViewToggle && Boolean(onViewChange)

  if (!showContentModes && !showEditPreview) return null

  return (
    <div className="report-stage-bar report-stage-bar--compact">
      <div className="report-stage-bar__start">
        {showContentModes && (
          <ReportContentModeTabs mode={contentMode!} onChange={onContentModeChange!} />
        )}

        {showContentModes && showEditPreview && (
          <span className="report-stage-bar__divider" aria-hidden />
        )}

        {showEditPreview && (
          <div className="segmented report-stage-bar__modes" role="tablist" aria-label="Report content view">
            <button
              type="button"
              role="tab"
              aria-selected={view === 'edit'}
              className={`segmented-btn px-2.5 py-1 text-sm ${view === 'edit' ? 'segmented-btn-active' : ''}`}
              onClick={() => onViewChange?.('edit')}
            >
              Edit
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'preview'}
              className={`segmented-btn px-2.5 py-1 text-sm ${view === 'preview' ? 'segmented-btn-active' : ''}`}
              onClick={() => onViewChange?.('preview')}
            >
              Preview
            </button>
          </div>
        )}

        {view === 'edit' && contextLine && (
          <span className="report-stage-bar__context">{contextLine}</span>
        )}
      </div>
    </div>
  )
}
