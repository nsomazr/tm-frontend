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

  const dense = compact
  const sectionGap = dense ? 'gap-1' : 'gap-1.5'
  const layerPadding = dense ? 'px-0' : 'px-0.5'
  const sectionLabel =
    'text-[10px] font-semibold uppercase tracking-wide map-text-muted leading-none'
  const showLayersSection =
    availableBoundaryLevels.length > 0 ||
    onShowBasemapLabelsChange != null ||
    onShowBoundaryLabelsChange != null

  return (
    <div className={`flex flex-col ${sectionGap} ${className}`}>
      <label className={`flex flex-col gap-0.5 ${layerPadding}`}>
        <span className={sectionLabel}>{m.map.boundaryCountryLabel}</span>
        <CountrySelect
          countries={countries}
          value={countryCode}
          onChange={onCountryChange}
          compact={compact}
          showCountHint={!compact}
          placeholder={m.map.searchCountries}
        />
      </label>

      {showLayersSection && (
        <div className={layerPadding}>
          <span className={sectionLabel}>{m.map.boundaryLayersTitle}</span>
          {boundaryFocus && (
            <div className="mb-0.5 mt-1 rounded-md border border-terra-500/25 bg-terra-500/8 px-2 py-1">
              <p className="text-[10px] text-app-text-secondary leading-snug">
                {t('map.boundaryFocusHint', { name: boundaryFocus.name })}
              </p>
              {onClearBoundaryFocus && (
                <button
                  type="button"
                  onClick={onClearBoundaryFocus}
                  className="mt-0.5 text-[10px] font-medium text-terra-600 dark:text-terra-400 hover:underline"
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
            className={dense ? 'mt-0.5' : 'mt-1'}
          />
        </div>
      )}
    </div>
  )
}
