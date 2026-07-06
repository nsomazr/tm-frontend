import { useEffect, useId, useRef, useState } from 'react'

interface InputDialogProps {
  open: boolean
  title: string
  description?: string
  label?: string
  defaultValue?: string
  placeholder?: string
  confirmLabel?: string
  onConfirm: (value: string) => void
  onCancel: () => void
}

export default function InputDialog({
  open,
  title,
  description,
  label = 'Name',
  defaultValue = '',
  placeholder = '',
  confirmLabel = 'Save',
  onConfirm,
  onCancel,
}: InputDialogProps) {
  const titleId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(defaultValue)

  useEffect(() => {
    if (open) {
      setValue(defaultValue)
      const timer = window.setTimeout(() => inputRef.current?.focus(), 0)
      return () => window.clearTimeout(timer)
    }
  }, [open, defaultValue])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        aria-label="Close dialog"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-xl border border-app-border bg-app-surface shadow-xl p-5 space-y-4"
      >
        <div>
          <h2 id={titleId} className="text-lg font-semibold text-app-text">
            {title}
          </h2>
          {description && <p className="text-sm text-app-text-secondary mt-1">{description}</p>}
        </div>
        <label className="block">
          <span className="text-sm font-medium text-app-text-secondary">{label}</span>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="input mt-1.5 w-full"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && value.trim()) onConfirm(value.trim())
              if (e.key === 'Escape') onCancel()
            }}
          />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary text-sm" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary text-sm"
            disabled={!value.trim()}
            onClick={() => onConfirm(value.trim())}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
