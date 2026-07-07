import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { analyticsApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { useTranslation } from '../../i18n/LocaleContext'
import { useDisplayName } from '../../i18n/useDisplayName'
import type { AssistantCredits, AssistantMessage, MineralCatalogEntry } from '../../types'
import { SendArrowIcon, TerraAssistantAvatar } from '../assistant/AssistantIcons'
import AssistantMessageContent from '../assistant/AssistantMessageContent'
import { catalogInsightParams, catalogInsightChatParams } from './catalogInsightParams'
import { formatAreaKm2 } from './mapFormat'

interface CommodityInsightPanelProps {
  entry: MineralCatalogEntry
  hasPaidAccess: boolean
  onClose: () => void
  onShowOnMap: () => void
}

function buildSuggestedQuestions(
  label: string,
  topRegions: { region: string }[],
  prompts: {
    regions: string
    significance: string
    investor: string
    compare: string
    regionFocus: string
  }
) {
  const items = [
    prompts.regions.replace('{name}', label),
    prompts.significance.replace('{name}', label),
    prompts.investor.replace('{name}', label),
    prompts.compare.replace('{name}', label),
  ]
  const top = topRegions[0]?.region
  if (top) {
    items.push(prompts.regionFocus.replace('{name}', label).replace('{region}', top))
  }
  return items
}

export default function CommodityInsightPanel({
  entry,
  hasPaidAccess,
  onClose,
  onShowOnMap,
}: CommodityInsightPanelProps) {
  const { m, t } = useTranslation()
  const displayName = useDisplayName()
  const { user } = useAuth()
  const ta = m.assistant

  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const [question, setQuestion] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [credits, setCredits] = useState<AssistantCredits | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior, block: 'end' })
  }, [])

  const { data: insight, isLoading } = useQuery({
    queryKey: ['commodity-insight', entry.slug, entry.id],
    queryFn: () =>
      analyticsApi.searchContextInsights(catalogInsightParams(entry)).then((r) => r.data),
    enabled: hasPaidAccess && entry.is_mapped,
    staleTime: 60_000,
  })

  const topRegions = insight?.top_regions ?? []
  const connectedLayers = insight?.connected_layers ?? []
  const relatedReports = insight?.related_reports ?? []
  const totalAreaKm2 = insight?.total_area_km2
  const chatParams = catalogInsightChatParams(entry)
  const label = displayName(entry)
  const threadKey = `search:mineral:${entry.slug}`

  const suggestedQuestions = useMemo(
    () =>
      buildSuggestedQuestions(label, topRegions, {
        regions: m.map.commoditySuggestRegions,
        significance: m.map.commoditySuggestSignificance,
        investor: m.map.commoditySuggestInvestor,
        compare: m.map.commoditySuggestCompare,
        regionFocus: m.map.commoditySuggestRegionFocus,
      }),
    [label, topRegions, m.map]
  )

  const hasUserMessages = messages.some((msg) => msg.role === 'user')
  const showSuggestions = hasPaidAccess && !!insight?.ai_insight && !hasUserMessages && !sending

  const atLimit =
    credits != null && !credits.unlimited && (credits.remaining ?? 0) <= 0
  const canSend = !!question.trim() && !sending && !atLimit && !isLoading

  const refreshCredits = useCallback(async () => {
    try {
      const { data } = await analyticsApi.assistantCredits()
      setCredits(data.assistant_credits)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    setMessages([])
    setQuestion('')
    setError('')
  }, [entry.slug])

  useEffect(() => {
    if (insight?.assistant_credits) {
      setCredits(insight.assistant_credits)
    } else if (hasPaidAccess) {
      void refreshCredits()
    }
  }, [insight?.assistant_credits, hasPaidAccess, refreshCredits])

  useEffect(() => {
    if (!hasPaidAccess || !insight?.ai_insight) return

    let cancelled = false

    async function bootstrapThread() {
      if (user) {
        try {
          const { data } = await analyticsApi.assistantHistory({
            mode: 'map',
            thread_key: threadKey,
            mineralSlug: entry.slug,
          })
          if (!cancelled && data.messages.length > 0) {
            setMessages(data.messages)
            return
          }
        } catch {
          /* fall through */
        }
      }

      if (!cancelled) {
        setMessages([{ role: 'assistant', content: insight!.ai_insight! }])
      }
    }

    void bootstrapThread()
    return () => {
      cancelled = true
    }
  }, [entry.slug, hasPaidAccess, insight?.ai_insight, user, threadKey])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      scrollToBottom(messages.length <= 1 ? 'auto' : 'smooth')
    })
    return () => window.cancelAnimationFrame(frame)
  }, [messages, sending, isLoading, insight?.ai_insight, scrollToBottom])

  async function sendQuestion(raw: string) {
    const q = raw.trim()
    if (!q || sending || atLimit) return

    const prior = messages.filter((msg) => msg.role === 'user' || msg.role === 'assistant')

    setSending(true)
    setError('')
    setQuestion('')
    setMessages((prev) => [...prev, { role: 'user', content: q }])

    try {
      const { data } = await analyticsApi.assistantChat({
        question: q,
        messages: prior,
        mode: 'map',
        ...chatParams,
        countryCode: 'TZ',
        threadKey,
      })
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
      if (data.assistant_credits) setCredits(data.assistant_credits)
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { detail?: string; assistant_credits?: AssistantCredits } } })
        .response?.data
      setError(resp?.detail || ta.errorGeneric)
      if (resp?.assistant_credits) setCredits(resp.assistant_credits)
      setMessages((prev) => (prev[prev.length - 1]?.role === 'user' ? prev.slice(0, -1) : prev))
      setQuestion(q)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    void sendQuestion(question)
  }

  function creditsFooterText() {
    if (!credits) return ''
    if (credits.unlimited) return ta.creditsUnlimited
    const remaining = credits.remaining ?? 0
    const limit = credits.limit ?? 0
    if (remaining <= 0) return ta.creditsUsed
    if (credits.tier === 'anonymous') {
      return t('assistant.creditsAnonymous', { remaining, limit })
    }
    if (credits.tier === 'free') {
      return t('assistant.creditsFreeMonthly', { remaining, limit })
    }
    return t('assistant.creditsLeft', { remaining, limit })
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  useEffect(() => {
    inputRef.current?.focus()
  }, [entry.slug, hasPaidAccess, isLoading])

  function layerTypeLabel(layerType: string) {
    if (layerType === 'polygon') return m.map.layerTypePolygon
    if (layerType === 'point') return m.map.layerTypePoint
    if (layerType === 'line') return m.map.layerTypeLine
    return layerType
  }

  const panelBody = (
    <>
      <div className="flex items-start justify-between gap-3 px-4 sm:px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-terra-50/80 to-white shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="w-4 h-4 rounded-full shrink-0 ring-2 ring-white shadow-sm"
            style={{ backgroundColor: entry.color }}
          />
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">{label}</h3>
            {entry.feature_count > 0 && (
              <p className="text-xs text-slate-500 mt-0.5">
                {t('map.mappedZonesInView', { count: entry.feature_count })}
                {totalAreaKm2 != null && totalAreaKm2 > 0 && (
                  <span> · {formatAreaKm2(totalAreaKm2)}</span>
                )}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-xl leading-none"
          aria-label={m.map.closePanel}
        >
          ×
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-4 sm:px-5 py-4 space-y-4">
        {!hasPaidAccess ? (
          <div className="rounded-xl border border-terra-200/80 bg-terra-50/40 p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <TerraAssistantAvatar className="h-8 w-8 shrink-0 opacity-60" />
              <p className="text-sm font-semibold text-slate-800">{ta.sectionTitle}</p>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{m.map.commodityInsightPaidOnly}</p>
            <Link
              to="/subscriptions"
              className="mt-4 inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-terra-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-terra-700 transition-colors"
            >
              {m.map.viewPlans}
            </Link>
          </div>
        ) : (
          <>
            {entry.description?.trim() && (
              <p className="text-sm text-slate-600 leading-relaxed">{entry.description.trim()}</p>
            )}

            {connectedLayers.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  {m.map.commodityConnectedLayers}
                </p>
                <ul className="space-y-1">
                  {connectedLayers.map((layer) => (
                    <li
                      key={layer.id}
                      className="flex items-center justify-between text-sm text-slate-700 rounded-lg bg-slate-50 px-3 py-2"
                    >
                      <span className="min-w-0 truncate">{layer.name}</span>
                      <span className="shrink-0 text-xs text-slate-500 tabular-nums text-right ml-2">
                        {layerTypeLabel(layer.layer_type)}
                        {layer.feature_count > 0 && (
                          <span className="block">{layer.feature_count}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {relatedReports.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  {m.map.commodityRelatedReports}
                </p>
                <ul className="space-y-1">
                  {relatedReports.map((report) => (
                    <li key={report.slug}>
                      <Link
                        to={report.has_article ? `/downloads/${report.slug}/read` : `/downloads/${report.slug}`}
                        className="flex items-center justify-between text-sm text-slate-700 rounded-lg bg-slate-50 px-3 py-2 hover:bg-terra-50 hover:text-terra-800 transition-colors"
                      >
                        <span className="min-w-0 truncate font-medium">{report.title}</span>
                        {report.region && (
                          <span className="shrink-0 text-xs text-slate-500 ml-2">{report.region}</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {topRegions.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  {m.map.whereToFind}
                </p>
                <ul className="space-y-1">
                  {topRegions.map((r) => (
                    <li
                      key={r.region}
                      className="flex items-center justify-between text-sm text-slate-700 rounded-lg bg-slate-50 px-3 py-2"
                    >
                      <span>{r.region}</span>
                      <span className="text-xs text-slate-500 tabular-nums text-right">
                        {r.count} {m.map.zones}
                        {r.area_km2 != null && r.area_km2 > 0 && (
                          <span className="block">{formatAreaKm2(r.area_km2)}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-terra-600 border-t-transparent" />
                {m.map.analyzing}
              </div>
            ) : insight?.ai_insight ? (
              <>
                <div className="space-y-3">
                  {messages.map((msg, idx) => (
                    <div
                      key={`${msg.role}-${idx}`}
                      className={msg.role === 'user' ? 'flex justify-end' : 'flex gap-2'}
                    >
                      {msg.role === 'assistant' && (
                        <TerraAssistantAvatar className="h-6 w-6 shrink-0 mt-0.5" />
                      )}
                      <div
                        className={
                          msg.role === 'user'
                            ? 'max-w-[92%] rounded-2xl rounded-br-md bg-terra-600 px-3 py-2 text-sm text-white'
                            : 'min-w-0 flex-1'
                        }
                      >
                        {msg.role === 'assistant' ? (
                          <AssistantMessageContent
                            content={msg.content}
                            role="assistant"
                            compact
                            className="text-slate-600 text-sm"
                          />
                        ) : (
                          <p className="leading-relaxed">{msg.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {sending && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-terra-600 border-t-transparent" />
                      {ta.thinking}
                    </div>
                  )}
                </div>

                {showSuggestions && (
                  <div className="pt-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
                      {m.map.commoditySuggestedTitle}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedQuestions.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => void sendQuestion(prompt)}
                          disabled={atLimit}
                          className="text-left text-xs rounded-full border border-terra-200 bg-white px-3 py-1.5 text-slate-700 hover:border-terra-400 hover:bg-terra-50 transition-colors disabled:opacity-50"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {error && <p className="text-xs text-red-600">{error}</p>}
                <div ref={bottomRef} aria-hidden className="h-px shrink-0" />
              </>
            ) : (
              <p className="text-sm text-slate-500">{m.map.noMappedZones}</p>
            )}
          </>
        )}
      </div>

      {hasPaidAccess && insight?.ai_insight && !isLoading && (
        <div className="shrink-0 border-t border-slate-100 px-4 sm:px-5 py-3 space-y-3 bg-white">
          <form onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor={`commodity-follow-up-${entry.slug}`}>
              {ta.askLabel}
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                id={`commodity-follow-up-${entry.slug}`}
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={t('map.commodityAskPlaceholder', { name: label })}
                disabled={sending || atLimit}
                className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-terra-500/30 focus:border-terra-400 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!canSend}
                aria-label={ta.send}
                className={`flex shrink-0 items-center justify-center rounded-full h-9 w-9 transition-all ${
                  canSend
                    ? 'bg-terra-600 text-white hover:bg-terra-700 shadow-sm'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                {sending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <SendArrowIcon />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 mt-1.5 text-[11px] text-slate-500">
              <span>{creditsFooterText()}</span>
              {atLimit && (
                <Link to="/subscriptions" className="text-terra-600 hover:underline font-medium shrink-0">
                  {ta.getMoreCredits}
                </Link>
              )}
            </div>
          </form>
          <button
            type="button"
            onClick={onShowOnMap}
            className="w-full rounded-lg bg-terra-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-terra-700 transition-colors shadow-sm"
          >
            {m.map.showOnMap}
          </button>
        </div>
      )}
    </>
  )

  return createPortal(
    <>
      <button
        type="button"
        aria-label={m.map.closePanel}
        className="fixed inset-0 z-[60] bg-black/40 animate-fade-in"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="fixed z-[61] inset-x-0 bottom-0 sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2 flex flex-col w-full sm:w-[min(100%,28rem)] max-h-[min(32rem,90vh)] sm:max-h-[min(36rem,85vh)] rounded-t-2xl sm:rounded-2xl border border-terra-200/80 bg-white shadow-2xl overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {panelBody}
      </div>
    </>,
    document.body
  )
}
