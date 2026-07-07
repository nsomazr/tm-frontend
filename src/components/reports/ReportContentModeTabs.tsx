export type ReportContentMode = 'write' | 'upload'

interface ReportContentModeTabsProps {
  mode: ReportContentMode
  onChange: (mode: ReportContentMode) => void
}

export default function ReportContentModeTabs({ mode, onChange }: ReportContentModeTabsProps) {
  return (
    <div className="segmented report-content-mode-tabs" role="tablist" aria-label="Report content mode">
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'write'}
        onClick={() => onChange('write')}
        className={`segmented-btn px-2.5 py-1 text-sm ${mode === 'write' ? 'segmented-btn-active' : ''}`}
      >
        Write
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'upload'}
        onClick={() => onChange('upload')}
        className={`segmented-btn px-2.5 py-1 text-sm ${mode === 'upload' ? 'segmented-btn-active' : ''}`}
      >
        Upload
      </button>
    </div>
  )
}
