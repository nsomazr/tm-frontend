/** Tanzania mobile numbers for SMS OTP (07XXXXXXXX or 2557XXXXXXXX). */

export function isValidTzPhone(value: string): boolean {
  return normalizeTzPhone(value) != null
}

export function normalizeTzPhone(value: string): string | null {
  const digits = value.replace(/\D/g, '').trim()
  if (!digits) return null

  let national = digits
  if (national.startsWith('00')) national = national.slice(2)
  if (national.startsWith('255')) national = national.slice(3)
  else if (national.startsWith('0')) national = national.slice(1)

  if (!/^7[0-9]{8}$/.test(national)) return null
  return `255${national}`
}

export function formatTzPhoneDisplay(value: string): string {
  const normalized = normalizeTzPhone(value)
  if (!normalized) return value
  const local = normalized.slice(3)
  return `0${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`
}

export type OtpChannel = 'email' | 'sms'

export function detectOtpChannel(identifier: string): OtpChannel | null {
  const trimmed = identifier.trim()
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'email'
  if (isValidTzPhone(trimmed)) return 'sms'
  return null
}
