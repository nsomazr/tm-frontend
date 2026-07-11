import {
  coordinateSystemById,
  formatCoordinate,
  formatCoordinateParts,
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
  const useStackedDms = system.kind === 'geographic' && coordinateFormat === 'dms'
  const text = formatCoordinate(transformed, system.kind, coordinateFormat)
  const parts = useStackedDms
    ? formatCoordinateParts(transformed, system.kind, coordinateFormat)
    : null

  return (
    <div
      className={`map-coordinate-readout pointer-events-auto map-chrome rounded-lg px-2.5 py-1.5 text-[11px] font-mono tabular-nums map-text-secondary shadow-sm ${className}`}
    >
      <p className="mb-1.5 truncate text-[10px] font-sans font-semibold uppercase leading-none tracking-wide map-text-muted">
        {system.label}
      </p>
      <div className="flex min-h-[1.25rem] items-start gap-2">
        {parts ? (
          <div className="min-w-0 flex-1 space-y-0.5 text-[11px] leading-snug">
            <div className="whitespace-nowrap">{parts.primary}</div>
            <div className="whitespace-nowrap">{parts.secondary}</div>
          </div>
        ) : (
          <span className="min-w-0 flex-1 break-all text-[11px] leading-tight">{text}</span>
        )}
        {system.kind === 'geographic' && (
          <CoordinateFormatToggle
            value={coordinateFormat}
            onChange={onCoordinateFormatChange}
            compact
            className="shrink-0 mt-0.5"
          />
        )}
      </div>
    </div>
  )
}
