import { useEffect, useRef, useState } from 'react'
import OtpInput from '../auth/OtpInput'
import { formatOtpCountdown } from '../../constants/otp'
import { useOtpTimers } from '../../hooks/useOtpTimers'
import { CardBadges, MobileMoneyBadges } from './PaymentBrandBadges'

export type PaymentMethod = 'mobile_money' | 'card'

export interface SubscribeCheckoutPayload {
  paymentMethod: PaymentMethod
  msisdn?: string
}

type AuthStep = 'email' | 'otp' | 'password' | 'payment'

export interface SubscribeCheckoutLabels {
  emailMeCode: string
  usePassword: string
  resendCode: string
  resendIn: string
  otpExpiresIn: string
  back: string
  mobileMoney: string
  cardInternational: string
  mobileMoneyHint: string
  cardHint: string
  authEmailHint: string
  otpSentTo: string
  passwordCreate: string
  passwordSignIn: string
}

interface SubscribeCheckoutModalProps {
  open: boolean
  requiresAccount: boolean
  defaultPhone?: string
  defaultEmail?: string
  planLabel?: string
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
  const [email, setEmail] = useState(defaultEmail)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mobile_money')
  const [msisdn, setMsisdn] = useState(defaultPhone)
  const [localError, setLocalError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const autoVerifyRef = useRef(false)
  const { resendIn, expiresIn, startTimers } = useOtpTimers(step === 'otp')

  useEffect(() => {
    if (open) {
      setStep(requiresAccount ? 'email' : 'payment')
      setEmail(defaultEmail)
      setCode('')
      setPassword('')
      setMsisdn(defaultPhone)
      setPaymentMethod('mobile_money')
      setLocalError('')
      autoVerifyRef.current = false
    }
  }, [open, requiresAccount, defaultEmail, defaultPhone])

  const displayError = error || localError
  const busy = loading || authBusy
  const emailNormalized = email.trim().toLowerCase()

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

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (paymentMethod === 'mobile_money' && !msisdn.trim()) {
      setLocalError('Enter your mobile money number')
      return
    }
    setLocalError('')
    onConfirm({
      paymentMethod,
      msisdn: paymentMethod === 'mobile_money' ? msisdn.trim() : undefined,
    })
  }

  if (!open) return null

  const stepTitle =
    step === 'email'
      ? title
      : step === 'otp'
        ? labels.otpSentTo.replace('{email}', emailNormalized)
        : step === 'password'
          ? labels.passwordCreate
          : title

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-1">{stepTitle}</h2>
        {planLabel && step !== 'otp' && (
          <p className="text-sm font-medium text-terra-700 mb-2">{planLabel}</p>
        )}
        {step === 'email' && (
          <p className="text-sm text-slate-600 mb-4">{description}</p>
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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="input w-full"
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

        {step === 'payment' && (
          <form onSubmit={handlePaymentSubmit} className="space-y-4 mt-2">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-slate-700 mb-2">Payment method</legend>
              <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer has-[:checked]:border-terra-500 has-[:checked]:bg-terra-50">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="mobile_money"
                  checked={paymentMethod === 'mobile_money'}
                  onChange={() => setPaymentMethod('mobile_money')}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-900">{labels.mobileMoney}</span>
                  <span className="block text-xs text-slate-500 mt-0.5">{labels.mobileMoneyHint}</span>
                  <MobileMoneyBadges />
                </span>
              </label>
              <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer has-[:checked]:border-terra-500 has-[:checked]:bg-terra-50">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-900">{labels.cardInternational}</span>
                  <span className="block text-xs text-slate-500 mt-0.5">{labels.cardHint}</span>
                  <CardBadges />
                </span>
              </label>
            </fieldset>

            {paymentMethod === 'mobile_money' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Mobile money number
                </label>
                <input
                  type="tel"
                  value={msisdn}
                  onChange={(e) => setMsisdn(e.target.value)}
                  placeholder="2557XXXXXXXX or 07XXXXXXXX"
                  className="input w-full"
                  autoComplete="tel"
                />
              </div>
            )}

            <div className="flex gap-3 justify-end pt-1">
              {!requiresAccount && (
                <button type="button" onClick={onCancel} className="btn-secondary text-sm">
                  Cancel
                </button>
              )}
              {requiresAccount && (
                <button type="button" onClick={() => setStep('email')} className="btn-secondary text-sm">
                  {labels.back}
                </button>
              )}
              <button type="submit" disabled={busy} className="btn-primary text-sm disabled:opacity-50">
                {busy ? 'Processing…' : confirmLabel}
              </button>
            </div>
          </form>
        )}

        {step !== 'payment' && step !== 'otp' && step !== 'password' && (
          <div className="flex justify-end mt-4">
            <button type="button" onClick={onCancel} className="btn-secondary text-sm">
              Cancel
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
    window.location.href = data.redirect_url
    return
  }
  if (data.payment_provider === 'selcom' && data.merchant_reference) {
    window.location.href = `/payment/callback?ref=${data.merchant_reference}`
    return
  }
  window.location.href = '/dashboard'
}
