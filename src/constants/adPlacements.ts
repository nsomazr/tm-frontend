export const AD_PLACEMENTS = [
  { value: 'map_sidebar', label: 'Map sidebar' },
  { value: 'map_overlay', label: 'Map overlay' },
  { value: 'downloads_banner', label: 'Downloads catalog' },
  { value: 'subscriptions_banner', label: 'Subscriptions page' },
  { value: 'dashboard_card', label: 'User dashboard' },
  { value: 'about_banner', label: 'About page' },
] as const

export type AdPlacement = (typeof AD_PLACEMENTS)[number]['value']

export const AD_AUDIENCES = [
  { value: 'all', label: 'All visitors' },
  { value: 'free', label: 'Free users only' },
  { value: 'subscriber', label: 'Paid subscribers only' },
] as const

export type AdAudience = (typeof AD_AUDIENCES)[number]['value']

export function placementLabel(code: string): string {
  return AD_PLACEMENTS.find((item) => item.value === code)?.label ?? code
}
