import {
  coordinateSystemById,
  formatCoordinate,
  type CoordinateSystemId,
  transformMapCoordinate,
} from './coordinateSystems'
import type { CoordinateDisplayFormat } from './coordinateFormat'
import CoordinateFormatToggle from './CoordinateFormatToggle'

interface MapCoordinateReadoutProps {
  mapCoordinate: number[] | null
  coordinateSystem: CoordinateSystemId
  coordinateFormat: CoordinateDisplayFormat
  onCoordinateFormatChange: (format: CoordinateDisplayFormat) => void
  className?: string
}

/** Compact single-row readout — height matches the map compass (44px). */
export default function MapCoordinateReadout({
  mapCoordinate,
  coordinateSystem,
  coordinateFormat,
  onCoordinateFormatChange,
  className = '',
}: MapCoordinateReadoutProps) {
  if (!mapCoordinate) return null

  const system = coordinateSystemById(coordinateSystem)
  const transformed = transformMapCoordinate(mapCoordinate, coordinateSystem)
  const text = formatCoordinate(transformed, system.kind, coordinateFormat)

  return (
    <div
      className={`map-coordinate-readout pointer-events-auto map-chrome flex h-11 min-h-11 max-h-11 items-center gap-2 rounded-lg px-2.5 text-[11px] font-mono tabular-nums map-text-secondary shadow-sm ${className}`}
    >
      <div className="min-w-0 shrink">
        <p className="truncate text-[9px] font-sans font-semibold uppercase leading-none tracking-wide map-text-muted">
          {system.label}
        </p>
        <p className="mt-0.5 whitespace-nowrap text-[11px] leading-tight" title={text}>
          {text}
        </p>
      </div>
      {system.kind === 'geographic' && (
        <CoordinateFormatToggle
          value={coordinateFormat}
          onChange={onCoordinateFormatChange}
          compact
          className="shrink-0"
        />
      )}
    </div>
  )
}
