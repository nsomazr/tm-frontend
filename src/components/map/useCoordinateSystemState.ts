import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { mapsApi } from '../../api'
import {
  COORDINATE_SYSTEM_CHANGE_EVENT,
  type CoordinateSystemId,
  coordinateSystemStorageKey,
  isCoordinateSystemId,
  readStoredCoordinateSystem,
  storeCoordinateSystem,
} from './coordinateSystems'

export function useCoordinateSystemState(countryCode = 'TZ') {
  const normalizedCountry = countryCode.toUpperCase()
  const [coordinateSystem, setCoordinateSystemState] = useState<CoordinateSystemId>(() =>
    readStoredCoordinateSystem(normalizedCountry)
  )

  const { data: platformSettings } = useQuery({
    queryKey: ['map-platform-settings', normalizedCountry],
    queryFn: () => mapsApi.platformSettings(normalizedCountry).then((r) => r.data),
    staleTime: 60_000,
  })

  useEffect(() => {
    setCoordinateSystemState(readStoredCoordinateSystem(normalizedCountry))
  }, [normalizedCountry])

  useEffect(() => {
    const crs = platformSettings?.coordinate_system
    if (crs && isCoordinateSystemId(crs)) {
      setCoordinateSystemState(crs)
      storeCoordinateSystem(crs, normalizedCountry)
    }
  }, [platformSettings?.coordinate_system, normalizedCountry])

  useEffect(() => {
    const apply = (id: string | null | undefined) => {
      if (id && isCoordinateSystemId(id)) {
        setCoordinateSystemState(id)
      }
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key === coordinateSystemStorageKey(normalizedCountry)) {
        apply(event.newValue)
      }
    }

    const onCustom = (event: Event) => {
      const detail = (event as CustomEvent<{ id: CoordinateSystemId; countryCode: string }>).detail
      if (detail?.countryCode === normalizedCountry && detail.id) {
        apply(detail.id)
      }
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener(COORDINATE_SYSTEM_CHANGE_EVENT, onCustom)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(COORDINATE_SYSTEM_CHANGE_EVENT, onCustom)
    }
  }, [normalizedCountry])

  const setCoordinateSystem = (id: CoordinateSystemId) => {
    setCoordinateSystemState(id)
    storeCoordinateSystem(id, normalizedCountry)
  }

  return [coordinateSystem, setCoordinateSystem] as const
}
