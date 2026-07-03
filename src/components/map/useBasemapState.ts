import { useState } from 'react'
import type { BasemapId } from './basemaps'
import { loadBasemapPreference } from './basemaps'

export function useBasemapState() {
  const [basemap, setBasemap] = useState<BasemapId>(() => loadBasemapPreference())
  return [basemap, setBasemap] as const
}
