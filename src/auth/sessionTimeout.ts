/** Auth session limits (aligned with OWASP low/moderate-risk SaaS defaults). */

/** End session after this much inactivity (mouse, keyboard, touch, visibility). */
export const SESSION_IDLE_MS = 30 * 60 * 1000 // 30 minutes

/** Hard cap from login even if the user stays active. */
export const SESSION_ABSOLUTE_MS = 8 * 60 * 60 * 1000 // 8 hours

export const SESSION_ACTIVITY_KEY = 'tm_session_last_activity'
export const SESSION_STARTED_KEY = 'tm_session_started_at'

export function touchSessionActivity(now = Date.now()) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SESSION_ACTIVITY_KEY, String(now))
  } catch {
    /* ignore quota / private mode */
  }
}

export function markSessionStarted(now = Date.now()) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SESSION_STARTED_KEY, String(now))
    localStorage.setItem(SESSION_ACTIVITY_KEY, String(now))
  } catch {
    /* ignore */
  }
}

export function clearSessionTimers() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(SESSION_ACTIVITY_KEY)
    localStorage.removeItem(SESSION_STARTED_KEY)
  } catch {
    /* ignore */
  }
}

export function readSessionTimestamp(key: string): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const value = Number(raw)
    return Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

export function isSessionExpired(now = Date.now()): boolean {
  const started = readSessionTimestamp(SESSION_STARTED_KEY)
  const activity = readSessionTimestamp(SESSION_ACTIVITY_KEY)
  if (started == null || activity == null) return true
  if (now - started >= SESSION_ABSOLUTE_MS) return true
  if (now - activity >= SESSION_IDLE_MS) return true
  return false
}
