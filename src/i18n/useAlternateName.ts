import { useCallback } from 'react'
import { useLocale } from './LocaleContext'
import type { LocalizedName } from './types'

/** The mineral/layer name in the non-active locale (for admin bilingual labels). */
export function useAlternateName() {
  const { locale } = useLocale()
  return useCallback(
    (item: LocalizedName) => {
      const alt = locale === 'sw' ? item.name?.trim() : item.name_sw?.trim()
      return alt || ''
    },
    [locale],
  )
}
