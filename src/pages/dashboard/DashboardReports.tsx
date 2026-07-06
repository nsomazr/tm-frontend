import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { reportsApi, subscriptionsApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { toast } from '../../components/ui/toast'
import type { MyReport } from '../../types'
import { EmptyState, PageHeader } from './DashboardUi'

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}

function normalizePurchases(data: unknown): MyReport[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && 'results' in data && Array.isArray((data as { results: unknown }).results)) {
    return (data as { results: MyReport[] }).results
  }
  return []
}

export default function DashboardReports() {
  const { isManager } = useAuth()
  const [downloading, setDownloading] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => subscriptionsApi.purchases().then((r) => normalizePurchases(r.data)),
  })

  const { data: explorationReports } = useQuery({
    queryKey: ['exploration-reports'],
    queryFn: () => reportsApi.explorationList().then((r) => r.data.results ?? []),
  })

  const list = data ?? []
  const explorations = explorationReports ?? []

  const handleDownload = async (slug: string) => {
    setDownloading(slug)
    try {
      const { data: blob } = await reportsApi.download(slug)
      downloadBlob(new Blob([blob]), `${slug}.pdf`)
      toast.success('Download started')
    } catch {
      toast.error('Download failed', { description: 'Open the report preview and try again.' })
    } finally {
      setDownloading(null)
    }
  }

  return (
    <>
      <PageHeader
        title="My downloads"
        description="Reports you have purchased or downloaded with your subscription."
      />
      <div className="mb-5">
        <Link to="/dashboard/exploration-reports" className="btn-secondary text-sm">
          Exploration reports
        </Link>
      </div>

      {isManager && (
        <div className="mb-5 rounded-xl border border-terra-500/25 bg-terra-500/10 px-4 py-3 text-sm text-app-text">
          To write or upload reports for the catalog, use{' '}
          <Link to="/admin/reports" className="font-medium text-terra-600 dark:text-terra-400 hover:underline">
            Admin → Reports
          </Link>
          .
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : isError ? (
        <EmptyState
          message="Could not load your reports. Please refresh the page."
          action={
            <Link to="/downloads" className="btn-primary text-sm">
              Browse report catalog
            </Link>
          }
        />
      ) : list.length === 0 ? (
        <EmptyState
          message="You haven't purchased or downloaded any reports yet."
          action={
            <Link to="/downloads" className="btn-primary text-sm">
              Browse report catalog
            </Link>
          }
        />
      ) : (
        <>
          <ul className="card !p-0 overflow-hidden app-divide-y">
            {list.map((item) => (
              <li key={`${item.source}-${item.id}`} className="px-5 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-app-text">{item.report_title}</p>
                      <span
                        className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                          item.source === 'purchase'
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
                            : 'bg-sky-50 text-sky-700 ring-1 ring-sky-600/20'
                        }`}
                      >
                        {item.source === 'purchase' ? 'Purchased' : 'Subscription'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {item.source === 'purchase' && item.amount_paid
                        ? `${Number(item.amount_paid).toLocaleString()} ${item.currency ?? 'TZS'} · `
                        : ''}
                      {item.purchased_at
                        ? new Date(item.purchased_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Link
                      to={`/downloads/${item.report_slug}`}
                      className="btn-secondary text-xs py-2 px-3"
                    >
                      Open
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDownload(item.report_slug)}
                      disabled={downloading === item.report_slug}
                      className="btn-primary text-xs py-2 px-3 disabled:opacity-50"
                    >
                      {downloading === item.report_slug ? 'Downloading…' : 'Download PDF'}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Link to="/downloads" className="inline-block mt-4 text-sm text-terra-600 hover:text-terra-700 font-medium">
            Browse more reports →
          </Link>
        </>
      )}

      {explorations.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-app-text mb-3">Your exploration reports</h2>
          <ul className="card !p-0 overflow-hidden app-divide-y">
            {explorations.map((item) => (
              <li key={item.id} className="px-5 py-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-app-text">{item.title || `Report #${item.id}`}</p>
                  <p className="text-xs text-slate-400 capitalize">{item.status}</p>
                </div>
                <Link to="/dashboard/exploration-reports" className="btn-secondary text-xs">
                  Open
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
