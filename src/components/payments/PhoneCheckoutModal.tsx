import { useEffect, useState } from 'react'

interface PhoneCheckoutModalProps {
  open: boolean
  defaultPhone?: string
  title: string
  description: string
  confirmLabel: string
  loading?: boolean
  onCancel: () => void
  onConfirm: (msisdn: string) => void
}

export default function PhoneCheckoutModal({
  open,
  defaultPhone = '',
  title,
  description,
  confirmLabel,
  loading,
  onCancel,
  onConfirm,
}: PhoneCheckoutModalProps) {
  const [msisdn, setMsisdn] = useState(defaultPhone)

  useEffect(() => {
    if (open) setMsisdn(defaultPhone)
  }, [open, defaultPhone])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="card w-full max-w-md">
        <h2 className="text-lg font-bold mb-2">{title}</h2>
        <p className="text-sm text-slate-600 mb-4">{description}</p>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Mobile money number
        </label>
        <input
          type="tel"
          value={msisdn}
          onChange={(e) => setMsisdn(e.target.value)}
          placeholder="2557XXXXXXXX"
          className="input w-full mb-4"
          autoFocus
        />
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onCancel} className="btn-secondary text-sm">
            Cancel
          </button>
          <button
            type="button"
            disabled={!msisdn.trim() || loading}
            onClick={() => onConfirm(msisdn.trim())}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {loading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function handleCheckoutResponse(data: {
  redirect_url?: string
  callback_url?: string
  payment_provider?: string
  merchant_reference?: string
}) {
  if (data.redirect_url) {
    window.location.href = data.redirect_url
    return
  }
  if (data.payment_provider === 'selcom' && data.merchant_reference) {
    window.location.href = `/payment/callback?ref=${data.merchant_reference}`
    return
  }
  window.location.href = '/dashboard'
}
