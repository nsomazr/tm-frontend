const DEV_ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'ngrok-free.app', 'ngrok.io']

const PROD_ALLOWED_HOSTS = [
  'snippe.sh',
  'api.snippe.sh',
  'selcom.online',
  'tz.selcom.online',
  'terrameta.5ggeology.com',
  '5ggeology.com',
]

function allowedHosts(): string[] {
  const base = import.meta.env.DEV ? [...PROD_ALLOWED_HOSTS, ...DEV_ALLOWED_HOSTS] : PROD_ALLOWED_HOSTS
  const fromEnv = import.meta.env.VITE_ALLOWED_REDIRECT_HOSTS as string | undefined
  if (!fromEnv?.trim()) return base
  return [...base, ...fromEnv.split(',').map((h) => h.trim()).filter(Boolean)]
}

/** Only follow HTTPS (or localhost HTTP) redirects to known payment/app hosts. */
export function isSafeRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    const allowed = allowedHosts().some(
      (entry) => host === entry || host.endsWith(`.${entry}`)
    )
    if (!allowed) return false
    if (parsed.protocol === 'https:') return true
    return import.meta.env.DEV && parsed.protocol === 'http:' && (host === 'localhost' || host === '127.0.0.1')
  } catch {
    return false
  }
}

export function safeRedirect(url: string, fallback = '/dashboard'): void {
  if (isSafeRedirectUrl(url)) {
    window.location.href = url
    return
  }
  window.location.href = fallback.startsWith('/') ? fallback : `/${fallback}`
}

/** Prevent open redirects after login/register. */
export function safeReturnPath(from: unknown, fallback = '/dashboard'): string {
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')) {
    return fallback
  }
  return from
}

/** Validate external links shown in ads and similar UI. */
export function safeExternalHref(url: string | null | undefined): string | undefined {
  if (!url?.trim()) return undefined
  try {
    const parsed = new URL(url.trim())
    if (parsed.protocol === 'https:') return parsed.href
    if (
      import.meta.env.DEV &&
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    ) {
      return parsed.href
    }
  } catch {
    return undefined
  }
  return undefined
}
