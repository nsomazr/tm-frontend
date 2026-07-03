import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { analyticsApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { useTranslation } from '../../i18n/LocaleContext'
import { useDisplayName } from '../../i18n/useDisplayName'
import type { AreaInsight, AssistantCredits, AssistantMessage } from '../../types'
import AssistantMessageContent from './AssistantMessageContent'
import { SendArrowIcon, TerraAssistantAvatar } from './AssistantIcons'

export interface TerraAssistantMapContext {
  lat: number
  lng: number
  zoom: number
  featureIds?: number[]
  mineralSlug?: string
  regionId?: number
  searchLabel?: string
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
  ta: { accountWelcome: string; emptyStateMessage: string }
): AssistantMessage[] {
  if (insight?.ai_insight) {
    return [{ role: 'assistant', content: insight.ai_insight }]
  }
  if (mode === 'account') {
    return [{ role: 'assistant', content: ta.accountWelcome }]
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
}: TerraAssistantPanelProps) {
  const { m } = useTranslation()
  const ta = m.assistant
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
  const threadRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)

  const hasLocationContext = mode === 'map' && !!mapContext
  const hasSearchContext = !!(mapContext?.mineralSlug || mapContext?.regionId != null)
  const hasMapped = insight?.has_mapped_data !== false && (insight?.feature_count ?? 0) > 0
  const threadKey = useMemo(() => buildAssistantThreadKey(mode, mapContext), [mode, mapContext])
  const chatHistoryEnabled = credits?.chat_history === true

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
      setMessages(defaultSeedMessage(mode, insight, ta))
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = question.trim()
    if (!q || !canSend) return

    setSending(true)
    setError('')
    setQuestion('')

    const prior = messages.filter((msg) => msg.role === 'user' || msg.role === 'assistant')
    const useMapMode = mode === 'map' && (hasLocationContext || hasSearchContext)

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
        response?: { data?: { detail?: string; assistant_credits?: AssistantCredits } }
      }).response?.data
      setError(resp?.detail || ta.errorGeneric)
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
      {hasMapped && insight && (
        <div className="shrink-0 flex flex-wrap gap-1.5 px-4 pt-3 pb-2 bg-app-subtle/30">
          {insight.region && (
            <span className="inline-flex items-center rounded-full bg-app-surface border border-app-border px-2.5 py-1 text-xs font-medium map-text">
              {insight.region}
            </span>
          )}
          {insight.minerals.map((mineral) => (
            <span
              key={mineral.slug}
              className="inline-flex items-center gap-1.5 rounded-full bg-app-surface border border-app-border px-2.5 py-1 text-xs map-text-secondary"
            >
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: mineral.color }} />
              {displayName(mineral)}
              <span className="map-text-muted">×{mineral.count}</span>
            </span>
          ))}
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

        {!loading && insight && !insight.ai_insight && insight.requires_subscription && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 leading-relaxed">
            {insight.upgrade_message || ta.creditsUsed}
          </p>
        )}

        {!loading && insight && !hasMapped && mode === 'map' && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 leading-relaxed">
            {m.map.clickInsideZone}
          </p>
        )}

        {error && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
        )}
      </div>

      <div
        className={`shrink-0 z-10 bg-gradient-to-t from-app-surface via-app-surface/90 to-transparent ${
          mobileSheet ? 'px-2.5 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]' : 'px-3 sm:px-4 pt-2 pb-3 sm:pb-4'
        }`}
      >
        {!loading && historyReady && !chatHistoryEnabled && (
          <div className="mb-2 px-0.5 space-y-0.5 text-[11px] leading-snug map-text-muted">
            {messages.length > 1 && <p>{ta.chatHistorySessionHint}</p>}
            {user && !hasPaidAccess && (
              <p>
                {ta.chatHistoryUpsell}{' '}
                <Link to="/subscriptions" className="text-terra-600 hover:underline font-medium">
                  {ta.viewPlans}
                </Link>
              </p>
            )}
          </div>
        )}
        {composerForm}
      </div>
    </div>
  )
}
