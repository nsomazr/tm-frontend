import { useTranslation } from '../../i18n/LocaleContext'

interface MapZoomControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onResetView?: () => void
  className?: string
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
}: MapZoomControlsProps) {
  const { m } = useTranslation()
  const btnClass =
    'flex h-10 w-10 items-center justify-center text-lg font-medium map-text-secondary transition-colors hover:bg-app-subtle active:bg-app-subtle'

  return (
    <div
      className={`pointer-events-auto map-chrome flex flex-col overflow-hidden rounded-xl border border-app-border ${className}`}
    >
      <button type="button" aria-label={m.map.zoomIn} onClick={onZoomIn} className={btnClass}>
        +
      </button>
      <div className="h-px shrink-0 bg-app-border" />
      <button type="button" aria-label={m.map.zoomOut} onClick={onZoomOut} className={btnClass}>
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
            className={btnClass}
          >
            <ResetViewIcon className="h-[18px] w-[18px]" />
          </button>
        </>
      )}
    </div>
  )
}
