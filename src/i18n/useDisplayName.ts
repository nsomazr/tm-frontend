import { useCallback } from 'react'
import { useLocale } from './LocaleContext'
import type { LocalizedName } from './types'
import { localizedName } from './utils'

/** Returns a stable function that picks `name` or `name_sw` for the active locale. */
export function useDisplayName() {
  const { locale } = useLocale()
  return useCallback((item: LocalizedName) => localizedName(item, locale), [locale])
}

export { localizedName }
