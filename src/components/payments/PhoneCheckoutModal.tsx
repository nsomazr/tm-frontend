import { useEffect, useState, type ReactNode } from 'react'
import {
  CardBrandOption,
  CardBrandLogos,
  MobileMoneyBadges,
  PaymentMethodOption,
} from './PaymentBrandBadges'
import { safeRedirect } from '../../utils/safeRedirect'
import type { CardBrand, PaymentMethod, SubscribeCheckoutPayload } from './SubscribeCheckoutModal'

export type { SubscribeCheckoutPayload as ProductCheckoutPayload }

export interface ProductCheckoutLabels {
  back: string
  cancel: string
  mobileMoney: string
  card: string
  mobileMoneyHint: string
  mobileMoneyNumber: string
  mobileMoneyPlaceholder: string
  cardDetailsSubtitle: string
  continueToSecurePayment: string
  nameOnCard: string
  billingEmail: string
  visa: string
  mastercard: string
  continue: string
}

interface PhoneCheckoutModalProps {
  open: boolean
  defaultPhone?: string
  defaultEmail?: string
  title: string
  description?: string
  productHint?: ReactNode
  confirmLabel: string
  labels: ProductCheckoutLabels
  loading?: boolean
  error?: string
  onCancel: () => void
  onConfirm: (payload: SubscribeCheckoutPayload) => void
}

type PaymentSubStep = 'method' | 'mobile' | 'card_brand' | 'card_details'

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export default function PhoneCheckoutModal({
  open,
  defaultPhone = '',
  defaultEmail = '',
  title,
  description,
  productHint,
  confirmLabel,
  labels,
  loading,
  error,
  onCancel,
  onConfirm,
}: PhoneCheckoutModalProps) {
  const [paymentSubStep, setPaymentSubStep] = useState<PaymentSubStep>('method')
  const [msisdn, setMsisdn] = useState(defaultPhone)
  const [cardBrand, setCardBrand] = useState<CardBrand | null>(null)
  const [cardholderName, setCardholderName] = useState('')
  const [billingEmail, setBillingEmail] = useState(defaultEmail)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (open) {
      setPaymentSubStep('method')
      setMsisdn(defaultPhone)
      setCardBrand(null)
      setCardholderName('')
      setBillingEmail(defaultEmail)
      setLocalError('')
    }
  }, [open, defaultPhone, defaultEmail])

  if (!open) return null

  const displayError = error || localError

  const handleMobileSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!msisdn.trim()) {
      setLocalError('Enter your phone number')
      return
    }
    setLocalError('')
    onConfirm({ paymentMethod: 'mobile_money' as PaymentMethod, msisdn: msisdn.trim() })
  }

  const handleCardBrandContinue = (e: React.FormEvent) => {
    e.preventDefault()
    if (!cardBrand) {
      setLocalError('Select Visa or Mastercard')
      return
    }
    setLocalError('')
    setPaymentSubStep('card_details')
  }

  const handleCardSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!cardBrand) {
      setLocalError('Select Visa or Mastercard')
      return
    }
    if (!cardholderName.trim()) {
      setLocalError('Enter the name on your card')
      return
    }
    if (!isValidEmail(billingEmail)) {
      setLocalError('Enter a valid email address')
      return
    }
    setLocalError('')
    onConfirm({
      paymentMethod: 'card',
      cardBrand,
      cardholderName: cardholderName.trim(),
      billingEmail: billingEmail.trim().toLowerCase(),
    })
  }

  const paymentBack = () => {
    setLocalError('')
    if (paymentSubStep === 'mobile' || paymentSubStep === 'card_brand') {
      setPaymentSubStep('method')
      return
    }
    if (paymentSubStep === 'card_details') {
      setPaymentSubStep('card_brand')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="card w-full max-w-md max-h-[min(92vh,720px)] overflow-y-auto">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {description && <p className="text-sm text-slate-600 mt-1">{description}</p>}
        {productHint && <div className="mt-3">{productHint}</div>}

        {displayError && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {displayError}
          </p>
        )}

        {paymentSubStep === 'method' && (
          <div className="space-y-3 mt-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <PaymentMethodOption
                title={labels.mobileMoney}
                onClick={() => {
                  setLocalError('')
                  setPaymentSubStep('mobile')
                }}
              >
                <MobileMoneyBadges variant="compact" />
              </PaymentMethodOption>
              <PaymentMethodOption
                title={labels.card}
                onClick={() => {
                  setLocalError('')
                  setCardBrand(null)
                  setPaymentSubStep('card_brand')
                }}
              >
                <CardBrandLogos variant="compact" />
              </PaymentMethodOption>
            </div>
            <div className="flex justify-end pt-1">
              <button type="button" onClick={onCancel} className="btn-secondary text-sm">
                {labels.cancel}
              </button>
            </div>
          </div>
        )}

        {paymentSubStep === 'mobile' && (
          <form onSubmit={handleMobileSubmit} className="space-y-3 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {labels.mobileMoneyNumber}
              </label>
              <input
                type="tel"
                value={msisdn}
                onChange={(e) => setMsisdn(e.target.value)}
                placeholder={labels.mobileMoneyPlaceholder}
                className="input w-full"
                autoComplete="tel"
                autoFocus
              />
              <p className="text-xs text-slate-500 mt-1">{labels.mobileMoneyHint}</p>
              <div className="mt-3">
                <MobileMoneyBadges variant="compact" />
              </div>
            </div>
            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
              <button type="button" onClick={paymentBack} className="btn-secondary w-full sm:w-auto text-sm">
                {labels.back}
              </button>
              <button
                type="submit"
                disabled={loading || !msisdn.trim()}
                className="btn-primary w-full sm:w-auto text-sm disabled:opacity-50"
              >
                {loading ? 'Processing…' : confirmLabel}
              </button>
            </div>
          </form>
        )}

        {paymentSubStep === 'card_brand' && (
          <form onSubmit={handleCardBrandContinue} className="space-y-3 mt-4">
            <p className="text-sm text-slate-600">{labels.cardDetailsSubtitle}</p>
            <div className="grid grid-cols-2 gap-3">
              <CardBrandOption
                brand="visa"
                label={labels.visa}
                selected={cardBrand === 'visa'}
                onSelect={() => {
                  setCardBrand('visa')
                  setLocalError('')
                }}
              />
              <CardBrandOption
                brand="mastercard"
                label={labels.mastercard}
                selected={cardBrand === 'mastercard'}
                onSelect={() => {
                  setCardBrand('mastercard')
                  setLocalError('')
                }}
              />
            </div>
            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
              <button type="button" onClick={paymentBack} className="btn-secondary w-full sm:w-auto text-sm">
                {labels.back}
              </button>
              <button
                type="submit"
                disabled={!cardBrand}
                className="btn-primary w-full sm:w-auto text-sm disabled:opacity-50"
              >
                {labels.continue}
              </button>
            </div>
          </form>
        )}

        {paymentSubStep === 'card_details' && (
          <form onSubmit={handleCardSubmit} className="space-y-3 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{labels.nameOnCard}</label>
              <input
                type="text"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                placeholder="Jane Doe"
                className="input w-full"
                autoComplete="cc-name"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{labels.billingEmail}</label>
              <input
                type="email"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                placeholder="you@example.com"
                className="input w-full"
                autoComplete="email"
              />
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full shrink-0 whitespace-nowrap text-sm disabled:opacity-50"
              >
                {loading ? 'Processing…' : labels.continueToSecurePayment}
              </button>
              <button type="button" onClick={paymentBack} className="btn-secondary w-full text-sm">
                {labels.back}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export function handleCheckoutResponse(data: {
  redirect_url?: string
  callback_url?: string
  payment_provider?: string
  merchant_reference?: string
}) {
  if (data.redirect_url) {
    safeRedirect(data.redirect_url, '/dashboard')
    return
  }
  if (data.payment_provider === 'snippe' && data.merchant_reference) {
    window.location.href = `/payment/callback?ref=${encodeURIComponent(data.merchant_reference)}`
    return
  }
  window.location.href = '/dashboard'
}
