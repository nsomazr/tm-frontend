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
      className={`map-coordinate-readout pointer-events-auto map-chrome rounded-lg px-2.5 py-1.5 text-[11px] font-mono tabular-nums map-text-secondary shadow-sm ${className}`}
    >
      <p className="mb-1.5 truncate text-[10px] font-sans font-semibold uppercase leading-none tracking-wide map-text-muted">
        {system.label}
      </p>
      <div className="flex min-h-[1.25rem] items-center gap-2">
        <span className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-[11px] leading-tight [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {text}
        </span>
        {system.kind === 'geographic' && (
          <CoordinateFormatToggle
            value={coordinateFormat}
            onChange={onCoordinateFormatChange}
            compact
            className="shrink-0"
          />
        )}
      </div>
    </div>
  )
}
