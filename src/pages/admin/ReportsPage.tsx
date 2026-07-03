import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { reportsApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import FileUploadField from '../../components/ui/FileUploadField'
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

function ReportRow({
  report,
  isAdmin,
  onError,
  onInvalidate,
}: {
  report: Report
  isAdmin: boolean
  onError: (msg: string | null) => void
  onInvalidate: () => void
}) {
  const isVisible = report.is_active !== false
  const hasWritten =
    (report.summary_preview?.trim().length ?? 0) > 0 || report.ai_summary?.model_used === 'manual'
  const [mode, setMode] = useState<ReportRowMode>(report.has_pdf && !hasWritten ? 'upload' : 'write')

  const uploadDocument = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData()
      fd.append('pdf_file', file)
      return reportsApi.adminUpdate(report.slug, fd)
    },
    onSuccess: () => {
      onInvalidate()
      onError(null)
    },
    onError: (err) => onError(uploadErrorMessage(err, 'Document upload failed.')),
  })

  const generatePdf = useMutation({
    mutationFn: (force?: boolean) => reportsApi.adminGeneratePdf(report.slug, force),
    onSuccess: () => {
      onInvalidate()
      onError(null)
    },
    onError: () => onError('PDF generation failed.'),
  })

  const toggleVisible = useMutation({
    mutationFn: (nextActive: boolean) => reportsApi.adminUpdate(report.slug, { is_active: nextActive }),
    onSuccess: () => {
      onInvalidate()
      onError(null)
    },
    onError: () => onError('Could not update report visibility.'),
  })

  const deleteReport = useMutation({
    mutationFn: () => reportsApi.adminDelete(report.slug),
    onSuccess: () => {
      onInvalidate()
      onError(null)
    },
    onError: () => onError('Could not delete report.'),
  })

  const lifecyclePending = toggleVisible.isPending || deleteReport.isPending

  function handleToggleVisible() {
    toggleVisible.mutate(!isVisible)
  }

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
    onError(null)
    try {
      const { data } = await reportsApi.download(report.slug)
      downloadBlob(new Blob([data]), `${report.slug}.pdf`)
    } catch {
      onError('Download failed. Write content, upload a document, or generate a PDF first.')
    }
  }

  return (
    <div className={`card !p-0 overflow-hidden ${!isVisible ? 'opacity-75 border-dashed' : ''}`}>
      <div className="px-5 py-4 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-bold text-app-text">{report.title}</h3>
            {!isVisible && (
              <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-app-subtle text-app-text-muted border border-app-border">
                Hidden
              </span>
            )}
            <span
              className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                report.has_pdf
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 ring-1 ring-emerald-600/20'
                  : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 ring-1 ring-amber-600/20'
              }`}
            >
              {report.has_pdf ? 'PDF ready' : 'No PDF'}
            </span>
            {report.ai_summary?.model_used === 'manual' && (
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 ring-1 ring-sky-600/20">
                Written
              </span>
            )}
          </div>
          <p className="text-sm text-app-muted">
            {report.mineral_name}
            {report.region_name ? ` · ${report.region_name}` : ''} · {Number(report.price).toLocaleString()}{' '}
            {report.currency}
          </p>
          {report.summary_preview && (
            <p className="text-sm text-app-text-secondary mt-2 line-clamp-3">{report.summary_preview}</p>
          )}
        </div>
      </div>

      <div className="px-5 py-3 border-t app-divider flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="segmented w-full sm:w-auto" role="tablist" aria-label={`Actions for ${report.title}`}>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'write'}
            onClick={() => setMode('write')}
            className={`segmented-btn flex-1 sm:flex-none px-3 py-1.5 text-xs ${
              mode === 'write' ? 'segmented-btn-active' : ''
            }`}
          >
            Write
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'upload'}
            onClick={() => setMode('upload')}
            className={`segmented-btn flex-1 sm:flex-none px-3 py-1.5 text-xs ${
              mode === 'upload' ? 'segmented-btn-active' : ''
            }`}
          >
            Upload
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-end">
          {mode === 'write' ? (
            <>
              <Link to={`/admin/reports/${report.slug}/edit?mode=write`} className="btn-primary text-xs py-2 px-3">
                Open editor
              </Link>
              <button
                type="button"
                onClick={() => generatePdf.mutate(!!report.has_pdf)}
                disabled={generatePdf.isPending}
                className="btn-secondary text-xs py-2 px-3 disabled:opacity-50"
              >
                {report.has_pdf ? 'Regenerate PDF' : 'Generate PDF'}
              </button>
            </>
          ) : (
            <FileUploadField
              variant="button"
              buttonLabel={uploadDocument.isPending ? 'Uploading…' : 'Upload document'}
              accept={DOCUMENT_ACCEPT}
              resetOnSelect
              disabled={uploadDocument.isPending}
              buttonClassName="btn-primary text-xs py-2 px-3 disabled:opacity-50"
              onChange={(file) => {
                if (file) uploadDocument.mutate(file)
              }}
            />
          )}
          <Link to={`/downloads/${report.slug}`} className="btn-secondary text-xs py-2 px-3">
            Preview
          </Link>
          <button type="button" onClick={() => downloadReport()} className="btn-secondary text-xs py-2 px-3">
            Download PDF
          </button>
        </div>
      </div>

      <div className="px-5 py-3 border-t app-divider flex flex-wrap items-center gap-2">
        <Link
          to={`/admin/reports/${report.slug}/edit`}
          className="text-xs px-3 py-1.5 rounded-lg border border-app-border hover:bg-app-subtle text-app-text-secondary"
        >
          Edit details
        </Link>
        <button
          type="button"
          onClick={handleToggleVisible}
          disabled={lifecyclePending}
          className="text-xs px-3 py-1.5 rounded-lg border border-app-border hover:bg-app-subtle text-app-text-secondary disabled:opacity-50"
        >
          {isVisible ? 'Hide from catalog' : 'Show in catalog'}
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={lifecyclePending}
            className="text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 disabled:opacity-50"
          >
            Delete permanently
          </button>
        )}
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const qc = useQueryClient()
  const { isAdmin } = useAuth()
  const [actionError, setActionError] = useState<string | null>(null)
  const [newReportMode, setNewReportMode] = useState<ReportRowMode>('write')
  const [showHidden, setShowHidden] = useState(true)

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

  return (
    <div>
      <h1 className="text-2xl font-bold text-app-text mb-2">Reports</h1>
      <p className="text-sm text-app-muted mb-6">
        Write reports with the AI assistant or upload a PDF / Word document. Word files convert to PDF automatically.
      </p>

      <div className="card !p-0 overflow-hidden mb-8">
        <div className="px-5 py-4 border-b app-divider">
          <h2 className="font-bold text-app-text">Add report</h2>
          <p className="text-sm text-app-muted mt-1">
            {newReportMode === 'write'
              ? 'Use the AI assistant to draft from context, review, then publish.'
              : 'Start with metadata and attach a PDF or Word document.'}
          </p>
          <div className="segmented mt-4 w-full sm:w-auto" role="tablist" aria-label="New report mode">
            <button
              type="button"
              role="tab"
              aria-selected={newReportMode === 'write'}
              onClick={() => setNewReportMode('write')}
              className={`segmented-btn flex-1 sm:flex-none px-4 py-2 text-sm ${
                newReportMode === 'write' ? 'segmented-btn-active' : ''
              }`}
            >
              Write report
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={newReportMode === 'upload'}
              onClick={() => setNewReportMode('upload')}
              className={`segmented-btn flex-1 sm:flex-none px-4 py-2 text-sm ${
                newReportMode === 'upload' ? 'segmented-btn-active' : ''
              }`}
            >
              Upload document
            </button>
          </div>
        </div>
        <div className="px-5 py-4 border-t app-divider flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-app-text-muted">
            {newReportMode === 'write'
              ? 'No document upload in write mode. A PDF is generated from your approved text.'
              : 'Word (.docx) files are converted to PDF on upload.'}
          </p>
          <Link
            to={`/admin/reports/new?mode=${newReportMode}`}
            className="btn-primary text-sm shrink-0 self-end sm:self-auto"
          >
            Continue
          </Link>
        </div>
      </div>

      {actionError && (
        <div className="mb-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-800 dark:text-red-300">
          {actionError}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-app-muted">Loading reports…</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-bold text-app-text">All reports ({visibleReports.length})</h2>
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
          <div className="grid gap-4">
            {visibleReports.map((r) => (
              <ReportRow
                key={r.id}
                report={r}
                isAdmin={isAdmin}
                onError={setActionError}
                onInvalidate={invalidate}
              />
            ))}
            {visibleReports.length === 0 && (
              <p className="text-sm text-app-muted">No reports match your filters.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
