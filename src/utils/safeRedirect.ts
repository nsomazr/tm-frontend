const DEFAULT_ALLOWED_HOSTS = [
  'snippe.sh',
  'selcom.online',
  'tz.selcom.online',
  'terrameta.5ggeology.com',
  'ngrok-free.app',
  'ngrok.io',
  'localhost',
  '127.0.0.1',
]

function allowedHosts(): string[] {
  const fromEnv = import.meta.env.VITE_ALLOWED_REDIRECT_HOSTS as string | undefined
  if (!fromEnv?.trim()) return DEFAULT_ALLOWED_HOSTS
  return [...DEFAULT_ALLOWED_HOSTS, ...fromEnv.split(',').map((h) => h.trim()).filter(Boolean)]
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
    return parsed.protocol === 'http:' && (host === 'localhost' || host === '127.0.0.1')
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
