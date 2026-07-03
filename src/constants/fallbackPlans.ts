import type { SubscriptionPlan } from '../types'

/** Shown when the plans API is unreachable or returns no active plans (matches seed_data). */
export const FALLBACK_PLANS: SubscriptionPlan[] = [
  {
    id: 0,
    slug: 'monthly-standard',
    name: 'Monthly Standard',
    description: 'Full access to all mineral maps and analytics',
    billing_cycle: 'monthly',
    price: '50000',
    currency: 'TZS',
    included_minerals: [],
    included_mineral_names: ['Gold', 'Graphite', 'Tanzanite'],
    included_report_downloads: 3,
    included_assistant_credits: 3000,
  },
  {
    id: 0,
    slug: 'annual-standard',
    name: 'Annual Standard',
    description: 'Full year access with 20% savings',
    billing_cycle: 'annual',
    price: '480000',
    currency: 'TZS',
    included_minerals: [],
    included_mineral_names: ['Gold', 'Graphite', 'Tanzanite'],
    included_report_downloads: 10,
    included_assistant_credits: 5000,
  },
]
