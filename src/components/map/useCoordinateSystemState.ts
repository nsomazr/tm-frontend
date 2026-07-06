import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { mapsApi } from '../../api'
import {
  COORDINATE_SYSTEM_CHANGE_EVENT,
  COORDINATE_SYSTEM_STORAGE_KEY,
  COORDINATE_SYSTEMS,
  type CoordinateSystemId,
  readStoredCoordinateSystem,
  storeCoordinateSystem,
} from './coordinateSystems'

function isCoordinateSystemId(value: string): value is CoordinateSystemId {
  return COORDINATE_SYSTEMS.some((c) => c.id === value)
}

export function useCoordinateSystemState() {
  const [coordinateSystem, setCoordinateSystemState] = useState<CoordinateSystemId>(
    readStoredCoordinateSystem
  )

  const { data: platformSettings } = useQuery({
    queryKey: ['map-platform-settings'],
    queryFn: () => mapsApi.platformSettings().then((r) => r.data),
    staleTime: 60_000,
  })

  useEffect(() => {
    const crs = platformSettings?.coordinate_system
    if (crs && isCoordinateSystemId(crs)) {
      setCoordinateSystemState(crs)
      storeCoordinateSystem(crs)
    }
  }, [platformSettings?.coordinate_system])

  useEffect(() => {
    const apply = (id: string | null | undefined) => {
      if (id && isCoordinateSystemId(id)) {
        setCoordinateSystemState(id)
      }
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key === COORDINATE_SYSTEM_STORAGE_KEY) {
        apply(event.newValue)
      }
    }

    const onCustom = (event: Event) => {
      const detail = (event as CustomEvent<CoordinateSystemId>).detail
      if (detail) apply(detail)
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener(COORDINATE_SYSTEM_CHANGE_EVENT, onCustom)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(COORDINATE_SYSTEM_CHANGE_EVENT, onCustom)
    }
  }, [])

  const setCoordinateSystem = (id: CoordinateSystemId) => {
    setCoordinateSystemState(id)
    storeCoordinateSystem(id)
  }

  return [coordinateSystem, setCoordinateSystem] as const
}
