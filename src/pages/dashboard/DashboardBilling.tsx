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
        <p className="text-sm text-app-muted">Loading…</p>
      ) : !invoices?.length ? (
        <EmptyState message="No invoices yet. Invoices appear here after a subscription or report purchase." />
      ) : (
        <ul className="card !p-0 overflow-hidden app-divide-y">
          {invoices.map((inv) => (
            <li key={inv.id} className="flex items-center justify-between gap-4 px-5 py-4 text-sm">
              <div>
                <p className="font-mono text-xs text-app-muted">{inv.invoice_number}</p>
                <p className="text-app-text-secondary mt-0.5">{inv.description || 'Terra Meta payment'}</p>
                <p className="text-xs text-app-text-muted mt-0.5">
                  {new Date(inv.issued_at).toLocaleDateString()}
                </p>
              </div>
              <p className="font-semibold text-app-text shrink-0">
                {Number(inv.amount).toLocaleString()} {inv.currency}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
