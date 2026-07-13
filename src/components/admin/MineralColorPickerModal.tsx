import { useEffect } from 'react'
import MineralColorReference from './MineralColorReference'
import { colorInputValue } from './layerColors'
import { normalizeHex } from '../../lib/mineralColorUtils'

interface MineralColorPickerModalProps {
  open: boolean
  onClose: () => void
  onSelect: (hex: string) => void
  selectedColor?: string
  layerName?: string
  usedColors?: string[]
  title?: string
}

export default function MineralColorPickerModal({
  open,
  onClose,
  onSelect,
  selectedColor,
  layerName = '',
  usedColors = [],
  title = 'Mineral colors',
}: MineralColorPickerModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const selected = normalizeHex(selectedColor || '#0D9488')

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close color picker"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mineral-color-picker-title"
        className="relative z-10 flex max-h-[min(88vh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-app-border bg-app-surface shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b app-divider px-5 py-4">
          <div className="min-w-0">
            <h2 id="mineral-color-picker-title" className="text-lg font-bold text-app-text">
              {title}
            </h2>
            <p className="mt-0.5 text-sm text-app-text-muted">
              Standard geological map colors. Pick one for this layer.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="h-8 w-8 rounded-lg border border-app-border"
              style={{ backgroundColor: selected }}
              title={selected}
              aria-hidden
            />
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-sm text-app-text-muted hover:bg-app-subtle hover:text-app-text"
            >
              Close
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <MineralColorReference
            variant="inline"
            layerName={layerName}
            usedColors={usedColors}
            selectedColor={selected}
            onSelect={(hex) => {
              onSelect(hex)
              onClose()
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-3 border-t app-divider px-5 py-3">
          <label className="inline-flex items-center gap-2 text-sm text-app-text-secondary">
            <span>Custom</span>
            <input
              type="color"
              value={colorInputValue(selected)}
              onChange={(e) => onSelect(e.target.value)}
              className="h-8 w-10 cursor-pointer rounded-md border border-app-border bg-transparent p-0.5"
              aria-label="Custom color"
            />
            <span className="font-mono text-xs text-app-text-muted">{colorInputValue(selected)}</span>
          </label>
          <button type="button" onClick={onClose} className="btn-primary text-sm">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
