import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../i18n/LocaleContext'
import {
  COORDINATE_SYSTEMS,
  coordinateSystemById,
  type CoordinateSystemId,
  storeCoordinateSystem,
} from './coordinateSystems'

interface CoordinateSystemPickerProps {
  value: CoordinateSystemId
  onChange: (id: CoordinateSystemId) => void
  embedded?: boolean
}

export default function CoordinateSystemPicker({
  value,
  onChange,
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
    storeCoordinateSystem(id)
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
        <ul className="max-h-44 overflow-y-auto border-t app-divider p-1">
          {COORDINATE_SYSTEMS.map((crs) => (
            <li key={crs.id}>
              <button
                type="button"
                onClick={() => select(crs.id)}
                className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs ${
                  crs.id === value
                    ? 'bg-app-accent-soft text-terra-800 dark:text-terra-300 font-medium'
                    : 'hover:bg-app-subtle map-text-secondary'
                }`}
              >
                <span className="w-4 shrink-0 text-center text-xs">
                  {crs.id === value ? '✓' : ''}
                </span>
                <span className="min-w-0">{crs.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
