import type { SubscriptionPlan } from '../types'

/** Display order: Starter → Plus → Pro (annual). */
export const PAID_PLAN_SLUG_ORDER = [
  'monthly-starter',
  'monthly-standard',
  'annual-standard',
] as const

export type PaidPlanSlug = (typeof PAID_PLAN_SLUG_ORDER)[number]

export type PlanTierKey = 'free' | PaidPlanSlug | 'unknown'

/** Distinctive pill styling for each package name. */
export type PlanTierStyle = {
  className: string
}

const PLAN_TIER_STYLES: Record<PlanTierKey, PlanTierStyle> = {
  free: {
    className:
      'bg-slate-100 text-slate-700 ring-slate-300/70 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600/60',
  },
  'monthly-starter': {
    className:
      'bg-sky-50 text-sky-800 ring-sky-300/70 dark:bg-sky-950/50 dark:text-sky-200 dark:ring-sky-600/50',
  },
  'monthly-standard': {
    className:
      'bg-emerald-50 text-emerald-800 ring-emerald-300/80 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-600/50',
  },
  'annual-standard': {
    className:
      'bg-amber-50 text-amber-900 ring-amber-300/80 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-600/50',
  },
  unknown: {
    className:
      'bg-terra-50 text-terra-800 ring-terra-300/70 dark:bg-terra-950/40 dark:text-terra-200 dark:ring-terra-600/50',
  },
}

export function planTierKeyFromSlug(slug?: string | null): PlanTierKey {
  if (!slug) return 'free'
  if (slug === 'free' || slug === 'explorer') return 'free'
  if ((PAID_PLAN_SLUG_ORDER as readonly string[]).includes(slug)) return slug as PaidPlanSlug
  return 'unknown'
}

/** Resolve tier pill styling from plan slug or display name. */
export function planTierStyle(slugOrName?: string | null): PlanTierStyle {
  const raw = (slugOrName || '').trim()
  if (!raw) return PLAN_TIER_STYLES.free
  const fromSlug = planTierKeyFromSlug(raw)
  if (fromSlug !== 'unknown') return PLAN_TIER_STYLES[fromSlug]

  const lower = raw.toLowerCase()
  if (lower.includes('starter')) return PLAN_TIER_STYLES['monthly-starter']
  if (lower.includes('plus') || lower.includes('standard')) return PLAN_TIER_STYLES['monthly-standard']
  if (lower.includes('pro') || lower.includes('annual')) return PLAN_TIER_STYLES['annual-standard']
  if (lower.includes('explorer') || lower.includes('free')) return PLAN_TIER_STYLES.free
  return PLAN_TIER_STYLES.unknown
}

export function sortPaidPlans(plans: SubscriptionPlan[]): SubscriptionPlan[] {
  return [...plans].sort((a, b) => {
    const aIdx = PAID_PLAN_SLUG_ORDER.indexOf(a.slug as PaidPlanSlug)
    const bIdx = PAID_PLAN_SLUG_ORDER.indexOf(b.slug as PaidPlanSlug)
    const rankA = aIdx === -1 ? 99 : aIdx
    const rankB = bIdx === -1 ? 99 : bIdx
    if (rankA !== rankB) return rankA - rankB
    return Number(a.price) - Number(b.price)
  })
}

export function planHighlight(slug: string): 'recommended' | 'best_value' | null {
  if (slug === 'monthly-standard') return 'recommended'
  if (slug === 'annual-standard') return 'best_value'
  return null
}

export function monthlyEquivalent(plan: SubscriptionPlan): number | null {
  if (plan.billing_cycle !== 'annual') return null
  return Math.round(Number(plan.price) / 12)
}
