import { useState } from 'react'
import {
  type CoordinateSystemId,
  readStoredCoordinateSystem,
  storeCoordinateSystem,
} from './coordinateSystems'

export function useCoordinateSystemState() {
  const [coordinateSystem, setCoordinateSystemState] = useState<CoordinateSystemId>(
    readStoredCoordinateSystem
  )

  const setCoordinateSystem = (id: CoordinateSystemId) => {
    setCoordinateSystemState(id)
    storeCoordinateSystem(id)
  }

  return [coordinateSystem, setCoordinateSystem] as const
}
