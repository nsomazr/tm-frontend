import {
  coordinateSystemById,
  formatCoordinate,
  type CoordinateSystemId,
  transformMapCoordinate,
} from './coordinateSystems'

interface MapCoordinateReadoutProps {
  mapCoordinate: number[] | null
  coordinateSystem: CoordinateSystemId
  className?: string
}

export default function MapCoordinateReadout({
  mapCoordinate,
  coordinateSystem,
  className = '',
}: MapCoordinateReadoutProps) {
  if (!mapCoordinate) return null

  const system = coordinateSystemById(coordinateSystem)
  const transformed = transformMapCoordinate(mapCoordinate, coordinateSystem)
  const text = formatCoordinate(transformed, system.kind)

  return (
    <div
      className={`map-coordinate-readout pointer-events-none map-chrome rounded-lg px-2.5 py-1.5 text-[11px] font-mono tabular-nums map-text-secondary shadow-sm ${className}`}
    >
      <span className="text-[10px] font-sans font-semibold uppercase tracking-wide map-text-muted mr-2">
        {system.label}
      </span>
      {text}
    </div>
  )
}
