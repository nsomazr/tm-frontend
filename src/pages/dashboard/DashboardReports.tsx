import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { subscriptionsApi } from '../../api'
import { EmptyState, PageHeader } from './DashboardUi'

export default function DashboardReports() {
  const { data: purchases, isLoading } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => subscriptionsApi.purchases().then((r) => r.data),
  })

  const list = (purchases ?? []) as { report_title: string; purchased_at?: string }[]

  return (
    <>
      <PageHeader title="My reports" description="Reports you have purchased and can download." />

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : list.length === 0 ? (
        <EmptyState
          message="You haven't purchased any reports yet."
          action={
            <Link to="/downloads" className="btn-primary text-sm">
              Browse report catalog
            </Link>
          }
        />
      ) : (
        <>
          <ul className="rounded-xl bg-white border border-slate-200 divide-y divide-slate-100">
            {list.map((p, i) => (
              <li key={i} className="px-5 py-4 text-sm">
                <p className="font-medium text-slate-900">{p.report_title}</p>
                {p.purchased_at && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Purchased {new Date(p.purchased_at).toLocaleDateString()}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <Link to="/downloads" className="inline-block mt-4 text-sm text-terra-600 hover:text-terra-700 font-medium">
            Download from catalog →
          </Link>
        </>
      )}
    </>
  )
}
