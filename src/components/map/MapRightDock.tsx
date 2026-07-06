import type { MapLayer } from '../../types'
import type { BasemapId } from './basemaps'
import { BASEMAPS } from './basemaps'
import BasemapSwitcher from './BasemapSwitcher'
import LegendPanel from './LegendPanel'
import CountryBoundaryPanel from './CountryBoundaryPanel'
import CoordinateSystemPicker from './CoordinateSystemPicker'
import type { BoundaryLevelKey, BoundaryVisibility } from './adminBoundaryStyles'
import type { CoordinateSystemId } from './coordinateSystems'
import type { Country } from '../../types'
import type { BoundaryFocus } from './boundaryFocus'
import BoundaryVisibilityToggles from './BoundaryVisibilityToggles'
import { useTranslation } from '../../i18n/LocaleContext'

interface MapRightDockProps {
  basemap: BasemapId
  onBasemapChange: (id: BasemapId) => void
  showBasemapLabels: boolean
  onShowBasemapLabelsChange: (next: boolean) => void
  showBoundaryLabels: boolean
  onShowBoundaryLabelsChange: (next: boolean) => void
  layers: MapLayer[]
  countries: Country[]
  countryCode: string
  onCountryChange: (code: string) => void
  availableBoundaryLevels: BoundaryLevelKey[]
  boundaryVisibility: BoundaryVisibility
  onBoundaryVisibilityChange: (next: BoundaryVisibility) => void
  boundaryFocus?: BoundaryFocus | null
  onClearBoundaryFocus?: () => void
  villagesLoading?: boolean
  villagesError?: boolean
  lockedBoundaryLevels?: BoundaryLevelKey[]
  coordinateSystem: CoordinateSystemId
  onCoordinateSystemChange: (id: CoordinateSystemId) => void
}

export default function MapRightDock({
  basemap,
  onBasemapChange,
  showBasemapLabels,
  onShowBasemapLabelsChange,
  showBoundaryLabels,
  onShowBoundaryLabelsChange,
  layers,
  countries,
  countryCode,
  onCountryChange,
  availableBoundaryLevels,
  boundaryVisibility,
  onBoundaryVisibilityChange,
  boundaryFocus,
  onClearBoundaryFocus,
  villagesLoading = false,
  villagesError = false,
  lockedBoundaryLevels = [],
  coordinateSystem,
  onCoordinateSystemChange,
}: MapRightDockProps) {
  const { m } = useTranslation()
  const current = BASEMAPS.find((b) => b.id === basemap) ?? BASEMAPS[0]

  return (
    <aside className="absolute z-10 flex-col gap-2 pointer-events-none max-h-[calc(100%-4rem)] overflow-y-auto
      top-3 right-3 w-64 hidden md:flex">
      {countries.length > 0 ? (
        <div className="pointer-events-auto shrink-0 map-chrome rounded-xl p-2.5">
          <CountryBoundaryPanel
            countries={countries}
            countryCode={countryCode}
            onCountryChange={onCountryChange}
            availableBoundaryLevels={availableBoundaryLevels}
            boundaryVisibility={boundaryVisibility}
            onBoundaryVisibilityChange={onBoundaryVisibilityChange}
            showBasemapLabels={showBasemapLabels}
            onShowBasemapLabelsChange={onShowBasemapLabelsChange}
            showBoundaryLabels={showBoundaryLabels}
            onShowBoundaryLabelsChange={onShowBoundaryLabelsChange}
            boundaryFocus={boundaryFocus}
            onClearBoundaryFocus={onClearBoundaryFocus}
            villagesLoading={villagesLoading}
            villagesError={villagesError}
            lockedBoundaryLevels={lockedBoundaryLevels}
          />
        </div>
      ) : (
        <div className="pointer-events-auto shrink-0 map-chrome rounded-xl p-2.5">
          <span className="block text-[11px] font-semibold uppercase tracking-wide map-text-muted px-0.5 mb-1.5">
            {m.map.boundaryLayersTitle}
          </span>
          <BoundaryVisibilityToggles
            availableLevels={[]}
            value={boundaryVisibility}
            onChange={onBoundaryVisibilityChange}
            showBasemapLabels={showBasemapLabels}
            onShowBasemapLabelsChange={onShowBasemapLabelsChange}
            showBoundaryLabels={showBoundaryLabels}
            onShowBoundaryLabelsChange={onShowBoundaryLabelsChange}
            compact
          />
        </div>
      )}
      <div className="pointer-events-auto shrink-0 map-chrome rounded-xl overflow-hidden">
        <CoordinateSystemPicker value={coordinateSystem} onChange={onCoordinateSystemChange} />
      </div>
      <div className="pointer-events-auto shrink-0 map-chrome rounded-xl overflow-hidden">
        <BasemapSwitcher value={basemap} onChange={onBasemapChange} embedded current={current} />
      </div>
      {layers.length > 0 && (
        <div className="pointer-events-auto shrink-0 map-chrome rounded-xl overflow-hidden">
          <LegendPanel layers={layers} embedded defaultOpen />
        </div>
      )}
    </aside>
  )
}
