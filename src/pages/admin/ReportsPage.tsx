import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { reportsApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import ListPagination from '../../components/ui/ListPagination'
import { toast } from '../../components/ui/toast'
import { usePagination } from '../../hooks/usePagination'
import type { Report } from '../../types'

const DOCUMENT_ACCEPT =
  '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

type ReportRowMode = 'write' | 'upload'

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}

function uploadErrorMessage(err: unknown, fallback: string) {
  if (!isAxiosError(err)) return fallback
  const data = err.response?.data as { pdf_file?: string[]; detail?: string } | undefined
  if (Array.isArray(data?.pdf_file) && data.pdf_file[0]) return data.pdf_file[0]
  if (typeof data?.detail === 'string') return data.detail
  return fallback
}

function ReportRowMenu({
  children,
  label = 'Report actions',
}: {
  children: ReactNode
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-8 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-subtle hover:text-app-text"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
          <circle cx="12" cy="5" r="1.75" />
          <circle cx="12" cy="12" r="1.75" />
          <circle cx="12" cy="19" r="1.75" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 min-w-[10.5rem] rounded-lg border border-app-border bg-app-surface py-1 shadow-lg"
        >
          <div onClick={() => setOpen(false)}>{children}</div>
        </div>
      )}
    </div>
  )
}

function ReportRowMenuItem({
  children,
  onClick,
  to,
  disabled,
  destructive,
}: {
  children: ReactNode
  onClick?: () => void
  to?: string
  disabled?: boolean
  destructive?: boolean
}) {
  const className = `block w-full px-3 py-2 text-left text-xs ${
    destructive
      ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
      : 'text-app-text hover:bg-app-subtle'
  } disabled:opacity-50 disabled:pointer-events-none`

  if (to) {
    return (
      <Link to={to} role="menuitem" className={className}>
        {children}
      </Link>
    )
  }

  return (
    <button type="button" role="menuitem" onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  )
}

function ReportTableRow({
  report,
  isAdmin,
  onNotify,
  onInvalidate,
}: {
  report: Report
  isAdmin: boolean
  onNotify: (msg: string, kind?: 'success' | 'error') => void
  onInvalidate: () => void
}) {
  const isVisible = report.is_active !== false
  const hasWritten =
    (report.summary_preview?.trim().length ?? 0) > 0 || report.ai_summary?.model_used === 'manual'
  const [mode, setMode] = useState<ReportRowMode>(report.has_pdf && !hasWritten ? 'upload' : 'write')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadDocument = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData()
      fd.append('pdf_file', file)
      return reportsApi.adminUpdate(report.slug, fd)
    },
    onSuccess: () => {
      onInvalidate()
      onNotify('Document uploaded', 'success')
    },
    onError: (err) => onNotify(uploadErrorMessage(err, 'Document upload failed.'), 'error'),
  })

  const generatePdf = useMutation({
    mutationFn: (force?: boolean) => reportsApi.adminGeneratePdf(report.slug, force),
    onSuccess: () => {
      onInvalidate()
      onNotify('PDF generated', 'success')
    },
    onError: () => onNotify('PDF generation failed.', 'error'),
  })

  const toggleVisible = useMutation({
    mutationFn: (nextActive: boolean) => reportsApi.adminUpdate(report.slug, { is_active: nextActive }),
    onSuccess: () => {
      onInvalidate()
      onNotify('Report visibility updated', 'success')
    },
    onError: () => onNotify('Could not update report visibility.', 'error'),
  })

  const deleteReport = useMutation({
    mutationFn: () => reportsApi.adminDelete(report.slug),
    onSuccess: () => {
      onInvalidate()
      onNotify('Report deleted', 'success')
    },
    onError: () => onNotify('Could not delete report.', 'error'),
  })

  const lifecyclePending = toggleVisible.isPending || deleteReport.isPending

  function handleDelete() {
    if (
      !window.confirm(
        `Permanently delete "${report.title}"? Purchases and download history for this report will also be removed. This cannot be undone.`,
      )
    ) {
      return
    }
    deleteReport.mutate()
  }

  const downloadReport = async () => {
    try {
      const { data } = await reportsApi.download(report.slug)
      downloadBlob(new Blob([data]), `${report.slug}.pdf`)
      onNotify('Download started', 'success')
    } catch {
      onNotify('Download failed. Write content, upload a document, or generate a PDF first.', 'error')
    }
  }

  return (
    <tr className={!isVisible ? 'opacity-70' : undefined}>
      <td className="min-w-[12rem] max-w-[18rem]">
        <div className="font-medium text-app-text leading-snug">{report.title}</div>
        {report.summary_preview && (
          <p className="text-xs text-app-text-muted mt-0.5 line-clamp-2">{report.summary_preview}</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {!isVisible && (
            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-px rounded bg-app-subtle text-app-text-muted border border-app-border">
              Hidden
            </span>
          )}
          {report.ai_summary?.model_used === 'manual' && (
            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-px rounded bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-600/20">
              Written
            </span>
          )}
        </div>
      </td>
      <td className="text-xs text-app-text-secondary whitespace-nowrap">
        <span className="text-app-text">{report.mineral_name}</span>
        {report.region_name && <span className="block text-app-text-muted">{report.region_name}</span>}
      </td>
      <td className="text-xs tabular-nums text-app-text-secondary whitespace-nowrap">
        {Number(report.price).toLocaleString()} {report.currency}
      </td>
      <td>
        <span
          className={`inline-block text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
            report.has_pdf
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 ring-1 ring-emerald-600/20'
              : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 ring-1 ring-amber-600/20'
          }`}
        >
          {report.has_pdf ? 'PDF' : 'No PDF'}
        </span>
      </td>
      <td className="text-right whitespace-nowrap">
        <div className="inline-flex items-center justify-end gap-2">
          <div className="segmented" role="tablist" aria-label="Report edit mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'write'}
              onClick={() => setMode('write')}
              className={`segmented-btn px-2 py-1 text-[11px] ${mode === 'write' ? 'segmented-btn-active' : ''}`}
            >
              Write
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'upload'}
              onClick={() => setMode('upload')}
              className={`segmented-btn px-2 py-1 text-[11px] ${mode === 'upload' ? 'segmented-btn-active' : ''}`}
            >
              Upload
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={DOCUMENT_ACCEPT}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) uploadDocument.mutate(file)
              e.target.value = ''
            }}
          />
          <ReportRowMenu label={`Actions for ${report.title}`}>
            {mode === 'write' ? (
              <>
                <ReportRowMenuItem to={`/admin/reports/${report.slug}/edit?mode=write`}>Editor</ReportRowMenuItem>
                <ReportRowMenuItem
                  onClick={() => generatePdf.mutate(!!report.has_pdf)}
                  disabled={generatePdf.isPending}
                >
                  {generatePdf.isPending ? 'Generating…' : report.has_pdf ? 'Regen PDF' : 'Gen PDF'}
                </ReportRowMenuItem>
              </>
            ) : (
              <ReportRowMenuItem
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadDocument.isPending}
              >
                {uploadDocument.isPending ? 'Uploading…' : 'Choose file'}
              </ReportRowMenuItem>
            )}
            <ReportRowMenuItem to={`/downloads/${report.slug}`}>Preview</ReportRowMenuItem>
            <ReportRowMenuItem onClick={() => void downloadReport()}>Download</ReportRowMenuItem>
            <ReportRowMenuItem to={`/admin/reports/${report.slug}/edit`}>Details</ReportRowMenuItem>
            <ReportRowMenuItem
              onClick={() => toggleVisible.mutate(!isVisible)}
              disabled={lifecyclePending}
            >
              {isVisible ? 'Hide' : 'Show'}
            </ReportRowMenuItem>
            {isAdmin && (
              <ReportRowMenuItem onClick={handleDelete} disabled={lifecyclePending} destructive>
                Delete
              </ReportRowMenuItem>
            )}
          </ReportRowMenu>
        </div>
      </td>
    </tr>
  )
}

export default function ReportsPage() {
  const qc = useQueryClient()
  const { isAdmin } = useAuth()
  const [newReportMode, setNewReportMode] = useState<ReportRowMode>('write')
  const [showHidden, setShowHidden] = useState(true)

  const notify = (msg: string, kind: 'success' | 'error' = 'error') => {
    if (kind === 'success') toast.success(msg)
    else toast.error(msg)
  }

  const { data: reports, isLoading } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () => reportsApi.adminList().then((r) => r.data),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-reports'] })
    qc.invalidateQueries({ queryKey: ['reports'] })
  }

  const allReports = reports?.results ?? []
  const visibleReports = showHidden ? allReports : allReports.filter((r) => r.is_active !== false)
  const reportPagination = usePagination(visibleReports, 25)

  return (
    <div>
      <h1 className="text-2xl font-bold text-app-text mb-2">Reports</h1>
      <p className="text-sm text-app-muted mb-6">
        Write reports with the AI assistant or upload a PDF / Word document. Word files convert to PDF automatically.
      </p>

      <div className="card !p-0 overflow-hidden mb-8">
        <div className="px-5 py-4 border-b app-divider flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-bold text-app-text">Add report</h2>
            <p className="text-sm text-app-muted mt-1">
              {newReportMode === 'write'
                ? 'Draft with AI, review, then publish.'
                : 'Attach a PDF or Word document.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="segmented" role="tablist" aria-label="New report mode">
              <button
                type="button"
                role="tab"
                aria-selected={newReportMode === 'write'}
                onClick={() => setNewReportMode('write')}
                className={`segmented-btn px-3 py-1.5 text-xs ${
                  newReportMode === 'write' ? 'segmented-btn-active' : ''
                }`}
              >
                Write
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={newReportMode === 'upload'}
                onClick={() => setNewReportMode('upload')}
                className={`segmented-btn px-3 py-1.5 text-xs ${
                  newReportMode === 'upload' ? 'segmented-btn-active' : ''
                }`}
              >
                Upload
              </button>
            </div>
            <Link to={`/admin/reports/new?mode=${newReportMode}`} className="btn-primary text-sm py-2 px-3">
              Continue
            </Link>
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-app-muted">Loading reports…</p>
      ) : visibleReports.length === 0 ? (
        <p className="text-sm text-app-muted">No reports match your filters.</p>
      ) : (
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b app-divider">
            <h2 className="font-bold text-app-text text-sm">All reports ({visibleReports.length})</h2>
            <label className="flex items-center gap-2 text-sm text-app-text-secondary">
              <input
                type="checkbox"
                checked={showHidden}
                onChange={(e) => setShowHidden(e.target.checked)}
                className="rounded border-app-border"
              />
              Include hidden reports
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Report</th>
                  <th>Mineral</th>
                  <th className="tabular-nums">Price</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reportPagination.pageItems.map((r) => (
                  <ReportTableRow
                    key={r.id}
                    report={r}
                    isAdmin={isAdmin}
                    onNotify={notify}
                    onInvalidate={invalidate}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <ListPagination
            page={reportPagination.page}
            pageCount={reportPagination.pageCount}
            total={reportPagination.total}
            pageSize={reportPagination.pageSize}
            onPageChange={reportPagination.setPage}
            className="px-4 pb-4"
          />
        </div>
      )}
    </div>
  )
}
