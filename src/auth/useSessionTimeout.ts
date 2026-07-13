import { useEffect, useRef } from 'react'
import {
  clearSessionTimers,
  isSessionExpired,
  markSessionStarted,
  readSessionTimestamp,
  SESSION_STARTED_KEY,
  touchSessionActivity,
} from './sessionTimeout'

type UseSessionTimeoutOptions = {
  enabled: boolean
  onTimeout: () => void
}

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'pointerdown',
  'keydown',
  'touchstart',
  'scroll',
  'mousemove',
]

/**
 * Ends the auth session after 30 minutes idle or 8 hours absolute
 * (common SaaS / OWASP low-moderate risk defaults).
 */
export function useSessionTimeout({ enabled, onTimeout }: UseSessionTimeoutOptions) {
  const onTimeoutRef = useRef(onTimeout)
  onTimeoutRef.current = onTimeout

  useEffect(() => {
    if (!enabled) {
      return
    }

    if (readSessionTimestamp(SESSION_STARTED_KEY) == null) {
      markSessionStarted()
    } else {
      touchSessionActivity()
    }

    let activityThrottle: number | null = null
    const noteActivity = () => {
      if (activityThrottle != null) return
      activityThrottle = window.setTimeout(() => {
        activityThrottle = null
      }, 15_000)
      touchSessionActivity()
    }

    const expireIfNeeded = () => {
      if (!isSessionExpired()) return
      clearSessionTimers()
      onTimeoutRef.current()
    }

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return
      noteActivity()
      expireIfNeeded()
    }

    expireIfNeeded()
    const intervalId = window.setInterval(expireIfNeeded, 30_000)

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, noteActivity, { passive: true })
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.clearInterval(intervalId)
      if (activityThrottle != null) window.clearTimeout(activityThrottle)
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, noteActivity)
      }
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled])
}
