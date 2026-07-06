interface ReportGenerationProgressProps {
  progress: number
  label: string
}

export default function ReportGenerationProgress({ progress, label }: ReportGenerationProgressProps) {
  const pct = Math.min(100, Math.max(0, Math.round(progress)))

  return (
    <div className="report-gen-progress" role="status" aria-live="polite" aria-busy="true">
      <div className="report-gen-progress__icon" aria-hidden>
        <span className="report-gen-progress__pulse" />
      </div>
      <div className="report-gen-progress__content">
        <div className="report-gen-progress__header">
          <span className="report-gen-progress__label">{label}</span>
          <span className="report-gen-progress__pct">{pct}%</span>
        </div>
        <div className="report-gen-progress__track" aria-hidden>
          <div className="report-gen-progress__bar" style={{ width: `${pct}%` }} />
        </div>
        <p className="report-gen-progress__hint">Building a 3–5 page draft — usually 15–45 seconds.</p>
      </div>
    </div>
  )
}
