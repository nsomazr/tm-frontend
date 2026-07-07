import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export function normalizeLinkUrl(url: string) {
  const trimmed = url.trim()
  if (!trimmed || trimmed === 'https://' || trimmed === 'http://') return ''
  if (/^(https?:|mailto:|tel:|#)/i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

interface ReportLinkDialogProps {
  open: boolean
  url: string
  selectionLabel: string
  canRemove: boolean
  onClose: () => void
  onApply: (url: string) => void
  onRemove: () => void
}

export default function ReportLinkDialog({
  open,
  url: initialUrl,
  selectionLabel,
  canRemove,
  onClose,
  onApply,
  onRemove,
}: ReportLinkDialogProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState(initialUrl)

  useEffect(() => {
    if (!open) return
    setUrl(initialUrl)
    const timer = window.setTimeout(() => {
      const input = inputRef.current
      if (!input) return
      input.focus()
      input.select()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [open, initialUrl])

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const normalized = normalizeLinkUrl(url)
  const canApply = Boolean(normalized) && Boolean(selectionLabel || canRemove)

  return createPortal(
    <div className="report-link-dialog" role="dialog" aria-modal="true" aria-labelledby="report-link-dialog-title">
      <div className="report-link-dialog__backdrop" onClick={onClose} aria-hidden />
      <div className="report-link-dialog__panel">
        <header className="report-link-dialog__header">
          <div>
            <h2 id="report-link-dialog-title" className="report-link-dialog__title">
              {canRemove ? 'Edit link' : 'Insert link'}
            </h2>
            <p className="report-link-dialog__hint">
              {selectionLabel
                ? <>Link text: <strong>{selectionLabel}</strong></>
                : 'Select text in the report, then add a link.'}
            </p>
          </div>
          <button type="button" className="btn-secondary text-sm" onClick={onClose}>
            Cancel
          </button>
        </header>

        <div className="report-link-dialog__body">
          <label className="report-link-dialog__field" htmlFor={inputId}>
            <span className="report-link-dialog__label">URL</span>
            <input
              ref={inputRef}
              id={inputId}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canApply) {
                  e.preventDefault()
                  onApply(url)
                }
              }}
              placeholder="https://example.com"
              className="input report-link-dialog__input"
              autoComplete="off"
            />
          </label>
        </div>

        <footer className="report-link-dialog__footer">
          {canRemove && (
            <button type="button" className="btn-secondary text-sm report-link-dialog__remove" onClick={onRemove}>
              Remove link
            </button>
          )}
          <button
            type="button"
            className="btn-primary text-sm"
            onClick={() => onApply(url)}
            disabled={!canApply}
          >
            {canRemove ? 'Update link' : 'Insert link'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
