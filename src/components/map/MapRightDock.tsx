import type { MapLayer } from '../../types'
import type { BasemapId } from './basemaps'
import { BASEMAPS } from './basemaps'
import BasemapSwitcher from './BasemapSwitcher'
import LegendPanel from './LegendPanel'
import CountryBoundaryPanel from './CountryBoundaryPanel'
import CoordinateSystemPicker from './CoordinateSystemPicker'
import type { BoundaryLevelKey, BoundaryVisibility } from './adminBoundaryStyles'
import type { CoordinateSystemId } from './coordinateSystems'
import type { CoordinateDisplayFormat } from './coordinateFormat'
import type { Country } from '../../types'
import type { BoundaryFocus } from './boundaryFocus'
import BoundaryVisibilityToggles from './BoundaryVisibilityToggles'
import AdPlacementSlot from '../ads/AdPlacementSlot'
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
  countryCenter?: { lat: number; lng: number } | null
  coordinateFormat?: CoordinateDisplayFormat
  onCoordinateFormatChange?: (format: CoordinateDisplayFormat) => void
  hasPaidAccess?: boolean
  showCoordinateSystem?: boolean
  showMapAds?: boolean
  totalLayerCount?: number
  showLayerRotationHint?: boolean
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
  countryCenter = null,
  coordinateFormat = 'decimal',
  onCoordinateFormatChange,
  hasPaidAccess = false,
  showCoordinateSystem = false,
  showMapAds = true,
  totalLayerCount,
  showLayerRotationHint = false,
}: MapRightDockProps) {
  const { m } = useTranslation()
  const current = BASEMAPS.find((b) => b.id === basemap) ?? BASEMAPS[0]

  return (
    <aside className="absolute z-10 flex-col gap-1.5 pointer-events-none max-h-[calc(100%-4rem)] overflow-y-auto
      top-3 right-3 w-60 hidden md:flex">
      {hasPaidAccess && countries.length > 0 ? (
        <div className="pointer-events-auto shrink-0 map-chrome rounded-xl p-2">
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
            compact
          />
        </div>
      ) : hasPaidAccess ? (
        <div className="pointer-events-auto shrink-0 map-chrome rounded-xl p-2">
          <span className="mb-1 block px-0.5 text-[10px] font-semibold uppercase tracking-wide leading-none map-text-muted">
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
      ) : null}
      {showCoordinateSystem && (
        <div className="pointer-events-auto shrink-0 map-chrome rounded-xl overflow-hidden">
          <CoordinateSystemPicker
            value={coordinateSystem}
            onChange={onCoordinateSystemChange}
            countryCode={countryCode}
            countryCenter={countryCenter}
            coordinateFormat={coordinateFormat}
            onCoordinateFormatChange={onCoordinateFormatChange}
          />
        </div>
      )}
      <div className="pointer-events-auto shrink-0 map-chrome rounded-xl overflow-hidden">
        <BasemapSwitcher value={basemap} onChange={onBasemapChange} embedded current={current} />
      </div>
      {/* Legend + ads for every visitor (paid/unpaid, signed in or out).
          Paid users still get the interactive LayerPanel on the left. */}
      {layers.length > 0 && (
        <div className="pointer-events-auto shrink-0 map-chrome rounded-xl overflow-hidden">
          <LegendPanel
            layers={layers}
            embedded
            defaultOpen
            totalLayerCount={totalLayerCount}
            showRotationHint={showLayerRotationHint}
          />
        </div>
      )}
      {showMapAds && (
        <AdPlacementSlot
          placement="map_overlay"
          countryCode={countryCode}
          compact
          className="pointer-events-auto w-full shrink-0"
        />
      )}
    </aside>
  )
}
