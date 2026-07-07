import { useEffect, useState } from 'react'
import {
  COORDINATE_FORMAT_CHANGE_EVENT,
  COORDINATE_FORMAT_STORAGE_KEY,
  type CoordinateDisplayFormat,
  readStoredCoordinateFormat,
  storeCoordinateFormat,
} from './coordinateFormat'

export function useCoordinateFormatState() {
  const [format, setFormatState] = useState<CoordinateDisplayFormat>(readStoredCoordinateFormat)

  useEffect(() => {
    const apply = (value: string | null | undefined) => {
      if (value === 'dms' || value === 'decimal') setFormatState(value)
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key === COORDINATE_FORMAT_STORAGE_KEY) apply(event.newValue)
    }

    const onCustom = (event: Event) => {
      const detail = (event as CustomEvent<CoordinateDisplayFormat>).detail
      if (detail) apply(detail)
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener(COORDINATE_FORMAT_CHANGE_EVENT, onCustom)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(COORDINATE_FORMAT_CHANGE_EVENT, onCustom)
    }
  }, [])

  const setFormat = (next: CoordinateDisplayFormat) => {
    setFormatState(next)
    storeCoordinateFormat(next)
  }

  return [format, setFormat] as const
}
