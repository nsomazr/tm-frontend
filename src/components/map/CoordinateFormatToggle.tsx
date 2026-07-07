import { useTranslation } from '../../i18n/LocaleContext'
import type { CoordinateDisplayFormat } from './coordinateFormat'

interface CoordinateFormatToggleProps {
  value: CoordinateDisplayFormat
  onChange: (format: CoordinateDisplayFormat) => void
  className?: string
  compact?: boolean
}

export default function CoordinateFormatToggle({
  value,
  onChange,
  className = '',
  compact = false,
}: CoordinateFormatToggleProps) {
  const { m } = useTranslation()

  return (
    <div
      className={`inline-flex rounded-md border border-app-border bg-app-surface p-0.5 ${className}`}
      role="group"
      aria-label={m.map.coordinateFormatLabel}
    >
      {(['decimal', 'dms'] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={`rounded px-2 py-0.5 font-semibold uppercase tracking-wide transition-colors ${
            compact ? 'text-[9px]' : 'text-[10px]'
          } ${
            value === mode
              ? 'bg-terra-600 text-white shadow-sm'
              : 'map-text-muted hover:bg-app-subtle hover:map-text-secondary'
          }`}
          aria-pressed={value === mode}
        >
          {mode === 'decimal' ? m.map.coordinateFormatDecimal : m.map.coordinateFormatDms}
        </button>
      ))}
    </div>
  )
}
