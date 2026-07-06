import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAllMapLayers, reportsApi, subscriptionsApi } from '../../api'
import ReportLocationPicker, { type ReportLocationValue } from '../../components/reports/ReportLocationPicker'
import ReportLayerPicker from '../../components/reports/ReportLayerPicker'
import ReportSetupPanel from '../../components/reports/ReportSetupPanel'
import type { LayerRegionRef } from '../../components/reports/reportEditorText'
import ReportContentWorkflow from '../../components/reports/ReportContentWorkflow'
import { mergeReportDocument, splitReportDocument, htmlToFindingsText } from '../../components/reports/reportEditorText'
import FileUploadField from '../../components/ui/FileUploadField'
import { toast } from '../../components/ui/toast'
import { useDisplayName } from '../../i18n/useDisplayName'
import type { Report } from '../../types'

const DOCUMENT_ACCEPT =
  '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

type ReportMode = 'write' | 'upload'
type EditorStep = 1 | 2 | 3

const REPORT_STEPS: { id: EditorStep; label: string; hint: string }[] = [
  { id: 1, label: 'Setup', hint: 'Layer & location' },
  { id: 2, label: 'Content', hint: 'Title, write, review & edit' },
  { id: 3, label: 'Publish', hint: 'Price, format & catalog' },
]

function findingsToText(findings: string[] | undefined) {
  return (findings ?? []).join('\n')
}

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

function textToFindings(text: string) {
  const plain = text.includes('<') ? htmlToFindingsText(text) : text
  return plain
    .split('\n')
    .map((line) => line.trim().replace(/^[-•]\s*/, ''))
    .filter(Boolean)
}

function ReportStepIndicator({
  currentStep,
  maxReachableStep,
  onStepClick,
}: {
  currentStep: EditorStep
  maxReachableStep: EditorStep
  onStepClick: (step: EditorStep) => void
}) {
  return (
    <ol className="flex flex-wrap items-center justify-center gap-2 text-xs">
      {REPORT_STEPS.map((step, index) => {
        const isActive = step.id === currentStep
        const isDone = step.id < currentStep
        const isReachable = step.id <= maxReachableStep

        return (
          <li key={step.id} className="flex items-center gap-2">
            {index > 0 && <span className="text-app-text-muted">→</span>}
            <button
              type="button"
              disabled={!isReachable}
              onClick={() => isReachable && onStepClick(step.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium transition-colors ${
                isActive
                  ? 'bg-terra-500/10 text-terra-700 dark:text-terra-300 border border-terra-500/25'
                  : isDone
                    ? 'bg-app-subtle text-app-text-secondary border border-app-border hover:border-terra-500/30'
                    : isReachable
                      ? 'text-app-text-secondary border border-app-border hover:border-terra-500/30'
                      : 'text-app-text-muted border border-transparent opacity-60 cursor-not-allowed'
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                  isActive
                    ? 'bg-terra-600 text-white'
                    : isDone
                      ? 'bg-terra-600/80 text-white'
                      : 'bg-app-subtle text-app-text-muted'
                }`}
              >
                {step.id}
              </span>
              <span>{step.label}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

export default function ReportEditorPage() {
  const { slug } = useParams<{ slug: string }>()
  const isNew = !slug || slug === 'new'
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const qc = useQueryClient()
  const displayName = useDisplayName()

  const [currentStep, setCurrentStep] = useState<EditorStep>(1)
  const [reportMode, setReportMode] = useState<ReportMode>(() =>
    searchParams.get('mode') === 'upload' ? 'upload' : 'write',
  )
  const [form, setForm] = useState({
    title: '',
    mineral: '',
    primary_layer_id: '',
    region: '',
    description: '',
    price: '25000',
    is_active: true,
    executive_summary: '',
    key_findings: '',
    access_type: 'paid' as Report['access_type'],
    report_format: 'pdf' as Report['report_format'],
    allowed_plan_ids: [] as number[],
    layer_ids: [] as number[],
  })
  const [location, setLocation] = useState<ReportLocationValue>({
    regionId: '',
    centerLat: '',
    centerLng: '',
    zoom: '',
    boundingBox: { west: '', south: '', east: '', north: '' },
    boundaryIds: [],
    locationLabel: '',
  })
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [regeneratePdf, setRegeneratePdf] = useState(false)
  const [contentApproved, setContentApproved] = useState(false)

  const { data: report, isLoading: loadingReport } = useQuery({
    queryKey: ['admin-report', slug],
    queryFn: () => reportsApi.adminGet(slug!).then((r) => r.data),
    enabled: !isNew && !!slug,
  })

  const { data: availableLayers = [], isLoading: loadingLayers } = useQuery({
    queryKey: ['report-editor-layers'],
    queryFn: () => fetchAllMapLayers(),
  })

  const selectedLayer = availableLayers.find((layer) => String(layer.id) === form.primary_layer_id)

  const layerRegions = useMemo(() => {
    const seen = new Set<string>()
    const rows: LayerRegionRef[] = []
    for (const id of form.layer_ids) {
      const layer = availableLayers.find((item) => item.id === id)
      if (!layer || (!layer.region && !layer.region_name)) continue
      const key = `${layer.region ?? 'none'}:${layer.region_name ?? ''}`
      if (seen.has(key)) continue
      seen.add(key)
      rows.push({ regionId: layer.region, regionName: layer.region_name })
    }
    return rows
  }, [form.layer_ids, availableLayers])

  const { data: plans } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => subscriptionsApi.plans().then((r) => r.data),
  })

  useEffect(() => {
    if (!report) return
    const executive = mergeReportDocument(
      report.ai_summary?.summary || '',
      findingsToText(report.ai_summary?.key_findings),
    )
    const bbox = report.bounding_box ?? {}
    const linkedLayerIds = report.linked_layers?.map((l) => l.id) ?? []
    setForm({
      title: report.title,
      mineral: String(report.mineral),
      primary_layer_id: linkedLayerIds[0] ? String(linkedLayerIds[0]) : '',
      region: report.region ? String(report.region) : '',
      description: report.description || '',
      price: report.price,
      is_active: report.is_active ?? true,
      executive_summary: executive,
      key_findings: '',
      access_type: report.access_type ?? 'paid',
      report_format: report.report_format ?? 'pdf',
      allowed_plan_ids: report.allowed_plan_ids ?? [],
      layer_ids: linkedLayerIds,
    })
    setLocation({
      regionId: report.region ? String(report.region) : '',
      centerLat: report.center_lat != null ? String(report.center_lat) : '',
      centerLng: report.center_lng != null ? String(report.center_lng) : '',
      zoom: report.zoom != null ? String(report.zoom) : '',
      boundingBox: {
        west: bbox.west != null ? String(bbox.west) : '',
        south: bbox.south != null ? String(bbox.south) : '',
        east: bbox.east != null ? String(bbox.east) : '',
        north: bbox.north != null ? String(bbox.north) : '',
      },
      boundaryIds: report.location_tags?.map((t) => t.id) ?? [],
      locationLabel: report.location_tags?.map((t) => t.name).join(' · ') ?? '',
    })
    const hasWritten = executive.trim().length > 0
    if (report.has_pdf && !hasWritten) {
      setReportMode('upload')
    }
    if (hasWritten) {
      setContentApproved(true)
    }
    if (hasWritten || report.has_pdf) {
      setCurrentStep(2)
    }
  }, [report])

  useEffect(() => {
    if (!form.mineral || form.primary_layer_id || availableLayers.length === 0) return
    const match = availableLayers.find((layer) => layer.mineral === Number(form.mineral))
    if (match) {
      setForm((prev) => ({ ...prev, primary_layer_id: String(match.id) }))
    }
  }, [form.mineral, form.primary_layer_id, availableLayers])

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-reports'] })
    qc.invalidateQueries({ queryKey: ['reports'] })
    if (slug) qc.invalidateQueries({ queryKey: ['admin-report', slug] })
  }

  const buildPayload = () => {
    const bbox: Record<string, number> = {}
    for (const edge of ['west', 'south', 'east', 'north'] as const) {
      const raw = location.boundingBox[edge]
      if (raw.trim()) bbox[edge] = Number(raw)
    }
    const { body, findings } = splitReportDocument(form.executive_summary)
    return {
      title: form.title,
      mineral: Number(form.mineral),
      region: form.region ? Number(form.region) : location.regionId ? Number(location.regionId) : null,
      description: form.description,
      price: form.price,
      is_active: form.is_active,
      access_type: form.access_type,
      report_format: reportMode === 'upload' ? 'pdf' : form.report_format,
      source_type: reportMode === 'upload' ? 'uploaded' : 'ai_generated',
      allowed_plan_ids: form.allowed_plan_ids,
      layer_ids: form.layer_ids,
      boundary_ids: location.boundaryIds,
      center_lat: location.centerLat ? Number(location.centerLat) : null,
      center_lng: location.centerLng ? Number(location.centerLng) : null,
      zoom: location.zoom ? Number(location.zoom) : null,
      bounding_box: bbox,
      executive_summary: body,
      key_findings: textToFindings(findings),
      ...(regeneratePdf ? { regenerate_pdf: true } : {}),
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = buildPayload()

      if (isNew) {
        if (reportMode === 'upload' && documentFile) {
          const fd = new FormData()
          Object.entries(payload).forEach(([key, value]) => {
            if (key === 'key_findings' || key === 'allowed_plan_ids' || key === 'layer_ids' || key === 'boundary_ids' || key === 'bounding_box') {
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
          if (
            key === 'key_findings' ||
            key === 'allowed_plan_ids' ||
            key === 'layer_ids' ||
            key === 'boundary_ids' ||
            key === 'bounding_box'
          ) {
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
      toast.success(isNew ? 'Report created' : 'Report saved')
      if (isNew) {
        navigate(`/admin/reports/${res.data.slug}/edit`, { replace: true })
      }
    },
    onError: () => toast.error('Could not save report', { description: 'Check required fields and try again.' }),
  })

  const hasWrittenContent = form.executive_summary.trim().length > 0

  const step1Complete = form.layer_ids.length > 0 && Boolean(form.primary_layer_id)
  const step2Complete =
    step1Complete &&
    Boolean(form.title.trim()) &&
    (reportMode === 'upload'
      ? Boolean(documentFile || (!isNew && report?.has_pdf))
      : hasWrittenContent && contentApproved)

  const canContinue =
    currentStep === 1 ? step1Complete : currentStep === 2 ? step2Complete : false

  const step3Ready = step1Complete && step2Complete && Boolean(form.title.trim())

  const continueHint =
    currentStep === 1 && !step1Complete
      ? 'Select at least one layer to continue.'
      : currentStep === 2 && !step2Complete
        ? reportMode === 'upload'
          ? !form.title.trim()
            ? 'Add a title and upload a document.'
            : 'Upload a PDF or Word file.'
          : !form.title.trim()
            ? 'Add a report title.'
            : !hasWrittenContent
              ? 'Generate or write report content.'
              : !contentApproved
                ? 'Approve your draft to continue.'
                : ''
        : ''

  const maxReachableStep: EditorStep = step2Complete ? 3 : step1Complete ? 2 : 1

  function handleSave() {
    if (reportMode === 'upload' && isNew && !documentFile) {
      toast.error('Choose a PDF or Word document to upload')
      return
    }
    if (reportMode === 'write' && !hasWrittenContent) {
      toast.error('Add content before saving', { description: 'Write content or apply a generated draft first.' })
      return
    }
    save.mutate()
  }

  function switchReportMode(next: ReportMode) {
    setReportMode(next)
    if (next === 'write') {
      setDocumentFile(null)
    } else {
      setContentApproved(false)
    }
  }

  function validateStep(step: EditorStep): boolean {
    if (step === 1) {
      if (!form.primary_layer_id) {
        toast.error('Select a map layer')
        return false
      }
      return true
    }
    if (step === 2) {
      if (!step1Complete) {
        toast.error('Complete setup first', { description: 'Select at least one map layer in step 1.' })
        return false
      }
      if (!form.title.trim()) {
        toast.error('Add a report title')
        return false
      }
      if (reportMode === 'upload') {
        if (isNew && !documentFile) {
          toast.error('Upload a document', { description: 'Choose a PDF or Word file to continue.' })
          return false
        }
        if (!isNew && !documentFile && !report?.has_pdf) {
          toast.error('Upload a document', { description: 'Choose a file or switch to Write report.' })
          return false
        }
      } else if (!hasWrittenContent) {
        toast.error('Add report content', {
          description: 'Generate a draft with Terra Assistant or write in the editor.',
        })
        return false
      } else if (!contentApproved) {
        toast.error('Approve your content', {
          description: 'Review the draft and click Approve content before continuing.',
        })
        return false
      }
      return true
    }
    return true
  }

  function goToStep(step: EditorStep) {
    if (step > currentStep) {
      for (let s = currentStep; s < step; s++) {
        if (!validateStep(s as EditorStep)) return
      }
    }
    setCurrentStep(step)
  }

  function handleNext() {
    if (!validateStep(currentStep)) return
    if (currentStep < 3) {
      setCurrentStep((currentStep + 1) as EditorStep)
    }
  }

  function handleBack() {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as EditorStep)
    }
  }

  const mineralName = selectedLayer?.mineral_name ?? ''
  const selectedLayersForReview = form.layer_ids
    .map((id) => availableLayers.find((layer) => layer.id === id))
    .filter(Boolean)
  const activeStepMeta = REPORT_STEPS.find((s) => s.id === currentStep)!

  if (!isNew && loadingReport) {
    return <p className="text-sm text-app-muted">Loading report…</p>
  }

  const saveLabel =
    reportMode === 'upload'
      ? isNew
        ? 'Create from document'
        : documentFile
          ? 'Save & replace document'
          : 'Save & publish'
      : isNew
        ? form.is_active
          ? 'Create & publish'
          : 'Save draft'
        : form.is_active
          ? 'Save & publish'
          : 'Save changes'

  const formatLabel =
    form.report_format === 'pdf'
      ? 'PDF only'
      : form.report_format === 'web_article'
        ? 'Web article only'
        : 'PDF and web article'

  const accessLabel =
    form.access_type === 'free'
      ? 'Free'
      : form.access_type === 'paid'
        ? `Paid · ${Number(form.price).toLocaleString()} TZS`
        : form.access_type === 'subscriber_only'
          ? 'Subscriber only'
          : 'Subscriber or paid'

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <Link to="/admin/reports" className="text-sm text-terra-600 dark:text-terra-400 hover:underline">
            ← Back to reports
          </Link>
          <h1 className="text-2xl font-bold text-app-text mt-2">{isNew ? 'New report' : 'Edit report'}</h1>
          <p className="text-sm text-app-muted mt-1">
            Step {currentStep} of 3 — {activeStepMeta.hint}
          </p>
        </div>
        {!isNew && report && (
          <Link to={`/downloads/${report.slug}`} className="btn-secondary text-sm shrink-0">
            Preview catalog page
          </Link>
        )}
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="px-5 py-4 border-b app-divider">
          <ReportStepIndicator
            currentStep={currentStep}
            maxReachableStep={maxReachableStep}
            onStepClick={goToStep}
          />
          {currentStep !== 1 && (
            <div className="mt-3">
              <h2 className="font-bold text-app-text">
                Step {currentStep}: {activeStepMeta.label}
              </h2>
              <p className="text-sm text-app-muted mt-0.5">{activeStepMeta.hint}</p>
            </div>
          )}
        </div>

        <div className="px-5 py-5 space-y-6">
          {currentStep === 1 && (
            <ReportSetupPanel
              layers={
                <ReportLayerPicker
                  layers={availableLayers}
                  selectedIds={form.layer_ids}
                  primaryLayerId={form.primary_layer_id}
                  loading={loadingLayers}
                  displayName={displayName}
                  onChange={({ layerIds, primaryLayerId, mineral }) => {
                    setForm((prev) => ({
                      ...prev,
                      layer_ids: layerIds,
                      primary_layer_id: primaryLayerId,
                      mineral,
                    }))
                  }}
                />
              }
              locations={
                <ReportLocationPicker
                  key={slug ?? 'new'}
                  value={{ ...location, regionId: form.region || location.regionId }}
                  layerRegions={layerRegions}
                  hasLayersSelected={form.layer_ids.length > 0}
                  onChange={(next) => {
                    setLocation(next)
                    if (next.regionId) setForm((prev) => ({ ...prev, region: next.regionId }))
                  }}
                />
              }
            />
          )}

          {currentStep === 2 && (
            <>
              <div className="segmented w-full sm:w-auto max-w-xs" role="tablist" aria-label="Report content mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={reportMode === 'write'}
                  onClick={() => switchReportMode('write')}
                  className={`segmented-btn flex-1 px-3 py-1.5 text-sm ${
                    reportMode === 'write' ? 'segmented-btn-active' : ''
                  }`}
                >
                  Write
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={reportMode === 'upload'}
                  onClick={() => switchReportMode('upload')}
                  className={`segmented-btn flex-1 px-3 py-1.5 text-sm ${
                    reportMode === 'upload' ? 'segmented-btn-active' : ''
                  }`}
                >
                  Upload
                </button>
              </div>

              <div className={reportMode === 'write' ? 'report-step-canvas' : 'space-y-4'}>
              {reportMode === 'write' ? (
                <ReportContentWorkflow
                  title={form.title}
                  onTitleChange={(value) => setForm((prev) => ({ ...prev, title: value }))}
                  executiveSummary={form.executive_summary}
                  onExecutiveSummaryChange={(value) =>
                    setForm((prev) => ({ ...prev, executive_summary: value }))
                  }
                  assistantMetadata={{
                    title: form.title,
                    mineralName,
                    regionName: location.locationLabel,
                    description: form.description,
                    currentExecutiveSummary: form.executive_summary,
                    currentKeyFindings: splitReportDocument(form.executive_summary).findings,
                  }}
                  assistantDisabled={!form.primary_layer_id}
                  contentApproved={contentApproved}
                  onContentApprovedChange={setContentApproved}
                />
              ) : (
                <section className="space-y-4">
                  <label className="block rounded-xl border border-app-border overflow-hidden bg-app-surface px-4 py-4">
                    <span className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                      Report title
                    </span>
                    <input
                      placeholder="e.g. Eastern belt gold prospectivity assessment"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="mt-2 w-full border-0 bg-transparent p-0 text-xl font-semibold text-app-text placeholder:text-app-text-muted focus:outline-none focus:ring-0"
                    />
                    <p className="text-xs text-app-muted mt-1">Shown in the catalog and on the downloadable PDF</p>
                  </label>

                  <div className="rounded-xl border border-app-border p-4 space-y-4">
                  <FileUploadField
                    label="Document file"
                    accept={DOCUMENT_ACCEPT}
                    value={documentFile}
                    onChange={setDocumentFile}
                    placeholder="PDF or Word (.docx)"
                    hint="Word documents convert to PDF automatically when you publish."
                  />
                  {documentFile && documentFile.name.toLowerCase().endsWith('.docx') && (
                    <p className="text-xs text-app-text-muted">Will convert to PDF on save.</p>
                  )}
                  {!isNew && report?.has_pdf && !documentFile && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      A PDF is already on file. Upload a new file to replace it, or continue to publish settings.
                    </p>
                  )}
                  </div>
                </section>
              )}
              </div>
            </>
          )}

          {currentStep === 3 && (
            <>
              <section className="rounded-xl border border-app-border bg-app-subtle/25 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-app-text">Review before publishing</h3>
                <dl className="grid gap-2 sm:grid-cols-2 text-sm">
                  <div>
                    <dt className="text-xs text-app-text-muted">Title</dt>
                    <dd className="font-medium text-app-text">{form.title || '—'}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-app-text-muted">Layers ({selectedLayersForReview.length})</dt>
                    <dd className="font-medium text-app-text mt-0.5">
                      {selectedLayersForReview.length
                        ? selectedLayersForReview
                            .map((layer) => {
                              const name = displayName(layer!)
                              return String(layer!.id) === form.primary_layer_id ? `${name} (primary)` : name
                            })
                            .join(' · ')
                        : '—'}
                      {mineralName ? ` · ${mineralName}` : ''}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-app-text-muted">
                      Locations ({location.boundaryIds.length})
                    </dt>
                    <dd className="font-medium text-app-text mt-0.5">
                      {location.locationLabel || 'Not set'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-app-text-muted">Content</dt>
                    <dd className="font-medium text-app-text">
                      {reportMode === 'upload'
                        ? documentFile
                          ? documentFile.name
                          : report?.has_pdf
                            ? 'Existing PDF on file'
                            : 'No document'
                        : hasWrittenContent
                          ? `${form.executive_summary.trim().split(/\s+/).filter(Boolean).length} words written`
                          : 'Empty'}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-app-text">Access and pricing</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-app-text-secondary">Access type</span>
                    <select
                      value={form.access_type}
                      onChange={(e) =>
                        setForm({ ...form, access_type: e.target.value as Report['access_type'] })
                      }
                      className="input mt-1.5 w-full"
                    >
                      <option value="free">Free</option>
                      <option value="paid">Paid</option>
                      <option value="subscriber_only">Subscriber only</option>
                      <option value="subscriber_or_paid">Subscriber or paid</option>
                    </select>
                  </label>
                  {form.access_type !== 'free' && (
                    <label className="block">
                      <span className="text-sm font-medium text-app-text-secondary">Price (TZS)</span>
                      <input
                        type="number"
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                        className="input mt-1.5 w-full"
                      />
                    </label>
                  )}
                </div>
                {(form.access_type === 'subscriber_only' || form.access_type === 'subscriber_or_paid') && (
                  <div>
                    <span className="text-sm font-medium text-app-text-secondary">Allowed subscription plans</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(plans?.results ?? []).map((plan) => {
                        const checked = form.allowed_plan_ids.includes(plan.id)
                        return (
                          <label
                            key={plan.id}
                            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm cursor-pointer ${
                              checked ? 'border-terra-500 bg-terra-50' : 'border-app-border'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setForm((prev) => ({
                                  ...prev,
                                  allowed_plan_ids: checked
                                    ? prev.allowed_plan_ids.filter((id) => id !== plan.id)
                                    : [...prev.allowed_plan_ids, plan.id],
                                }))
                              }}
                            />
                            {plan.name}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </section>

              {reportMode === 'write' && (
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-app-text">Output format</h3>
                  <select
                    value={form.report_format}
                    onChange={(e) =>
                      setForm({ ...form, report_format: e.target.value as Report['report_format'] })
                    }
                    className="input max-w-md"
                  >
                    <option value="pdf">PDF only</option>
                    <option value="web_article">Web article only</option>
                    <option value="pdf_and_article">PDF and web article</option>
                  </select>
                  {form.report_format !== 'pdf' && !isNew && report?.has_article && (
                    <Link to={`/downloads/${report.slug}/read`} className="text-sm text-terra-600 hover:underline block">
                      Preview web article
                    </Link>
                  )}
                </section>
              )}

              <section className="space-y-3 rounded-xl border border-app-border p-4">
                <h3 className="text-sm font-semibold text-app-text">Catalog visibility</h3>
                <label className="flex items-start gap-3 text-sm text-app-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="rounded border-app-border mt-0.5"
                  />
                  <span>
                    <span className="font-medium text-app-text block">Visible in catalog</span>
                    <span className="text-xs text-app-text-muted">
                      {form.is_active
                        ? 'Report will appear in the public catalog after you save.'
                        : 'Save as draft — hidden from catalog until you enable visibility.'}
                    </span>
                  </span>
                </label>
                {!isNew && report?.has_pdf && reportMode === 'write' && (
                  <label className="flex items-center gap-2 text-sm text-app-text-secondary">
                    <input
                      type="checkbox"
                      checked={regeneratePdf}
                      onChange={(e) => setRegeneratePdf(e.target.checked)}
                      className="rounded border-app-border"
                    />
                    Regenerate PDF after save
                  </label>
                )}
              </section>

              <section className="rounded-lg border border-dashed border-app-border px-4 py-3 text-sm text-app-text-secondary">
                <p>
                  <span className="font-medium text-app-text">Ready to publish:</span> {accessLabel}
                  {reportMode === 'write' ? ` · ${formatLabel}` : ' · PDF from upload'}
                  {form.is_active ? ' · Public catalog' : ' · Draft (hidden)'}
                </p>
              </section>
            </>
          )}
        </div>

        <div className="px-5 py-4 border-t app-divider">
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              {currentStep > 1 && (
                <button type="button" onClick={handleBack} className="btn-secondary text-sm">
                  Back
                </button>
              )}
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-primary text-sm"
                  disabled={!canContinue}
                  title={continueHint || undefined}
                >
                  Continue to step {currentStep + 1}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!step3Ready || save.isPending}
                  className="btn-primary text-sm"
                >
                  {save.isPending ? 'Saving…' : saveLabel}
                </button>
              )}
            </div>

            <p className="text-xs text-app-text-muted">
              {continueHint ||
                (currentStep === 1 && 'Location is optional but improves assistant insights and map surfacing.')}
              {!continueHint && currentStep === 2 &&
                (reportMode === 'write'
                  ? contentApproved
                    ? 'Approved — continue to publish.'
                    : 'Generate, edit, then approve.'
                  : 'Upload a finished PDF or Word file.')}
              {!continueHint && currentStep === 3 &&
                (form.is_active
                  ? 'Saving publishes to the catalog and generates or refreshes the PDF.'
                  : 'Save as draft. You can publish later by enabling catalog visibility.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
