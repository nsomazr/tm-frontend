import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { formatUsd, tzsToUsd, useTzsUsdRate } from '../../hooks/useTzsUsdRate'

export type PricingCurrency = 'TZS' | 'USD'

type PricingCurrencyLabels = {
  tzs: string
  usd: string
  liveRateHint: string
  rateUnavailable: string
}

const PricingCurrencyContext = createContext<{
  currency: PricingCurrency
  setCurrency: (c: PricingCurrency) => void
  rate: number | undefined
  rateLoading: boolean
  rateError: boolean
  labels: PricingCurrencyLabels
} | null>(null)

export function PricingCurrencyProvider({
  children,
  labels,
}: {
  children: ReactNode
  labels: PricingCurrencyLabels
}) {
  const [currency, setCurrency] = useState<PricingCurrency>('TZS')
  const { data: rate, isLoading, isError } = useTzsUsdRate()

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      rate,
      rateLoading: isLoading,
      rateError: isError,
      labels,
    }),
    [currency, rate, isLoading, isError, labels]
  )

  return <PricingCurrencyContext.Provider value={value}>{children}</PricingCurrencyContext.Provider>
}

export function usePricingCurrency() {
  const ctx = useContext(PricingCurrencyContext)
  if (!ctx) throw new Error('usePricingCurrency must be used within PricingCurrencyProvider')
  return ctx
}

/** Centered TZS / USD pill switcher - place above pricing cards. */
export function PricingCurrencyToggle({ className = '' }: { className?: string }) {
  const { currency, setCurrency, rateLoading, rateError, labels } = usePricingCurrency()

  return (
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      <div className="segmented rounded-full p-1 gap-0.5" role="group" aria-label="Price currency">
        {(['TZS', 'USD'] as const).map((code) => {
          const active = currency === code
          return (
            <button
              key={code}
              type="button"
              onClick={() => setCurrency(code)}
              aria-pressed={active}
              className={`segmented-btn min-w-[4.5rem] rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
                active
                  ? 'segmented-btn-active shadow-sm'
                  : 'hover:bg-app-surface/50 dark:hover:bg-app-surface/40'
              }`}
            >
              {code === 'TZS' ? labels.tzs : labels.usd}
            </button>
          )
        })}
      </div>
      {currency === 'USD' && (
        <p className="text-xs text-app-muted">
          {rateLoading ? labels.liveRateHint : rateError ? labels.rateUnavailable : labels.liveRateHint}
        </p>
      )}
    </div>
  )
}

export function PlanPriceAmount({
  amountTzs,
  className = '',
  size = 'lg',
}: {
  amountTzs: number
  className?: string
  size?: 'lg' | 'sm'
}) {
  const { currency, rate, rateLoading, rateError } = usePricingCurrency()

  const amountClass =
    size === 'lg' ? 'text-4xl font-bold text-slate-900' : 'text-sm font-medium text-slate-700 tabular-nums'
  const currencyClass = size === 'lg' ? 'text-slate-500 ml-1' : 'text-slate-500 ml-1 text-xs'

  if (amountTzs <= 0) {
    return (
      <span className={className}>
        <span className={amountClass}>0</span>
        <span className={currencyClass}>TZS</span>
      </span>
    )
  }

  if (currency === 'USD') {
    if (rateLoading) {
      return <span className={`${amountClass} text-slate-400 ${className}`}>…</span>
    }
    if (rateError || rate == null) {
      return (
        <span className={`${size === 'lg' ? 'text-base' : 'text-xs'} text-slate-500 ${className}`}>
          USD unavailable
        </span>
      )
    }
    return (
      <span className={className}>
        <span className={amountClass}>{formatUsd(tzsToUsd(amountTzs, rate))}</span>
        <span className={currencyClass}>USD</span>
      </span>
    )
  }

  return (
    <span className={className}>
      <span className={amountClass}>{Number(amountTzs).toLocaleString()}</span>
      <span className={currencyClass}>TZS</span>
    </span>
  )
}

/** Live-rate footnote under checkout plan line when USD is selected. */
export function CheckoutPriceHint({ amountTzs }: { amountTzs: number }) {
  const { currency, rateLoading, rateError, labels } = usePricingCurrency()

  if (currency !== 'USD' || amountTzs <= 0) return null

  return (
    <p className="text-xs text-slate-500 mt-0.5">
      {rateLoading ? labels.liveRateHint : rateError ? labels.rateUnavailable : labels.liveRateHint}
    </p>
  )
}
