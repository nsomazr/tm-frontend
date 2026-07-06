import type { Country } from '../../types'
import type { BoundaryLevelKey, BoundaryVisibility } from './adminBoundaryStyles'
import type { BoundaryFocus } from './boundaryFocus'
import BoundaryVisibilityToggles from './BoundaryVisibilityToggles'
import CountrySelect from './CountrySelect'
import { useTranslation } from '../../i18n/LocaleContext'

interface CountryBoundaryPanelProps {
  countries: Country[]
  countryCode: string
  onCountryChange: (code: string) => void
  availableBoundaryLevels: BoundaryLevelKey[]
  boundaryVisibility: BoundaryVisibility
  onBoundaryVisibilityChange: (next: BoundaryVisibility) => void
  showBasemapLabels?: boolean
  onShowBasemapLabelsChange?: (next: boolean) => void
  showBoundaryLabels?: boolean
  onShowBoundaryLabelsChange?: (next: boolean) => void
  boundaryFocus?: BoundaryFocus | null
  onClearBoundaryFocus?: () => void
  villagesLoading?: boolean
  villagesError?: boolean
  lockedBoundaryLevels?: BoundaryLevelKey[]
  compact?: boolean
  className?: string
}

export default function CountryBoundaryPanel({
  countries,
  countryCode,
  onCountryChange,
  availableBoundaryLevels,
  boundaryVisibility,
  onBoundaryVisibilityChange,
  showBasemapLabels,
  onShowBasemapLabelsChange,
  showBoundaryLabels,
  onShowBoundaryLabelsChange,
  boundaryFocus,
  onClearBoundaryFocus,
  villagesLoading = false,
  villagesError = false,
  lockedBoundaryLevels = [],
  compact = false,
  className = '',
}: CountryBoundaryPanelProps) {
  const { t, m } = useTranslation()

  if (countries.length === 0) return null

  const layerPadding = compact ? 'px-0.5' : 'px-1'
  const showLayersSection =
    availableBoundaryLevels.length > 0 ||
    onShowBasemapLabelsChange != null ||
    onShowBoundaryLabelsChange != null

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className={`flex flex-col gap-1 ${layerPadding}`}>
        <span className="text-[11px] font-semibold uppercase tracking-wide map-text-muted">
          {m.map.boundaryCountryLabel}
        </span>
        <CountrySelect
          countries={countries}
          value={countryCode}
          onChange={onCountryChange}
          compact={compact}
          placeholder={m.map.searchCountries}
        />
      </label>

      {showLayersSection && (
        <div className={layerPadding}>
          <span className="text-[11px] font-semibold uppercase tracking-wide map-text-muted">
            {m.map.boundaryLayersTitle}
          </span>
          {boundaryFocus && (
            <div className="mt-1.5 mb-1 rounded-lg border border-terra-500/25 bg-terra-500/8 px-2 py-1.5">
              <p className="text-[11px] text-app-text-secondary leading-snug">
                {t('map.boundaryFocusHint', { name: boundaryFocus.name })}
              </p>
              {onClearBoundaryFocus && (
                <button
                  type="button"
                  onClick={onClearBoundaryFocus}
                  className="mt-1 text-[11px] font-medium text-terra-600 dark:text-terra-400 hover:underline"
                >
                  {m.map.showAllBoundaries}
                </button>
              )}
            </div>
          )}
          <BoundaryVisibilityToggles
            availableLevels={availableBoundaryLevels}
            value={boundaryVisibility}
            onChange={onBoundaryVisibilityChange}
            lockedLevels={lockedBoundaryLevels}
            showBasemapLabels={showBasemapLabels}
            onShowBasemapLabelsChange={onShowBasemapLabelsChange}
            showBoundaryLabels={showBoundaryLabels}
            onShowBoundaryLabelsChange={onShowBoundaryLabelsChange}
            villagesLoading={villagesLoading}
            villagesError={villagesError}
            compact={compact}
            className="mt-1.5"
          />
        </div>
      )}
    </div>
  )
}
