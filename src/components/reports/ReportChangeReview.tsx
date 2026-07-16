interface ReportChangeReviewProps {
  changeCount: number
  onAccept: () => void
}

export default function ReportChangeReview({ changeCount, onAccept }: ReportChangeReviewProps) {
  if (changeCount <= 0) return null

  return (
    <div className="report-change-review" role="status">
      <div className="report-change-review__copy">
        <strong>AI updated your draft</strong>
        <span>
          {changeCount === 1
            ? '1 section changed. Highlighted in green below.'
            : `${changeCount} sections changed. Highlighted in green below.`}
        </span>
      </div>
      <div className="report-change-review__actions">
        <button type="button" className="btn-primary text-sm" onClick={onAccept}>
          Accept changes
        </button>
      </div>
    </div>
  )
}
