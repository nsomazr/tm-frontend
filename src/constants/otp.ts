/** Must match tm-backend/apps/accounts/otp_service.py OTP_TTL_MINUTES */
export const OTP_VALID_MINUTES = 1
export const OTP_VALID_SECONDS = OTP_VALID_MINUTES * 60

/** SMS OTP validity — must match tm-backend OTP_SMS_TTL_MINUTES */
export const OTP_SMS_VALID_MINUTES = 5
export const OTP_SMS_VALID_SECONDS = OTP_SMS_VALID_MINUTES * 60

/** Must match tm-backend OTP_RESEND_SECONDS */
export const OTP_RESEND_SECONDS = 60

export function formatOtpCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
