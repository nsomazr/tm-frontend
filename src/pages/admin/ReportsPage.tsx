import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { reportsApi } from '../../api'
import { reportPreviewText } from '../../components/reports/reportEditorText'
import { useAuth } from '../../auth/AuthContext'
import ActionMenu, { ActionMenuItem } from '../../components/ui/ActionMenu'
import ListPagination from '../../components/ui/ListPagination'
import { toast } from '../../components/ui/toast'
import { usePagination } from '../../hooks/usePagination'
import type { Report } from '../../types'

const DOCUMENT_ACCEPT =
  '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

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
    toast.confirm('Delete this report?', {
      description: `"${report.title}" and its purchase history will be permanently removed.`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteReport.mutate(),
    })
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
          <p className="text-xs text-app-text-muted mt-0.5 line-clamp-2">
            {reportPreviewText(report.summary_preview, 200) || report.summary_preview}
          </p>
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
          {report.access_type && (
            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-px rounded bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border border-violet-600/20">
              {report.access_type.replace(/_/g, ' ')}
            </span>
          )}
          {report.report_format && report.report_format !== 'pdf' && (
            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-px rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-600/20">
              {report.report_format.replace(/_/g, ' ')}
            </span>
          )}
          {(report.location_tags?.length ?? 0) > 0 && (
            <span className="text-[10px] text-app-text-muted">{report.location_tags!.length} locations</span>
          )}
          {(report.linked_layers?.length ?? 0) > 0 && (
            <span className="text-[10px] text-app-text-muted">{report.linked_layers!.length} layers</span>
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
          <ActionMenu label={`Actions for ${report.title}`}>
            <ActionMenuItem to={`/admin/reports/${report.slug}/edit`}>Editor</ActionMenuItem>
            <ActionMenuItem
              onClick={() => generatePdf.mutate(!!report.has_pdf)}
              disabled={generatePdf.isPending}
            >
              {generatePdf.isPending ? 'Generating…' : report.has_pdf ? 'Regen PDF' : 'Gen PDF'}
            </ActionMenuItem>
            <ActionMenuItem
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadDocument.isPending}
            >
              {uploadDocument.isPending ? 'Uploading…' : 'Upload file'}
            </ActionMenuItem>
            <ActionMenuItem to={`/downloads/${report.slug}`}>Preview</ActionMenuItem>
            <ActionMenuItem onClick={() => void downloadReport()}>Download</ActionMenuItem>
            <ActionMenuItem
              onClick={() => toggleVisible.mutate(!isVisible)}
              disabled={lifecyclePending}
            >
              {isVisible ? 'Hide' : 'Show'}
            </ActionMenuItem>
            {isAdmin && (
              <ActionMenuItem onClick={handleDelete} disabled={lifecyclePending} destructive>
                Delete
              </ActionMenuItem>
            )}
          </ActionMenu>
        </div>
      </td>
    </tr>
  )
}

export default function ReportsPage() {
  const qc = useQueryClient()
  const { isAdmin } = useAuth()
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
  const reportPagination = usePagination(visibleReports)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold text-app-text">Reports</h1>
        <Link to="/admin/reports/new" className="btn-primary text-sm py-2 px-3 shrink-0">
          New report
        </Link>
      </div>

      {isLoading ? (
        <p className="text-sm text-app-muted">Loading reports…</p>
      ) : visibleReports.length === 0 ? (
        <p className="text-sm text-app-muted">No reports match your filters.</p>
      ) : (
        <div className="card overflow-x-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b app-divider">
            <h2 className="font-bold text-app-text text-sm">All reports ({visibleReports.length})</h2>
            <label className="checkbox-label checkbox-label--muted">
              <input
                type="checkbox"
                checked={showHidden}
                onChange={(e) => setShowHidden(e.target.checked)}
                className="checkbox"
              />
              <span>Include hidden reports</span>
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
