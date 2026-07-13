import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../brand/Logo'
import OtpInput from './OtpInput'
import PasswordInput from '../ui/PasswordInput'
import StepProgress from '../ui/StepProgress'
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

const AUTH_STEPS: { id: Step; label: string; short: string }[] = [
  { id: 'start', label: 'Account', short: 'Email or phone' },
  { id: 'otp', label: 'Verify', short: 'One-time code' },
  { id: 'password', label: 'Password', short: 'Sign in' },
]

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
    otpChannel === 'sms'
      ? formatTzPhoneDisplay(identifier)
      : emailForOtp

  const requireIdentifier = () => {
    if (!identifier.trim()) {
      setLocalError(
        isLogin
          ? 'Enter your email, phone, or username'
          : 'Enter your email address or mobile number'
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
          : 'Enter the 6-digit code from your email'
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
        ? 'Email, phone, username, or code'
        : 'Use your email or Tanzania mobile number'
      : step === 'otp'
        ? otpChannel === 'sms'
          ? `We sent a code to ${otpDestination}`
          : `We sent a code to ${emailForOtp}`
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
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <Link to="/" className="inline-block">
          <Logo variant="icon" className="h-16 w-16 mx-auto md:hidden" />
          <Logo variant="wordmark" className="hidden md:block h-20 w-auto mx-auto" />
        </Link>
        <h1 className="text-xl font-semibold text-slate-900 mt-4">{title}</h1>
        <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
        <StepProgress
          className="mt-5 text-left"
          aria-label="Sign-in steps"
          steps={AUTH_STEPS}
          current={step}
          maxReachable={step}
        />
      </div>

      <div className="card-flat space-y-4">
        {displayError && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{displayError}</p>
        )}

        {step === 'start' && (
          <div className="space-y-3">
            <input
              type="text"
              inputMode={detectedChannel === 'sms' ? 'tel' : 'email'}
              placeholder={isLogin ? 'Email, phone, or username' : 'Email or mobile (07XXXXXXXX)'}
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value)
                setLocalError('')
              }}
              className="input"
              required
              autoFocus
              autoComplete={isLogin ? 'username' : 'email'}
            />
            {isLogin && identifier.trim() && !isEmail && detectedChannel !== 'sms' && (
              <p className="text-xs text-slate-500 -mt-1">
                Username account. Use password sign-in below.
              </p>
            )}
            {detectedChannel === 'sms' && (
              <p className="text-xs text-slate-500 -mt-1">
                We&apos;ll send a one-time code by SMS to this number.
              </p>
            )}
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={loading || !canSendOtp}
              className="btn-primary w-full disabled:opacity-50"
              title={!canSendOtp ? 'Enter a valid email or mobile number' : undefined}
            >
              {otpButtonLabel}
            </button>
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
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <OtpInput value={code} onChange={setCode} disabled={loading} />
            {expiresIn > 0 && (
              <p className="text-sm text-slate-600 text-center tabular-nums">
                {m.auth.otpExpiresIn.replace('{time}', formatOtpCountdown(expiresIn))}
              </p>
            )}

            <button type="submit" disabled={loading || code.length !== 6} className="btn-primary w-full">
              {loading ? 'Verifying…' : mode === 'register' ? 'Create account' : 'Sign in'}
            </button>

            <div className="text-center space-y-1">
              {resendIn > 0 ? (
                <p className="text-sm text-slate-500">
                  {m.auth.resendAvailableIn.replace('{seconds}', String(resendIn))}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-sm font-medium text-terra-600 hover:text-terra-700 hover:underline"
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
              className="text-sm text-slate-500 hover:text-slate-700 w-full"
            >
              ← Back
            </button>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={handlePassword} className="space-y-4">
            <p className="text-sm text-slate-600 text-center truncate">
              {normalizeIdentifier(identifier, isEmail)}
            </p>
            <PasswordInput
              placeholder={mode === 'register' ? 'Create password (min 8 chars)' : 'Password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={isLogin ? undefined : 8}
              autoFocus
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={() => setStep('start')}
              className="text-sm text-slate-500 hover:text-slate-700 w-full"
            >
              ← Back
            </button>
          </form>
        )}

        <p className="text-sm text-center text-slate-500 pt-1">
          {footerLink.text}{' '}
          <Link to={footerLink.to} className="text-terra-600 font-medium">
            {footerLink.label}
          </Link>
        </p>
      </div>
    </div>
  )
}
