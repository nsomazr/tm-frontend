import { useMemo, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { subscriptionsApi, paymentsApi } from '../api'
import { useAuth } from '../auth/AuthContext'
import SubscribeCheckoutModal, {
  handleCheckoutResponse,
} from '../components/payments/SubscribeCheckoutModal'
import type { SubscriptionPlan, UserSubscription } from '../types'
import MarketingHero from '../components/marketing/MarketingHero'
import { useTranslation } from '../i18n/LocaleContext'
import { interpolate } from '../i18n/utils'
import { FALLBACK_PLANS } from '../constants/fallbackPlans'

function formatPrice(plan: SubscriptionPlan) {
  return `${Number(plan.price).toLocaleString()} ${plan.currency}`
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

function CheckIcon({ ok }: { ok: boolean | string }) {
  if (typeof ok === 'string') {
    return <span className="text-xs font-medium text-slate-600">{ok}</span>
  }
  return ok ? (
    <svg className="w-5 h-5 text-terra-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ) : (
    <svg className="w-5 h-5 text-slate-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-slate-200 last:border-0">
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
  const {
    user,
    hasPaidAccess,
    login,
    registerWithPassword,
    registerWithOtp,
    loginWithOtp,
  } = useAuth()
  const { m, t } = useTranslation()
  const p = m.pricing
  const [checkoutPlanId, setCheckoutPlanId] = useState<number | null>(null)
  const [checkoutError, setCheckoutError] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['plans'],
    queryFn: () => subscriptionsApi.plans().then((r) => r.data),
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
    }: {
      planId: number
      msisdn?: string
      paymentMethod: 'mobile_money' | 'card'
    }) =>
      paymentsApi.checkout({
        order_type: 'subscription',
        plan_id: planId,
        msisdn,
        payment_method: paymentMethod,
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
  }: {
    paymentMethod: 'mobile_money' | 'card'
    msisdn?: string
  }) => {
    if (checkoutPlanId === null) return
    setCheckoutError('')
    try {
      await checkout.mutateAsync({ planId: checkoutPlanId, msisdn, paymentMethod })
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
        return user ? t('pricing.subscribeFor', { price: formatPrice(plan) }) : p.subscribeNow
    }
  }

  return (
    <div className="animate-fade-in">
      <MarketingHero eyebrow={p.eyebrow} title={p.heroTitle} subtitle={p.heroSubtitle}>
        <Link to="/" className="btn-primary text-sm">{p.exploreFree}</Link>
      </MarketingHero>

      {hasPaidAccess && subscription?.is_active && (
        <div className="bg-emerald-50 border-b border-emerald-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-emerald-900">
            <div>
              <p className="font-semibold">
                {interpolate(p.activePlanBanner, {
                  plan: subscription.plan_detail.name,
                  cycle: subscription.plan_detail.billing_cycle,
                })}
              </p>
              {subscription.end_date && (
                <p className="text-emerald-800/80 mt-0.5">
                  {interpolate(p.activePlanExpires, { date: subscription.end_date })}
                </p>
              )}
            </div>
            <Link
              to="/dashboard/subscription"
              className="font-medium text-emerald-800 hover:text-emerald-950 underline shrink-0"
            >
              {p.managePlan}
            </Link>
          </div>
        </div>
      )}

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
                <div className="mt-6 pb-6 border-b border-slate-100">
                  <span className="text-4xl font-bold text-slate-900">0</span>
                  <span className="text-slate-500 ml-1">TZS</span>
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
                    <h2 className="text-xl font-bold text-slate-900 mt-2">{plan.name}</h2>
                    <p className="text-slate-500 text-sm mt-1">{plan.description}</p>
                    <div className="mt-6 pb-6 border-b border-slate-100">
                      <span className="text-4xl font-bold text-slate-900">{Number(plan.price).toLocaleString()}</span>
                      <span className="text-slate-500 ml-1">{plan.currency}</span>
                      <span className="text-slate-400 text-sm ml-2">/ {plan.billing_cycle}</span>
                      {isAnnual && annualSavings != null && annualSavings > 0 && (
                        <p className="text-xs text-terra-700 font-medium mt-2">
                          {t('pricing.saveVsMonthly', { pct: annualSavings })}
                        </p>
                      )}
                    </div>
                    <ul className="mt-6 text-sm text-slate-600 space-y-3 flex-1">
                      {p.paidFeatures.map((f) => (
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
                              sample: plan.included_mineral_names.slice(0, 3).join(', '),
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
          )}
        </div>
      </section>

      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">{p.compareTitle}</h2>
            <p className="text-slate-500 mt-2 text-sm">{p.compareSubtitle}</p>
          </div>
          <div className="card-flat overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">{p.featureCol}</th>
                  <th className="py-3 px-4 font-semibold text-slate-700 text-center w-28">{p.freeCol}</th>
                  <th className="py-3 px-4 font-semibold text-terra-700 text-center w-28">{p.paidCol}</th>
                </tr>
              </thead>
              <tbody>
                {p.comparison.map((row) => (
                  <tr key={row.feature} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 px-4 text-slate-700">{row.feature}</td>
                    <td className="py-3 px-4 text-center"><CheckIcon ok={resolveCompareValue(row.free)} /></td>
                    <td className="py-3 px-4 text-center"><CheckIcon ok={resolveCompareValue(row.paid)} /></td>
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

      <section className="bg-slate-900 text-white py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-xl sm:text-2xl font-bold">{p.ctaTitle}</h2>
          <p className="text-slate-400 mt-2 text-sm">{p.ctaSubtitle}</p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <Link to="/" className="btn-primary text-sm">{p.openMap}</Link>
            <Link to="/downloads" className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-medium border border-white/25 hover:bg-white/10">
              {m.nav.reports}
            </Link>
          </div>
        </div>
      </section>

      <SubscribeCheckoutModal
        open={checkoutPlanId !== null}
        requiresAccount={!user}
        defaultPhone={user?.phone || ''}
        defaultEmail={user?.email || ''}
        planLabel={checkoutPlan ? `${checkoutPlan.name} · ${formatPrice(checkoutPlan)}` : undefined}
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
          cardInternational: p.cardInternational,
          mobileMoneyHint: p.mobileMoneyHint,
          cardHint: p.cardHint,
          authEmailHint: p.authEmailHint,
          otpSentTo: p.otpSentTo,
          passwordCreate: p.passwordCreate,
          passwordSignIn: p.passwordSignIn,
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
