import type { Locale, LocalizedName } from './types'

export function localizedName(item: LocalizedName, locale: Locale): string {
  const name = item.name?.trim() ?? ''
  const nameSw = item.name_sw?.trim() ?? ''
  if (locale === 'sw') return nameSw || name
  return name || nameSw
}

export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`))
}
