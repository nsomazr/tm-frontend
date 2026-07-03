import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { messages } from './messages'
import type { Messages } from './messages'
import type { Locale } from './types'
import { interpolate } from './utils'

const STORAGE_KEY = 'tm-locale'

export const LOCALE_STORAGE_KEY = STORAGE_KEY

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  m: Messages
  t: (key: string, vars?: Record<string, string | number>) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'sw' || stored === 'en') return stored
  } catch {
    /* ignore */
  }
  return 'en'
}

function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in acc) {
      return (acc as Record<string, unknown>)[part]
    }
    return undefined
  }, obj)
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale)

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const m = messages[locale]

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const value = getByPath(m, key)
      if (typeof value !== 'string') return key
      return vars ? interpolate(value, vars) : value
    },
    [m],
  )

  useEffect(() => {
    document.documentElement.lang = locale === 'sw' ? 'sw' : 'en'
    document.title = m.meta.title
  }, [locale, m.meta.title])

  const value = useMemo(() => ({ locale, setLocale, m, t }), [locale, setLocale, m, t])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider')
  return ctx
}

/** Shorthand for translated strings with optional interpolation. */
export function useTranslation() {
  const { locale, setLocale, m, t } = useLocale()
  return { locale, setLocale, m, t }
}
