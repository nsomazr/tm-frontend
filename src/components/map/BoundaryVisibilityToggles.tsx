import type { BoundaryLevelKey, BoundaryVisibility } from './adminBoundaryStyles'
import { boundaryAccentColor } from './adminBoundaryStyles'
import { BOUNDARY_LEVEL_OPTIONS } from './boundaryLevelOptions'
import { useTranslation } from '../../i18n/LocaleContext'

const rowClass =
  'flex items-center gap-2 text-xs map-text-secondary cursor-pointer min-h-[1.375rem]'

const LEVEL_BY_KEY: Record<BoundaryLevelKey, number> = {
  country: 0,
  regions: 1,
  districts: 2,
  wards: 3,
  villages: 4,
}

interface BoundaryVisibilityTogglesProps {
  availableLevels: BoundaryLevelKey[]
  value: BoundaryVisibility
  onChange: (next: BoundaryVisibility) => void
  /** Optional: levels that cannot be toggled off (unused on the public map). */
  lockedLevels?: BoundaryLevelKey[]
  showBasemapLabels?: boolean
  onShowBasemapLabelsChange?: (next: boolean) => void
  showBoundaryLabels?: boolean
  onShowBoundaryLabelsChange?: (next: boolean) => void
  villagesLoading?: boolean
  villagesError?: boolean
  compact?: boolean
  className?: string
}

export default function BoundaryVisibilityToggles({
  availableLevels,
  value,
  onChange,
  lockedLevels = [],
  showBasemapLabels,
  onShowBasemapLabelsChange,
  showBoundaryLabels,
  onShowBoundaryLabelsChange,
  villagesLoading = false,
  villagesError = false,
  compact = false,
  className = '',
}: BoundaryVisibilityTogglesProps) {
  const { m } = useTranslation()

  const showNamesSection =
    onShowBasemapLabelsChange != null || onShowBoundaryLabelsChange != null

  if (availableLevels.length === 0 && !showNamesSection) return null

  const labels: Record<BoundaryLevelKey, string> = {
    country: m.map.boundaryCountry,
    regions: m.map.boundaryRegions,
    districts: m.map.boundaryDistricts,
    wards: m.map.boundaryWards,
    villages: m.map.boundaryVillages,
  }

  const accentByKey = Object.fromEntries(
    BOUNDARY_LEVEL_OPTIONS.map((opt) => [opt.key, opt.accent])
  ) as Record<BoundaryLevelKey, string>

  const checkboxClass =
    'shrink-0 rounded border-app-border-strong text-terra-600 focus:ring-terra-500/30 size-3.5'

  return (
    <div className={`flex flex-col gap-1.5 ${compact ? 'px-0.5' : 'px-1'} ${className}`}>
      {availableLevels.map((key) => {
        const locked = lockedLevels.includes(key)
        return (
        <label key={key} className={`${rowClass}${locked ? ' opacity-80 cursor-default' : ''}`}>
          <input
            type="checkbox"
            checked={value[key]}
            disabled={locked}
            onChange={(e) => {
              if (locked) return
              onChange({ ...value, [key]: e.target.checked })
            }}
            className={checkboxClass}
          />
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/10"
            style={{ backgroundColor: accentByKey[key] ?? boundaryAccentColor(LEVEL_BY_KEY[key]) }}
            aria-hidden
          />
          <span className="leading-snug">{labels[key]}</span>
        </label>
        )
      })}
      {value.villages && villagesLoading && (
        <p className="text-[11px] text-app-muted leading-snug px-0.5">{m.map.villagesLoading}</p>
      )}
      {value.villages && villagesError && !villagesLoading && (
        <p className="text-[11px] text-red-600 dark:text-red-400 leading-snug px-0.5">
          {m.map.villagesLoadError}
        </p>
      )}
      {showNamesSection && (
        <div className="mt-1 pt-1.5 border-t border-app-border/70 flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide map-text-muted px-0.5">
            {m.map.namesSectionTitle}
          </span>
          {onShowBasemapLabelsChange != null && (
            <label className={rowClass}>
              <input
                type="checkbox"
                checked={showBasemapLabels ?? true}
                onChange={(e) => onShowBasemapLabelsChange(e.target.checked)}
                className={checkboxClass}
              />
              <span className="leading-snug">{m.map.basemapLabels}</span>
            </label>
          )}
          {onShowBoundaryLabelsChange != null && (
            <label className={rowClass}>
              <input
                type="checkbox"
                checked={showBoundaryLabels ?? true}
                onChange={(e) => onShowBoundaryLabelsChange(e.target.checked)}
                className={checkboxClass}
              />
              <span className="leading-snug">{m.map.boundaryLabels}</span>
            </label>
          )}
        </div>
      )}
    </div>
  )
}
