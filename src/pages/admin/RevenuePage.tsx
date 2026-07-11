import { useMemo, useState, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentsApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import ActionMenu, { ActionMenuItem } from '../../components/ui/ActionMenu'
import ListPagination from '../../components/ui/ListPagination'
import { toast } from '../../components/ui/toast'
import { usePagination } from '../../hooks/usePagination'
import type { PaymentOrder } from '../../types'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'download', label: 'Download' },
  { value: 'license', label: 'License' },
  { value: 'aerial', label: 'Aerial extension' },
]

const PROVIDER_OPTIONS = [
  { value: '', label: 'All providers' },
  { value: 'snippe', label: 'Snippe' },
  { value: 'simulated', label: 'Simulated' },
]

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: 'status-badge-completed',
    pending: 'status-badge-pending',
    failed: 'status-badge-failed',
    cancelled: 'status-badge-cancelled',
  }
  return <span className={map[status] || 'status-badge-cancelled'}>{status}</span>
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateOnly(iso: string | null | undefined) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function displayValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return 'Not provided'
  return String(value)
}

function capitalizeLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function paymentMethodLabel(method?: string | null) {
  if (!method) return 'Not provided'
  if (method === 'mobile_money') return 'Mobile money'
  if (method === 'simulated') return 'Simulated (dev)'
  return capitalizeLabel(method)
}

function activationLabel(source?: PaymentOrder['activation_source']) {
  if (!source) return null
  if (source === 'manual_admin') return 'Marked complete by admin'
  if (source === 'webhook') return 'Snippe webhook'
  return 'Payment gateway'
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function promptEmail(defaultEmail?: string | null) {
  const value = window.prompt('Send to email address', defaultEmail || '')
  if (value == null) return null
  return value.trim()
}

function documentStatusLabel(doc: PaymentOrder['invoice'] | PaymentOrder['receipt']) {
  if (!doc) return 'Not generated'
  if (doc.email_sent_at) {
    return `Emailed ${doc.email_send_count}× · ${formatWhen(doc.email_sent_at)}`
  }
  return doc.has_pdf ? 'PDF ready' : 'Generated'
}

function hasGatewayPayload(response?: Record<string, unknown>) {
  return !!response && Object.keys(response).length > 0
}

function gatewayEventRows(response: Record<string, unknown>) {
  const rows: { label: string; value: string }[] = []
  if (response.error) rows.push({ label: 'Gateway error', value: String(response.error) })
  if (response.order_status_error) {
    rows.push({ label: 'Status poll error', value: String(response.order_status_error) })
  }
  if (response.failure) {
    rows.push({ label: 'Failure payload', value: JSON.stringify(response.failure) })
  }
  if (response.activation) {
    rows.push({ label: 'Activation', value: JSON.stringify(response.activation) })
  }
  if (response.webhook) {
    rows.push({ label: 'Webhook event', value: JSON.stringify(response.webhook) })
  }
  if (response.create_payment) {
    rows.push({ label: 'Create payment', value: 'Recorded (see raw payload below)' })
  }
  if (response.order_status) {
    rows.push({ label: 'Latest status poll', value: 'Recorded (see raw payload below)' })
  }
  return rows
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide map-text-muted">{label}</dt>
      <dd className="map-text mt-0.5">{children}</dd>
    </div>
  )
}

function OrderDetailModal({
  order,
  onClose,
  isSuperAdmin,
  refreshPending,
  completePending,
  docBusy,
  onRefresh,
  onComplete,
  onGenerateInvoice,
  onDownloadInvoice,
  onEmailInvoice,
  onGenerateReceipt,
  onDownloadReceipt,
  onEmailReceipt,
}: {
  order: PaymentOrder
  onClose: () => void
  isSuperAdmin: boolean
  refreshPending: boolean
  completePending: boolean
  docBusy: boolean
  onRefresh: () => void
  onComplete: () => void
  onGenerateInvoice: () => void
  onDownloadInvoice: () => void
  onEmailInvoice: () => void
  onGenerateReceipt: () => void
  onDownloadReceipt: () => void
  onEmailReceipt: () => void
}) {
  const [showRawGateway, setShowRawGateway] = useState(false)
  const gatewayRows = order.gateway_response ? gatewayEventRows(order.gateway_response) : []
  const showRaw = hasGatewayPayload(order.gateway_response)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="card w-full max-w-2xl max-h-[85vh] overflow-y-auto !p-0">
        <div className="flex items-start justify-between gap-4 p-5 border-b app-divider">
          <div className="min-w-0">
            <h2 className="text-lg font-bold map-text">Order detail</h2>
            <p className="font-mono text-xs map-text-muted break-all mt-0.5">{order.merchant_reference}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="map-text-muted hover:text-app-secondary text-xl leading-none p-1 rounded-lg hover:bg-app-subtle"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-5">
          <section className="rounded-xl bg-app-subtle border border-app-border px-4 py-3">
            <p className="text-sm font-medium map-text">{order.description || capitalizeLabel(order.order_type)}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <span className="font-semibold tabular-nums map-text">
                {Number(order.amount).toLocaleString()} {order.currency}
              </span>
              <StatusBadge status={order.status} />
              <span className="map-text-muted capitalize">{order.order_type}</span>
            </div>
          </section>

          {order.subscription_detail && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide map-text-muted mb-3">Subscription</h3>
              <dl className="grid sm:grid-cols-2 gap-4 text-sm">
                <DetailField label="Plan">{order.subscription_detail.plan_name}</DetailField>
                <DetailField label="Billing">{capitalizeLabel(order.subscription_detail.billing_cycle)}</DetailField>
                <DetailField label="Subscription status">
                  <span className="capitalize">{order.subscription_detail.status.replace(/_/g, ' ')}</span>
                </DetailField>
                <DetailField label="Access period">
                  {order.subscription_detail.start_date && order.subscription_detail.end_date
                    ? `${formatDateOnly(order.subscription_detail.start_date)} – ${formatDateOnly(order.subscription_detail.end_date)}`
                    : order.status === 'completed'
                      ? 'Active after payment'
                      : 'Starts when payment completes'}
                </DetailField>
              </dl>
            </section>
          )}

          {order.report_detail && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide map-text-muted mb-3">Report</h3>
              <dl className="grid sm:grid-cols-2 gap-4 text-sm">
                <DetailField label="Title">{order.report_detail.title}</DetailField>
                <DetailField label="Slug">
                  <span className="font-mono text-xs">{order.report_detail.slug}</span>
                </DetailField>
              </dl>
            </section>
          )}

          {order.license_detail && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide map-text-muted mb-3">License</h3>
              <dl className="grid sm:grid-cols-2 gap-4 text-sm">
                <DetailField label="Company">{order.license_detail.company_name}</DetailField>
                <DetailField label="Contact">{order.license_detail.contact_name}</DetailField>
                <DetailField label="License status">
                  <span className="capitalize">{order.license_detail.status}</span>
                </DetailField>
              </dl>
            </section>
          )}

          {order.aerial_detail && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide map-text-muted mb-3">Aerial extension</h3>
              <dl className="grid sm:grid-cols-2 gap-4 text-sm">
                <DetailField label="Location">
                  {order.aerial_detail.lat.toFixed(5)}, {order.aerial_detail.lng.toFixed(5)}
                </DetailField>
                <DetailField label="Extra coverage">
                  {order.aerial_detail.purchased_extra_km2 != null
                    ? `+${order.aerial_detail.purchased_extra_km2} km²`
                    : 'Not provided'}
                </DetailField>
                {order.aerial_detail.max_area_km2 != null && (
                  <DetailField label="Max analysis area">{order.aerial_detail.max_area_km2} km²</DetailField>
                )}
              </dl>
            </section>
          )}

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide map-text-muted mb-3">Customer & payment</h3>
            <dl className="grid sm:grid-cols-2 gap-4 text-sm">
              <DetailField label="User">{order.user_email || order.user_username || 'Not provided'}</DetailField>
              <DetailField label="Phone">{displayValue(order.msisdn)}</DetailField>
              <DetailField label="Provider">
                <span className="capitalize">{order.payment_provider}</span>
              </DetailField>
              <DetailField label="Payment method">{paymentMethodLabel(order.payment_method)}</DetailField>
              <DetailField label="Account reference">
                <span className="font-mono text-xs break-all">{displayValue(order.account_number || order.merchant_reference)}</span>
              </DetailField>
              <DetailField label="Gateway tracking ID">
                <span className="font-mono text-xs break-all">{displayValue(order.order_tracking_id)}</span>
              </DetailField>
            </dl>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide map-text-muted mb-3">Timeline</h3>
            <dl className="grid sm:grid-cols-2 gap-4 text-sm">
              <DetailField label="Created">{formatWhen(order.created_at)}</DetailField>
              <DetailField label="Last updated">
                {order.updated_at ? formatWhen(order.updated_at) : 'Not provided'}
              </DetailField>
              {activationLabel(order.activation_source) && (
                <DetailField label="Completed via">{activationLabel(order.activation_source)}</DetailField>
              )}
              {order.invoice_number || order.invoice ? (
                <DetailField label="Invoice">
                  <span className="font-mono text-xs">{order.invoice?.number || order.invoice_number}</span>
                  <span className="block text-xs map-text-muted mt-0.5">
                    {documentStatusLabel(order.invoice)}
                  </span>
                </DetailField>
              ) : order.status === 'completed' ? (
                <DetailField label="Invoice">
                  <span className="text-xs map-text-muted">Not generated yet</span>
                </DetailField>
              ) : null}
              {order.receipt || order.receipt_number ? (
                <DetailField label="Receipt">
                  <span className="font-mono text-xs">{order.receipt?.number || order.receipt_number}</span>
                  <span className="block text-xs map-text-muted mt-0.5">
                    {documentStatusLabel(order.receipt)}
                  </span>
                </DetailField>
              ) : order.status === 'completed' ? (
                <DetailField label="Receipt">
                  <span className="text-xs map-text-muted">Not generated yet</span>
                </DetailField>
              ) : null}
            </dl>
          </section>

          {(order.document_emails?.length ?? 0) > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide map-text-muted mb-3">
                Email delivery log
              </h3>
              <ul className="space-y-2 text-sm">
                {order.document_emails!.map((log) => (
                  <li
                    key={log.id}
                    className="rounded-lg border border-app-border bg-app-subtle px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="capitalize font-medium map-text">{log.document_type}</span>
                      <span
                        className={
                          log.status === 'sent'
                            ? 'status-badge-completed'
                            : 'status-badge-failed'
                        }
                      >
                        {log.status}
                      </span>
                      <span className="text-xs map-text-muted">{formatWhen(log.created_at)}</span>
                    </div>
                    <p className="text-xs map-text mt-1">
                      To {log.sent_to}
                      {log.document_number ? ` · ${log.document_number}` : ''}
                      {log.sent_by_email ? ` · by ${log.sent_by_email}` : ''}
                    </p>
                    {log.error && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 break-all">{log.error}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {gatewayRows.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide map-text-muted mb-3">Gateway events</h3>
              <ul className="space-y-2 text-sm">
                {gatewayRows.map((row) => (
                  <li key={row.label} className="rounded-lg border border-app-border bg-app-subtle px-3 py-2">
                    <p className="text-xs font-medium uppercase tracking-wide map-text-muted">{row.label}</p>
                    <p className="map-text mt-0.5 text-xs break-all">{row.value}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {showRaw && (
            <section>
              <button
                type="button"
                onClick={() => setShowRawGateway((open) => !open)}
                className="text-xs font-medium text-terra-600 dark:text-terra-400 hover:underline"
              >
                {showRawGateway ? 'Hide raw gateway payload' : 'Show raw gateway payload'}
              </button>
              {showRawGateway && (
                <pre className="mt-2 text-xs map-text-secondary bg-app-subtle border border-app-border rounded-xl p-3 overflow-x-auto">
                  {JSON.stringify(order.gateway_response, null, 2)}
                </pre>
              )}
            </section>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={onGenerateInvoice}
              disabled={docBusy}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              {order.invoice ? 'Regenerate invoice' : 'Generate invoice'}
            </button>
            {order.invoice?.has_pdf && (
              <button
                type="button"
                onClick={onDownloadInvoice}
                disabled={docBusy}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                Download invoice
              </button>
            )}
            <button
              type="button"
              onClick={onEmailInvoice}
              disabled={docBusy}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              Email invoice
            </button>
            {order.status === 'completed' && (
              <>
                <button
                  type="button"
                  onClick={onGenerateReceipt}
                  disabled={docBusy}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  {order.receipt ? 'Regenerate receipt' : 'Generate receipt'}
                </button>
                {order.receipt?.has_pdf && (
                  <button
                    type="button"
                    onClick={onDownloadReceipt}
                    disabled={docBusy}
                    className="btn-secondary text-sm disabled:opacity-50"
                  >
                    Download receipt
                  </button>
                )}
                <button
                  type="button"
                  onClick={onEmailReceipt}
                  disabled={docBusy}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  Email receipt
                </button>
              </>
            )}
            {order.status === 'pending' && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshPending}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                {refreshPending ? 'Refreshing…' : 'Refresh from gateway'}
              </button>
            )}
            {isSuperAdmin && order.status !== 'completed' && (
              <button
                type="button"
                onClick={onComplete}
                disabled={completePending}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {completePending ? 'Completing…' : 'Mark completed'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RevenuePage() {
  const { isSuperAdmin } = useAuth()
  const qc = useQueryClient()
  const [status, setStatus] = useState('')
  const [orderType, setOrderType] = useState('')
  const [provider, setProvider] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<PaymentOrder | null>(null)

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['revenue'],
    queryFn: () => paymentsApi.revenue().then((r) => r.data),
  })

  const orderParams = useMemo(() => {
    const params: Record<string, string> = {}
    if (status) params.status = status
    if (orderType) params.order_type = orderType
    if (provider) params.payment_provider = provider
    if (search.trim()) params.search = search.trim()
    return params
  }, [status, orderType, provider, search])

  const { data: ordersPage, isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-orders', orderParams],
    queryFn: () => paymentsApi.adminOrders(orderParams).then((r) => r.data),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-orders'] })
    qc.invalidateQueries({ queryKey: ['revenue'] })
  }

  const refreshOrder = useMutation({
    mutationFn: (reference: string) => paymentsApi.refreshOrder(reference),
    onSuccess: ({ data }) => {
      setSelected((prev) => (prev?.merchant_reference === data.merchant_reference ? data : prev))
      toast.success('Order refreshed from gateway')
      invalidate()
    },
    onError: () => toast.error('Could not refresh order from gateway'),
  })

  const completeOrder = useMutation({
    mutationFn: (reference: string) => paymentsApi.completeOrder(reference),
    onSuccess: ({ data }) => {
      setSelected((prev) => (prev?.merchant_reference === data.merchant_reference ? data : prev))
      toast.success('Order marked as completed')
      invalidate()
    },
    onError: () => toast.error('Could not mark order as completed'),
  })

  const applyOrderUpdate = (data: PaymentOrder) => {
    setSelected((prev) => (prev?.merchant_reference === data.merchant_reference ? data : prev))
    invalidate()
  }

  const generateInvoice = useMutation({
    mutationFn: ({ reference, regenerate }: { reference: string; regenerate?: boolean }) =>
      paymentsApi.generateInvoice(reference, regenerate),
    onSuccess: ({ data }) => {
      applyOrderUpdate(data)
      toast.success('Invoice generated')
    },
    onError: (err: Error) => toast.error('Could not generate invoice', { description: err.message }),
  })

  const downloadInvoice = useMutation({
    mutationFn: async (order: PaymentOrder) => {
      const { data } = await paymentsApi.downloadInvoice(order.merchant_reference)
      const name = `${order.invoice?.number || order.invoice_number || order.merchant_reference}-invoice.pdf`
      downloadBlob(data as Blob, name)
    },
    onSuccess: () => toast.success('Invoice download started'),
    onError: () => toast.error('Could not download invoice'),
  })

  const emailInvoice = useMutation({
    mutationFn: ({ reference, email }: { reference: string; email?: string }) =>
      paymentsApi.emailInvoice(reference, email),
    onSuccess: ({ data }) => {
      applyOrderUpdate(data)
      toast.success('Invoice emailed', {
        description: data.invoice?.email_sent_to || data.user_email || undefined,
      })
    },
    onError: (err: Error) => toast.error('Could not email invoice', { description: err.message }),
  })

  const generateReceipt = useMutation({
    mutationFn: ({ reference, regenerate }: { reference: string; regenerate?: boolean }) =>
      paymentsApi.generateReceipt(reference, regenerate),
    onSuccess: ({ data }) => {
      applyOrderUpdate(data)
      toast.success('Receipt generated')
    },
    onError: (err: Error) => toast.error('Could not generate receipt', { description: err.message }),
  })

  const downloadReceipt = useMutation({
    mutationFn: async (order: PaymentOrder) => {
      const { data } = await paymentsApi.downloadReceipt(order.merchant_reference)
      const name = `${order.receipt?.number || order.receipt_number || order.merchant_reference}-receipt.pdf`
      downloadBlob(data as Blob, name)
    },
    onSuccess: () => toast.success('Receipt download started'),
    onError: () => toast.error('Could not download receipt'),
  })

  const emailReceipt = useMutation({
    mutationFn: ({ reference, email }: { reference: string; email?: string }) =>
      paymentsApi.emailReceipt(reference, email),
    onSuccess: ({ data }) => {
      applyOrderUpdate(data)
      toast.success('Receipt emailed', {
        description: data.receipt?.email_sent_to || data.user_email || undefined,
      })
    },
    onError: (err: Error) => toast.error('Could not email receipt', { description: err.message }),
  })

  const openDetail = async (order: PaymentOrder) => {
    try {
      const { data } = await paymentsApi.adminOrder(order.merchant_reference)
      setSelected(data)
    } catch {
      setSelected(order)
    }
  }

  const handleEmailInvoice = (order: PaymentOrder) => {
    const email = promptEmail(order.user_email)
    if (email === null) return
    if (!email && !order.user_email) {
      toast.error('Customer has no email on file')
      return
    }
    emailInvoice.mutate({
      reference: order.merchant_reference,
      email: email || undefined,
    })
  }

  const handleEmailReceipt = (order: PaymentOrder) => {
    if (order.status !== 'completed') {
      toast.error('Receipts are only for completed orders')
      return
    }
    const email = promptEmail(order.user_email)
    if (email === null) return
    if (!email && !order.user_email) {
      toast.error('Customer has no email on file')
      return
    }
    emailReceipt.mutate({
      reference: order.merchant_reference,
      email: email || undefined,
    })
  }

  const orders = ordersPage?.results || []
  const ordersPagination = usePagination(orders)
  const docBusy =
    generateInvoice.isPending ||
    downloadInvoice.isPending ||
    emailInvoice.isPending ||
    generateReceipt.isPending ||
    downloadReceipt.isPending ||
    emailReceipt.isPending
  const actionPending = refreshOrder.isPending || completeOrder.isPending || docBusy

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold map-text">Payments & Revenue</h1>
        <p className="text-sm map-text-muted mt-1">Track Snippe and simulated orders across the platform.</p>
      </div>

      {summaryLoading ? (
        <p className="text-sm map-text-muted">Loading summary…</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="card !p-5">
            <p className="text-xs font-medium uppercase tracking-wide map-text-muted">Total revenue</p>
            <p className="text-2xl font-bold text-terra-600 dark:text-terra-400 mt-1">
              {Number(summary?.total_revenue || 0).toLocaleString()} TZS
            </p>
          </div>
          <div className="card !p-5">
            <p className="text-xs font-medium uppercase tracking-wide map-text-muted">Pending</p>
            <p className="text-2xl font-bold map-text mt-1">{summary?.pending_count ?? 0}</p>
          </div>
          <div className="card !p-5">
            <p className="text-xs font-medium uppercase tracking-wide map-text-muted">Failed</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{summary?.failed_count ?? 0}</p>
          </div>
          <div className="card !p-5">
            <p className="text-xs font-medium uppercase tracking-wide map-text-muted">By provider</p>
            <div className="mt-2 space-y-1.5 text-sm">
              {(summary?.by_provider || []).length === 0 ? (
                <p className="map-text-muted">No data</p>
              ) : (
                (summary?.by_provider || []).map((item) => (
                  <div key={item.payment_provider} className="flex justify-between gap-3 capitalize">
                    <span className="map-text-secondary">{item.payment_provider}</span>
                    <span className="map-text font-medium tabular-nums">{item.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="card !p-0 overflow-hidden">
        <div className="p-4 sm:p-5 border-b app-divider space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
              <label className="block">
                <span className="sr-only">Status</span>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="input text-sm py-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value || 'all-status'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="sr-only">Type</span>
                <select value={orderType} onChange={(e) => setOrderType(e.target.value)} className="input text-sm py-2">
                  {TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value || 'all-type'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="sr-only">Provider</span>
                <select value={provider} onChange={(e) => setProvider(e.target.value)} className="input text-sm py-2">
                  {PROVIDER_OPTIONS.map((opt) => (
                    <option key={opt.value || 'all-provider'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="lg:w-72 shrink-0">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ref, email, phone…"
                className="input text-sm py-2 w-full"
              />
            </div>
          </div>
        </div>

        {ordersLoading ? (
          <p className="p-6 text-sm map-text-muted">Loading orders…</p>
        ) : orders.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm map-text-muted">No orders match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>User</th>
                  <th>Type</th>
                  <th>Provider</th>
                  <th className="text-right">Amount</th>
                  <th>Status</th>
                  <th>When</th>
                  <th className="text-right w-[1%] whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ordersPagination.pageItems.map((order) => (
                  <tr key={order.merchant_reference}>
                    <td>
                      <span className="font-mono text-xs map-text" title={order.merchant_reference}>
                        {order.merchant_reference.slice(0, 12)}…
                      </span>
                    </td>
                    <td>
                      <span className="block map-text truncate max-w-[12rem]" title={order.user_email || order.user_username}>
                        {order.user_email || order.user_username || '-'}
                      </span>
                    </td>
                    <td className="capitalize">{order.order_type}</td>
                    <td className="capitalize">{order.payment_provider}</td>
                    <td className="text-right tabular-nums map-text font-medium whitespace-nowrap">
                      {Number(order.amount).toLocaleString()} {order.currency}
                    </td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="text-xs map-text-muted whitespace-nowrap">{formatWhen(order.created_at)}</td>
                    <td className="text-right">
                      <div className="inline-flex justify-end">
                        <ActionMenu label={`Actions for ${order.merchant_reference}`} minWidth="12rem">
                          <ActionMenuItem onClick={() => openDetail(order)}>View details</ActionMenuItem>
                          <ActionMenuItem
                            disabled={docBusy}
                            onClick={() =>
                              generateInvoice.mutate({
                                reference: order.merchant_reference,
                                regenerate: Boolean(order.invoice),
                              })
                            }
                          >
                            {order.invoice ? 'Regenerate invoice' : 'Generate invoice'}
                          </ActionMenuItem>
                          <ActionMenuItem
                            disabled={docBusy || !order.invoice?.has_pdf}
                            onClick={() => downloadInvoice.mutate(order)}
                          >
                            Download invoice
                          </ActionMenuItem>
                          <ActionMenuItem
                            disabled={docBusy}
                            onClick={() => handleEmailInvoice(order)}
                          >
                            Email invoice
                          </ActionMenuItem>
                          {order.status === 'completed' && (
                            <>
                              <ActionMenuItem
                                disabled={docBusy}
                                onClick={() =>
                                  generateReceipt.mutate({
                                    reference: order.merchant_reference,
                                    regenerate: Boolean(order.receipt),
                                  })
                                }
                              >
                                {order.receipt ? 'Regenerate receipt' : 'Generate receipt'}
                              </ActionMenuItem>
                              <ActionMenuItem
                                disabled={docBusy || !order.receipt?.has_pdf}
                                onClick={() => downloadReceipt.mutate(order)}
                              >
                                Download receipt
                              </ActionMenuItem>
                              <ActionMenuItem
                                disabled={docBusy}
                                onClick={() => handleEmailReceipt(order)}
                              >
                                Email receipt
                              </ActionMenuItem>
                            </>
                          )}
                          {order.status === 'pending' && (
                            <ActionMenuItem
                              disabled={actionPending}
                              onClick={() => refreshOrder.mutate(order.merchant_reference)}
                            >
                              Refresh status
                            </ActionMenuItem>
                          )}
                          {isSuperAdmin && order.status !== 'completed' && (
                            <ActionMenuItem
                              disabled={actionPending}
                              onClick={() => completeOrder.mutate(order.merchant_reference)}
                            >
                              Mark completed
                            </ActionMenuItem>
                          )}
                        </ActionMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ListPagination
              page={ordersPagination.page}
              pageCount={ordersPagination.pageCount}
              total={ordersPagination.total}
              pageSize={ordersPagination.pageSize}
              onPageChange={ordersPagination.setPage}
              className="px-4 pb-4"
            />
          </div>
        )}
      </div>

      {selected && (
        <OrderDetailModal
          order={selected}
          onClose={() => setSelected(null)}
          isSuperAdmin={isSuperAdmin}
          refreshPending={refreshOrder.isPending}
          completePending={completeOrder.isPending}
          docBusy={docBusy}
          onRefresh={() => refreshOrder.mutate(selected.merchant_reference)}
          onComplete={() => completeOrder.mutate(selected.merchant_reference)}
          onGenerateInvoice={() =>
            generateInvoice.mutate({
              reference: selected.merchant_reference,
              regenerate: Boolean(selected.invoice),
            })
          }
          onDownloadInvoice={() => downloadInvoice.mutate(selected)}
          onEmailInvoice={() => handleEmailInvoice(selected)}
          onGenerateReceipt={() =>
            generateReceipt.mutate({
              reference: selected.merchant_reference,
              regenerate: Boolean(selected.receipt),
            })
          }
          onDownloadReceipt={() => downloadReceipt.mutate(selected)}
          onEmailReceipt={() => handleEmailReceipt(selected)}
        />
      )}
    </div>
  )
}
