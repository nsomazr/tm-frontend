import { useEffect, useState } from 'react'
import { useTheme } from '../../theme/ThemeContext'
import type { BasemapId } from './basemaps'
import { saveBasemapPreference, themeDefaultBasemap } from './basemaps'

export function useBasemapState() {
  const { theme } = useTheme()
  const [basemap, setBasemapState] = useState<BasemapId>(() => themeDefaultBasemap(theme))

  useEffect(() => {
    const next = themeDefaultBasemap(theme)
    setBasemapState((current) => {
      if (current === next) return current
      saveBasemapPreference(next)
      return next
    })
  }, [theme])

  const setBasemap = (id: BasemapId) => {
    setBasemapState(id)
    saveBasemapPreference(id)
  }

  return [basemap, setBasemap] as const
}
