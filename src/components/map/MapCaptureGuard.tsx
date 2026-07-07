import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from '../../i18n/LocaleContext'
import { toast } from '../ui/toast'
import { useMapCaptureGuard } from './useMapCaptureGuard'

type MapCaptureGuardProps = {
  children: ReactNode
  className?: string
}

export default function MapCaptureGuard({ children, className = '' }: MapCaptureGuardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { m } = useTranslation()
  const [shieldVisible, setShieldVisible] = useState(false)

  useMapCaptureGuard(ref, () => {
    toast.error(m.map.screenshotBlocked)
  })

  useEffect(() => {
    const updateShield = () => {
      setShieldVisible(document.hidden || !document.hasFocus())
    }

    document.addEventListener('visibilitychange', updateShield)
    window.addEventListener('blur', updateShield)
    window.addEventListener('focus', updateShield)

    return () => {
      document.removeEventListener('visibilitychange', updateShield)
      window.removeEventListener('blur', updateShield)
      window.removeEventListener('focus', updateShield)
    }
  }, [])

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
