import { useMemo, useState } from 'react'
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
import { interpolate } from '../i18n/utils'
import {
  localizedBillingCycle,
  localizedMineralNames,
  localizedPlanDescription,
  localizedPlanName,
} from '../i18n/planLocalization'
import { FALLBACK_PLANS } from '../constants/fallbackPlans'

function formatPrice(plan: SubscriptionPlan) {
  return `${Number(plan.price).toLocaleString()} ${plan.currency}`
}

function formatPlanPriceLabel(plan: SubscriptionPlan, currency: 'TZS' | 'USD', rate?: number) {
  if (currency === 'USD' && rate) {
    return `${formatUsd(tzsToUsd(Number(plan.price), rate))} USD`
  }
  return formatPrice(plan)
}

type PlanAction = 'subscribe' | 'current' | 'upgrade_annual' | 'switch'

function resolvePlanAction(
  plan: SubscriptionPlan,
  subscription: UserSubscription | null | undefined,
  hasPaidAccess: boolean
): PlanAction {
  if (!hasPaidAccess || !subscription?.is_active) return 'subscribe'
  if (subscription.plan === plan.id) return 'current'
  if (
    subscription.plan_detail.billing_cycle === 'monthly' &&
    plan.billing_cycle === 'annual'
  ) {
    return 'upgrade_annual'
  }
  return 'switch'
}

function paidPlanFeatures(
  plan: SubscriptionPlan,
  p: ReturnType<typeof useTranslation>['m']['pricing'],
  t: ReturnType<typeof useTranslation>['t']
) {
  const credits = plan.included_assistant_credits || (plan.billing_cycle === 'annual' ? 5000 : 3000)
  const downloads = plan.included_report_downloads || (plan.billing_cycle === 'annual' ? 10 : 3)
  return [
    t('pricing.paidFeatureCredits', { count: credits.toLocaleString() }),
    t('pricing.paidFeatureDownloads', { count: downloads }),
    ...p.paidFeatures,
  ]
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

  const plans = useMemo(() => {
    const fromApi = data?.results ?? []
    const list = fromApi.length > 0 ? fromApi : FALLBACK_PLANS
    return [...list].sort((a, b) => {
      if (a.billing_cycle === b.billing_cycle) return 0
      return a.billing_cycle === 'monthly' ? -1 : 1
    })
  }, [data])

  const checkoutPlan = checkoutPlanId
    ? plans.find((plan) => plan.id === checkoutPlanId)
    : undefined

  const usingFallbackPlans =
    !isLoading && (isError || (data?.results?.length ?? 0) === 0)

  const monthlyPlan = plans.find((plan) => plan.billing_cycle === 'monthly')
  const annualPlan = plans.find((plan) => plan.billing_cycle === 'annual')
  const annualSavings =
    monthlyPlan && annualPlan
      ? Math.round((1 - Number(annualPlan.price) / (Number(monthlyPlan.price) * 12)) * 100)
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
        return user
          ? t('pricing.subscribeFor', { price: formatPlanPriceLabel(plan, currency, rate) })
          : p.subscribeNow
    }
  }

  return (
    <div className="animate-fade-in">
      <MarketingHero eyebrow={p.eyebrow} title={p.heroTitle} subtitle={p.heroSubtitle}>
        <Link to="/" className="btn-primary text-sm">{p.exploreFree}</Link>
      </MarketingHero>

      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
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
              {!usingFallbackPlans && plans.some((plan) => Number(plan.price) > 0) && (
                <div className="flex justify-center mb-8 lg:mb-10">
                  <PricingCurrencyToggle />
                </div>
              )}
            <div className={`grid gap-6 lg:gap-8 ${plans.length >= 2 ? 'lg:grid-cols-3' : plans.length === 1 ? 'lg:grid-cols-2' : 'max-w-md mx-auto'}`}>
              <div className={`card flex flex-col border-slate-200 relative ${!hasPaidAccess ? 'ring-2 ring-slate-300' : ''}`}>
                {!hasPaidAccess && (
                  <span className="absolute -top-3 left-6 badge bg-slate-700 text-white ring-0">
                    {p.freeEyebrow}
                  </span>
                )}
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{p.freeEyebrow}</p>
                <h2 className="text-xl font-bold text-slate-900 mt-2">{p.freeTitle}</h2>
                <p className="text-slate-500 text-sm mt-1">{p.freeDesc}</p>
                <div className="mt-6 pb-6 border-b app-divider">
                  <PlanPriceAmount amountTzs={0} />
                  <span className="text-slate-400 text-sm ml-2">{p.freeForever}</span>
                </div>
                <ul className="mt-6 text-sm text-slate-600 space-y-3 flex-1">
                  {p.freeFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="text-terra-600 mt-0.5">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/" className="btn-secondary mt-8 w-full text-center">{p.openMap}</Link>
              </div>

              {plans.map((plan) => {
                const isAnnual = plan.billing_cycle === 'annual'
                const isCurrent = hasPaidAccess && subscription?.is_active && subscription.plan === plan.id
                const action = resolvePlanAction(plan, subscription, hasPaidAccess)
                const highlighted = isAnnual && !isCurrent
                const showBestValue = isAnnual && annualSavings != null && annualSavings > 0

                return (
                  <div
                    key={plan.id}
                    className={`card flex flex-col relative ${
                      isCurrent
                        ? 'ring-2 ring-emerald-500 border-emerald-200'
                        : highlighted
                          ? 'ring-2 ring-terra-500 shadow-glow border-terra-200'
                          : ''
                    }`}
                  >
                    {isCurrent && (
                      <span className="absolute -top-3 left-6 badge bg-emerald-600 text-white ring-0">
                        {p.currentPlan}
                      </span>
                    )}
                    {!isCurrent && showBestValue && (
                      <span className="absolute -top-3 left-6 badge bg-terra-600 text-white ring-0">
                        {p.bestValue}
                      </span>
                    )}
                    {!isCurrent && !showBestValue && plans.length === 1 && (
                      <span className="absolute -top-3 left-6 badge bg-terra-600 text-white ring-0">
                        {p.popular}
                      </span>
                    )}
                    <p className="text-xs font-semibold uppercase tracking-wider text-terra-600">{p.paidEyebrow}</p>
                    <h2 className="text-xl font-bold text-slate-900 mt-2">{localizedPlanName(plan, locale)}</h2>
                    <p className="text-slate-500 text-sm mt-1">{localizedPlanDescription(plan, locale)}</p>
                    <div className="mt-6 pb-6 border-b app-divider">
                      <PlanPriceAmount amountTzs={Number(plan.price)} />
                      <span className="text-slate-400 text-sm ml-2">/ {localizedBillingCycle(plan, locale)}</span>
                      {isAnnual && annualSavings != null && annualSavings > 0 && (
                        <p className="text-xs text-terra-700 font-medium mt-2">
                          {t('pricing.saveVsMonthly', { pct: annualSavings })}
                        </p>
                      )}
                    </div>
                    <ul className="mt-6 text-sm text-slate-600 space-y-3 flex-1">
                      <li className="flex items-start gap-2">
                        <span className="text-terra-600 mt-0.5">✓</span>
                        <span>{p.paidFeaturesIntro}</span>
                      </li>
                      {paidPlanFeatures(plan, p, t).map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <span className="text-terra-600 mt-0.5">✓</span>
                          <span>{f}</span>
                        </li>
                      ))}
                      {plan.included_mineral_names.length > 0 && (
                        <li className="flex items-start gap-2">
                          <span className="text-terra-600 mt-0.5">✓</span>
                          <span>
                            {interpolate(p.mineralLayersIncluded, {
                              count: plan.included_mineral_names.length,
                              sample: localizedMineralNames(
                                plan.included_mineral_names.slice(0, 3),
                                locale
                              ).join(', '),
                            })}
                            {plan.included_mineral_names.length > 3 ? '…' : ''}
                          </span>
                        </li>
                      )}
                    </ul>
                    <button
                      onClick={() => plan.id > 0 && startCheckout(plan.id)}
                      disabled={
                        checkout.isPending ||
                        action === 'current' ||
                        usingFallbackPlans ||
                        plan.id <= 0
                      }
                      className={`mt-8 w-full disabled:opacity-60 ${
                        action === 'current' ? 'btn-secondary' : 'btn-primary'
                      }`}
                    >
                      {checkout.isPending && action !== 'current'
                        ? p.processing
                        : planButtonLabel(action, plan)}
                    </button>
                  </div>
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
