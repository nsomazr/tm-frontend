import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from '../../i18n/LocaleContext'
import { toast } from '../ui/toast'
import { useMapCaptureGuard } from './useMapCaptureGuard'

type MapCaptureGuardProps = {
  children: ReactNode
  className?: string
}

function isMobileDevice() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(max-width: 767px)').matches ||
    window.matchMedia('(pointer: coarse)').matches ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  )
}

export default function MapCaptureGuard({ children, className = '' }: MapCaptureGuardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { m } = useTranslation()
  const [shieldVisible, setShieldVisible] = useState(false)
  const clearTimerRef = useRef<number | null>(null)
  const toastCooldownRef = useRef(0)

  const notifyBlocked = useCallback(() => {
    const now = Date.now()
    if (now - toastCooldownRef.current < 2500) return
    toastCooldownRef.current = now
    toast.error(m.map.screenshotBlocked)
  }, [m.map.screenshotBlocked])

  useMapCaptureGuard(ref, notifyBlocked)

  useEffect(() => {
    const root = ref.current
    if (!root) return

    const clearPending = () => {
      if (clearTimerRef.current != null) {
        window.clearTimeout(clearTimerRef.current)
        clearTimerRef.current = null
      }
    }

    const obscure = (announce: boolean) => {
      clearPending()
      setShieldVisible(true)
      root.classList.add('map-capture-guard--obscured')
      if (announce && isMobileDevice()) notifyBlocked()
    }

    const reveal = () => {
      clearPending()
      // Keep shield briefly after return so mid-capture frames stay blank.
      clearTimerRef.current = window.setTimeout(() => {
        setShieldVisible(false)
        root.classList.remove('map-capture-guard--obscured')
        clearTimerRef.current = null
      }, isMobileDevice() ? 600 : 200)
    }

    const sync = () => {
      const shouldHide = document.hidden || !document.hasFocus()
      if (shouldHide) obscure(document.hidden)
      else reveal()
    }

    const onVisibility = () => {
      if (document.hidden) obscure(true)
      else reveal()
    }

    const onPageHide = () => obscure(true)

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('blur', sync)
    window.addEventListener('focus', sync)
    sync()

    return () => {
      clearPending()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('blur', sync)
      window.removeEventListener('focus', sync)
      root.classList.remove('map-capture-guard--obscured')
    }
  }, [notifyBlocked])

  return (
    <div ref={ref} className={`map-capture-guard ${className}`.trim()}>
      {children}
      {shieldVisible && (
        <div className="map-capture-guard__shield" aria-hidden="true">
          <span className="map-capture-guard__shield-label">{m.map.screenshotProtected}</span>
        </div>
      )}
    </div>
  )
}
