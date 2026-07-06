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
    <div className="space-y-2">
      <span className="text-sm font-medium text-app-secondary">{m.adminBoundaries.boundaryType}</span>
      <div className="grid gap-2 sm:grid-cols-2">
        {levels.map((level) => {
          const count = counts?.[String(level.value) as '0' | '1' | '2' | '3' | '4'] ?? 0
          const selected = value === level.value

          return (
            <button
              key={level.value}
              type="button"
              onClick={() => onChange(level.value)}
              className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                selected
                  ? 'border-terra-600 bg-terra-500/8'
                  : 'border-app-border bg-app-bg hover:border-app-border-strong hover:bg-app-subtle/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="block text-sm font-medium text-app-text">{level.boundaryLabel}</span>
                  <span className="text-[11px] font-mono text-app-muted">{level.admon}</span>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-app-text-secondary">
                  {count > 0 ? count : '-'}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
