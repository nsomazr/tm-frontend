import { useTranslation } from '../../i18n/LocaleContext'

interface MapZoomControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onResetView?: () => void
  className?: string
  /** Compact horizontal strip for mobile bottom dock. */
  compact?: boolean
}

function ResetViewIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z"
      />
    </svg>
  )
}

export default function MapZoomControls({
  onZoomIn,
  onZoomOut,
  onResetView,
  className = '',
  compact = false,
}: MapZoomControlsProps) {
  const { m } = useTranslation()
  const btnClass =
    'flex items-center justify-center font-medium map-text-secondary transition-colors hover:bg-app-subtle active:bg-app-subtle'
  const compactBtnClass = `${btnClass} h-9 w-9 text-base`
  const btnClassDefault = `${btnClass} h-10 w-10 text-lg`

  if (compact) {
    return (
      <div
        className={`pointer-events-auto map-chrome flex shrink-0 overflow-hidden rounded-lg border border-app-border ${className}`}
      >
        <button type="button" aria-label={m.map.zoomIn} onClick={onZoomIn} className={compactBtnClass}>
          +
        </button>
        <div className="w-px shrink-0 self-stretch bg-app-border" />
        <button type="button" aria-label={m.map.zoomOut} onClick={onZoomOut} className={compactBtnClass}>
          −
        </button>
        {onResetView && (
          <>
            <div className="w-px shrink-0 self-stretch bg-app-border" />
            <button
              type="button"
              aria-label={m.map.resetView}
              title={m.map.resetView}
              onClick={onResetView}
              className={compactBtnClass}
            >
              <ResetViewIcon className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div
      className={`pointer-events-auto map-chrome flex flex-col overflow-hidden rounded-xl border border-app-border ${className}`}
    >
      <button type="button" aria-label={m.map.zoomIn} onClick={onZoomIn} className={btnClassDefault}>
        +
      </button>
      <div className="h-px shrink-0 bg-app-border" />
      <button type="button" aria-label={m.map.zoomOut} onClick={onZoomOut} className={btnClassDefault}>
        −
      </button>
      {onResetView && (
        <>
          <div className="h-px shrink-0 bg-app-border" />
          <button
            type="button"
            aria-label={m.map.resetView}
            title={m.map.resetView}
            onClick={onResetView}
            className={btnClassDefault}
          >
            <ResetViewIcon className="h-[18px] w-[18px]" />
          </button>
        </>
      )}
    </div>
  )
}
