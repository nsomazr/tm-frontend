import { useQuery } from '@tanstack/react-query'
import { paymentsApi } from '../../api'
import { EmptyState, PageHeader } from './DashboardUi'

export default function DashboardBilling() {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => paymentsApi.invoices().then((r) => r.data),
  })

  return (
    <>
      <PageHeader title="Billing" description="Payment history and invoices." />

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : !invoices?.length ? (
        <EmptyState message="No invoices yet. Invoices appear here after a subscription or report purchase." />
      ) : (
        <ul className="rounded-xl bg-white border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {invoices.map((inv) => (
            <li key={inv.id} className="flex items-center justify-between gap-4 px-5 py-4 text-sm">
              <div>
                <p className="font-mono text-xs text-slate-500">{inv.invoice_number}</p>
                <p className="text-slate-700 mt-0.5">{inv.description || 'Terra Meta payment'}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(inv.issued_at).toLocaleDateString()}
                </p>
              </div>
              <p className="font-semibold text-slate-900 shrink-0">
                {Number(inv.amount).toLocaleString()} {inv.currency}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
