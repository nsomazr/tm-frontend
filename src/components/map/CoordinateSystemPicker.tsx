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
        className="w-full px-3 py-2.5 flex items-center gap-2 text-left hover:bg-app-subtle/80"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-app-border bg-app-subtle text-[10px] font-bold map-text-muted">
          CRS
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-wider map-text-muted">
            {m.map.coordinateSystemLabel}
          </span>
          <span className="block text-sm font-medium map-text truncate">{current.label}</span>
        </span>
        <span className="map-text-muted text-sm shrink-0">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <ul className="p-1.5 max-h-52 overflow-y-auto border-t app-divider">
          {COORDINATE_SYSTEMS.map((crs) => (
            <li key={crs.id}>
              <button
                type="button"
                onClick={() => select(crs.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm ${
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
