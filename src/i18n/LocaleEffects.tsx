import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocale } from '../i18n/LocaleContext'

/** Refetch API data when language changes so localized server fields stay in sync. */
export default function LocaleEffects() {
  const { locale } = useLocale()
  const queryClient = useQueryClient()

  useEffect(() => {
    queryClient.invalidateQueries()
  }, [locale, queryClient])

  return null
}
