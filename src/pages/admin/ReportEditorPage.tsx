import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { geographyApi, mineralsApi, reportsApi } from '../../api'
import ReportWritingAssistant from '../../components/reports/ReportWritingAssistant'
import FileUploadField from '../../components/ui/FileUploadField'
import { useDisplayName } from '../../i18n/useDisplayName'

const DOCUMENT_ACCEPT =
  '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

type ReportMode = 'write' | 'upload'

function findingsToText(findings: string[] | undefined) {
  return (findings ?? []).join('\n')
}

function textToFindings(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim().replace(/^[-•]\s*/, ''))
    .filter(Boolean)
}

export default function ReportEditorPage() {
  const { slug } = useParams<{ slug: string }>()
  const isNew = !slug || slug === 'new'
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const qc = useQueryClient()
  const displayName = useDisplayName()

  const [reportMode, setReportMode] = useState<ReportMode>(() =>
    searchParams.get('mode') === 'upload' ? 'upload' : 'write',
  )
  const [form, setForm] = useState({
    title: '',
    mineral: '',
    region: '',
    description: '',
    price: '25000',
    is_active: true,
    executive_summary: '',
    key_findings: '',
  })
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [regeneratePdf, setRegeneratePdf] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: report, isLoading: loadingReport } = useQuery({
    queryKey: ['admin-report', slug],
    queryFn: () => reportsApi.adminGet(slug!).then((r) => r.data),
    enabled: !isNew && !!slug,
  })

  const { data: minerals } = useQuery({
    queryKey: ['minerals'],
    queryFn: () => mineralsApi.list().then((r) => r.data),
  })

  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: () => geographyApi.regions().then((r) => r.data),
  })

  useEffect(() => {
    if (!report) return
    const executive = report.ai_summary?.summary || ''
    const findings = findingsToText(report.ai_summary?.key_findings)
    setForm({
      title: report.title,
      mineral: String(report.mineral),
      region: report.region ? String(report.region) : '',
      description: report.description || '',
      price: report.price,
      is_active: report.is_active ?? true,
      executive_summary: executive,
      key_findings: findings,
    })
    const hasWritten = executive.trim().length > 0 || findings.trim().length > 0
    if (report.has_pdf && !hasWritten) {
      setReportMode('upload')
    }
  }, [report])

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-reports'] })
    qc.invalidateQueries({ queryKey: ['reports'] })
    if (slug) qc.invalidateQueries({ queryKey: ['admin-report', slug] })
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        mineral: Number(form.mineral),
        region: form.region ? Number(form.region) : null,
        description: form.description,
        price: form.price,
        is_active: form.is_active,
        executive_summary: form.executive_summary,
        key_findings: textToFindings(form.key_findings),
        ...(regeneratePdf ? { regenerate_pdf: true } : {}),
      }

      if (isNew) {
        if (reportMode === 'upload' && documentFile) {
          const fd = new FormData()
          Object.entries(payload).forEach(([key, value]) => {
            if (key === 'key_findings') {
              fd.append(key, JSON.stringify(value))
            } else if (value !== null && value !== undefined) {
              fd.append(key, String(value))
            }
          })
          fd.append('pdf_file', documentFile)
          return reportsApi.create(fd)
        }
        return reportsApi.create(payload)
      }

      if (reportMode === 'upload' && documentFile) {
        const fd = new FormData()
        Object.entries(payload).forEach(([key, value]) => {
          if (key === 'key_findings') {
            fd.append(key, JSON.stringify(value))
          } else if (value !== null && value !== undefined) {
            fd.append(key, String(value))
          }
        })
        fd.append('pdf_file', documentFile)
        return reportsApi.adminUpdate(slug!, fd)
      }
      return reportsApi.adminUpdate(slug!, payload)
    },
    onSuccess: (res) => {
      invalidate()
      setError(null)
      if (isNew) {
        navigate(`/admin/reports/${res.data.slug}/edit`, { replace: true })
      }
    },
    onError: () => setError('Could not save report. Check required fields and try again.'),
  })

  const hasWrittenContent =
    form.executive_summary.trim().length > 0 || textToFindings(form.key_findings).length > 0

  function handleSave() {
    if (reportMode === 'upload' && isNew && !documentFile) {
      setError('Choose a PDF or Word document to upload.')
      return
    }
    if (reportMode === 'write' && !hasWrittenContent) {
      setError('Write content or apply an AI draft before saving.')
      return
    }
    setError(null)
    save.mutate()
  }

  function switchReportMode(next: ReportMode) {
    setReportMode(next)
    if (next === 'write') {
      setDocumentFile(null)
    }
  }

  const selectedMineral = minerals?.results.find((m) => String(m.id) === form.mineral)
  const mineralName = selectedMineral ? displayName(selectedMineral) : ''
  const regionName = regions?.results.find((r) => String(r.id) === form.region)?.name || ''

  if (!isNew && loadingReport) {
    return <p className="text-sm text-app-muted">Loading report…</p>
  }

  const saveLabel =
    reportMode === 'upload'
      ? isNew
        ? 'Create from document'
        : documentFile
          ? 'Save & replace document'
          : 'Save changes'
      : isNew
        ? 'Create report'
        : 'Save changes'

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <Link to="/admin/reports" className="text-sm text-terra-600 dark:text-terra-400 hover:underline">
            ← Back to reports
          </Link>
          <h1 className="text-2xl font-bold text-app-text mt-2">{isNew ? 'New report' : 'Edit report'}</h1>
          <p className="text-sm text-app-muted mt-1">
            {reportMode === 'write'
              ? 'Use the AI assistant or write manually. A branded PDF is generated from your text when you save. No document upload in this mode.'
              : 'Upload a PDF or Word (.docx) document. Word files convert to PDF automatically.'}
          </p>
        </div>
        {!isNew && report && (
          <Link to={`/downloads/${report.slug}`} className="btn-secondary text-sm shrink-0">
            Preview catalog page
          </Link>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="card !p-0 overflow-hidden">
        <div className="px-5 py-4 border-b app-divider">
          <h2 className="font-bold text-app-text">Report content</h2>
          <p className="text-sm text-app-muted mt-1">
            {reportMode === 'write'
              ? 'Draft with AI, review the text below, then save to publish.'
              : 'Attach a finished document instead of writing in the editor.'}
          </p>
          <div className="segmented mt-4 w-full sm:w-auto" role="tablist" aria-label="Report content mode">
            <button
              type="button"
              role="tab"
              aria-selected={reportMode === 'write'}
              onClick={() => switchReportMode('write')}
              className={`segmented-btn flex-1 sm:flex-none px-4 py-2 text-sm ${
                reportMode === 'write' ? 'segmented-btn-active' : ''
              }`}
            >
              Write report
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={reportMode === 'upload'}
              onClick={() => switchReportMode('upload')}
              className={`segmented-btn flex-1 sm:flex-none px-4 py-2 text-sm ${
                reportMode === 'upload' ? 'segmented-btn-active' : ''
              }`}
            >
              Upload document
            </button>
          </div>
        </div>

        <div className="px-5 py-5 space-y-6">
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-app-text">Report details</h3>
            <input
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <select
                value={form.mineral}
                onChange={(e) => setForm({ ...form, mineral: e.target.value })}
                className="input"
              >
                <option value="">Select mineral</option>
                {minerals?.results.map((m) => (
                  <option key={m.id} value={m.id}>
                    {displayName(m)}
                  </option>
                ))}
              </select>
              <select
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                className="input"
              >
                <option value="">Region (optional)</option>
                {regions?.results.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              placeholder="Overview: geological context, scope, and background"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input min-h-[100px]"
              rows={4}
            />
          </section>

          {reportMode === 'write' ? (
            <>
              <ReportWritingAssistant
                metadata={{
                  title: form.title,
                  mineralName,
                  regionName,
                  description: form.description,
                  currentExecutiveSummary: form.executive_summary,
                  currentKeyFindings: form.key_findings,
                }}
                disabled={!form.title || !form.mineral}
                onApplyDraft={({ executiveSummary, keyFindings }) => {
                  setForm((prev) => ({
                    ...prev,
                    executive_summary: executiveSummary,
                    key_findings: keyFindings,
                  }))
                  setError(null)
                }}
              />

              <section className="space-y-3 pt-2 border-t app-divider">
                <div>
                  <h3 className="text-sm font-semibold text-app-text">Review & edit before publishing</h3>
                  <p className="text-sm text-app-muted mt-1">
                    Adjust the AI draft or write from scratch. This text appears in the catalog and downloadable PDF.
                  </p>
                </div>
              </section>

              <section className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-app-text">Executive summary</h3>
                </div>
                <textarea
                  placeholder="Write the executive summary here. Use paragraphs separated by blank lines."
                  value={form.executive_summary}
                  onChange={(e) => setForm({ ...form, executive_summary: e.target.value })}
                  className="input min-h-[220px] font-[inherit] leading-relaxed"
                  rows={12}
                />
              </section>

              <section className="space-y-3 pt-2 border-t app-divider">
                <div>
                  <h3 className="text-sm font-semibold text-app-text">Key findings</h3>
                  <p className="text-sm text-app-muted mt-1">One finding per line. Shown as bullet points in the PDF.</p>
                </div>
                <textarea
                  placeholder={
                    'High prospectivity in the eastern belt\nFavourable geology for alluvial deposits\nRecommended follow-up geophysical survey'
                  }
                  value={form.key_findings}
                  onChange={(e) => setForm({ ...form, key_findings: e.target.value })}
                  className="input min-h-[140px] font-[inherit]"
                  rows={6}
                />
              </section>
            </>
          ) : (
            <section className="space-y-4 pt-2 border-t app-divider">
              <FileUploadField
                label="Document file"
                accept={DOCUMENT_ACCEPT}
                value={documentFile}
                onChange={setDocumentFile}
                placeholder="PDF or Word (.docx)"
                hint="Word documents convert to PDF automatically when you save."
              />
              {documentFile && documentFile.name.toLowerCase().endsWith('.docx') && (
                <p className="text-xs text-app-text-muted">Will convert to PDF on save.</p>
              )}
              {!isNew && report?.has_pdf && !documentFile && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  A PDF is already on file for this report. Upload a new file to replace it.
                </p>
              )}
            </section>
          )}
        </div>

        <div className="px-5 py-4 border-t app-divider space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:items-end">
            <label className="block">
              <span className="text-xs font-medium text-app-text-muted">Price (TZS)</span>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="input mt-1.5 w-full"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-app-text-secondary pb-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="rounded border-app-border"
              />
              Visible in catalog
            </label>
            {!isNew && report?.has_pdf && reportMode === 'write' && (
              <label className="flex items-center gap-2 text-sm text-app-text-secondary pb-2">
                <input
                  type="checkbox"
                  checked={regeneratePdf}
                  onChange={(e) => setRegeneratePdf(e.target.checked)}
                  className="rounded border-app-border"
                />
                Regenerate PDF after save
              </label>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {reportMode === 'write' && !hasWrittenContent ? (
              <p className="text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 rounded-lg px-3 py-2 order-2 sm:order-1">
                Generate a draft with the assistant, review it below, then save to publish.
              </p>
            ) : (
              <p className="text-xs text-app-text-muted order-2 sm:order-1">
                {reportMode === 'upload'
                  ? 'Document upload replaces any existing PDF on save.'
                  : form.is_active
                    ? 'Saving publishes to the catalog and refreshes the PDF from your written content.'
                    : 'Save as draft. Toggle catalog visibility when you are ready to publish.'}
              </p>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={!form.title || !form.mineral || save.isPending}
              className="btn-primary order-1 sm:order-2 shrink-0 self-end sm:self-auto disabled:opacity-50"
            >
              {save.isPending ? 'Saving…' : saveLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
