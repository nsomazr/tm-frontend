import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import OtpInput from './OtpInput'
import PasswordInput from '../ui/PasswordInput'
import { formatOtpCountdown } from '../../constants/otp'
import { useOtpTimers } from '../../hooks/useOtpTimers'
import { useTranslation } from '../../i18n/LocaleContext'
import {
  detectOtpChannel,
  formatTzPhoneDisplay,
  type OtpChannel,
} from '../../lib/phone'

type AuthMode = 'register' | 'login'
type Step = 'start' | 'otp' | 'password'

interface SimpleAuthFormProps {
  mode: AuthMode
  loading: boolean
  error: string
  onSendOtp: (identifier: string) => Promise<{ channel: 'email' | 'sms'; expiresIn: number }>
  onVerifyOtp: (identifier: string, code: string) => Promise<void>
  onPassword: (identifier: string, password: string) => Promise<void>
  footerLink: { text: string; to: string; label: string }
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function normalizeIdentifier(value: string, asEmail: boolean) {
  const trimmed = value.trim()
  return asEmail ? trimmed.toLowerCase() : trimmed
}

export default function SimpleAuthForm({
  mode,
  loading,
  error,
  onSendOtp,
  onVerifyOtp,
  onPassword,
  footerLink,
}: SimpleAuthFormProps) {
  const { m } = useTranslation()
  const [step, setStep] = useState<Step>('start')
  const [identifier, setIdentifier] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const [otpChannel, setOtpChannel] = useState<OtpChannel | null>(null)
  const autoVerifyRef = useRef(false)
  const { resendIn, expiresIn, startTimers } = useOtpTimers(step === 'otp')

  const isLogin = mode === 'login'
  const isEmail = isValidEmail(identifier)
  const detectedChannel = detectOtpChannel(identifier)
  const title = mode === 'register' ? 'Create account' : 'Sign in'
  const displayError = error || localError
  const emailForOtp = normalizeIdentifier(identifier, true)
  const canSendOtp = detectedChannel != null

  const otpDestination =
    otpChannel === 'sms' ? formatTzPhoneDisplay(identifier) : emailForOtp

  const requireIdentifier = () => {
    if (!identifier.trim()) {
      setLocalError(
        isLogin
          ? 'Enter your email, phone, or username'
          : 'Enter your email address or mobile number',
      )
      return false
    }
    setLocalError('')
    return true
  }

  const handleSendOtp = async () => {
    if (!canSendOtp) {
      setLocalError('Enter a valid email or Tanzania mobile number (07XXXXXXXX)')
      return
    }
    setLocalError('')
    try {
      const result = await onSendOtp(identifier.trim())
      setOtpChannel(result.channel)
      setCode('')
      setStep('otp')
      autoVerifyRef.current = false
      startTimers(result.expiresIn)
    } catch {
      /* parent sets error */
    }
  }

  const handleResendOtp = async () => {
    if (resendIn > 0 || loading) return
    setLocalError('')
    try {
      const result = await onSendOtp(identifier.trim())
      setOtpChannel(result.channel)
      setCode('')
      startTimers(result.expiresIn)
    } catch {
      /* parent sets error */
    }
  }

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setLocalError('')
    if (code.length !== 6) {
      setLocalError(
        otpChannel === 'sms'
          ? 'Enter the 6-digit code from your SMS'
          : 'Enter the 6-digit code from your email',
      )
      return
    }
    await onVerifyOtp(identifier.trim(), code)
  }

  useEffect(() => {
    if (code.length < 6) {
      autoVerifyRef.current = false
    }
  }, [code])

  useEffect(() => {
    if (step !== 'otp' || code.length !== 6 || loading || autoVerifyRef.current) return
    autoVerifyRef.current = true
    void handleVerifyOtp()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, step, loading])

  const handlePasswordStep = () => {
    if (!requireIdentifier()) return
    if (!isLogin && !isEmail) {
      setLocalError('Password sign-up requires an email address')
      return
    }
    setStep('password')
  }

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    if (!password) {
      setLocalError('Enter your password')
      return
    }
    if (!isLogin && password.length < 8) {
      setLocalError('Password must be at least 8 characters')
      return
    }
    const loginId = normalizeIdentifier(identifier, isEmail)
    await onPassword(loginId, password)
  }

  const subtitle =
    step === 'start'
      ? isLogin
        ? 'Email, phone, or username'
        : 'Email or Tanzania mobile number'
      : step === 'otp'
        ? otpChannel === 'sms'
          ? `Code sent to ${otpDestination}`
          : `Code sent to ${emailForOtp}`
        : mode === 'register'
          ? 'Choose a password for your account'
          : 'Enter your password'

  const otpButtonLabel =
    detectedChannel === 'sms'
      ? loading
        ? 'Sending code…'
        : 'Text me a code'
      : loading
        ? 'Sending code…'
        : 'Email me a code'

  return (
    <div className="auth-form w-full">
      <header className="mb-4 sm:mb-5">
        <h2 className="auth-form__title">{title}</h2>
        <p className="auth-form__subtitle mt-1">{subtitle}</p>
      </header>

      <div className="space-y-3.5">
        {displayError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {displayError}
          </p>
        ) : null}

        {step === 'start' && (
          <div className="space-y-3.5">
            <label className="block">
              <span className="auth-form__label">
                {isLogin ? 'Account' : 'Email or mobile'}
              </span>
              <input
                type="text"
                inputMode={detectedChannel === 'sms' ? 'tel' : 'email'}
                placeholder={isLogin ? 'Email, phone, or username' : 'Email or mobile (07XXXXXXXX)'}
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value)
                  setLocalError('')
                }}
                className="input mt-1.5"
                required
                autoFocus
                autoComplete={isLogin ? 'username' : 'email'}
              />
            </label>

            {isLogin && identifier.trim() && !isEmail && detectedChannel !== 'sms' ? (
              <p className="text-xs text-app-muted">Username account — use password sign-in below.</p>
            ) : null}
            {detectedChannel === 'sms' ? (
              <p className="text-xs text-app-muted">We’ll text a one-time code to this number.</p>
            ) : null}

            <button
              type="button"
              onClick={handleSendOtp}
              disabled={loading || !canSendOtp}
              className="btn-primary w-full disabled:opacity-50"
              title={!canSendOtp ? 'Enter a valid email or mobile number' : undefined}
            >
              {otpButtonLabel}
            </button>

            <div className="auth-form__or" aria-hidden>
              <span>or</span>
            </div>

            <button
              type="button"
              onClick={handlePasswordStep}
              disabled={loading || !identifier.trim() || (!isLogin && !isEmail)}
              className="btn-secondary w-full"
            >
              {mode === 'register' ? 'Continue with password' : 'Use my password'}
            </button>
          </div>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <OtpInput value={code} onChange={setCode} disabled={loading} />
            {expiresIn > 0 ? (
              <p className="text-center text-sm tabular-nums text-app-text-secondary">
                {m.auth.otpExpiresIn.replace('{time}', formatOtpCountdown(expiresIn))}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="btn-primary w-full"
            >
              {loading ? 'Verifying…' : mode === 'register' ? 'Create account' : 'Sign in'}
            </button>

            <div className="text-center">
              {resendIn > 0 ? (
                <p className="text-sm text-app-muted">
                  {m.auth.resendAvailableIn.replace('{seconds}', String(resendIn))}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-sm font-medium text-terra-700 hover:underline dark:text-terra-300"
                >
                  {m.auth.resendCode}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setStep('start')
                setCode('')
                setOtpChannel(null)
              }}
              className="w-full text-sm text-app-muted transition-colors hover:text-app-text"
            >
              ← Back
            </button>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={handlePassword} className="space-y-4">
            <div className="rounded-xl bg-app-subtle/80 px-3.5 py-2.5 text-center">
              <p className="truncate text-sm font-medium text-app-text">
                {normalizeIdentifier(identifier, isEmail)}
              </p>
            </div>
            <label className="block">
              <span className="auth-form__label">Password</span>
              <PasswordInput
                className="mt-1.5"
                placeholder={mode === 'register' ? 'Create password (min 8 chars)' : 'Password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={isLogin ? undefined : 8}
                autoFocus
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              />
            </label>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={() => setStep('start')}
              className="w-full text-sm text-app-muted transition-colors hover:text-app-text"
            >
              ← Back
            </button>
          </form>
        )}

        <p className="pt-2 text-center text-sm text-app-muted">
          {footerLink.text}{' '}
          <Link to={footerLink.to} className="font-semibold text-terra-700 hover:underline dark:text-terra-300">
            {footerLink.label}
          </Link>
        </p>
      </div>
    </div>
  )
}
