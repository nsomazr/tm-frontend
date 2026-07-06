import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentsApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
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

  const openDetail = async (order: PaymentOrder) => {
    try {
      const { data } = await paymentsApi.adminOrder(order.merchant_reference)
      setSelected(data)
    } catch {
      setSelected(order)
    }
  }

  const orders = ordersPage?.results || []
  const ordersPagination = usePagination(orders)
  const actionPending = refreshOrder.isPending || completeOrder.isPending

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
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openDetail(order)}
                          className="btn-secondary !px-2.5 !py-1.5 text-xs"
                        >
                          View
                        </button>
                        {order.status === 'pending' && (
                          <button
                            type="button"
                            disabled={actionPending}
                            onClick={() => refreshOrder.mutate(order.merchant_reference)}
                            className="btn-secondary !px-2.5 !py-1.5 text-xs disabled:opacity-50"
                          >
                            Refresh
                          </button>
                        )}
                        {isSuperAdmin && order.status !== 'completed' && (
                          <button
                            type="button"
                            disabled={actionPending}
                            onClick={() => completeOrder.mutate(order.merchant_reference)}
                            className="btn-primary !px-2.5 !py-1.5 text-xs disabled:opacity-50"
                          >
                            Complete
                          </button>
                        )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="card w-full max-w-2xl max-h-[85vh] overflow-y-auto !p-0">
            <div className="flex items-start justify-between gap-4 p-5 border-b app-divider">
              <div className="min-w-0">
                <h2 className="text-lg font-bold map-text">Order detail</h2>
                <p className="font-mono text-xs map-text-muted break-all mt-0.5">{selected.merchant_reference}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="map-text-muted hover:text-app-secondary text-xl leading-none p-1 rounded-lg hover:bg-app-subtle"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="p-5">
              <dl className="grid sm:grid-cols-2 gap-4 text-sm mb-5">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide map-text-muted">User</dt>
                  <dd className="map-text mt-0.5">{selected.user_email || selected.user_username || '-'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide map-text-muted">Status</dt>
                  <dd className="mt-1"><StatusBadge status={selected.status} /></dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide map-text-muted">Amount</dt>
                  <dd className="map-text mt-0.5 font-medium tabular-nums">
                    {Number(selected.amount).toLocaleString()} {selected.currency}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide map-text-muted">Provider</dt>
                  <dd className="map-text mt-0.5 capitalize">{selected.payment_provider}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide map-text-muted">Type</dt>
                  <dd className="map-text mt-0.5 capitalize">{selected.order_type}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide map-text-muted">Phone</dt>
                  <dd className="map-text mt-0.5">{selected.msisdn || '-'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide map-text-muted">Tracking ID</dt>
                  <dd className="map-text mt-0.5 font-mono text-xs break-all">{selected.order_tracking_id || '-'}</dd>
                </div>
              </dl>

              {selected.gateway_response && (
                <pre className="text-xs map-text-secondary bg-app-subtle border border-app-border rounded-xl p-3 overflow-x-auto mb-5">
                  {JSON.stringify(selected.gateway_response, null, 2)}
                </pre>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                {selected.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => refreshOrder.mutate(selected.merchant_reference)}
                    disabled={refreshOrder.isPending}
                    className="btn-secondary text-sm disabled:opacity-50"
                  >
                    {refreshOrder.isPending ? 'Refreshing…' : 'Refresh from gateway'}
                  </button>
                )}
                {isSuperAdmin && selected.status !== 'completed' && (
                  <button
                    type="button"
                    onClick={() => completeOrder.mutate(selected.merchant_reference)}
                    disabled={completeOrder.isPending}
                    className="btn-primary text-sm disabled:opacity-50"
                  >
                    {completeOrder.isPending ? 'Completing…' : 'Mark completed'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
