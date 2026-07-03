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
          className="w-full px-3 py-2.5 flex items-center gap-2 text-left hover:bg-slate-50/80"
        >
          <span
            className="w-8 h-8 rounded-lg border border-slate-200 shrink-0"
            style={{ background: current.preview }}
          />
          <span className="flex-1 min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">{m.map.basemapLabel}</span>
            <span className="block text-sm font-medium text-slate-900">{current.label}</span>
          </span>
          <span className="text-slate-400 text-sm shrink-0">{open ? '−' : '+'}</span>
        </button>
        {open && (
          <ul className="p-1.5 max-h-44 overflow-y-auto border-t border-slate-100">
            {BASEMAPS.map((bm) => (
              <li key={bm.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(bm.id)
                    saveBasemapPreference(bm.id)
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm ${
                    bm.id === value ? 'bg-terra-50 text-terra-800 font-medium' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="w-6 h-6 rounded border border-slate-200 shrink-0" style={{ background: bm.preview }} />
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
        className="flex items-center gap-2 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-sm font-medium text-slate-800 hover:border-terra-300 transition-colors"
      >
        <span className="w-6 h-6 rounded-md border border-slate-200 shrink-0" style={{ background: current.preview }} />
        <span className="hidden sm:inline">{current.label}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
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
                  className={`w-full px-2.5 py-2 rounded-lg text-left text-sm ${
                    bm.id === value ? 'bg-terra-50 font-medium' : 'hover:bg-slate-50'
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
