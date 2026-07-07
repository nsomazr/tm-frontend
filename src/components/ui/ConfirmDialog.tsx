import { useEffect, useId, useState } from 'react'
import { closeConfirm, subscribeConfirm, type ConfirmRequest } from './confirmStore'

export default function ConfirmDialog() {
  const titleId = useId()
  const descId = useId()
  const [request, setRequest] = useState<ConfirmRequest | null>(null)

  useEffect(() => subscribeConfirm(setRequest), [])

  useEffect(() => {
    if (!request) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') handleCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [request])

  if (!request) return null

  function handleCancel() {
    request?.onCancel?.()
    closeConfirm()
  }

  function handleConfirm() {
    request?.onConfirm()
    closeConfirm()
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]"
        aria-label="Close dialog"
        onClick={handleCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={request.description ? descId : undefined}
        className="relative w-full max-w-sm rounded-xl border border-app-border bg-app-surface shadow-xl p-4"
      >
        <h2 id={titleId} className="text-base font-semibold text-app-text leading-snug">
          {request.title}
        </h2>
        {request.description && (
          <p id={descId} className="text-sm text-app-text-secondary mt-1.5 leading-relaxed line-clamp-4">
            {request.description}
          </p>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" className="btn-secondary text-sm px-3 py-1.5" onClick={handleCancel}>
            {request.cancelLabel}
          </button>
          <button
            type="button"
            className={`text-sm px-3 py-1.5 rounded-lg font-medium text-white border-0 ${
              request.destructive
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-terra-600 hover:bg-terra-700'
            }`}
            onClick={handleConfirm}
          >
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
