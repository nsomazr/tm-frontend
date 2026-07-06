import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../i18n/LocaleContext'
import {
  BASEMAPS,
  type BasemapId,
  type BasemapOption,
  saveBasemapPreference,
} from './basemaps'

interface BasemapSwitcherProps {
  value: BasemapId
  onChange: (id: BasemapId) => void
  embedded?: boolean
  current?: BasemapOption
}

export default function BasemapSwitcher({ value, onChange, embedded, current: currentProp }: BasemapSwitcherProps) {
  const { m } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = currentProp ?? BASEMAPS.find((b) => b.id === value) ?? BASEMAPS[0]

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (!embedded) {
      document.addEventListener('mousedown', close)
      return () => document.removeEventListener('mousedown', close)
    }
  }, [embedded])

  if (embedded) {
    return (
      <div ref={ref}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full px-2.5 py-2 flex items-center gap-2 text-left hover:bg-app-subtle/80"
        >
          <span
            className="w-6 h-6 rounded-md border border-app-border shrink-0"
            style={{ background: current.preview }}
          />
          <span className="flex-1 min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-wide leading-none map-text-muted">{m.map.basemapLabel}</span>
            <span className="block text-xs font-medium map-text truncate">{current.label}</span>
          </span>
          <span className="map-text-muted text-xs shrink-0">{open ? '−' : '+'}</span>
        </button>
        {open && (
          <ul className="max-h-40 overflow-y-auto border-t app-divider p-1">
            {BASEMAPS.map((bm) => (
              <li key={bm.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(bm.id)
                    saveBasemapPreference(bm.id)
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-left text-xs ${
                    bm.id === value ? 'bg-app-accent-soft text-terra-800 dark:text-terra-300 font-medium' : 'hover:bg-app-subtle map-text-secondary'
                  }`}
                >
                  <span className="w-5 h-5 rounded border border-slate-200 shrink-0" style={{ background: bm.preview }} />
                  {bm.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div ref={ref} className="absolute top-14 right-3 z-10">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 map-chrome rounded-xl px-3 py-2 text-sm font-medium map-text hover:border-terra-400 transition-colors"
      >
        <span className="w-6 h-6 rounded-md border border-app-border shrink-0" style={{ background: current.preview }} />
        <span className="hidden sm:inline">{current.label}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 map-chrome rounded-xl overflow-hidden">
          <ul className="p-1.5">
            {BASEMAPS.map((bm) => (
              <li key={bm.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(bm.id)
                    saveBasemapPreference(bm.id)
                    setOpen(false)
                  }}
                  className={`w-full px-2.5 py-2 rounded-lg text-left text-sm map-text-secondary ${
                    bm.id === value ? 'bg-app-accent-soft font-medium' : 'hover:bg-app-subtle'
                  }`}
                >
                  {bm.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export { useBasemapState } from './useBasemapState'
