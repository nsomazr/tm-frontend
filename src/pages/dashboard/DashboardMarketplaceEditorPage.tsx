import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { marketplaceApi } from '../../api'
import MapViewer, { type AdminFitBounds } from '../../components/map/MapViewer'
import CoordinateFormatToggle from '../../components/map/CoordinateFormatToggle'
import CoordinateAxisInput from '../../components/map/CoordinateAxisInput'
import MarketplaceLayerDropzone from '../../components/marketplace/MarketplaceLayerDropzone'
import MarketplaceDocumentDropzone from '../../components/marketplace/MarketplaceDocumentDropzone'
import StepProgress from '../../components/ui/StepProgress'
import {
  dmsPartsToDecimal,
  emptyDmsParts,
  formatLatLngPair,
  parseCoordinateComponent,
  type DmsAxisParts,
} from '../../components/map/coordinateFormat'
import { useCoordinateFormatState } from '../../components/map/useCoordinateFormatState'
import {
  allDrawPositions,
  drawFromGeometry,
  explorationAreaKm2,
  explorationReady,
  explorationTotalAreaKm2,
  finishDraftPolygon,
  geometryFromDraw,
  paddedExplorationFitBounds,
  type ExplorationDraw,
} from '../../components/map/explorationGeometry'
import {
  bufferRadiusToAreaKm2,
  clampReportBufferKm,
  REPORT_BUFFER_KM_MAX,
  REPORT_BUFFER_KM_MIN,
} from '../../constants/reportBufferZone'
import type { MarketplaceListingStatus, MarketplaceListingWrite } from '../../types'

function boundsAroundPoint(lat: number, lng: number, span = 0.08): AdminFitBounds {
  return {
    west: lng - span,
    south: lat - span,
    east: lng + span,
    north: lat + span,
    key: Date.now(),
  }
}

function fitToPoints(mode: 'point' | 'polygon', points: [number, number][]): AdminFitBounds | null {
  if (!points.length) return null
  if (mode === 'point' && points.length === 1) {
    const [lng, lat] = points[0]
    return boundsAroundPoint(lat, lng, 0.06)
  }
  const padded = paddedExplorationFitBounds(points, mode)
  if (!padded) {
    const [lng, lat] = points[0]
    return boundsAroundPoint(lat, lng, 0.08)
  }
  return { ...padded, key: Date.now() }
}

function fitToDraw(draw: ExplorationDraw | null): AdminFitBounds | null {
  if (!draw) return null
  return fitToPoints(draw.mode === 'point' ? 'point' : 'polygon', allDrawPositions(draw))
}

function formatAreaKm2(km2: number): string {
  if (!Number.isFinite(km2) || km2 <= 0) return '-'
  if (km2 < 0.01) return '< 0.01 km²'
  if (km2 < 10) return `${km2.toFixed(2)} km²`
  if (km2 < 1000) return `${km2.toFixed(1)} km²`
  return `${Math.round(km2).toLocaleString()} km²`
}

function errorMessage(err: unknown): string {
  const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data
  if (!data) return 'Something went wrong. Please try again.'
  if (typeof data.detail === 'string') return data.detail
  const first = Object.values(data).find((v) => v != null)
  if (typeof first === 'string') return first
  if (Array.isArray(first) && typeof first[0] === 'string') return first[0]
  return 'Please check the form and try again.'
}

type WizardStep = 1 | 2 | 3

const STEPS: { id: WizardStep; label: string; short: string }[] = [
  { id: 1, label: 'Details', short: 'Title and basics' },
  { id: 2, label: 'Map area', short: 'Where it is' },
  { id: 3, label: 'Publish', short: 'Optional files, go live' },
]

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint: string
  children: ReactNode
}) {
  return (
    <section className="rounded-xl border app-divider bg-app-surface p-4 sm:p-6">
      <div className="mb-4 border-b app-divider pb-3">
        <h2 className="text-base font-semibold text-app-text">{title}</h2>
        <p className="mt-1 text-sm text-app-muted">{hint}</p>
      </div>
      {children}
    </section>
  )
}

export default function DashboardMarketplaceEditorPage() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const listingId = isNew ? null : Number(id)
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const stepFromLocation = (): WizardStep | null => {
    const fromState = (location.state as { step?: WizardStep } | null)?.step
    if (fromState === 1 || fromState === 2 || fromState === 3) return fromState
    const fromQuery = Number(searchParams.get('step'))
    if (fromQuery === 1 || fromQuery === 2 || fromQuery === 3) return fromQuery
    return null
  }

  const [step, setStep] = useState<WizardStep>(() => stepFromLocation() ?? 1)

  useEffect(() => {
    const next = stepFromLocation()
    if (next != null) setStep(next)
    // Only re-apply when the history entry changes (e.g. after create → edit navigate).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, searchParams])

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [commodities, setCommodities] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [showContactPublic, setShowContactPublic] = useState(false)
  const [allowInquiries, setAllowInquiries] = useState(true)
  const [drawMode, setDrawMode] = useState<'point' | 'polygon'>('polygon')
  const [draw, setDraw] = useState<ExplorationDraw | null>(null)
  const [manualLat, setManualLat] = useState('')
  const [manualLng, setManualLng] = useState('')
  const [manualLatDms, setManualLatDms] = useState<DmsAxisParts>(() => emptyDmsParts('lat'))
  const [manualLngDms, setManualLngDms] = useState<DmsAxisParts>(() => emptyDmsParts('lng'))
  const [fitBounds, setFitBounds] = useState<AdminFitBounds | null>(null)
  const [coordinateFormat, setCoordinateFormat] = useCoordinateFormatState()
  const [bufferKm, setBufferKm] = useState('')
  const [showBuffer, setShowBuffer] = useState(false)
  const [layerFileName, setLayerFileName] = useState('')
  const [layerFeatureCount, setLayerFeatureCount] = useState<number | null>(null)
  const [layerError, setLayerError] = useState('')
  const [status, setStatus] = useState<MarketplaceListingStatus>('draft')
  const [showOnMap, setShowOnMap] = useState(true)
  const [docFile, setDocFile] = useState<File | null>(null)
  const [docPublic, setDocPublic] = useState(true)
  const [formError, setFormError] = useState('')
  const [saveNote, setSaveNote] = useState('')

  const existing = useQuery({
    queryKey: ['marketplace-my-listing', listingId],
    queryFn: async () => {
      if (listingId == null) throw new Error('Missing listing')
      return marketplaceApi.myListing(listingId).then((r) => r.data)
    },
    enabled: listingId != null && Number.isFinite(listingId),
  })

  useEffect(() => {
    if (!existing.data) return
    const row = existing.data
    setTitle(row.title)
    const about = (row.description || '').trim() || (row.summary || '').trim()
    setDescription(about)
    setCommodities((row.commodity_labels || []).join(', '))
    setContactEmail(row.contact_email || '')
    setContactPhone(row.contact_phone || '')
    setShowContactPublic(row.show_contact_public)
    setAllowInquiries(row.allow_inquiries)
    setStatus(row.status)
    setShowOnMap(row.show_on_map)
    setBufferKm(row.buffer_km != null ? String(row.buffer_km) : '')
    setShowBuffer(row.buffer_km != null)
    const nextDraw = drawFromGeometry(row.geometry as { type?: string; coordinates?: unknown })
    if (nextDraw && (nextDraw.mode === 'point' || nextDraw.mode === 'polygon')) {
      setDrawMode(nextDraw.mode)
      setDraw(nextDraw)
      setFitBounds(fitToDraw(nextDraw))
    }
  }, [existing.data])

  const applyDraw = (next: ExplorationDraw | null) => {
    setDraw(next)
    setFitBounds(fitToDraw(next))
    if (!next) {
      setLayerFileName('')
      setLayerFeatureCount(null)
    }
  }

  const clearManualFields = () => {
    setManualLat('')
    setManualLng('')
    setManualLatDms(emptyDmsParts('lat'))
    setManualLngDms(emptyDmsParts('lng'))
  }

  const addManualCoordinate = () => {
    const isDms = coordinateFormat === 'dms'
    const lat = isDms
      ? dmsPartsToDecimal(manualLatDms, 'lat')
      : parseCoordinateComponent(manualLat, 'lat')
    const lng = isDms
      ? dmsPartsToDecimal(manualLngDms, 'lng')
      : parseCoordinateComponent(manualLng, 'lng')
    if (lat == null || lng == null) return
    if (drawMode === 'point') {
      const prev = draw?.mode === 'point' ? draw.points : []
      applyDraw({ mode: 'point', points: [...prev, [lng, lat]] })
    } else {
      const prev = draw?.mode === 'polygon' ? draw.points : []
      const polygons = draw?.mode === 'polygon' ? draw.polygons : []
      applyDraw({ mode: 'polygon', points: [...prev, [lng, lat]], polygons })
    }
    clearManualFields()
  }

  const removePoint = (index: number) => {
    if (!draw || draw.mode !== 'point') return
    const next = draw.points.filter((_, i) => i !== index)
    applyDraw(next.length ? { mode: 'point', points: next } : null)
  }

  const removePolygon = (index: number) => {
    if (!draw || draw.mode !== 'polygon') return
    const polygons = [...(draw.polygons || [])]
    polygons.splice(index, 1)
    if (!polygons.length && draw.points.length === 0) {
      applyDraw(null)
      return
    }
    applyDraw({ mode: 'polygon', points: draw.points, polygons })
  }

  const clearDraftVertices = () => {
    if (!draw || draw.mode !== 'polygon') return
    if ((draw.polygons || []).length) {
      applyDraw({ mode: 'polygon', points: [], polygons: draw.polygons })
      return
    }
    applyDraw(null)
  }

  const saveMutation = useMutation({
    mutationFn: async (payload: MarketplaceListingWrite & { _nextStep?: WizardStep }) => {
      const { _nextStep: _ignored, ...body } = payload
      if (listingId) return marketplaceApi.updateListing(listingId, body).then((r) => r.data)
      return marketplaceApi.createListing(body).then((r) => r.data)
    },
    onSuccess: (row, variables) => {
      const nextStep = variables._nextStep
      // Seed detail cache so the edit page does not flash "not found" after create.
      queryClient.setQueryData(['marketplace-my-listing', row.id], row)
      queryClient.invalidateQueries({ queryKey: ['marketplace-my-listings'] })
      queryClient.invalidateQueries({ queryKey: ['marketplace-listings'] })
      queryClient.invalidateQueries({ queryKey: ['marketplace-geojson'] })

      if (nextStep) setStep(nextStep)

      if (isNew) {
        navigate(
          {
            pathname: `/dashboard/marketplace/${row.id}`,
            search: nextStep ? `?step=${nextStep}` : '',
          },
          {
            replace: true,
            state: nextStep ? { step: nextStep } : undefined,
          },
        )
      }
    },
  })

  const uploadMutation = useMutation({
    mutationFn: async ({ file, isPublic }: { file: File; isPublic: boolean }) => {
      if (!listingId) throw new Error('Save the listing before uploading documents.')
      const form = new FormData()
      form.append('title', file.name)
      form.append('is_public', isPublic ? 'true' : 'false')
      form.append('file', file)
      return marketplaceApi.uploadDocument(listingId, form)
    },
    onSuccess: () => {
      setDocFile(null)
      queryClient.invalidateQueries({ queryKey: ['marketplace-my-listing', listingId] })
      queryClient.invalidateQueries({ queryKey: ['marketplace-my-listings'] })
    },
  })

  const attachDocument = (file: File | null) => {
    setDocFile(file)
    if (!file || !listingId) return
    uploadMutation.mutate({ file, isPublic: docPublic })
  }

  const deleteDocMutation = useMutation({
    mutationFn: (docId: number) => {
      if (!listingId) throw new Error('Missing listing')
      return marketplaceApi.deleteDocument(listingId, docId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-my-listing', listingId] })
      queryClient.invalidateQueries({ queryKey: ['marketplace-my-listings'] })
    },
  })

  const commodityLabels = useMemo(
    () =>
      commodities
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean),
    [commodities],
  )

  const hasArea = Boolean(draw && explorationReady(draw))
  const points = draw?.mode === 'point' ? draw.points : draw?.points ?? []
  const finishedPolygons = draw?.mode === 'polygon' ? draw.polygons || [] : []
  const polygonAreaKm2 = explorationTotalAreaKm2(draw)
  const bufferNum =
    showBuffer && bufferKm.trim() !== '' ? clampReportBufferKm(Number(bufferKm)) : null
  const bufferAreaKm2 = bufferNum != null ? bufferRadiusToAreaKm2(bufferNum) : 0
  const manualLatOk =
    coordinateFormat === 'dms'
      ? dmsPartsToDecimal(manualLatDms, 'lat') != null
      : parseCoordinateComponent(manualLat, 'lat') != null
  const manualLngOk =
    coordinateFormat === 'dms'
      ? dmsPartsToDecimal(manualLngDms, 'lng') != null
      : parseCoordinateComponent(manualLng, 'lng') != null
  const canAddManual = manualLatOk && manualLngOk
  const canFinishPolygon = drawMode === 'polygon' && points.length >= 3
  const shapeSummary =
    drawMode === 'point'
      ? `${points.length} point${points.length === 1 ? '' : 's'}`
      : `${finishedPolygons.length + (points.length >= 3 ? 1 : 0)} polygon${
          finishedPolygons.length + (points.length >= 3 ? 1 : 0) === 1 ? '' : 's'
        }`

  const buildPayload = (nextStatus?: MarketplaceListingStatus): MarketplaceListingWrite => {
    const geometry =
      draw && explorationReady(draw) ? geometryFromDraw(draw) : existing.data?.geometry || {}
    const buffer =
      showBuffer && bufferKm.trim() !== '' ? clampReportBufferKm(Number(bufferKm)) : null
    const about = description.trim()
    const listSummary = (about.split('\n').find((line) => line.trim()) || title).trim().slice(0, 500)
    return {
      title: title.trim(),
      summary: listSummary,
      description: about,
      commodity_labels: commodityLabels,
      geometry,
      buffer_km: buffer,
      contact_name: '',
      contact_email: showContactPublic ? contactEmail.trim() : '',
      contact_phone: showContactPublic ? contactPhone.trim() : '',
      show_contact_public: showContactPublic,
      allow_inquiries: allowInquiries,
      status: nextStatus ?? status,
      show_on_map: showOnMap,
    }
  }

  const save = async (nextStatus?: MarketplaceListingStatus, nextStep?: WizardStep) => {
    setFormError('')
    setSaveNote('')
    if (title.trim().length < 3) {
      setFormError('Add a title (at least 3 characters) before continuing.')
      setStep(1)
      return false
    }
    if (showContactPublic && !contactEmail.trim() && !contactPhone.trim()) {
      setFormError('Add an email or phone, or turn off public contact.')
      setStep(1)
      return false
    }
    if ((nextStatus ?? status) === 'published' && !hasArea && !existing.data?.geometry) {
      setFormError('Add a map area (draw or upload a layer) before publishing.')
      setStep(2)
      return false
    }
    try {
      await saveMutation.mutateAsync({ ...buildPayload(nextStatus), _nextStep: nextStep })
      if (nextStatus) setStatus(nextStatus)
      if (nextStatus === 'published') {
        navigate('/dashboard/marketplace', {
          replace: true,
          state: { notice: 'Listing published and visible on the Marketplace map.' },
        })
        return true
      }
      if (nextStatus === 'hidden') {
        navigate('/dashboard/marketplace', {
          replace: true,
          state: { notice: 'Listing hidden from the public map.' },
        })
        return true
      }
      if (!nextStep) {
        setSaveNote('Draft saved.')
      }
      return true
    } catch (err) {
      setFormError(errorMessage(err))
      return false
    }
  }

  const goNext = async () => {
    if (step === 1) {
      const ok = await save('draft', 2)
      if (ok && !isNew) {
        setStep(2)
        setSearchParams({ step: '2' }, { replace: true })
      }
      return
    }
    if (step === 2) {
      if (!hasArea && !existing.data?.geometry) {
        setFormError('Add a map area before continuing (draw, enter points, or upload a layer).')
        return
      }
      const ok = await save('draft', 3)
      if (ok) {
        setStep(3)
        setSearchParams({ step: '3' }, { replace: true })
      }
    }
  }

  const goBack = () => {
    setFormError('')
    setSaveNote('')
    if (step > 1) {
      const prev = (step - 1) as WizardStep
      setStep(prev)
      setSearchParams({ step: String(prev) }, { replace: true })
    }
  }

  const onLayerFile = async (file: File | null) => {
    setLayerError('')
    setLayerFileName('')
    setLayerFeatureCount(null)
    if (!file) return
    const name = file.name.toLowerCase()
    const ok =
      name.endsWith('.geojson') ||
      name.endsWith('.json') ||
      name.endsWith('.zip') ||
      name.endsWith('.shp')
    if (!ok) {
      setLayerError('Upload a .geojson, .json, or shapefile .zip.')
      return
    }
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await marketplaceApi.parseGeometry(form)
      const nextDraw = drawFromGeometry(data.geometry)
      if (!nextDraw) {
        setLayerError('Could not read that geometry. Use Point or Polygon features.')
        return
      }
      setDrawMode(nextDraw.mode === 'point' ? 'point' : 'polygon')
      applyDraw(nextDraw)
      setLayerFileName(data.filename || file.name)
      setLayerFeatureCount(
        typeof data.feature_count === 'number'
          ? data.feature_count
          : nextDraw.mode === 'point'
            ? nextDraw.points.length
            : (nextDraw.polygons?.length || 0) + (nextDraw.points.length >= 3 ? 1 : 0),
      )
    } catch (err) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data
      const fileErr = data?.file
      if (typeof fileErr === 'string') setLayerError(fileErr)
      else if (Array.isArray(fileErr) && typeof fileErr[0] === 'string') setLayerError(fileErr[0])
      else if (typeof data?.detail === 'string') setLayerError(data.detail)
      else setLayerError('Could not read that file. Check it is valid GeoJSON or a shapefile ZIP.')
    }
  }

  if (!isNew && existing.isLoading) {
    return <p className="text-sm text-app-muted">Loading listing…</p>
  }
  if (!isNew && existing.isError) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-app-muted">Listing not found.</p>
        <Link to="/dashboard/marketplace" className="text-sm text-terra-600 hover:underline">
          Back to My listings
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link to="/dashboard/marketplace" className="text-xs text-terra-600 hover:underline">
          ← My listings
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-app-text">
          {isNew ? 'Create listing' : 'Edit listing'}
        </h1>
        <p className="mt-2 text-sm text-app-muted">
          Title and map area are enough to publish. Everything else is optional.
        </p>

        <StepProgress
          className="mt-5"
          aria-label="Listing steps"
          steps={STEPS.map((s) => ({ id: s.id, label: s.label, short: s.short }))}
          current={step}
          maxReachable={step}
          onStepClick={(id) => {
            setStep(id)
            setSearchParams({ step: String(id) }, { replace: true })
          }}
        />
      </div>

      {formError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {formError}
        </p>
      )}
      {saveNote && (
        <p className="rounded-lg bg-terra-50 px-3 py-2 text-sm text-terra-800 dark:bg-terra-500/10 dark:text-terra-300">
          {saveNote}
        </p>
      )}

      {step === 1 && (
      <Section
        title="Step 1: Details"
        hint="Only a title is required here. Add more only if it helps buyers."
      >
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="text-app-text font-medium">
              Title <span className="text-red-600">*</span>
            </span>
            <input
              className="mt-1 w-full rounded-lg border app-divider bg-app-bg px-3 py-2 text-app-text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. PL gold licence - Geita block"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="text-app-muted">About this listing (optional)</span>
            <textarea
              className="mt-1 w-full rounded-lg border app-divider bg-app-bg px-3 py-2 text-app-text"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What you are offering, licence status, work done…"
            />
          </label>
          <label className="block text-sm">
            <span className="text-app-muted">Minerals (optional)</span>
            <input
              className="mt-1 w-full rounded-lg border app-divider bg-app-bg px-3 py-2 text-app-text"
              value={commodities}
              onChange={(e) => setCommodities(e.target.value)}
              placeholder="Gold, copper"
            />
          </label>

          <div className="rounded-xl border app-divider bg-app-subtle/30 p-3 space-y-3">
            <p className="text-sm font-medium text-app-text">How buyers reach you</p>
            <label className="flex items-start gap-2 text-sm text-app-text">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={allowInquiries}
                onChange={(e) => setAllowInquiries(e.target.checked)}
              />
              <span>Allow in-app messages from signed-in users (recommended)</span>
            </label>
            <label className="flex items-start gap-2 text-sm text-app-text">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={showContactPublic}
                onChange={(e) => setShowContactPublic(e.target.checked)}
              />
              <span>Also show my email or phone on the public listing</span>
            </label>
            {showContactPublic && (
              <div className="grid gap-3 sm:grid-cols-2 pt-1">
                <label className="block text-sm">
                  <span className="text-app-muted">Email</span>
                  <input
                    type="email"
                    className="mt-1 w-full rounded-lg border app-divider bg-app-bg px-3 py-2 text-app-text"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="you@company.com"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-app-muted">Phone</span>
                  <input
                    className="mt-1 w-full rounded-lg border app-divider bg-app-bg px-3 py-2 text-app-text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="Optional"
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      </Section>
      )}

      {step === 2 && (
      <Section
        title="Step 2: Map area"
        hint="Upload a layer, click the map, or enter coordinates. Required to publish."
      >
        <div className="space-y-4">
          <MarketplaceLayerDropzone
            fileName={layerFileName}
            featureCount={layerFeatureCount}
            error={layerError}
            onFile={(file) => void onLayerFile(file)}
            onClear={() => {
              setLayerFileName('')
              setLayerFeatureCount(null)
              setLayerError('')
              applyDraw(null)
            }}
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="segmented" role="radiogroup" aria-label="Shape type">
              {(
                [
                  { id: 'point' as const, label: 'Points' },
                  { id: 'polygon' as const, label: 'Polygons' },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={drawMode === option.id}
                  onClick={() => {
                    setDrawMode(option.id)
                    applyDraw(null)
                    setLayerFileName('')
                    setLayerFeatureCount(null)
                    clearManualFields()
                  }}
                  className={`segmented-btn px-3 py-1.5 text-sm ${
                    drawMode === option.id ? 'segmented-btn-active' : ''
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-app-muted">
                Format
              </span>
              <CoordinateFormatToggle value={coordinateFormat} onChange={setCoordinateFormat} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,18rem)]">
            <div className="min-w-0 space-y-2">
              <div className="h-[22rem] overflow-hidden rounded-xl border app-divider sm:h-[26rem]">
                <MapViewer
                  layers={[]}
                  minimalChrome
                  hasPaidAccess
                  drawActive
                  explorationDraw={draw}
                  adminFitBounds={fitBounds}
                  onDrawPoint={(lng, lat) => {
                    if (drawMode === 'point') {
                      const prev = draw?.mode === 'point' ? draw.points : []
                      applyDraw({ mode: 'point', points: [...prev, [lng, lat]] })
                    } else {
                      const prev = draw?.mode === 'polygon' ? draw.points : []
                      const polygons = draw?.mode === 'polygon' ? draw.polygons : []
                      applyDraw({ mode: 'polygon', points: [...prev, [lng, lat]], polygons })
                    }
                  }}
                  className="h-full w-full"
                />
              </div>
              <p className="text-xs text-app-muted">
                {drawMode === 'point'
                  ? 'Click the map to add points. Each click adds another site.'
                  : 'Click to add vertices. Use Finish polygon, then draw the next one.'}
              </p>
            </div>

            <div className="flex min-w-0 flex-col gap-3">
              <div className="rounded-xl border app-divider p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-app-muted">
                  Enter coordinates
                </p>
                <p className="text-[11px] text-app-muted">
                  {coordinateFormat === 'dms'
                    ? 'Use separate boxes for degrees, minutes, seconds, and N/S or E/W.'
                    : 'Enter decimal degrees for latitude and longitude.'}
                </p>
                <div className={`gap-2 ${coordinateFormat === 'dms' ? 'space-y-2' : 'grid grid-cols-1'}`}>
                  <CoordinateAxisInput
                    axis="lat"
                    label="Latitude"
                    format={coordinateFormat}
                    decimalValue={manualLat}
                    onDecimalChange={setManualLat}
                    dmsValue={manualLatDms}
                    onDmsChange={setManualLatDms}
                    compact
                  />
                  <CoordinateAxisInput
                    axis="lng"
                    label="Longitude"
                    format={coordinateFormat}
                    decimalValue={manualLng}
                    onDecimalChange={setManualLng}
                    dmsValue={manualLngDms}
                    onDmsChange={setManualLngDms}
                    compact
                  />
                </div>
                <button
                  type="button"
                  className="btn-secondary w-full text-xs"
                  onClick={addManualCoordinate}
                  disabled={!canAddManual}
                >
                  {drawMode === 'polygon' ? 'Add vertex' : 'Add point'}
                </button>
                {drawMode === 'polygon' && (
                  <button
                    type="button"
                    className="btn-primary w-full text-xs"
                    disabled={!canFinishPolygon}
                    onClick={() => applyDraw(finishDraftPolygon(draw))}
                  >
                    Finish polygon & start next
                  </button>
                )}
              </div>

              <div className="rounded-xl border app-divider p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-app-muted">
                    {drawMode === 'point' ? `Points (${points.length})` : `Shapes (${shapeSummary})`}
                  </p>
                  {(points.length > 0 || finishedPolygons.length > 0) && (
                    <button
                      type="button"
                      className="text-[11px] text-app-muted hover:text-app-text"
                      onClick={() => {
                        applyDraw(null)
                        setLayerFileName('')
                        setLayerFeatureCount(null)
                      }}
                    >
                      Clear all
                    </button>
                  )}
                </div>
                {drawMode === 'point' ? (
                  points.length === 0 ? (
                    <p className="text-xs text-app-muted">No points yet.</p>
                  ) : (
                    <ul className="max-h-44 space-y-0 overflow-y-auto divide-y app-divider text-xs">
                      {points.map((pt, index) => (
                        <li key={`${pt[0]}-${pt[1]}-${index}`} className="flex items-start gap-2 py-2">
                          <span className="min-w-0 flex-1 font-mono tabular-nums leading-snug text-app-text">
                            <span className="mr-1 font-sans text-app-muted">{index + 1}.</span>
                            {formatLatLngPair(pt[1], pt[0], coordinateFormat)}
                          </span>
                          <button
                            type="button"
                            className="shrink-0 text-app-muted hover:text-red-600"
                            onClick={() => removePoint(index)}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )
                ) : (
                  <div className="space-y-2 text-xs">
                    {finishedPolygons.length === 0 && points.length === 0 ? (
                      <p className="text-app-muted">No polygons yet.</p>
                    ) : null}
                    {finishedPolygons.map((ring, index) => (
                      <div
                        key={`poly-${index}-${ring[0]?.[0]}-${ring[0]?.[1]}`}
                        className="flex items-center justify-between gap-2 rounded-lg bg-app-subtle/50 px-2 py-1.5"
                      >
                        <span className="text-app-text">
                          Polygon {index + 1} · {ring.length} vertices · {formatAreaKm2(explorationAreaKm2(ring))}
                        </span>
                        <button
                          type="button"
                          className="shrink-0 text-app-muted hover:text-red-600"
                          onClick={() => removePolygon(index)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    {points.length > 0 && (
                      <div className="rounded-lg border border-dashed app-divider px-2 py-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-app-muted">
                            Draft · {points.length} vertex{points.length === 1 ? '' : 'ices'}
                            {points.length >= 3 ? ` · ${formatAreaKm2(explorationAreaKm2(points))}` : ''}
                          </span>
                          <button
                            type="button"
                            className="shrink-0 text-app-muted hover:text-app-text"
                            onClick={clearDraftVertices}
                          >
                            Clear draft
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-xl border app-divider bg-app-subtle/40 p-3 space-y-1.5 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-app-muted">Area</p>
                {drawMode === 'point' ? (
                  <p className="text-app-text">
                    {hasArea
                      ? `${points.length} point${points.length === 1 ? '' : 's'} on the map`
                      : 'No points yet'}
                    {bufferNum ? (
                      <span className="block text-xs text-app-muted mt-1">
                        Buffer around each ≈ {formatAreaKm2(bufferAreaKm2)}
                      </span>
                    ) : null}
                  </p>
                ) : (
                  <p className="text-app-text">
                    {hasArea ? (
                      <>
                        Total area:{' '}
                        <span className="font-semibold text-terra-700 dark:text-terra-300">
                          {formatAreaKm2(polygonAreaKm2)}
                        </span>
                        <span className="block text-xs text-app-muted mt-1">{shapeSummary}</span>
                      </>
                    ) : (
                      <span className="text-amber-700 dark:text-amber-400">
                        Need {Math.max(0, 3 - points.length)} more vertex
                        {3 - points.length === 1 ? '' : 'ices'} for the first polygon
                      </span>
                    )}
                    {bufferNum && hasArea ? (
                      <span className="block text-xs text-app-muted mt-1">
                        Plus optional buffer {bufferNum} km
                      </span>
                    ) : null}
                  </p>
                )}
              </div>

              <div className="rounded-xl border app-divider p-3 space-y-2">
                <label className="flex items-center gap-2 text-sm text-app-text">
                  <input
                    type="checkbox"
                    checked={showBuffer}
                    onChange={(e) => {
                      setShowBuffer(e.target.checked)
                      if (!e.target.checked) setBufferKm('')
                    }}
                  />
                  <span>Add optional buffer around the area</span>
                </label>
                {showBuffer && (
                  <label className="block text-sm">
                    <span className="text-app-muted">
                      Buffer radius ({REPORT_BUFFER_KM_MIN}-{REPORT_BUFFER_KM_MAX} km)
                    </span>
                    <input
                      type="number"
                      min={REPORT_BUFFER_KM_MIN}
                      max={REPORT_BUFFER_KM_MAX}
                      className="mt-1 w-full rounded-lg border app-divider bg-app-bg px-3 py-2 text-app-text"
                      value={bufferKm}
                      onChange={(e) => setBufferKm(e.target.value)}
                      placeholder="e.g. 5"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>
      </Section>
      )}

      {step === 3 && (
      <Section
        title="Step 3: Files & publish"
        hint="Documents are optional. Publish when the map area is set."
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-app-text">Documents</h3>
            <p className="mt-1 text-xs text-app-muted">Attach PDF or Word reports buyers can download.</p>
            <div className="mt-3">
              {!listingId ? (
                <div className="rounded-xl border border-dashed app-divider bg-app-subtle/30 px-4 py-5 space-y-3">
                  <p className="text-sm text-app-muted">
                    Save a draft once to unlock document uploads for this listing.
                  </p>
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    disabled={saveMutation.isPending}
                    onClick={() => void save('draft')}
                  >
                    {saveMutation.isPending ? 'Saving…' : 'Save draft to unlock uploads'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {(existing.data?.documents || []).length > 0 ? (
                    <ul className="space-y-2">
                      {(existing.data?.documents || []).map((doc) => (
                        <li
                          key={doc.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border app-divider bg-app-surface px-3.5 py-3"
                        >
                          <div className="flex min-w-0 items-start gap-3">
                            <span
                              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-app-subtle text-app-muted"
                              aria-hidden
                            >
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z"
                                />
                              </svg>
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-app-text">{doc.title}</p>
                              <p className="mt-0.5 text-xs text-app-muted">
                                {doc.is_public ? 'Public download' : 'Private (owner only)'}
                                {doc.file_url ? (
                                  <>
                                    {' · '}
                                    <a
                                      href={doc.file_url}
                                      className="text-terra-600 hover:underline"
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Open
                                    </a>
                                  </>
                                ) : null}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="shrink-0 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                            onClick={() => deleteDocMutation.mutate(doc.id)}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-app-muted">No documents attached yet.</p>
                  )}

                  <div className="space-y-3 rounded-xl border app-divider bg-app-subtle/20 p-4">
                    <label className="flex items-start gap-2 text-sm text-app-text">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={docPublic}
                        onChange={(e) => setDocPublic(e.target.checked)}
                        disabled={uploadMutation.isPending}
                      />
                      <span>New uploads are public downloads on the listing</span>
                    </label>
                    <MarketplaceDocumentDropzone
                      file={docFile}
                      uploading={uploadMutation.isPending}
                      disabled={uploadMutation.isPending}
                      error={uploadMutation.isError ? errorMessage(uploadMutation.error) : ''}
                      onFile={attachDocument}
                    />
                    {uploadMutation.isPending ? (
                      <p className="text-xs text-app-muted">Uploading…</p>
                    ) : (
                      <p className="text-xs text-app-muted">
                        Drop or browse a file to attach it. Use Remove on attached files below.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t app-divider pt-5 space-y-4">
            <h3 className="text-sm font-semibold text-app-text">Publish</h3>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showOnMap}
                onChange={(e) => setShowOnMap(e.target.checked)}
              />
              Show on public map when published
            </label>
            <p className="text-sm text-app-text">
              Current status: <span className="font-medium capitalize">{status}</span>
              {hasArea ? '' : ' · map area still needed to publish'}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary text-sm"
                disabled={saveMutation.isPending}
                onClick={() => void save('draft')}
              >
                Save draft
              </button>
              <button
                type="button"
                className="btn-primary text-sm"
                disabled={saveMutation.isPending}
                onClick={() => void save('published')}
              >
                Publish to Marketplace
              </button>
              <button
                type="button"
                className="btn-secondary text-sm"
                disabled={saveMutation.isPending}
                onClick={() => void save('hidden')}
              >
                Hide from map
              </button>
            </div>
            <Link to="/marketplace" className="inline-block text-sm text-terra-600 hover:underline">
              Open public Marketplace →
            </Link>
          </div>
        </div>
      </Section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t app-divider pt-4">
        <button
          type="button"
          className="btn-secondary text-sm"
          onClick={goBack}
          disabled={step === 1 || saveMutation.isPending}
        >
          Back
        </button>
        {step < 3 ? (
          <button
            type="button"
            className="btn-primary text-sm"
            onClick={() => void goNext()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving…' : 'Continue'}
          </button>
        ) : (
          <p className="text-xs text-app-muted">Step 3 of 3 - publish when ready</p>
        )}
      </div>
    </div>
  )
}
