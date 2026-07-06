import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reportsApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { toast } from '../../components/ui/toast'
import type { UserExplorationReport } from '../../types'
import { EmptyState, PageHeader } from './DashboardUi'

type WizardStep = 'describe' | 'generating' | 'preview' | 'refine'

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}

export default function ExplorationReportPage() {
  const { hasPaidAccess } = useAuth()
  const qc = useQueryClient()
  const [step, setStep] = useState<WizardStep>('describe')
  const [prompt, setPrompt] = useState('')
  const [title, setTitle] = useState('')
  const [refineNotes, setRefineNotes] = useState('')
  const [activeId, setActiveId] = useState<number | null>(null)

  const { data: listData, isLoading } = useQuery({
    queryKey: ['exploration-reports'],
    queryFn: () => reportsApi.explorationList().then((r) => r.data.results ?? []),
    enabled: hasPaidAccess,
  })

  const { data: activeReport } = useQuery({
    queryKey: ['exploration-report', activeId],
    queryFn: () => reportsApi.explorationGet(activeId!).then((r) => r.data),
    enabled: activeId != null,
    refetchInterval: (query) =>
      query.state.data?.status === 'generating' ? 2000 : false,
  })

  const generate = useMutation({
    mutationFn: () =>
      reportsApi.explorationGenerate({
        prompt,
        title: title || undefined,
        context: {},
      }),
    onSuccess: (res) => {
      setActiveId(res.data.id)
      setStep('generating')
      qc.invalidateQueries({ queryKey: ['exploration-reports'] })
    },
    onError: () => toast.error('Could not start report generation'),
  })

  const refine = useMutation({
    mutationFn: () => reportsApi.explorationRefine(activeId!, refineNotes),
    onSuccess: () => {
      setRefineNotes('')
      setStep('generating')
      qc.invalidateQueries({ queryKey: ['exploration-report', activeId] })
    },
    onError: () => toast.error('Could not refine report'),
  })

  const exportPdf = useMutation({
    mutationFn: () => reportsApi.explorationExportPdf(activeId!),
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['exploration-report', activeId] })
      toast.success('PDF exported')
    },
    onError: () => toast.error('PDF export failed'),
  })

  const report: UserExplorationReport | undefined = activeReport

  useEffect(() => {
    if (!report) return
    if (report.status === 'ready' && step === 'generating') setStep('preview')
    if (report.status === 'failed' && step === 'generating') setStep('preview')
  }, [report, step])

  if (!hasPaidAccess) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <PageHeader
          title="Exploration reports"
          description="Generate professional geological reports from your map explorations."
        />
        <EmptyState
          message="A paid subscription is required to generate exploration reports."
          action={
            <Link to="/subscriptions" className="btn-primary text-sm">
              View plans
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <PageHeader
        title="Exploration reports"
        description="Describe what you explored, preview the narrative, refine with instructions, then export a professional PDF."
      />

      {step === 'describe' && (
        <div className="card space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-app-text">Title (optional)</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="input mt-1 w-full" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-app-text">What should this report cover?</span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="input mt-1 w-full min-h-[140px]"
              placeholder="Summarize the geological setting, commodities of interest, and questions you want answered."
            />
          </label>
          <button
            type="button"
            className="btn-primary"
            disabled={!prompt.trim() || generate.isPending}
            onClick={() => generate.mutate()}
          >
            {generate.isPending ? 'Starting…' : 'Generate draft (3 credits)'}
          </button>
        </div>
      )}

      {(step === 'generating' || step === 'preview' || step === 'refine') && report && (
        <div className="space-y-6">
          {report.status === 'generating' && (
            <div className="card text-center py-10">
              <p className="font-medium text-app-text">Generating your report…</p>
              <p className="text-sm text-app-muted mt-2">This usually takes under a minute.</p>
            </div>
          )}

          {report.status === 'failed' && (
            <div className="card border-red-200 bg-red-50 text-red-800 text-sm">{report.error_message || 'Generation failed.'}</div>
          )}

          {report.status === 'ready' && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="card">
                <h2 className="font-semibold text-app-text">{report.title || 'Exploration report'}</h2>
                <div className="mt-4 prose prose-sm max-w-none text-app-text-secondary whitespace-pre-wrap">
                  {report.narrative}
                </div>
              </div>
              <div className="card space-y-4">
                <h3 className="font-semibold text-app-text">Refine</h3>
                <textarea
                  value={refineNotes}
                  onChange={(e) => setRefineNotes(e.target.value)}
                  className="input min-h-[100px] w-full text-sm"
                  placeholder="Ask for more detail on a section, change tone, or add recommendations."
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    disabled={!refineNotes.trim() || refine.isPending}
                    onClick={() => refine.mutate()}
                  >
                    {refine.isPending ? 'Refining…' : 'Refine (1 credit)'}
                  </button>
                  <button
                    type="button"
                    className="btn-primary text-sm"
                    disabled={exportPdf.isPending}
                    onClick={() => exportPdf.mutate()}
                  >
                    {exportPdf.isPending ? 'Exporting…' : 'Export PDF (5 credits)'}
                  </button>
                  {report.pdf_file && (
                    <button
                      type="button"
                      className="btn-secondary text-sm"
                      onClick={async () => {
                        const { data } = await reportsApi.explorationDownload(report.id)
                        downloadBlob(new Blob([data]), `exploration-${report.id}.pdf`)
                      }}
                    >
                      Download PDF
                    </button>
                  )}
                </div>
                <button type="button" className="text-sm text-terra-600" onClick={() => setStep('describe')}>
                  Start a new report
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-app-text mb-3">Your reports</h2>
        {isLoading ? (
          <p className="text-sm text-app-muted">Loading…</p>
        ) : !listData?.length ? (
          <p className="text-sm text-app-muted">No exploration reports yet.</p>
        ) : (
          <ul className="card !p-0 overflow-hidden app-divide-y">
            {listData.map((item) => (
              <li key={item.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-app-text">{item.title || `Report #${item.id}`}</p>
                  <p className="text-xs text-app-muted capitalize">{item.status}</p>
                </div>
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => {
                    setActiveId(item.id)
                    setStep(item.status === 'ready' ? 'preview' : 'generating')
                  }}
                >
                  Open
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
