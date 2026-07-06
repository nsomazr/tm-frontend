import { useMemo, useState, type ReactNode } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { subscriptionsApi, paymentsApi } from '../api'
import { useAuth } from '../auth/AuthContext'
import SubscribeCheckoutModal, {
  handleCheckoutResponse,
} from '../components/payments/SubscribeCheckoutModal'
import {
  CheckoutPriceHint,
  PlanPriceAmount,
  PricingCurrencyProvider,
  PricingCurrencyToggle,
  usePricingCurrency,
} from '../components/payments/PricingCurrency'
import { formatUsd, tzsToUsd } from '../hooks/useTzsUsdRate'
import type { SubscriptionPlan, UserSubscription } from '../types'
import MarketingHero from '../components/marketing/MarketingHero'
import MarketingCta, { MarketingCtaLink } from '../components/marketing/MarketingCta'
import { useTranslation } from '../i18n/LocaleContext'
import {
  localizedBillingCycle,
  localizedPlanDescription,
  localizedPlanName,
} from '../i18n/planLocalization'
import { FALLBACK_PLANS } from '../constants/fallbackPlans'
import { monthlyEquivalent, planHighlight, sortPaidPlans } from '../lib/planTiers'
import { en } from '../i18n/messages/en'

function formatPlanPriceLabel(plan: SubscriptionPlan, currency: 'TZS' | 'USD', rate?: number) {
  if (currency === 'USD' && rate) {
    return `${formatUsd(tzsToUsd(Number(plan.price), rate))} USD`
  }
  return `${Number(plan.price).toLocaleString()} ${plan.currency}`
}

type PlanAction = 'subscribe' | 'current' | 'upgrade_annual' | 'switch'

function resolvePlanAction(
  plan: SubscriptionPlan,
  subscription: UserSubscription | null | undefined,
  hasPaidAccess: boolean
): PlanAction {
  if (!hasPaidAccess || !subscription?.is_active || !subscription.plan_detail) return 'subscribe'
  if (subscription.plan === plan.id) return 'current'
  if (
    subscription.plan_detail.billing_cycle === 'monthly' &&
    plan.billing_cycle === 'annual'
  ) {
    return 'upgrade_annual'
  }
  return 'switch'
}

function CheckIcon({ ok }: { ok: boolean | string }) {
  if (typeof ok === 'string') {
    return <span className="text-xs font-medium text-app-secondary">{ok}</span>
  }
  return ok ? (
    <svg className="w-5 h-5 text-terra-600 dark:text-terra-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ) : (
    <svg className="w-5 h-5 text-app-muted mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b app-divider last:border-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left font-medium text-slate-900 hover:text-terra-700 transition-colors"
      >
        {q}
        <span className="text-slate-400 shrink-0 text-lg leading-none">{open ? '−' : '+'}</span>
      </button>
      {open && <p className="pb-4 text-sm text-slate-600 leading-relaxed">{a}</p>}
    </div>
  )
}

function PlanFeatureList({ items }: { items: string[] }) {
  return (
    <ul className="mt-6 space-y-2.5 text-sm text-slate-600 flex-1">
      {items.map((feature) => (
        <li key={feature} className="flex items-start gap-2.5">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-terra-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="leading-snug">{feature}</span>
        </li>
      ))}
    </ul>
  )
}

function PricingCard({
  badge,
  title,
  description,
  price,
  priceSuffix,
  priceNote,
  features,
  cta,
  highlighted,
  muted,
}: {
  badge?: string | null
  title: string
  description: string
  price: ReactNode
  priceSuffix?: string
  priceNote?: string | null
  features: string[]
  cta: ReactNode
  highlighted?: boolean
  muted?: boolean
}) {
  return (
    <article
      className={`relative flex min-w-[17rem] max-w-[20rem] flex-col rounded-2xl border bg-white p-6 shadow-sm snap-center shrink-0 sm:min-w-0 sm:max-w-none sm:shrink ${
        highlighted
          ? 'border-terra-500 ring-2 ring-terra-500/80 shadow-md'
          : muted
            ? 'border-slate-200'
            : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {badge && (
        <span className="absolute -top-3 right-4 rounded-full bg-terra-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          {badge}
        </span>
      )}
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1.5 min-h-[2.75rem] text-sm leading-snug text-slate-500">{description}</p>
      <div className="mt-5 border-b border-slate-100 pb-5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          {price}
          {priceSuffix && <span className="text-sm text-slate-400">/ {priceSuffix}</span>}
        </div>
        {priceNote && <p className="mt-1.5 text-xs font-medium text-terra-700">{priceNote}</p>}
      </div>
      <PlanFeatureList items={features} />
      <div className="mt-6 pt-2">{cta}</div>
    </article>
  )
}

export default function SubscriptionsPage() {
  const { m } = useTranslation()
  const p = m.pricing

  return (
    <PricingCurrencyProvider
      labels={{
        tzs: p.currencyTzs,
        usd: p.currencyUsd,
        liveRateHint: p.liveRateHint,
        rateUnavailable: p.rateUnavailable,
      }}
    >
      <SubscriptionsPageContent />
    </PricingCurrencyProvider>
  )
}

function tierFeatureList(
  slug: keyof typeof en.pricing.tierFeatures | 'free',
  p: typeof en.pricing
): string[] {
  return p.tierFeatures[slug as keyof typeof p.tierFeatures] ?? []
}

function SubscriptionsPageContent() {
  const {
    user,
    hasPaidAccess,
    login,
    registerWithPassword,
    registerWithOtp,
    loginWithOtp,
  } = useAuth()
  const { m, t, locale } = useTranslation()
  const p = m.pricing
  const { currency, rate } = usePricingCurrency()
  const [checkoutPlanId, setCheckoutPlanId] = useState<number | null>(null)
  const [checkoutError, setCheckoutError] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['plans'],
    queryFn: () => subscriptionsApi.plans().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const { data: subscription } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: () => subscriptionsApi.me().then((r) => r.data).catch(() => null),
    enabled: !!user,
  })

  const checkout = useMutation({
    mutationFn: ({
      planId,
      msisdn,
      paymentMethod,
      cardBrand,
      cardholderName,
      billingEmail,
    }: {
      planId: number
      msisdn?: string
      paymentMethod: 'mobile_money' | 'card'
      cardBrand?: 'visa' | 'mastercard'
      cardholderName?: string
      billingEmail?: string
    }) =>
      paymentsApi.checkout({
        order_type: 'subscription',
        plan_id: planId,
        msisdn,
        payment_method: paymentMethod,
        card_brand: cardBrand,
        cardholder_name: cardholderName,
        billing_email: billingEmail,
      }),
    onSuccess: ({ data: checkoutData }) => {
      setCheckoutPlanId(null)
      setCheckoutError('')
      handleCheckoutResponse(checkoutData)
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      setCheckoutError(err.response?.data?.detail || 'Payment could not be started. Please try again.')
    },
  })

  const startCheckout = (planId: number) => {
    setCheckoutError('')
    setCheckoutPlanId(planId)
  }

  const sendSubscribeOtp = async (email: string) => {
    try {
      await registerWithOtp.send(email)
    } catch {
      await loginWithOtp.send(email)
    }
  }

  const verifySubscribeOtp = async (email: string, code: string) => {
    try {
      await registerWithOtp.verify(email, code)
    } catch {
      await loginWithOtp.verify(email, code)
    }
  }

  const passwordAuth = async (email: string, password: string) => {
    try {
      await registerWithPassword(email, password)
    } catch {
      await login(email, password)
    }
  }

  const handleSubscribeCheckout = async ({
    paymentMethod,
    msisdn,
    cardBrand,
    cardholderName,
    billingEmail,
  }: {
    paymentMethod: 'mobile_money' | 'card'
    msisdn?: string
    cardBrand?: 'visa' | 'mastercard'
    cardholderName?: string
    billingEmail?: string
  }) => {
    if (checkoutPlanId === null) return
    setCheckoutError('')
    try {
      await checkout.mutateAsync({
        planId: checkoutPlanId,
        msisdn,
        paymentMethod,
        cardBrand,
        cardholderName,
        billingEmail,
      })
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { detail?: string } } }
      setCheckoutError(
        apiErr.response?.data?.detail ||
          'Could not start payment. Check your details and try again.'
      )
    }
  }

  const paidPlans = useMemo(() => {
    const fromApi = data?.results ?? []
    const list = fromApi.length > 0 ? fromApi : FALLBACK_PLANS
    return sortPaidPlans(list)
  }, [data])

  const checkoutPlan = checkoutPlanId
    ? paidPlans.find((plan) => plan.id === checkoutPlanId)
    : undefined

  const usingFallbackPlans =
    !isLoading && (isError || (data?.results?.length ?? 0) === 0)

  const monthlyPlus = paidPlans.find((plan) => plan.slug === 'monthly-standard')
  const annualPro = paidPlans.find((plan) => plan.slug === 'annual-standard')
  const annualSavings =
    monthlyPlus && annualPro
      ? Math.round((1 - Number(annualPro.price) / (Number(monthlyPlus.price) * 12)) * 100)
      : null

  const resolveCompareValue = (value: boolean | string) => {
    if (value === 'payPerReport') return p.payPerReport
    if (value === 'previewOnly') return p.previewOnly
    if (value === 'highlightsOnly') return p.highlightsOnly
    if (value === 'top3Preview') return p.top3Preview
    if (value === 'included') return p.included
    return value
  }

  const planButtonLabel = (action: PlanAction, plan: SubscriptionPlan) => {
    switch (action) {
      case 'current':
        return p.currentPlan
      case 'upgrade_annual':
        return p.upgradeToAnnual
      case 'switch':
        return p.switchPlan
      default:
        return user ? t('pricing.upgradeTo', { plan: localizedPlanName(plan, locale) }) : p.subscribeNow
    }
  }

  const planBadge = (slug: string) => {
    const highlight = planHighlight(slug)
    if (highlight === 'recommended') return p.recommended
    if (highlight === 'best_value') return p.bestValue
    return null
  }

  return (
    <div className="animate-fade-in">
      <MarketingHero eyebrow={p.eyebrow} title={p.heroTitle} subtitle={p.heroSubtitle}>
        <Link to="/" className="btn-primary text-sm">{p.exploreFree}</Link>
      </MarketingHero>

      <section className="py-12 sm:py-16 bg-slate-50/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {usingFallbackPlans && !isLoading && (
            <div className="mb-8 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900 text-center">
              {isError ? p.plansApiUnavailable : p.noPlans}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-terra-600 border-t-transparent" />
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center gap-4 mb-8 sm:mb-10">
                {!usingFallbackPlans && paidPlans.some((plan) => Number(plan.price) > 0) && (
                  <PricingCurrencyToggle />
                )}
              </div>

              <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:overflow-visible sm:pb-0 sm:snap-none sm:grid-cols-2 sm:gap-5 lg:gap-6 xl:grid-cols-4">
                <PricingCard
                  muted={hasPaidAccess}
                  title={p.freeTitle}
                  description={p.freeDesc}
                  price={<PlanPriceAmount amountTzs={0} />}
                  priceSuffix={p.freeForever.replace(/^\//, '').trim()}
                  features={tierFeatureList('free', p)}
                  cta={
                    !hasPaidAccess ? (
                      <button type="button" disabled className="btn-secondary w-full opacity-80 cursor-default">
                        {p.freeCta}
                      </button>
                    ) : (
                      <Link to="/" className="btn-secondary w-full text-center block">
                        {p.freeCtaExplore}
                      </Link>
                    )
                  }
                />

                {paidPlans.map((plan) => {
                  const isCurrent =
                    hasPaidAccess && subscription?.is_active && subscription.plan === plan.id
                  const action = resolvePlanAction(plan, subscription, hasPaidAccess)
                  const highlighted = planHighlight(plan.slug) === 'recommended' && !isCurrent
                  const badge = !isCurrent ? planBadge(plan.slug) : p.currentPlan
                  const monthlyEq = monthlyEquivalent(plan)
                  const features =
                    tierFeatureList(
                      plan.slug as keyof typeof en.pricing.tierFeatures,
                      p
                    ).length > 0
                      ? tierFeatureList(plan.slug as keyof typeof en.pricing.tierFeatures, p)
                      : tierFeatureList('monthly-standard', p)

                  return (
                    <PricingCard
                      key={plan.slug}
                      badge={badge}
                      highlighted={highlighted || isCurrent}
                      title={localizedPlanName(plan, locale)}
                      description={localizedPlanDescription(plan, locale)}
                      price={<PlanPriceAmount amountTzs={Number(plan.price)} />}
                      priceSuffix={localizedBillingCycle(plan, locale)}
                      priceNote={
                        plan.billing_cycle === 'annual' && monthlyEq != null
                          ? t('pricing.equivalentMonthly', {
                              price: formatPlanPriceLabel(
                                { ...plan, price: String(monthlyEq), billing_cycle: 'monthly' },
                                currency,
                                rate
                              ),
                            })
                          : plan.billing_cycle === 'annual' && annualSavings != null && annualSavings > 0
                            ? t('pricing.saveVsMonthly', { pct: annualSavings })
                            : null
                      }
                      features={features}
                      cta={
                        <button
                          type="button"
                          onClick={() => plan.id > 0 && startCheckout(plan.id)}
                          disabled={
                            checkout.isPending ||
                            action === 'current' ||
                            usingFallbackPlans ||
                            plan.id <= 0
                          }
                          className={`w-full disabled:opacity-60 ${
                            highlighted ? 'btn-primary' : action === 'current' ? 'btn-secondary' : 'btn-primary'
                          }`}
                        >
                          {checkout.isPending && action !== 'current'
                            ? p.processing
                            : planButtonLabel(action, plan)}
                        </button>
                      }
                    />
                  )
                })}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="bg-app-subtle border-y border-app-border py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-app-text">{p.compareTitle}</h2>
            <p className="text-app-muted mt-2 text-sm">{p.compareSubtitle}</p>
          </div>
          <div className="card-flat overflow-hidden p-0">
            <table className="admin-table">
              <thead>
                <tr className="bg-app-subtle">
                  <th>{p.featureCol}</th>
                  <th className="text-center w-28">{p.freeCol}</th>
                  <th className="text-center w-28 text-terra-700 dark:text-terra-400">{p.paidCol}</th>
                </tr>
              </thead>
              <tbody>
                {p.comparison.map((row) => (
                  <tr key={row.feature}>
                    <td>{row.feature}</td>
                    <td className="text-center"><CheckIcon ok={resolveCompareValue(row.free)} /></td>
                    <td className="text-center"><CheckIcon ok={resolveCompareValue(row.paid)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">{p.faqTitle}</h2>
          </div>
          <div className="card-flat">
            {p.faq.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      <MarketingCta title={p.ctaTitle} subtitle={p.ctaSubtitle}>
        <MarketingCtaLink to="/" variant="primary">
          {p.openMap}
        </MarketingCtaLink>
        <MarketingCtaLink to="/downloads">{m.nav.reports}</MarketingCtaLink>
      </MarketingCta>

      <SubscribeCheckoutModal
        open={checkoutPlanId !== null}
        requiresAccount={!user}
        defaultPhone={user?.phone || ''}
        defaultEmail={user?.email || ''}
        planLabel={
          checkoutPlan
            ? `${localizedPlanName(checkoutPlan, locale)} · ${formatPlanPriceLabel(checkoutPlan, currency, rate)}`
            : undefined
        }
        planPriceHint={
          checkoutPlan ? <CheckoutPriceHint amountTzs={Number(checkoutPlan.price)} /> : undefined
        }
        title={user ? p.checkoutTitle : p.subscribeModalTitle}
        description={p.subscribeModalDesc}
        confirmLabel={user ? p.payNow : p.continueToPayment}
        labels={{
          emailMeCode: p.emailMeCode,
          usePassword: p.usePassword,
          resendCode: p.resendCode,
          resendIn: p.resendIn,
          otpExpiresIn: p.otpExpiresIn,
          back: p.back,
          mobileMoney: p.mobileMoney,
          card: p.card,
          mobileMoneyHint: p.mobileMoneyHint,
          cardDetailsSubtitle: p.cardDetailsSubtitle,
          continueToSecurePayment: p.continueToSecurePayment,
          mobileMoneyNumber: p.mobileMoneyNumber,
          mobileMoneyPlaceholder: p.mobileMoneyPlaceholder,
          selectCardType: p.selectCardType,
          cardDetailsTitle: p.cardDetailsTitle,
          nameOnCard: p.nameOnCard,
          billingEmail: p.billingEmail,
          visa: p.visa,
          mastercard: p.mastercard,
          continue: p.continueToPayment,
          authEmailHint: p.authEmailHint,
          otpSentTo: p.otpSentTo,
          passwordCreate: p.passwordCreate,
          passwordSignIn: p.passwordSignIn,
          cancel: p.cancel,
        }}
        loading={checkout.isPending}
        error={checkoutError}
        onSendOtp={sendSubscribeOtp}
        onVerifyOtp={verifySubscribeOtp}
        onPasswordAuth={passwordAuth}
        onCancel={() => {
          setCheckoutPlanId(null)
          setCheckoutError('')
        }}
        onConfirm={handleSubscribeCheckout}
      />
    </div>
  )
}
