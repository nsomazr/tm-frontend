import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocale } from '../i18n/LocaleContext'
import { clearLayerGeojsonCache } from '../components/map/mapGeojsonCache'

/** Refetch API data when language changes so localized server fields stay in sync. */
export default function LocaleEffects() {
  const { locale } = useLocale()
  const queryClient = useQueryClient()
  const prevLocale = useRef(locale)

  useEffect(() => {
    if (prevLocale.current === locale) return
    prevLocale.current = locale
    clearLayerGeojsonCache()
    queryClient.invalidateQueries()
  }, [locale, queryClient])

  return null
}
