import { useTranslation } from '../../i18n/LocaleContext'

interface MapCompassProps {
  /** OpenLayers view rotation in radians (0 = north up). */
  rotationRad?: number
  className?: string
  compact?: boolean
  onResetNorth?: () => void
}

/** Fixed-size north indicator — keep in sync with `--map-scale-stack-tools-height`. */
export default function MapCompass({
  rotationRad = 0,
  className = '',
  compact = false,
  onResetNorth,
}: MapCompassProps) {
  const { m } = useTranslation()
  const size = compact ? 36 : 44
  const rotationDeg = (-rotationRad * 180) / Math.PI
  const interactive = typeof onResetNorth === 'function' && Math.abs(rotationRad) > 0.001

  const body = (
    <svg
      width={size - 10}
      height={size - 10}
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

  const boxClass = `pointer-events-auto map-chrome flex shrink-0 items-center justify-center rounded-lg border border-app-border bg-app-surface/95 shadow-sm backdrop-blur-sm ${className}`
  const boxStyle = { width: size, height: size }

  if (interactive) {
    return (
      <button
        type="button"
        className={`${boxClass} cursor-pointer hover:bg-app-subtle`}
        style={boxStyle}
        aria-label={m.map.compassNorth}
        title={`${m.map.compassNorth} · reset`}
        onClick={onResetNorth}
      >
        {body}
      </button>
    )
  }

  return (
    <div
      className={`${boxClass} pointer-events-none`}
      style={boxStyle}
      role="img"
      aria-label={m.map.compassNorth}
      title={m.map.compassNorth}
    >
      {body}
    </div>
  )
}
