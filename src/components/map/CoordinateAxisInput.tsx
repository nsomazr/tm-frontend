import type { DmsAxisParts, LatHemisphere, LngHemisphere } from './coordinateFormat'

const BOX =
  'rounded-md border border-app-border bg-app-surface px-1.5 py-1.5 text-sm tabular-nums map-text focus:border-terra-500 focus:outline-none focus:ring-2 focus:ring-terra-500/25'
const BOX_COMPACT =
  'rounded-md border border-app-border bg-app-surface px-1.5 py-1.5 text-xs tabular-nums map-text focus:border-terra-500 focus:outline-none focus:ring-2 focus:ring-terra-500/25'
const UNIT = 'shrink-0 text-[10px] font-medium map-text-muted'

type CoordinateAxisInputProps = {
  axis: 'lat' | 'lng'
  label: string
  format: 'decimal' | 'dms'
  decimalValue: string
  onDecimalChange: (value: string) => void
  dmsValue: DmsAxisParts
  onDmsChange: (value: DmsAxisParts) => void
  compact?: boolean
  className?: string
}

function sanitizeInt(raw: string, maxLen: number) {
  return raw.replace(/[^\d]/g, '').slice(0, maxLen)
}

function sanitizeDecimal(raw: string, maxLen: number) {
  const cleaned = raw.replace(/[^\d.]/g, '')
  const [whole, ...rest] = cleaned.split('.')
  if (rest.length === 0) return whole.slice(0, maxLen)
  return `${whole.slice(0, maxLen)}.${rest.join('').slice(0, 4)}`
}

export default function CoordinateAxisInput({
  axis,
  label,
  format,
  decimalValue,
  onDecimalChange,
  dmsValue,
  onDmsChange,
  compact = false,
  className = '',
}: CoordinateAxisInputProps) {
  const box = compact ? BOX_COMPACT : BOX
  const hemispheres = axis === 'lat' ? (['N', 'S'] as const) : (['E', 'W'] as const)

  if (format === 'decimal') {
    return (
      <label className={`block min-w-0 ${className}`}>
        <span className="block text-[10px] uppercase tracking-wide map-text-muted">{label}</span>
        <input
          value={decimalValue}
          onChange={(e) => onDecimalChange(e.target.value)}
          inputMode="decimal"
          placeholder={axis === 'lat' ? '-6.17' : '35.74'}
          className={`mt-0.5 w-full ${box} px-2`}
          aria-label={label}
        />
      </label>
    )
  }

  return (
    <div className={`min-w-0 ${className}`}>
      <span className="block text-[10px] uppercase tracking-wide map-text-muted">{label}</span>
      <div className="mt-0.5 flex items-center gap-1">
        <input
          value={dmsValue.degrees}
          onChange={(e) =>
            onDmsChange({ ...dmsValue, degrees: sanitizeInt(e.target.value, axis === 'lat' ? 2 : 3) })
          }
          inputMode="numeric"
          placeholder="0"
          className={`w-10 sm:w-11 text-center ${box}`}
          aria-label={`${label} degrees`}
        />
        <span className={UNIT} aria-hidden>
          °
        </span>
        <input
          value={dmsValue.minutes}
          onChange={(e) => onDmsChange({ ...dmsValue, minutes: sanitizeInt(e.target.value, 2) })}
          inputMode="numeric"
          placeholder="0"
          className={`w-9 sm:w-10 text-center ${box}`}
          aria-label={`${label} minutes`}
        />
        <span className={UNIT} aria-hidden>
          ′
        </span>
        <input
          value={dmsValue.seconds}
          onChange={(e) => onDmsChange({ ...dmsValue, seconds: sanitizeDecimal(e.target.value, 2) })}
          inputMode="decimal"
          placeholder="0"
          className={`w-12 sm:w-14 text-center ${box}`}
          aria-label={`${label} seconds`}
        />
        <span className={UNIT} aria-hidden>
          ″
        </span>
        <select
          value={dmsValue.hemi}
          onChange={(e) =>
            onDmsChange({
              ...dmsValue,
              hemi: e.target.value as LatHemisphere | LngHemisphere,
            })
          }
          className={`min-w-[2.75rem] ${box} px-1`}
          aria-label={`${label} hemisphere`}
        >
          {hemispheres.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
