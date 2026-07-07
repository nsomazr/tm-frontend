import { useCallback, useEffect, useState } from 'react'
import { OTP_RESEND_SECONDS, OTP_VALID_SECONDS } from '../constants/otp'

export function useOtpTimers(active: boolean) {
  const [resendIn, setResendIn] = useState(0)
  const [expiresIn, setExpiresIn] = useState(0)

  const startTimers = useCallback((expiresSeconds: number = OTP_VALID_SECONDS) => {
    setResendIn(OTP_RESEND_SECONDS)
    setExpiresIn(expiresSeconds)
  }, [])

  useEffect(() => {
    if (!active) {
      setResendIn(0)
      setExpiresIn(0)
      return
    }
    const timer = window.setInterval(() => {
      setResendIn((s) => (s <= 1 ? 0 : s - 1))
      setExpiresIn((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [active])

  return { resendIn, expiresIn, startTimers }
}
