import { useMemo } from 'react'
import type { AdminBoundaryStats } from '../../types'
import { BOUNDARY_LEVEL_OPTIONS } from '../map/boundaryLevelOptions'
import { useTranslation } from '../../i18n/LocaleContext'

interface BoundaryLevelPickerProps {
  value: number
  onChange: (level: number) => void
  stats?: AdminBoundaryStats | null
}

export default function BoundaryLevelPicker({
  value,
  onChange,
  stats,
}: BoundaryLevelPickerProps) {
  const { m } = useTranslation()
  const counts = stats?.counts
  const levels = useMemo(() => BOUNDARY_LEVEL_OPTIONS, [])

  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium text-app-text">{m.adminBoundaries.boundaryType}</span>
      <div
        className="rounded-xl border border-app-border overflow-hidden divide-y app-divider"
        role="radiogroup"
        aria-label={m.adminBoundaries.boundaryType}
      >
        {levels.map((level) => {
          const count = counts?.[String(level.value) as '0' | '1' | '2' | '3' | '4'] ?? 0
          const selected = value === level.value

          return (
            <button
              key={level.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(level.value)}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                selected
                  ? 'bg-terra-500/10 text-app-text'
                  : 'bg-app-surface hover:bg-app-subtle/60 text-app-text'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  selected ? 'ring-2 ring-terra-500/40 ring-offset-1 ring-offset-transparent' : ''
                }`}
                style={{ backgroundColor: level.accent }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 text-sm font-medium truncate">{level.label}</span>
              <span className="text-[10px] font-mono uppercase tracking-wide text-app-text-muted shrink-0">
                {level.admon}
              </span>
              <span
                className={`min-w-[2.5rem] text-right text-sm tabular-nums shrink-0 ${
                  selected ? 'font-semibold text-app-text' : 'text-app-text-muted'
                }`}
              >
                {count > 0 ? count.toLocaleString() : '—'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
