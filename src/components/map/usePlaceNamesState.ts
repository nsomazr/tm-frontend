import { useCallback, useState } from 'react'

const BASEMAP_STORAGE_KEY = 'tm-show-basemap-labels'
const BOUNDARY_STORAGE_KEY = 'tm-show-boundary-labels'
const LEGACY_STORAGE_KEY = 'tm-show-place-names'

function readBool(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key)
    if (raw === '0' || raw === 'false') return false
    if (raw === '1' || raw === 'true') return true
  } catch {
    /* ignore */
  }
  return fallback
}

function writeBool(key: string, show: boolean) {
  try {
    localStorage.setItem(key, show ? '1' : '0')
  } catch {
    /* ignore */
  }
}

function loadBasemapLabelsPreference(): boolean {
  if (localStorage.getItem(BASEMAP_STORAGE_KEY) != null) {
    return readBool(BASEMAP_STORAGE_KEY, true)
  }
  return readBool(LEGACY_STORAGE_KEY, true)
}

function loadBoundaryLabelsPreference(): boolean {
  if (localStorage.getItem(BOUNDARY_STORAGE_KEY) != null) {
    return readBool(BOUNDARY_STORAGE_KEY, true)
  }
  return readBool(LEGACY_STORAGE_KEY, true)
}

export function useMapLabelState() {
  const [showBasemapLabels, setShowBasemapLabels] = useState(loadBasemapLabelsPreference)
  const [showBoundaryLabels, setShowBoundaryLabels] = useState(loadBoundaryLabelsPreference)

  const setShowBasemapLabelsPreference = useCallback((next: boolean) => {
    setShowBasemapLabels(next)
    writeBool(BASEMAP_STORAGE_KEY, next)
  }, [])

  const setShowBoundaryLabelsPreference = useCallback((next: boolean) => {
    setShowBoundaryLabels(next)
    writeBool(BOUNDARY_STORAGE_KEY, next)
  }, [])

  return {
    showBasemapLabels,
    setShowBasemapLabels: setShowBasemapLabelsPreference,
    showBoundaryLabels,
    setShowBoundaryLabels: setShowBoundaryLabelsPreference,
  }
}

/** Basemap tile labels only (Carto/OSM city & road names). */
export function usePlaceNamesState() {
  const { showBasemapLabels, setShowBasemapLabels } = useMapLabelState()
  return [showBasemapLabels, setShowBasemapLabels] as const
}
