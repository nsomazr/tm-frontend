import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { analyticsApi, paymentsApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { useTranslation } from '../../i18n/LocaleContext'
import { useDisplayName } from '../../i18n/useDisplayName'
import type { AreaInsight, AssistantCredits, AssistantMessage, AerialAccess } from '../../types'
import AssistantMessageContent from './AssistantMessageContent'
import TerraInsightExportControls from './TerraInsightExportControls'
import { SendArrowIcon, TerraAssistantAvatar } from './AssistantIcons'
import PhoneCheckoutModal, { handleCheckoutResponse } from '../payments/PhoneCheckoutModal'
import { EXTENSION_KM2_OPTIONS } from '../map/analysisZoneGeometry'

export interface TerraAssistantMapContext {
  lat: number
  lng: number
  zoom: number
  featureIds?: number[]
  mineralSlug?: string
  regionId?: number
  searchLabel?: string
  fromMapClick?: boolean
  countryCode?: string
  boundaryId?: number
  regionBoundaryName?: string
  districtBoundaryName?: string
  wardBoundaryName?: string
  villageBoundaryName?: string
}

interface TerraAssistantPanelProps {
  insight: AreaInsight | null
  loading?: boolean
  hasPaidAccess: boolean
  initialCredits?: AssistantCredits | null
  mapContext?: TerraAssistantMapContext | null
  mode?: 'map' | 'account'
  layout?: 'fill' | 'compact'
  mobileSheet?: boolean
  insightExport?: boolean
  mapSnapshot?: string | null
  getMapSnapshot?: () => Promise<string | null>
}

function formatPeriodEnd(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

export function buildAssistantThreadKey(
  mode: 'map' | 'account',
  mapContext?: TerraAssistantMapContext | null
): string {
  if (mode === 'account') return 'account'
  if (mapContext?.mineralSlug) return `search:mineral:${mapContext.mineralSlug}`
  if (mapContext?.regionId != null) return `search:region:${mapContext.regionId}`
  if (mapContext) {
    return `map:${mapContext.lat.toFixed(3)}:${mapContext.lng.toFixed(3)}:${mapContext.zoom}`
  }
  return 'map:general'
}

function defaultSeedMessage(
  mode: 'map' | 'account',
  insight: AreaInsight | null,
  ta: {
    accountWelcome: string
    emptyStateMessage: string
    platformWelcome: string
    mapFreeAsk: string
  },
  hasPaidAccess: boolean,
  hasInsightContext: boolean
): AssistantMessage[] {
  if (hasPaidAccess && hasInsightContext && insight?.ai_insight) {
    return [{ role: 'assistant', content: insight.ai_insight }]
  }
  if (mode === 'account') {
    return [{ role: 'assistant', content: ta.accountWelcome }]
  }
  if (mode === 'map' && !hasPaidAccess && hasInsightContext) {
    return [{ role: 'assistant', content: ta.mapFreeAsk }]
  }
  if (!hasPaidAccess) {
    return [{ role: 'assistant', content: ta.platformWelcome }]
  }
  return [{ role: 'assistant', content: ta.emptyStateMessage }]
}

export default function TerraAssistantPanel({
  insight,
  loading = false,
  hasPaidAccess,
  initialCredits = null,
  mapContext,
  mode = 'map',
  layout,
  mobileSheet = false,
  insightExport = false,
  mapSnapshot = null,
  getMapSnapshot,
}: TerraAssistantPanelProps) {
  const { m } = useTranslation()
  const ta = m.assistant
  const p = m.pricing
  const { user, loading: authLoading } = useAuth()
  const displayName = useDisplayName()
  const isFillLayout = layout === 'fill'
  const isCompact = !isFillLayout
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [question, setQuestion] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [credits, setCredits] = useState<AssistantCredits | null>(initialCredits)
  const [historyReady, setHistoryReady] = useState(false)
  const [aerialCheckoutOpen, setAerialCheckoutOpen] = useState(false)
  const [aerialCheckoutError, setAerialCheckoutError] = useState('')
  const [extensionKm2, setExtensionKm2] = useState<number>(EXTENSION_KM2_OPTIONS[1])
  const threadRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)

  const hasLocationContext =
    hasPaidAccess && mode === 'map' && mapContext?.fromMapClick === true
  const hasSearchContext =
    hasPaidAccess &&
    !!(mapContext?.mineralSlug || mapContext?.regionId != null)
  const hasInsightContext = hasLocationContext || hasSearchContext
  const hasMapped = insight?.has_mapped_data !== false && (insight?.feature_count ?? 0) > 0
  const threadKey = useMemo(() => buildAssistantThreadKey(mode, mapContext), [mode, mapContext])
  const chatHistoryEnabled = credits?.chat_history === true

  const adminBreadcrumb = useMemo(() => {
    const countryNames: Record<string, string> = {
      TZ: 'Tanzania',
      KE: 'Kenya',
      UG: 'Uganda',
    }
    const parts: string[] = []
    const code = mapContext?.countryCode?.toUpperCase()
    if (code) parts.push(countryNames[code] ?? code)
    const regionName =
      insight?.region_boundary?.name || mapContext?.regionBoundaryName || insight?.geographic_region
    const districtName = insight?.district_boundary?.name || mapContext?.districtBoundaryName
    const wardName = insight?.ward_boundary?.name || mapContext?.wardBoundaryName
    const villageName = insight?.village_boundary?.name || mapContext?.villageBoundaryName
    if (regionName) parts.push(regionName)
    if (districtName) parts.push(districtName)
    if (wardName) parts.push(wardName)
    if (villageName) parts.push(villageName)
    return parts
  }, [mapContext, insight])

  const refreshCredits = useCallback(async () => {
    if (user?.assistant_credits) {
      setCredits(user.assistant_credits)
      return
    }
    try {
      const { data } = await analyticsApi.assistantCredits()
      setCredits(data.assistant_credits)
    } catch {
      /* ignore */
    }
  }, [user?.assistant_credits, user?.id])

  useEffect(() => {
    if (authLoading) return
    if (initialCredits) {
      setCredits(initialCredits)
      return
    }
    void refreshCredits()
  }, [authLoading, initialCredits, refreshCredits])

  useEffect(() => {
    if (!insight?.assistant_credits) return
    const incoming = insight.assistant_credits
    if (user && incoming.tier === 'anonymous') return
    setCredits(incoming)
  }, [insight?.assistant_credits, user])

  useEffect(() => {
    let cancelled = false
    setHistoryReady(false)

    async function bootstrapThread() {
      if (loading) return

      if (user) {
        try {
          const { data } = await analyticsApi.assistantHistory({
            mode,
            thread_key: threadKey,
            lat: mapContext?.lat,
            lng: mapContext?.lng,
            zoom: mapContext?.zoom,
            mineralSlug: mapContext?.mineralSlug,
            regionId: mapContext?.regionId,
          })
          if (cancelled) return
          if (data.messages.length > 0) {
            setMessages(data.messages)
            setError('')
            setHistoryReady(true)
            return
          }
        } catch {
          /* fall through to seed */
        }
      }

      if (cancelled) return
      setMessages(defaultSeedMessage(mode, insight, ta, hasPaidAccess, hasInsightContext))
      setError('')
      setHistoryReady(true)
    }

    void bootstrapThread()
    return () => {
      cancelled = true
    }
  }, [
    threadKey,
    loading,
    insight?.ai_insight,
    insight?.lat,
    insight?.lng,
    mode,
    user?.id,
    ta.accountWelcome,
    ta.emptyStateMessage,
    ta.platformWelcome,
    hasPaidAccess,
    hasInsightContext,
    ta.mapFreeAsk,
  ])

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending, loading])

  useEffect(() => {
    if (loading || !historyReady) return
    if (mobileSheet) mobileInputRef.current?.focus()
    else inputRef.current?.focus()
  }, [loading, historyReady, hasLocationContext, mobileSheet])

  const unlimited = credits?.unlimited === true
  const atLimit = !unlimited && (credits?.remaining ?? 1) <= 0
  const canSend = !loading && !sending && question.trim().length > 0 && !atLimit && historyReady

  const aerialAccess: AerialAccess | null = insight?.aerial ?? null
  const showExtensionOffer =
    hasPaidAccess &&
    mapContext?.fromMapClick &&
    aerialAccess?.extension_available === true &&
    !aerialAccess?.using_extended_area

  const breadcrumbText =
    mapContext?.fromMapClick && adminBreadcrumb.length > 0 ? adminBreadcrumb.join(' › ') : ''
  const regionLabel = insight?.region_boundary?.name || insight?.region || ''
  const showRegionChip =
    !!regionLabel && !breadcrumbText.split(' › ').includes(regionLabel)
  const showContextBar =
    !!breadcrumbText || (hasMapped && insight && (showRegionChip || insight.minerals.length > 0))
  const showThreadUpgrade =
    !loading && !hasPaidAccess && !!insight?.requires_subscription && messages.length <= 2
  const showFooterUpgradeHint = !hasPaidAccess && !showThreadUpgrade
  const showZoneNote =
    !loading && hasPaidAccess && aerialAccess && mapContext?.fromMapClick && !showExtensionOffer

  function creditsFooterText(): string {
    if (!credits) return ''
    if (credits.unlimited) return ta.creditsUnlimited
    const remaining = credits.remaining ?? 0
    const limit = credits.limit ?? 0
    if (remaining <= 0) return ta.creditsUsed

    let base: string
    if (credits.tier === 'anonymous' || credits.period_label === 'session') {
      base = ta.creditsAnonymous.replace('{remaining}', String(remaining)).replace('{limit}', String(limit))
    } else if (credits.tier === 'free') {
      base = ta.creditsFreeMonthly.replace('{remaining}', String(remaining)).replace('{limit}', String(limit))
    } else {
      base = ta.creditsLeft.replace('{remaining}', String(remaining)).replace('{limit}', String(limit))
    }

    if (credits.period_end && credits.tier !== 'anonymous') {
      return `${base} · ${ta.creditsResets.replace('{date}', formatPeriodEnd(credits.period_end))}`
    }
    return base
  }

  function defaultAnalysisKm2(access: AerialAccess | null | undefined): number {
    return access?.default_analysis_km2 ?? access?.included_km2 ?? 10
  }

  function currentZoneKm2(access: AerialAccess | null | undefined): number {
    return access?.analysis_area_km2 ?? defaultAnalysisKm2(access)
  }

  function extensionPrice(extraKm2: number, rate: number): number {
    return Math.ceil(extraKm2) * rate
  }

  function fmtTzs(amount: number): string {
    return Math.round(amount).toLocaleString()
  }

  function fmtKm2(km2: number): string {
    if (km2 >= 1000) return Math.round(km2).toLocaleString()
    return km2 < 10 ? km2.toFixed(1) : String(Math.round(km2))
  }

  const ratePerKm2 = aerialAccess?.aerial_price_per_km2 ?? 10000
  const selectedExtensionPrice = extensionPrice(extensionKm2, ratePerKm2)

  const aerialCheckout = useMutation({
    mutationFn: (payload: {
      paymentMethod: 'mobile_money' | 'card'
      msisdn?: string
      cardBrand?: 'visa' | 'mastercard'
      cardholderName?: string
      billingEmail?: string
    }) => {
      if (!mapContext) throw new Error('Missing map context')
      return paymentsApi.checkout({
        order_type: 'aerial',
        lat: mapContext.lat,
        lng: mapContext.lng,
        zoom: mapContext.zoom,
        extra_km2: extensionKm2,
        payment_method: payload.paymentMethod,
        msisdn: payload.msisdn,
        card_brand: payload.cardBrand,
        cardholder_name: payload.cardholderName,
        billing_email: payload.billingEmail,
      })
    },
    onSuccess: ({ data }) => {
      setAerialCheckoutError('')
      handleCheckoutResponse(data)
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      setAerialCheckoutError(typeof detail === 'string' ? detail : ta.errorGeneric)
    },
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = question.trim()
    if (!q || !canSend) return

    setSending(true)
    setError('')
    setQuestion('')

    const prior = messages.filter((msg) => msg.role === 'user' || msg.role === 'assistant')
    const useMapMode =
      hasPaidAccess && mode === 'map' && (hasLocationContext || hasSearchContext)

    try {
      const { data } = await analyticsApi.assistantChat({
        question: q,
        messages: prior,
        mode: useMapMode ? 'map' : 'account',
        lat: mapContext?.lat,
        lng: mapContext?.lng,
        zoom: mapContext?.zoom,
        featureIds: mapContext?.featureIds,
        mineralSlug: mapContext?.mineralSlug,
        regionId: mapContext?.regionId,
        boundaryId: mapContext?.boundaryId,
        countryCode: mapContext?.countryCode,
        threadKey,
      })
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: q },
        { role: 'assistant', content: data.reply },
      ])
      if (data.assistant_credits) setCredits(data.assistant_credits)
    } catch (err: unknown) {
      const resp = (err as {
        response?: {
          data?: {
            detail?: string
            assistant_credits?: AssistantCredits
            requires_aerial_purchase?: boolean
            aerial?: AerialAccess
          }
        }
      }).response?.data
      if (resp?.requires_aerial_purchase && resp.aerial) {
        setError(ta.extensionPurchaseHint)
      } else {
        setError(resp?.detail || ta.errorGeneric)
      }
      if (resp?.assistant_credits) setCredits(resp.assistant_credits)
    } finally {
      setSending(false)
    }
  }

  const composerPlaceholder =
    hasSearchContext && mapContext?.searchLabel
      ? ta.composerSearch.replace('{name}', mapContext.searchLabel)
      : hasLocationContext
        ? ta.composerMap
        : ta.composerGeneral

  const composerForm = (
    <form
      onSubmit={handleSubmit}
      className="min-w-0 max-w-full rounded-2xl bg-app-surface shadow-[0_4px_24px_-4px_rgba(15,23,42,0.15)] dark:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.5)] px-2.5 py-2 sm:px-3 sm:py-2.5"
    >
      <label className="sr-only" htmlFor="terra-assistant-input">
        {ta.askLabel}
      </label>
      <div
        className={`flex items-end gap-1.5 min-w-0 max-w-full rounded-xl transition-all ${
          atLimit ? 'opacity-70' : ''
        }`}
      >
        {mobileSheet ? (
          <input
            ref={mobileInputRef}
            id="terra-assistant-input"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void handleSubmit(e)
              }
            }}
            placeholder={composerPlaceholder}
            disabled={sending || atLimit}
            className="flex-1 min-w-0 h-10 border-0 bg-transparent text-sm px-1 map-text placeholder:map-text-muted focus:outline-none focus:ring-0"
          />
        ) : (
          <textarea
            ref={inputRef}
            id="terra-assistant-input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleSubmit(e)
              }
            }}
            placeholder={composerPlaceholder}
            rows={1}
            disabled={sending || atLimit}
            className="flex-1 min-w-0 min-h-[2.5rem] max-h-24 resize-none border-0 bg-transparent text-sm py-2 px-1 map-text placeholder:map-text-muted focus:outline-none focus:ring-0"
          />
        )}
        <button
          type="submit"
          disabled={!canSend}
          aria-label={ta.send}
          title={ta.send}
          className={`mb-0.5 flex shrink-0 items-center justify-center rounded-full transition-all h-9 w-9 sm:h-10 sm:w-10 ${
            canSend
              ? 'bg-terra-600 text-white hover:bg-terra-700 shadow-md shadow-terra-600/25'
              : 'bg-app-subtle text-app-muted cursor-not-allowed'
          }`}
        >
          {sending ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <SendArrowIcon />
          )}
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 mt-1.5 px-0.5 text-[11px] map-text-muted min-w-0">
        <span className="min-w-0 leading-snug">{creditsFooterText()}</span>
        {!user && credits?.tier === 'anonymous' && (
          <Link to="/login" className="text-terra-600 hover:underline font-medium shrink-0 whitespace-nowrap">
            {ta.signInForCredits}
          </Link>
        )}
        {user && !hasPaidAccess && atLimit && (
          <Link to="/subscriptions" className="text-terra-600 hover:underline font-medium shrink-0 whitespace-nowrap">
            {ta.upgradeShort}
          </Link>
        )}
        {user && !hasPaidAccess && !atLimit && credits?.tier === 'free' && (
          <Link to="/subscriptions" className="text-terra-600 hover:underline font-medium shrink-0 whitespace-nowrap">
            {ta.getMoreCredits}
          </Link>
        )}
      </div>
    </form>
  )

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {showContextBar && (
        <div className="shrink-0 border-b border-app-border/60 px-3 sm:px-4 py-2 bg-app-subtle/25">
          {breadcrumbText && (
            <p className="text-[11px] map-text-muted truncate" title={breadcrumbText}>
              {breadcrumbText}
            </p>
          )}
          {(showRegionChip || (hasMapped && insight && insight.minerals.length > 0)) && (
            <div className={`flex flex-wrap items-center gap-1 ${breadcrumbText ? 'mt-1' : ''}`}>
              {showRegionChip && (
                <span className="inline-flex items-center rounded-md bg-app-surface border border-app-border/80 px-1.5 py-0.5 text-[11px] font-medium map-text">
                  {regionLabel}
                </span>
              )}
              {hasMapped &&
                insight?.minerals.map((mineral) => (
                  <span
                    key={mineral.slug}
                    className="inline-flex items-center gap-1 rounded-md bg-app-surface border border-app-border/80 px-1.5 py-0.5 text-[11px] map-text-secondary"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: mineral.color }}
                    />
                    {displayName(mineral)}
                    <span className="map-text-muted">×{mineral.count}</span>
                  </span>
                ))}
            </div>
          )}
          {showZoneNote && aerialAccess && (
            <p className="text-[10px] map-text-muted mt-1 leading-snug">
              {aerialAccess.using_extended_area
                ? ta.extendedZoneActive
                    .replace('{area}', fmtKm2(currentZoneKm2(aerialAccess)))
                    .replace('{default}', String(defaultAnalysisKm2(aerialAccess)))
                : ta.zoneHighlightActive.replace('{area}', fmtKm2(currentZoneKm2(aerialAccess)))}
            </p>
          )}
        </div>
      )}

      <div
        ref={threadRef}
        className={`flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y px-3 sm:px-4 py-2 sm:py-3 space-y-2.5 sm:space-y-3 scrollbar-pane ${
          isFillLayout ? 'bg-gradient-to-b from-app-subtle/30 to-transparent' : ''
        }`}
      >
        {loading ? (
          <div className={`flex items-center gap-2 text-sm map-text-muted justify-center ${isCompact ? 'py-4' : 'py-8'}`}>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-terra-600 border-t-transparent" />
            {ta.generating}
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={`${msg.role}-${i}`}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <TerraAssistantAvatar className={`shrink-0 mt-0.5 ${mobileSheet ? 'h-6 w-6' : 'h-7 w-7'}`} />
              )}
              <div
                className={`${mobileSheet ? 'max-w-[88%]' : 'max-w-[85%]'} rounded-2xl px-3 py-2 text-sm shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-terra-600 text-white rounded-br-md'
                    : 'bg-app-surface map-text shadow-sm rounded-bl-md'
                }`}
              >
                <AssistantMessageContent content={msg.content} role={msg.role} />
              </div>
            </div>
          ))
        )}

        {sending && (
          <div className="flex gap-2.5 justify-start">
            <TerraAssistantAvatar className="h-7 w-7 mt-0.5" />
            <div className="rounded-2xl rounded-bl-md bg-app-surface px-3.5 py-2.5 text-xs map-text-muted flex items-center gap-2 shadow-sm">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-terra-600 border-t-transparent" />
              {ta.thinking}
            </div>
          </div>
        )}

        {!loading && showThreadUpgrade && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 leading-relaxed">
            {insight?.upgrade_message || ta.upgradeForMore}{' '}
            <Link to="/subscriptions" className="text-terra-600 hover:underline font-medium">
              {ta.viewPlans}
            </Link>
          </p>
        )}

        {!loading && showExtensionOffer && aerialAccess && mapContext && (
          <div className="text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 leading-relaxed space-y-2">
            <p>{ta.extensionOfferMessage.replace('{included}', String(defaultAnalysisKm2(aerialAccess)))}</p>
            <div className="flex flex-wrap gap-1.5">
              {EXTENSION_KM2_OPTIONS.map((km2) => (
                <button
                  key={km2}
                  type="button"
                  onClick={() => setExtensionKm2(km2)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors ${
                    extensionKm2 === km2
                      ? 'bg-terra-600 text-white border-terra-600'
                      : 'bg-white border-amber-200 text-amber-900 hover:border-terra-400'
                  }`}
                >
                  +{km2} km²
                </button>
              ))}
            </div>
            {user ? (
              <button
                type="button"
                onClick={() => {
                  setAerialCheckoutError('')
                  setAerialCheckoutOpen(true)
                }}
                className="text-terra-700 font-medium hover:underline"
              >
                {ta.aerialPurchaseCta.replace('{price}', fmtTzs(selectedExtensionPrice))}
              </button>
            ) : (
              <Link to="/login" className="text-terra-600 hover:underline font-medium">
                {ta.signInForCredits}
              </Link>
            )}
          </div>
        )}

        {!loading && hasPaidAccess && insight && !hasMapped && hasLocationContext && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 leading-relaxed">
            {m.map.clickInsideZone}
          </p>
        )}

        {error && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
        )}
      </div>

      <div
        className={`shrink-0 z-10 flex flex-col gap-3 bg-gradient-to-t from-app-surface via-app-surface/90 to-transparent ${
          mobileSheet ? 'px-2.5 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]' : 'px-3 sm:px-4 pt-2 pb-3 sm:pb-4'
        }`}
      >
        {!loading && historyReady && !chatHistoryEnabled && messages.length > 1 && !mobileSheet && (
          <p className="px-0.5 text-[11px] leading-snug map-text-muted">{ta.chatHistorySessionHint}</p>
        )}
        {insightExport && (
          <TerraInsightExportControls
            hasPaidAccess={hasPaidAccess}
            mode={mode}
            messages={messages}
            mapContext={mapContext}
            mapSnapshot={mapSnapshot}
            getMapSnapshot={getMapSnapshot}
            onCreditsRefresh={() => void refreshCredits()}
            compact={mobileSheet || isCompact}
          />
        )}
        {showFooterUpgradeHint && user && !hasPaidAccess && atLimit && (
          <p className="px-0.5 text-[11px] leading-snug text-app-text-secondary">
            {ta.upgradeForMore}{' '}
            <Link to="/subscriptions" className="text-terra-600 hover:underline font-medium">
              {ta.viewPlans}
            </Link>
          </p>
        )}
        {composerForm}
      </div>

      <PhoneCheckoutModal
        open={aerialCheckoutOpen}
        onCancel={() => setAerialCheckoutOpen(false)}
        defaultPhone={user?.phone || ''}
        defaultEmail={user?.email || ''}
        title={ta.aerialCheckoutTitle}
        description={ta.aerialCheckoutDesc}
        productHint={
          <div className="text-sm text-app-secondary space-y-1">
            <p>
              {ta.aerialCheckoutLine
                .replace('{extra}', String(extensionKm2))
                .replace('{total}', String(defaultAnalysisKm2(aerialAccess) + extensionKm2))
                .replace('{price}', fmtTzs(selectedExtensionPrice))}
            </p>
            <p className="text-xs map-text-muted">{ta.extensionCheckoutNote}</p>
          </div>
        }
        confirmLabel={ta.aerialPurchaseCta.replace('{price}', fmtTzs(selectedExtensionPrice))}
        labels={{
          back: p.back,
          cancel: p.cancel,
          mobileMoney: p.mobileMoney,
          card: p.card,
          mobileMoneyHint: p.mobileMoneyHint,
          mobileMoneyNumber: p.mobileMoneyNumber,
          mobileMoneyPlaceholder: p.mobileMoneyPlaceholder,
          cardDetailsSubtitle: p.cardDetailsSubtitle,
          continueToSecurePayment: p.continueToSecurePayment,
          nameOnCard: p.nameOnCard,
          billingEmail: p.billingEmail,
          visa: p.visa,
          mastercard: p.mastercard,
          continue: p.continueToPayment,
        }}
        loading={aerialCheckout.isPending}
        error={aerialCheckoutError}
        onConfirm={(payload) => {
          void aerialCheckout.mutateAsync({
            paymentMethod: payload.paymentMethod,
            msisdn: payload.msisdn,
            cardBrand: payload.cardBrand,
            cardholderName: payload.cardholderName,
            billingEmail: payload.billingEmail,
          })
        }}
      />
    </div>
  )
}
