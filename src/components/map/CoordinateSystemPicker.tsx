import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../i18n/LocaleContext'
import {
  coordinateSystemById,
  type CoordinateSystemId,
  storeCoordinateSystem,
} from './coordinateSystems'
import type { CoordinateDisplayFormat } from './coordinateFormat'
import CoordinateFormatToggle from './CoordinateFormatToggle'
import CoordinateSystemList from './CoordinateSystemList'

interface CoordinateSystemPickerProps {
  value: CoordinateSystemId
  onChange: (id: CoordinateSystemId) => void
  countryCode?: string
  countryCenter?: { lat: number; lng: number } | null
  coordinateFormat?: CoordinateDisplayFormat
  onCoordinateFormatChange?: (format: CoordinateDisplayFormat) => void
  embedded?: boolean
}

export default function CoordinateSystemPicker({
  value,
  onChange,
  countryCode = 'TZ',
  countryCenter = null,
  coordinateFormat = 'decimal',
  onCoordinateFormatChange,
  embedded = true,
}: CoordinateSystemPickerProps) {
  const { m } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = coordinateSystemById(value)

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (embedded) {
      document.addEventListener('mousedown', close)
      return () => document.removeEventListener('mousedown', close)
    }
  }, [embedded])

  const select = (id: CoordinateSystemId) => {
    onChange(id)
    storeCoordinateSystem(id, countryCode)
    setOpen(false)
  }

  return (
    <div ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-2.5 py-2 flex items-center gap-2 text-left hover:bg-app-subtle/80"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-app-border bg-app-subtle text-[9px] font-bold map-text-muted">
          CRS
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-wide leading-none map-text-muted">
            {m.map.coordinateSystemLabel}
          </span>
          <span className="block truncate text-xs font-medium map-text">{current.label}</span>
        </span>
        <span className="map-text-muted shrink-0 text-xs">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <>
          <CoordinateSystemList
            value={value}
            onSelect={select}
            countryCode={countryCode}
            countryCenter={countryCenter}
            compact
          />
          {onCoordinateFormatChange && current.kind === 'geographic' && (
            <div className="border-t app-divider px-2.5 py-2 flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide map-text-muted">
                {m.map.coordinateFormatLabel}
              </span>
              <CoordinateFormatToggle
                value={coordinateFormat}
                onChange={onCoordinateFormatChange}
                compact
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
