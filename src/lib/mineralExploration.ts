import type { MineralExplorationQuota } from '../types'

export function canExploreMineral(
  quota: MineralExplorationQuota | null | undefined,
  slug: string
): boolean {
  const normalized = slug.trim()
  if (!normalized) return false
  if (!quota) return false
  if (quota.unlimited) return true
  if (quota.explored_slugs?.includes(normalized)) return true
  return (quota.remaining ?? 0) > 0
}

export function formatMineralExplorationLimit(limit: number | null | undefined): string {
  if (limit == null) return '11+'
  return String(limit)
}

export function mineralExplorationSummary(quota: MineralExplorationQuota | null | undefined): string {
  if (!quota) return '0 minerals'
  if (quota.unlimited) return '11+ minerals / month'
  const limit = quota.limit ?? 0
  if (limit === 0) return 'No mineral exploration'
  return `${limit} mineral${limit === 1 ? '' : 's'} / month`
}
