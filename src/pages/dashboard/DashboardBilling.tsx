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
              <div className="min-w-0">
                <p className="font-mono text-xs text-app-muted">{inv.invoice_number}</p>
                <p className="text-app-text-secondary mt-0.5">{inv.description || 'Terra Meta payment'}</p>
                <p className="text-xs text-app-text-muted mt-0.5">
                  {new Date(inv.issued_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <p className="font-semibold text-app-text">
                  {Number(inv.amount).toLocaleString()} {inv.currency}
                </p>
                {inv.pdf_file ? (
                  <a
                    href={inv.pdf_file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-terra-600 dark:text-terra-400 hover:underline"
                  >
                    Download PDF
                  </a>
                ) : (
                  <span className="text-xs text-app-text-muted">No PDF</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
