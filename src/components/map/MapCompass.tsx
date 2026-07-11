import { useTranslation } from '../../i18n/LocaleContext'

interface MapCompassProps {
  /** OpenLayers view rotation in radians (0 = north up). */
  rotationRad?: number
  className?: string
  compact?: boolean
  onResetNorth?: () => void
}

export default function MapCompass({
  rotationRad = 0,
  className = '',
  compact = false,
  onResetNorth,
}: MapCompassProps) {
  const { m } = useTranslation()
  const size = compact ? 40 : 48
  const rotationDeg = (-rotationRad * 180) / Math.PI
  const interactive = typeof onResetNorth === 'function' && Math.abs(rotationRad) > 0.001

  const body = (
    <svg
      width={size - 8}
      height={size - 8}
      viewBox="0 0 40 40"
      className="text-app-text-secondary"
      style={{ transform: `rotate(${rotationDeg}deg)` }}
    >
      <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1.25" />
      <path d="M20 6 L23 14 L20 12 L17 14 Z" fill="#dc2626" stroke="#ffffff" strokeWidth="0.75" />
      <path
        d="M20 34 L17 26 L20 28 L23 26 Z"
        fill="currentColor"
        fillOpacity="0.35"
        stroke="currentColor"
        strokeOpacity="0.45"
        strokeWidth="0.5"
      />
      <text x="20" y="11" textAnchor="middle" fontSize="7" fontWeight="700" fill="#dc2626">
        N
      </text>
      <text x="20" y="37" textAnchor="middle" fontSize="6" fontWeight="600" fill="currentColor" fillOpacity="0.55">
        S
      </text>
      <text x="6" y="22" textAnchor="middle" fontSize="6" fontWeight="600" fill="currentColor" fillOpacity="0.45">
        W
      </text>
      <text x="34" y="22" textAnchor="middle" fontSize="6" fontWeight="600" fill="currentColor" fillOpacity="0.45">
        E
      </text>
    </svg>
  )

  if (interactive) {
    return (
      <button
        type="button"
        className={`pointer-events-auto map-chrome flex items-center justify-center rounded-xl border border-app-border bg-app-surface/95 shadow-sm backdrop-blur-sm cursor-pointer hover:bg-app-subtle ${className}`}
        style={{ width: size, height: size }}
        aria-label={m.map.compassNorth}
        title={`${m.map.compassNorth} — reset`}
        onClick={onResetNorth}
      >
        {body}
      </button>
    )
  }

  return (
    <div
      className={`pointer-events-none map-chrome flex items-center justify-center rounded-xl border border-app-border bg-app-surface/95 shadow-sm backdrop-blur-sm ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={m.map.compassNorth}
      title={m.map.compassNorth}
    >
      {body}
    </div>
  )
}
