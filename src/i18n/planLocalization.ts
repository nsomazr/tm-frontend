import type { SubscriptionPlan } from '../types'
import { en } from './messages/en'
import { sw } from './messages/sw'
import type { Locale } from './types'

type PlanSlug = keyof typeof en.pricing.planLabels

function messages(locale: Locale) {
  return locale === 'sw' ? sw : en
}

export function localizedPlanName(
  plan: Pick<SubscriptionPlan, 'slug' | 'name'>,
  locale: Locale
): string {
  const label = messages(locale).pricing.planLabels[plan.slug as PlanSlug]
  return label?.name ?? plan.name
}

export function localizedPlanDescription(
  plan: Pick<SubscriptionPlan, 'slug' | 'description'>,
  locale: Locale
): string {
  const label = messages(locale).pricing.planLabels[plan.slug as PlanSlug]
  return label?.description ?? plan.description
}

export function localizedBillingCycle(
  plan: Pick<SubscriptionPlan, 'billing_cycle' | 'billing_cycle_label'>,
  locale: Locale
): string {
  if (plan.billing_cycle_label) return plan.billing_cycle_label
  const p = messages(locale).pricing
  return plan.billing_cycle === 'annual' ? p.billingAnnual : p.billingMonthly
}

const MINERAL_SW: Record<string, string> = {
  Gold: 'Dhahabu',
  Graphite: 'Grafiti',
  Tanzanite: 'Tanzanite',
  Copper: 'Shaba',
  Nickel: 'Nikeli',
  Iron: 'Chuma',
  Lithium: 'Lithiamu',
}

export function localizedMineralNames(names: string[], locale: Locale): string[] {
  if (locale !== 'sw') return names
  return names.map((name) => MINERAL_SW[name] ?? name)
}
