import type { SubscriptionPlan } from '../types'

/** Display order: Starter → Plus → Pro (annual). */
export const PAID_PLAN_SLUG_ORDER = [
  'monthly-starter',
  'monthly-standard',
  'annual-standard',
] as const

export type PaidPlanSlug = (typeof PAID_PLAN_SLUG_ORDER)[number]

export function sortPaidPlans(plans: SubscriptionPlan[]): SubscriptionPlan[] {
  return [...plans].sort((a, b) => {
    const ai = PAID_PLAN_SLUG_ORDER.indexOf(a.slug as PaidPlanSlug)
    const bi = PAID_PLAN_SLUG_ORDER.indexOf(b.slug as PaidPlanSlug)
    const rankA = ai === -1 ? 99 : ai
    const rankB = bi === -1 ? 99 : bi
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
