import { useEffect, useRef, useState } from 'react'
import OtpInput from '../auth/OtpInput'
import PasswordInput from '../ui/PasswordInput'
import StepProgress from '../ui/StepProgress'
import { formatOtpCountdown } from '../../constants/otp'
import { useOtpTimers } from '../../hooks/useOtpTimers'
import {
  CardBrandOption,
  CardBrandLogos,
  MobileMoneyBadges,
  PaymentMethodOption,
} from './PaymentBrandBadges'
import { safeRedirect } from '../../utils/safeRedirect'
import type { ReactNode } from 'react'

export type PaymentMethod = 'mobile_money' | 'card'
export type CardBrand = 'visa' | 'mastercard'
type PaymentSubStep = 'method' | 'mobile' | 'card_brand' | 'card_details'

export interface SubscribeCheckoutPayload {
  paymentMethod: PaymentMethod
  msisdn?: string
  cardBrand?: CardBrand
  cardholderName?: string
  billingEmail?: string
}

type AuthStep = 'email' | 'otp' | 'password' | 'payment'

const CHECKOUT_ACCOUNT_STEPS: { id: AuthStep; label: string; short: string }[] = [
  { id: 'email', label: 'Email', short: 'Your account' },
  { id: 'otp', label: 'Verify', short: 'Code' },
  { id: 'password', label: 'Password', short: 'Secure access' },
  { id: 'payment', label: 'Pay', short: 'Checkout' },
]

export interface SubscribeCheckoutLabels {
  emailMeCode: string
  usePassword: string
  resendCode: string
  resendIn: string
  otpExpiresIn: string
  back: string
  mobileMoney: string
  card: string
  mobileMoneyHint: string
  cardDetailsSubtitle: string
  continueToSecurePayment: string
  mobileMoneyNumber: string
  mobileMoneyPlaceholder: string
  selectCardType: string
  cardDetailsTitle: string
  nameOnCard: string
  billingEmail: string
  visa: string
  mastercard: string
  continue: string
  authEmailHint: string
  otpSentTo: string
  passwordCreate: string
  passwordSignIn: string
  cancel: string
}

interface SubscribeCheckoutModalProps {
  open: boolean
  requiresAccount: boolean
  defaultPhone?: string
  defaultEmail?: string
  planLabel?: string
  planPriceHint?: ReactNode
  title: string
  description: string
  confirmLabel: string
  labels: SubscribeCheckoutLabels
  loading?: boolean
  error?: string
  onSendOtp: (email: string) => Promise<void>
  onVerifyOtp: (email: string, code: string) => Promise<void>
  onPasswordAuth: (email: string, password: string) => Promise<void>
  onCancel: () => void
  onConfirm: (payload: SubscribeCheckoutPayload) => void
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export default function SubscribeCheckoutModal({
  open,
  requiresAccount,
  defaultPhone = '',
  defaultEmail = '',
  planLabel,
  planPriceHint,
  title,
  description,
  confirmLabel,
  labels,
  loading,
  error,
  onSendOtp,
  onVerifyOtp,
  onPasswordAuth,
  onCancel,
  onConfirm,
}: SubscribeCheckoutModalProps) {
  const [step, setStep] = useState<AuthStep>('email')
  const [paymentSubStep, setPaymentSubStep] = useState<PaymentSubStep>('method')
  const [email, setEmail] = useState(defaultEmail)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [msisdn, setMsisdn] = useState(defaultPhone)
  const [cardBrand, setCardBrand] = useState<CardBrand | null>(null)
  const [cardholderName, setCardholderName] = useState('')
  const [billingEmail, setBillingEmail] = useState(defaultEmail)
  const [localError, setLocalError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const autoVerifyRef = useRef(false)
  const { resendIn, expiresIn, startTimers } = useOtpTimers(step === 'otp')

  useEffect(() => {
    if (open) {
      setStep(requiresAccount ? 'email' : 'payment')
      setPaymentSubStep('method')
      setEmail(defaultEmail)
      setCode('')
      setPassword('')
      setMsisdn(defaultPhone)
      setCardBrand(null)
      setCardholderName('')
      setBillingEmail(defaultEmail || email)
      setLocalError('')
      autoVerifyRef.current = false
    }
  }, [open, requiresAccount, defaultEmail, defaultPhone])

  const emailNormalized = email.trim().toLowerCase()

  useEffect(() => {
    if (step === 'payment' && !billingEmail && emailNormalized) {
      setBillingEmail(emailNormalized)
    }
  }, [step, emailNormalized, billingEmail])

  const displayError = error || localError
  const busy = loading || authBusy

  const handleSendOtp = async () => {
    if (!isValidEmail(email)) {
      setLocalError('Enter a valid email address')
      return
    }
    setLocalError('')
    setAuthBusy(true)
    try {
      await onSendOtp(emailNormalized)
      setCode('')
      setStep('otp')
      autoVerifyRef.current = false
      startTimers()
    } catch {
      setLocalError('Could not send verification code. Try password instead.')
    } finally {
      setAuthBusy(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendIn > 0 || busy) return
    setLocalError('')
    setAuthBusy(true)
    try {
      await onSendOtp(emailNormalized)
      setCode('')
      startTimers()
    } catch {
      setLocalError('Could not resend code.')
    } finally {
      setAuthBusy(false)
    }
  }

  const advanceToPayment = () => {
    setLocalError('')
    setPaymentSubStep('method')
    setBillingEmail(emailNormalized || defaultEmail)
    setStep('payment')
  }

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (code.length !== 6) {
      setLocalError('Enter the 6-digit code from your email')
      return
    }
    setLocalError('')
    setAuthBusy(true)
    try {
      await onVerifyOtp(emailNormalized, code)
      advanceToPayment()
    } catch {
      setLocalError('Invalid or expired code.')
    } finally {
      setAuthBusy(false)
    }
  }

  useEffect(() => {
    if (code.length < 6) autoVerifyRef.current = false
  }, [code])

  useEffect(() => {
    if (step !== 'otp' || code.length !== 6 || busy || autoVerifyRef.current) return
    autoVerifyRef.current = true
    void handleVerifyOtp()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, step, busy])

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidEmail(email)) {
      setLocalError('Enter a valid email address')
      return
    }
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters')
      return
    }
    setLocalError('')
    setAuthBusy(true)
    try {
      await onPasswordAuth(emailNormalized, password)
      advanceToPayment()
    } catch {
      setLocalError('Could not sign in or create account. Check your password.')
    } finally {
      setAuthBusy(false)
    }
  }

  const handleMobileSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!msisdn.trim()) {
      setLocalError('Enter your phone number')
      return
    }
    setLocalError('')
    onConfirm({ paymentMethod: 'mobile_money', msisdn: msisdn.trim() })
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

  if (!open) return null

  const paymentTitle =
    paymentSubStep === 'mobile'
      ? labels.mobileMoney
      : paymentSubStep === 'card_brand'
        ? labels.selectCardType
        : paymentSubStep === 'card_details'
          ? labels.cardDetailsTitle
          : title

  const stepTitle =
    step === 'email'
      ? title
      : step === 'otp'
        ? labels.otpSentTo.replace('{email}', emailNormalized)
        : step === 'password'
          ? labels.passwordCreate
          : paymentTitle

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="card relative w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h2 className="text-lg font-bold pr-2">{stepTitle}</h2>
          <button
            type="button"
            onClick={onCancel}
            className="shrink-0 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 text-xl leading-none p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            aria-label={labels.cancel}
          >
            ×
          </button>
        </div>
        {requiresAccount && (
          <StepProgress
            className="mb-4"
            aria-label="Checkout steps"
            steps={CHECKOUT_ACCOUNT_STEPS}
            current={step}
            maxReachable={step}
          />
        )}
        {planLabel && step !== 'otp' && (
          <div className="mb-2">
            <p className="text-sm font-medium text-terra-700">{planLabel}</p>
            {planPriceHint}
          </div>
        )}
        {step === 'email' && (
          <p className="text-sm text-slate-600 mb-4">{description}</p>
        )}

        {step === 'payment' && paymentSubStep === 'card_details' && (
          <p className="text-sm text-slate-600 mb-4">{labels.cardDetailsSubtitle}</p>
        )}

        {displayError && (
          <p className="text-sm text-red-600 mb-3 rounded-lg bg-red-50 px-3 py-2">{displayError}</p>
        )}

        {step === 'email' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setLocalError('')
                }}
                placeholder="you@example.com"
                className="input w-full"
                autoFocus
                autoComplete="email"
              />
              <p className="text-xs text-slate-500 mt-1">{labels.authEmailHint}</p>
            </div>
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={busy || !isValidEmail(email)}
              className="btn-primary w-full text-sm disabled:opacity-50"
            >
              {busy ? 'Sending…' : labels.emailMeCode}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!isValidEmail(email)) {
                  setLocalError('Enter a valid email address')
                  return
                }
                setLocalError('')
                setStep('password')
              }}
              disabled={busy || !email.trim()}
              className="btn-secondary w-full text-sm"
            >
              {labels.usePassword}
            </button>
          </div>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4 mt-2">
            <OtpInput value={code} onChange={setCode} disabled={busy} />
            {expiresIn > 0 && (
              <p className="text-sm text-slate-600 text-center tabular-nums">
                {labels.otpExpiresIn.replace('{time}', formatOtpCountdown(expiresIn))}
              </p>
            )}
            <button type="submit" disabled={busy || code.length !== 6} className="btn-primary w-full text-sm">
              {busy ? 'Verifying…' : confirmLabel}
            </button>
            <div className="text-center">
              {resendIn > 0 ? (
                <p className="text-sm text-slate-500">
                  {labels.resendIn.replace('{seconds}', String(resendIn))}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={busy}
                  className="text-sm font-medium text-terra-600 hover:underline"
                >
                  {labels.resendCode}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setStep('email')}
              className="text-sm text-slate-500 hover:text-slate-700 w-full"
            >
              {labels.back}
            </button>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={handlePasswordAuth} className="space-y-3 mt-2">
            <p className="text-sm text-slate-600 truncate">{emailNormalized}</p>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              autoFocus
              autoComplete="new-password"
            />
            <p className="text-xs text-slate-500">{labels.passwordSignIn}</p>
            <button type="submit" disabled={busy} className="btn-primary w-full text-sm">
              {busy ? 'Please wait…' : confirmLabel}
            </button>
            <button
              type="button"
              onClick={() => setStep('email')}
              className="text-sm text-slate-500 hover:text-slate-700 w-full"
            >
              {labels.back}
            </button>
          </form>
        )}

        {step === 'payment' && paymentSubStep === 'method' && (
          <div className="space-y-3 mt-2">
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
            <div className="flex gap-3 justify-end pt-1">
              {requiresAccount ? (
                <button type="button" onClick={() => setStep('email')} className="btn-secondary text-sm">
                  {labels.back}
                </button>
              ) : (
                <button type="button" onClick={onCancel} className="btn-secondary text-sm">
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {step === 'payment' && paymentSubStep === 'mobile' && (
          <form onSubmit={handleMobileSubmit} className="space-y-3 mt-2">
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
                <MobileMoneyBadges />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-1">
              <button type="button" onClick={paymentBack} className="btn-secondary text-sm">
                {labels.back}
              </button>
              <button type="submit" disabled={busy} className="btn-primary text-sm disabled:opacity-50">
                {busy ? 'Processing…' : confirmLabel}
              </button>
            </div>
          </form>
        )}

        {step === 'payment' && paymentSubStep === 'card_brand' && (
          <form onSubmit={handleCardBrandContinue} className="space-y-3 mt-2">
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
            <div className="flex gap-3 justify-end pt-1">
              <button type="button" onClick={paymentBack} className="btn-secondary text-sm">
                {labels.back}
              </button>
              <button type="submit" disabled={!cardBrand} className="btn-primary text-sm disabled:opacity-50">
                {labels.continue}
              </button>
            </div>
          </form>
        )}

        {step === 'payment' && paymentSubStep === 'card_details' && (
          <form onSubmit={handleCardSubmit} className="space-y-3 mt-2">
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
                disabled={busy}
                className="btn-primary w-full shrink-0 whitespace-nowrap text-sm disabled:opacity-50"
              >
                {busy ? 'Processing…' : labels.continueToSecurePayment || 'Continue securely'}
              </button>
              <button type="button" onClick={paymentBack} className="btn-secondary w-full text-sm">
                {labels.back}
              </button>
            </div>
          </form>
        )}

        {step !== 'payment' && step !== 'otp' && step !== 'password' && (
          <div className="flex justify-end mt-4">
            <button type="button" onClick={onCancel} className="btn-secondary text-sm">
              {labels.cancel}
            </button>
          </div>
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
