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

function sourceLabel(source: MyReport['source']): string {
  switch (source) {
    case 'purchase':
      return 'Purchased'
    case 'subscription':
      return 'Subscription'
    case 'insight_export':
      return 'Terra insight'
    case 'exploration':
      return 'Exploration'
    default:
      return source
  }
}

function sourceBadgeClass(source: MyReport['source']): string {
  switch (source) {
    case 'purchase':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
    case 'subscription':
      return 'bg-sky-50 text-sky-700 ring-1 ring-sky-600/20'
    case 'insight_export':
      return 'bg-violet-50 text-violet-700 ring-1 ring-violet-600/20'
    case 'exploration':
      return 'bg-amber-50 text-amber-800 ring-1 ring-amber-600/20'
    default:
      return 'bg-app-subtle text-app-text-secondary ring-1 ring-app-border'
  }
}

export default function DashboardReports() {
  const { isManager } = useAuth()
  const [downloading, setDownloading] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => subscriptionsApi.purchases().then((r) => normalizePurchases(r.data)),
  })

  const list = data ?? []

  const handleCatalogDownload = async (slug: string) => {
    setDownloading(`catalog-${slug}`)
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

  const handleExplorationDownload = async (id: number) => {
    setDownloading(`exploration-${id}`)
    try {
      const { data: blob } = await reportsApi.explorationDownload(id)
      downloadBlob(new Blob([blob]), `exploration-${id}.pdf`)
      toast.success('Download started')
    } catch {
      toast.error('Download failed', { description: 'Open the exploration report and try again.' })
    } finally {
      setDownloading(null)
    }
  }

  return (
    <>
      <PageHeader
        title="My downloads"
        description="Catalog reports you purchased or saved, Terra insight PDFs you exported, and exploration reports you generated."
      />

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
          message="Nothing saved here yet. Catalog downloads appear after you use Download PDF on a report (subscription quota or purchase). Terra map exports appear after you export from Ask Terra. Exploration reports appear after you generate one from the map."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/downloads" className="btn-primary text-sm">
                Browse report catalog
              </Link>
              <Link to="/dashboard/exploration-reports" className="btn-secondary text-sm">
                Exploration reports
              </Link>
            </div>
          }
        />
      ) : (
        <>
          <ul className="card !p-0 overflow-hidden app-divide-y">
            {list.map((item) => {
              const downloadKey =
                item.source === 'exploration'
                  ? `exploration-${item.id}`
                  : item.source === 'insight_export'
                    ? `insight-${item.id}`
                    : `catalog-${item.report_slug}`

              return (
                <li key={`${item.source}-${item.id}`} className="px-5 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-app-text">{item.report_title}</p>
                        <span
                          className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${sourceBadgeClass(item.source)}`}
                        >
                          {sourceLabel(item.source)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {item.source === 'purchase' && item.amount_paid
                          ? `${Number(item.amount_paid).toLocaleString()} ${item.currency ?? 'TZS'} · `
                          : ''}
                        {item.source === 'exploration' && item.status
                          ? `${item.status} · `
                          : ''}
                        {item.source === 'insight_export'
                          ? 'Exported to your device · '
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
                      {item.source === 'exploration' && (
                        <Link
                          to="/dashboard/exploration-reports"
                          className="btn-secondary text-xs py-2 px-3"
                        >
                          Open
                        </Link>
                      )}
                      {item.source === 'insight_export' && (
                        <Link to="/" className="btn-secondary text-xs py-2 px-3">
                          Back to map
                        </Link>
                      )}
                      {(item.source === 'purchase' || item.source === 'subscription') && item.report_slug && (
                        <Link
                          to={`/downloads/${item.report_slug}`}
                          className="btn-secondary text-xs py-2 px-3"
                        >
                          Open
                        </Link>
                      )}
                      {item.source === 'exploration' && item.can_download && (
                        <button
                          type="button"
                          onClick={() => handleExplorationDownload(item.id)}
                          disabled={downloading === downloadKey}
                          className="btn-primary text-xs py-2 px-3 disabled:opacity-50"
                        >
                          {downloading === downloadKey ? 'Downloading…' : 'Download PDF'}
                        </button>
                      )}
                      {(item.source === 'purchase' || item.source === 'subscription') && item.report_slug && (
                        <button
                          type="button"
                          onClick={() => handleCatalogDownload(item.report_slug)}
                          disabled={downloading === downloadKey}
                          className="btn-primary text-xs py-2 px-3 disabled:opacity-50"
                        >
                          {downloading === downloadKey ? 'Downloading…' : 'Download PDF'}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="flex flex-wrap gap-4 mt-4">
            <Link to="/downloads" className="text-sm text-terra-600 hover:text-terra-700 font-medium">
              Browse more reports →
            </Link>
            <Link
              to="/dashboard/exploration-reports"
              className="text-sm text-terra-600 hover:text-terra-700 font-medium"
            >
              Manage exploration reports →
            </Link>
          </div>
        </>
      )}
    </>
  )
}
