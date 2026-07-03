import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentsApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import type { PaymentOrder } from '../../types'

const STATUS_OPTIONS = ['', 'pending', 'completed', 'failed', 'cancelled']
const TYPE_OPTIONS = ['', 'subscription', 'download', 'license']
const PROVIDER_OPTIONS = ['', 'selcom', 'simulated']

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: 'bg-emerald-50 text-emerald-700',
    pending: 'bg-amber-50 text-amber-800',
    failed: 'bg-red-50 text-red-700',
    cancelled: 'bg-slate-100 text-slate-600',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${colors[status] || 'bg-slate-100'}`}>
      {status}
    </span>
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
    if (search) params.search = search
    return params
  }, [status, orderType, provider, search])

  const { data: ordersPage, isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-orders', orderParams],
    queryFn: () => paymentsApi.adminOrders(orderParams).then((r) => r.data),
  })

  const refreshOrder = useMutation({
    mutationFn: (reference: string) => paymentsApi.refreshOrder(reference),
    onSuccess: ({ data }) => {
      setSelected(data)
      qc.invalidateQueries({ queryKey: ['admin-orders'] })
      qc.invalidateQueries({ queryKey: ['revenue'] })
    },
  })

  const completeOrder = useMutation({
    mutationFn: (reference: string) => paymentsApi.completeOrder(reference),
    onSuccess: ({ data }) => {
      setSelected(data)
      qc.invalidateQueries({ queryKey: ['admin-orders'] })
      qc.invalidateQueries({ queryKey: ['revenue'] })
    },
  })

  const orders = ordersPage?.results || []

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Payments & Revenue</h1>
      <p className="text-sm text-slate-500 mb-6">Track Selcom and simulated orders across the platform.</p>

      {summaryLoading ? (
        <p>Loading summary…</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="card">
            <p className="text-sm text-gray-500">Total revenue</p>
            <p className="text-2xl font-bold text-terra-700">
              {Number(summary?.total_revenue || 0).toLocaleString()} TZS
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold">{summary?.pending_count ?? 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">Failed</p>
            <p className="text-2xl font-bold text-red-600">{summary?.failed_count ?? 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">Providers</p>
            <div className="mt-1 space-y-1 text-sm">
              {(summary?.by_provider || []).map((item) => (
                <div key={item.payment_provider} className="flex justify-between capitalize">
                  <span>{item.payment_provider}</span>
                  <span>{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="card mb-6">
        <div className="flex flex-wrap gap-3 mb-4">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input text-sm py-1.5">
            {STATUS_OPTIONS.map((v) => (
              <option key={v || 'all'} value={v}>{v ? v : 'All statuses'}</option>
            ))}
          </select>
          <select value={orderType} onChange={(e) => setOrderType(e.target.value)} className="input text-sm py-1.5">
            {TYPE_OPTIONS.map((v) => (
              <option key={v || 'all-types'} value={v}>{v ? v : 'All types'}</option>
            ))}
          </select>
          <select value={provider} onChange={(e) => setProvider(e.target.value)} className="input text-sm py-1.5">
            {PROVIDER_OPTIONS.map((v) => (
              <option key={v || 'all-providers'} value={v}>{v ? v : 'All providers'}</option>
            ))}
          </select>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ref, email, phone…"
            className="input text-sm py-1.5 flex-1 min-w-[200px]"
          />
        </div>

        {ordersLoading ? (
          <p>Loading orders…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-3">Reference</th>
                  <th className="pb-2 pr-3">User</th>
                  <th className="pb-2 pr-3">Type</th>
                  <th className="pb-2 pr-3">Provider</th>
                  <th className="pb-2 pr-3">Amount</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2">When</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.merchant_reference}
                    className="border-b hover:bg-slate-50 cursor-pointer"
                    onClick={() => setSelected(o)}
                  >
                    <td className="py-2 pr-3 font-mono text-xs">{o.merchant_reference.slice(0, 10)}…</td>
                    <td className="py-2 pr-3">{o.user_email || o.user_username}</td>
                    <td className="py-2 pr-3 capitalize">{o.order_type}</td>
                    <td className="py-2 pr-3 capitalize">{o.payment_provider}</td>
                    <td className="py-2 pr-3">{Number(o.amount).toLocaleString()} {o.currency}</td>
                    <td className="py-2 pr-3"><StatusBadge status={o.status} /></td>
                    <td className="py-2 text-xs text-slate-500">{new Date(o.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="card w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-bold">Order detail</h2>
                <p className="font-mono text-xs text-slate-500 break-all">{selected.merchant_reference}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <dl className="grid sm:grid-cols-2 gap-3 text-sm mb-4">
              <div><dt className="text-slate-500">User</dt><dd>{selected.user_email}</dd></div>
              <div><dt className="text-slate-500">Status</dt><dd><StatusBadge status={selected.status} /></dd></div>
              <div><dt className="text-slate-500">Amount</dt><dd>{Number(selected.amount).toLocaleString()} {selected.currency}</dd></div>
              <div><dt className="text-slate-500">Provider</dt><dd className="capitalize">{selected.payment_provider}</dd></div>
              <div><dt className="text-slate-500">Phone</dt><dd>{selected.msisdn || 'N/A'}</dd></div>
              <div><dt className="text-slate-500">Tracking ID</dt><dd className="font-mono text-xs break-all">{selected.order_tracking_id || 'N/A'}</dd></div>
            </dl>

            {selected.gateway_response && (
              <pre className="text-xs bg-slate-50 border rounded-lg p-3 overflow-x-auto mb-4">
                {JSON.stringify(selected.gateway_response, null, 2)}
              </pre>
            )}

            <div className="flex flex-wrap gap-2">
              {selected.status === 'pending' && (
                <button
                  type="button"
                  onClick={() => refreshOrder.mutate(selected.merchant_reference)}
                  disabled={refreshOrder.isPending}
                  className="btn-secondary text-sm"
                >
                  Refresh from gateway
                </button>
              )}
              {isSuperAdmin && selected.status !== 'completed' && (
                <button
                  type="button"
                  onClick={() => completeOrder.mutate(selected.merchant_reference)}
                  disabled={completeOrder.isPending}
                  className="btn-primary text-sm"
                >
                  Mark completed
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
