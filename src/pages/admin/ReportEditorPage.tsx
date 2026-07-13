import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { fetchAllMapLayers, reportsApi, subscriptionsApi } from '../../api'
import ReportLocationPicker, { type ReportLocationValue } from '../../components/reports/ReportLocationPicker'
import {
  drawFromGeometry,
  explorationReady,
  geometryFromDraw,
} from '../../components/map/explorationGeometry'
import ReportLayerPicker from '../../components/reports/ReportLayerPicker'
import ReportSetupPanel from '../../components/reports/ReportSetupPanel'
import type { LayerRegionRef } from '../../components/reports/reportEditorText'
import ReportContentWorkflow from '../../components/reports/ReportContentWorkflow'
import ReportPublishPanel from '../../components/reports/ReportPublishPanel'
import ReportStageBar from '../../components/reports/ReportStageBar'
import { mergeReportDocument, splitReportDocument, htmlToFindingsText, filterReportFindings } from '../../components/reports/reportEditorText'
import {
  clearDraftDocument,
  loadDraftDocument,
  saveDraftDocument,
} from '../../components/reports/reportEditorDraftFile'
import FileUploadField from '../../components/ui/FileUploadField'
import StepProgress from '../../components/ui/StepProgress'
import { toast } from '../../components/ui/toast'
import { useDisplayName } from '../../i18n/useDisplayName'
import type { Report, MapLayer } from '../../types'

const DOCUMENT_ACCEPT =
  '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

type ReportMode = 'write' | 'upload'
type EditorStep = 1 | 2 | 3

const REPORT_STEPS: { id: EditorStep; label: string; hint: string }[] = [
  { id: 1, label: 'Setup', hint: 'Layer & location' },
  { id: 2, label: 'Content', hint: 'Title, write, review & edit' },
  { id: 3, label: 'Publish', hint: 'Price, format & catalog' },
]

const NEW_REPORT_DRAFT_KEY = 'terra-report-editor-new-draft'

function parseStepParam(value: string | null): EditorStep | null {
  if (value === '1' || value === '2' || value === '3') return Number(value) as EditorStep
  return null
}

function clampStep(step: EditorStep, max: EditorStep): EditorStep {
  return Math.min(step, max) as EditorStep
}

function inferMaxStep(args: {
  step1Complete: boolean
  step2Complete: boolean
}): EditorStep {
  if (args.step2Complete) return 3
  if (args.step1Complete) return 2
  return 1
}

function inferDefaultStep(args: {
  step1Complete: boolean
  hasContent: boolean
  hasPdf: boolean
}): EditorStep {
  if (args.step1Complete && (args.hasContent || args.hasPdf)) return 2
  return 1
}

function flattenFieldErrors(value: unknown, prefix = ''): string[] {
  if (value == null) return []
  if (typeof value === 'string') return prefix ? [`${prefix}: ${value}`] : [value]
  if (Array.isArray(value)) {
    const text = value.map(String).filter(Boolean).join(', ')
    return text ? (prefix ? [`${prefix}: ${text}`] : [text]) : []
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) =>
      flattenFieldErrors(nested, prefix ? `${prefix}.${key}` : key),
    )
  }
  return prefix ? [`${prefix}: ${String(value)}`] : [String(value)]
}

function formatSaveError(err: unknown): string {
  if (!isAxiosError(err)) return 'Check required fields and try again.'
  const data = err.response?.data
  if (typeof data === 'string' && data.trim()) return data
  if (data && typeof data === 'object') {
    if ('detail' in data) {
      const detail = (data as { detail?: unknown }).detail
      if (typeof detail === 'string' && detail.trim()) return detail
      if (Array.isArray(detail)) return detail.map(String).join(' ')
    }
    const fieldMessages = flattenFieldErrors(data)
    if (fieldMessages.length) return fieldMessages.join(' · ')
  }
  return 'Check required fields and try again.'
}

function resolveMineralId(form: { mineral: string; primary_layer_id: string }, layers: MapLayer[]) {
  const parsed = Number(form.mineral)
  if (Number.isFinite(parsed) && parsed > 0) return parsed
  const primary = layers.find((layer) => String(layer.id) === form.primary_layer_id)
  return primary?.mineral && primary.mineral > 0 ? primary.mineral : null
}

function findingsToText(findings: string[] | undefined) {
  return (findings ?? []).join('\n')
}

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

function textToFindings(text: string) {
  const plain = text.includes('<') ? htmlToFindingsText(text) : text
  return filterReportFindings(
    plain
      .split('\n')
      .map((line) => line.trim().replace(/^[-•]\s*/, ''))
      .filter(Boolean),
  )
}

export default function ReportEditorPage() {
  const { slug } = useParams<{ slug: string }>()
  const isNew = !slug || slug === 'new'
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const qc = useQueryClient()
  const displayName = useDisplayName()
  const restoredNewDraft = useRef(false)
  const hydratedReportSlug = useRef<string | null>(null)

  const syncStepToUrl = useCallback(
    (step: EditorStep) => {
      setSearchParams(
        (prev) => {
          if (prev.get('step') === String(step)) return prev
          const next = new URLSearchParams(prev)
          next.set('step', String(step))
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const [currentStep, setCurrentStepState] = useState<EditorStep>(
    () => parseStepParam(searchParams.get('step')) ?? 1,
  )

  const setCurrentStep = useCallback(
    (step: EditorStep | ((prev: EditorStep) => EditorStep)) => {
      setCurrentStepState((prev) => {
        const next = typeof step === 'function' ? step(prev) : step
        syncStepToUrl(next)
        return next
      })
    },
    [syncStepToUrl],
  )
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
    locationMode: 'boundaries',
    coordinateMode: 'point',
    drawPoints: [],
    bufferKm: '',
  })
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [restoredDocumentName, setRestoredDocumentName] = useState<string | null>(null)
  const [documentDraftReady, setDocumentDraftReady] = useState(!isNew)
  const restoredDocument = useRef(false)
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
    if (!isNew || restoredNewDraft.current) return
    restoredNewDraft.current = true

    try {
      const raw = sessionStorage.getItem(NEW_REPORT_DRAFT_KEY)
      if (!raw) return
      const draft = JSON.parse(raw) as {
        step?: EditorStep
        reportMode?: ReportMode
        form?: typeof form
        location?: ReportLocationValue
        contentApproved?: boolean
        documentFileName?: string
      }

      if (draft.reportMode) setReportMode(draft.reportMode)
      if (draft.form) {
        if (draft.reportMode === 'upload') {
          setForm({ ...draft.form, executive_summary: '', key_findings: '' })
        } else {
          setForm(draft.form)
        }
      }
      if (draft.location) {
        setLocation({
          ...draft.location,
          locationMode: draft.location.locationMode ?? 'boundaries',
          coordinateMode: draft.location.coordinateMode ?? 'point',
          drawPoints: draft.location.drawPoints ?? [],
          bufferKm: draft.location.bufferKm ?? '',
        })
      }
      if (draft.contentApproved && draft.reportMode !== 'upload') setContentApproved(true)
      if (draft.documentFileName) setRestoredDocumentName(draft.documentFileName)

      const urlStep = parseStepParam(searchParams.get('step'))
      const draftStep = parseStepParam(draft.step != null ? String(draft.step) : null)
      const restoredStep = urlStep ?? draftStep
      if (restoredStep) {
        setCurrentStepState(restoredStep)
        syncStepToUrl(restoredStep)
      }
    } catch {
      // Ignore corrupted draft data.
    }
  }, [isNew, searchParams, syncStepToUrl])

  useEffect(() => {
    if (!isNew) {
      setDocumentDraftReady(true)
      return
    }
    if (restoredDocument.current) return
    restoredDocument.current = true

    loadDraftDocument()
      .then((file) => {
        if (file) {
          setDocumentFile(file)
          setRestoredDocumentName(file.name)
        }
      })
      .catch(() => {
        // Ignore restore failures; user can re-attach the file.
      })
      .finally(() => setDocumentDraftReady(true))
  }, [isNew])

  useEffect(() => {
    if (!isNew) return
    sessionStorage.setItem(
      NEW_REPORT_DRAFT_KEY,
      JSON.stringify({
        step: currentStep,
        reportMode,
        form:
          reportMode === 'upload'
            ? { ...form, executive_summary: '', key_findings: '' }
            : form,
        location,
        contentApproved,
        documentFileName: documentFile?.name ?? restoredDocumentName ?? null,
      }),
    )
  }, [isNew, currentStep, reportMode, form, location, contentApproved, documentFile, restoredDocumentName])

  useEffect(() => {
    if (!isNew || !documentDraftReady) return
    if (documentFile) {
      setRestoredDocumentName(documentFile.name)
      saveDraftDocument(documentFile).catch(() => {
        toast.warning('Could not keep uploaded file after refresh', {
          description: 'Your document is attached for now, but re-upload it if you refresh the page.',
        })
      })
      return
    }
    setRestoredDocumentName(null)
    clearDraftDocument().catch(() => {})
  }, [isNew, documentFile, documentDraftReady])

  useEffect(() => {
    if (!report) return
    if (hydratedReportSlug.current === report.slug) return
    hydratedReportSlug.current = report.slug

    const isUploadedReport = report.source_type === 'uploaded'
    const executive = isUploadedReport
      ? ''
      : mergeReportDocument(
          report.ai_summary?.summary || '',
          findingsToText(report.ai_summary?.key_findings),
        )
    const bbox = report.bounding_box ?? {}
    const linkedLayerIds = report.linked_layers?.map((l) => l.id) ?? []
    const hasWritten = !isUploadedReport && executive.trim().length > 0
    const uploadOnly = isUploadedReport || (report.has_pdf && !hasWritten)

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
    const geom = report.geometry && Object.keys(report.geometry).length > 0 ? report.geometry : null
    const restoredDraw = drawFromGeometry(geom as { type?: string; coordinates?: unknown } | null)
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
      locationLabel:
        restoredDraw
          ? report.buffer_km
            ? `${restoredDraw.mode === 'point' ? 'Point' : 'Polygon'} · +${report.buffer_km} km buffer`
            : restoredDraw.mode === 'point'
              ? 'Custom point'
              : 'Custom polygon'
          : report.location_tags?.map((t) => t.name).join(' · ') ?? '',
      locationMode: restoredDraw ? 'coordinates' : 'boundaries',
      coordinateMode: restoredDraw?.mode === 'polygon' ? 'polygon' : 'point',
      drawPoints: restoredDraw?.points ?? [],
      bufferKm: report.buffer_km != null && report.buffer_km > 0 ? String(report.buffer_km) : '',
    })

    if (uploadOnly || isUploadedReport) {
      setReportMode('upload')
    }
    if (hasWritten) {
      setContentApproved(true)
    }

    const step1Complete = linkedLayerIds.length > 0 && Boolean(linkedLayerIds[0])
    const step2Complete =
      step1Complete &&
      Boolean(report.title?.trim()) &&
      Boolean(uploadOnly ? report.has_pdf : hasWritten)

    const maxStep = inferMaxStep({ step1Complete, step2Complete })
    const urlStep = parseStepParam(searchParams.get('step'))
    const resolvedStep = urlStep
      ? clampStep(urlStep, maxStep)
      : inferDefaultStep({
          step1Complete,
          hasContent: hasWritten,
          hasPdf: Boolean(report.has_pdf),
        })

    setCurrentStepState(resolvedStep)
    syncStepToUrl(resolvedStep)
  }, [report, syncStepToUrl])

  useEffect(() => {
    if (!form.primary_layer_id || availableLayers.length === 0) return
    const primary = availableLayers.find((layer) => String(layer.id) === form.primary_layer_id)
    if (!primary) return
    if (String(primary.mineral) !== form.mineral) {
      setForm((prev) => ({ ...prev, mineral: String(primary.mineral) }))
    }
  }, [form.primary_layer_id, form.mineral, availableLayers])

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
    const mineralId = resolveMineralId(form, availableLayers)
    if (!mineralId) {
      throw new Error('Select a map layer in step 1 before saving.')
    }
    const bbox: Record<string, number> = {}
    for (const edge of ['west', 'south', 'east', 'north'] as const) {
      const raw = location.boundingBox[edge]
      if (raw.trim()) bbox[edge] = Number(raw)
    }
    const { body, findings, references } =
      reportMode === 'upload'
        ? { body: '', findings: '', references: '' }
        : splitReportDocument(form.executive_summary)
    // Keep references in the stored summary (findings live in key_findings).
    const storedSummary = [body, references].filter((part) => part.trim()).join('') || body
    const draw =
      location.locationMode === 'coordinates' &&
      explorationReady({ mode: location.coordinateMode, points: location.drawPoints })
        ? { mode: location.coordinateMode, points: location.drawPoints }
        : null
    const geometry = draw ? geometryFromDraw(draw) : {}
    const bufferKm =
      location.locationMode === 'coordinates' && location.bufferKm.trim()
        ? Number(location.bufferKm)
        : null

    return {
      title: form.title.trim(),
      mineral: mineralId,
      region: form.region ? Number(form.region) : location.regionId ? Number(location.regionId) : null,
      description: form.description,
      price: form.price,
      is_active: form.is_active,
      access_type: form.access_type,
      report_format: reportMode === 'upload' ? 'pdf' : form.report_format,
      source_type: reportMode === 'upload' ? 'uploaded' : 'ai_generated',
      allowed_plan_ids: form.allowed_plan_ids,
      layer_ids: form.layer_ids,
      boundary_ids: location.locationMode === 'boundaries' ? location.boundaryIds : [],
      center_lat: location.centerLat ? Number(location.centerLat) : null,
      center_lng: location.centerLng ? Number(location.centerLng) : null,
      zoom: location.zoom ? Number(location.zoom) : null,
      bounding_box: bbox,
      geometry,
      buffer_km: bufferKm && bufferKm > 0 ? bufferKm : null,
      executive_summary: storedSummary,
      key_findings: textToFindings(findings),
      ...(regeneratePdf ? { regenerate_pdf: true } : {}),
    }
  }

  const save = useMutation({
    mutationFn: async () => {
      let payload
      try {
        payload = buildPayload()
      } catch (err) {
        throw err instanceof Error ? err : new Error('Could not build report payload.')
      }

      if (isNew) {
        if (reportMode === 'upload' && documentFile) {
          const fd = new FormData()
          Object.entries(payload).forEach(([key, value]) => {
            if (
              key === 'key_findings' ||
              key === 'allowed_plan_ids' ||
              key === 'layer_ids' ||
              key === 'boundary_ids' ||
              key === 'bounding_box' ||
              key === 'geometry'
            ) {
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
            key === 'bounding_box' ||
            key === 'geometry'
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
        sessionStorage.removeItem(NEW_REPORT_DRAFT_KEY)
        clearDraftDocument().catch(() => {})
        navigate('/admin/reports', { replace: true })
      }
    },
    onError: (err) => {
      const description =
        err instanceof Error && !isAxiosError(err) ? err.message : formatSaveError(err)
      toast.error('Could not save report', { description })
    },
  })

  const hasWrittenContent = form.executive_summary.trim().length > 0

  const step1Complete = form.layer_ids.length > 0 && Boolean(form.primary_layer_id)
  const step2Complete =
    step1Complete &&
    Boolean(form.title.trim()) &&
    (reportMode === 'upload'
      ? Boolean(documentFile || (restoredDocumentName && documentDraftReady) || (!isNew && report?.has_pdf))
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
                ? 'Open Preview and approve your draft to continue.'
                : ''
        : ''

  const maxReachableStep: EditorStep = step2Complete ? 3 : step1Complete ? 2 : 1

  function handleSave() {
    if (!form.title.trim()) {
      toast.error('Add a report title before saving.')
      return
    }
    if (!form.layer_ids.length || !form.primary_layer_id) {
      toast.error('Select a map layer in step 1 before saving.')
      return
    }
    const mineralId = resolveMineralId(form, availableLayers)
    if (!mineralId) {
      toast.error('Could not determine report commodity', {
        description: 'Re-select your primary layer in step 1, then try again.',
      })
      return
    }
    if (reportMode === 'upload' && isNew && !documentFile) {
      toast.error(
        restoredDocumentName
          ? 'Re-attach your document before saving'
          : 'Choose a PDF or Word document to upload',
        restoredDocumentName
          ? { description: `${restoredDocumentName} was detached on refresh. Upload it again in step 2.` }
          : undefined,
      )
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
      setRestoredDocumentName(null)
      clearDraftDocument().catch(() => {})
    } else {
      setContentApproved(false)
      setForm((prev) => ({ ...prev, executive_summary: '', key_findings: '' }))
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
          description: 'Open Preview, review the draft, then click Approve content.',
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <Link to="/admin/reports" className="text-sm text-terra-600 dark:text-terra-400 hover:underline">
            ← Reports
          </Link>
          <h1 className="text-2xl font-bold text-app-text mt-1">{isNew ? 'New report' : 'Edit report'}</h1>
        </div>
        {!isNew && report && (
          <Link to={`/downloads/${report.slug}`} className="btn-secondary text-sm shrink-0">
            Preview
          </Link>
        )}
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className={`px-5 border-b app-divider ${currentStep === 2 ? 'py-3' : 'py-4'}`}>
          <StepProgress
            aria-label="Report steps"
            steps={REPORT_STEPS.map((s) => ({ id: s.id, label: s.label, short: s.hint }))}
            current={currentStep}
            maxReachable={maxReachableStep}
            onStepClick={goToStep}
          />
        </div>

        <div className={currentStep === 2 || currentStep === 3 ? 'report-step-panel' : 'px-5 py-5 space-y-6'}>
          {currentStep === 1 && (
            <ReportSetupPanel
              hasLayersSelected={form.layer_ids.length > 0}
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
                form.layer_ids.length > 0 ? (
                  <ReportLocationPicker
                    key={slug ?? 'new'}
                    value={{ ...location, regionId: form.region || location.regionId }}
                    layerRegions={layerRegions}
                    selectedLayerIds={form.layer_ids}
                    hasLayersSelected={form.layer_ids.length > 0}
                    onChange={(next) => {
                      setLocation(next)
                      if (next.regionId) setForm((prev) => ({ ...prev, region: next.regionId }))
                    }}
                  />
                ) : undefined
              }
            />
          )}

          {currentStep === 2 && (
            <>
              <div className="report-step-panel__body">
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
                  contentMode={reportMode}
                  onContentModeChange={switchReportMode}
                />
              ) : (
                <section className="space-y-4">
                  <div className="report-upload-toolbar">
                    <ReportStageBar
                      contentMode={reportMode}
                      onContentModeChange={switchReportMode}
                      showViewToggle={false}
                    />
                  </div>

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
                    placeholder={
                      !documentDraftReady && restoredDocumentName
                        ? `Restoring ${restoredDocumentName}…`
                        : 'PDF or Word (.docx)'
                    }
                    hint="Word documents convert to PDF automatically when you publish. Your file is kept if you refresh this page."
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
            <ReportPublishPanel
              title={form.title}
              layersSummary={
                selectedLayersForReview.length
                  ? selectedLayersForReview
                      .map((layer) => {
                        const name = displayName(layer!)
                        return String(layer!.id) === form.primary_layer_id ? `${name} (primary)` : name
                      })
                      .join(' · ') + (mineralName ? ` · ${mineralName}` : '')
                  : 'No layers selected'
              }
              locationsSummary={location.locationLabel || 'No locations set'}
              contentSummary={
                reportMode === 'upload'
                  ? documentFile
                    ? documentFile.name
                    : report?.has_pdf
                      ? 'PDF on file'
                      : 'No document'
                  : hasWrittenContent
                    ? `${form.executive_summary.trim().split(/\s+/).filter(Boolean).length} words`
                    : 'Empty'
              }
              reportMode={reportMode}
              accessType={form.access_type}
              price={form.price}
              reportFormat={form.report_format}
              isActive={form.is_active}
              regeneratePdf={regeneratePdf}
              allowedPlanIds={form.allowed_plan_ids}
              plans={plans?.results ?? []}
              isNew={isNew}
              hasPdf={report?.has_pdf}
              hasArticle={report?.has_article}
              reportSlug={report?.slug}
              onAccessTypeChange={(access_type) => setForm((prev) => ({ ...prev, access_type }))}
              onPriceChange={(price) => setForm((prev) => ({ ...prev, price }))}
              onReportFormatChange={(report_format) => setForm((prev) => ({ ...prev, report_format }))}
              onIsActiveChange={(is_active) => setForm((prev) => ({ ...prev, is_active }))}
              onRegeneratePdfChange={setRegeneratePdf}
              onAllowedPlanIdsChange={(allowed_plan_ids) =>
                setForm((prev) => ({ ...prev, allowed_plan_ids }))
              }
            />
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
                    ? 'Approved. Continue to publish.'
                    : 'Generate, edit, then preview and approve.'
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
