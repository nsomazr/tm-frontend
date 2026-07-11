interface UploadProgressBarProps {
  progress: number
  label?: string
  className?: string
}

export default function UploadProgressBar({
  progress,
  label = 'Uploading…',
  className = '',
}: UploadProgressBarProps) {
  const pct = Math.min(100, Math.max(0, Math.round(progress)))
  const indeterminate = pct <= 0

  return (
    <div
      className={`rounded-lg border border-app-border bg-app-bg px-4 py-3 space-y-2 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-app-secondary">{label}</span>
        <span className="tabular-nums text-app-muted shrink-0">{indeterminate ? '…' : `${pct}%`}</span>
      </div>
      <div className="h-2 rounded-full bg-app-subtle overflow-hidden">
        <div
          className={`h-full rounded-full bg-terra-600 transition-all duration-300 ${
            indeterminate ? 'animate-pulse w-[18%]' : ''
          }`}
          style={indeterminate ? undefined : { width: `${Math.max(pct, 4)}%` }}
        />
      </div>
    </div>
  )
}
