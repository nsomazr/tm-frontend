import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { analyticsApi, marketplaceApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import AssistantMessageContent from '../assistant/AssistantMessageContent'
import { DEFAULT_COUNTRY_CODE } from '../map/countryFocus'
import { matchGeologicalColor } from '../../constants/geologicalMineralColors'
import MarketplaceContactCard from './MarketplaceContactCard'
import MarketplacePlotInsightCard from './MarketplacePlotInsightCard'
import type { AreaInsight, MarketplaceListingDocument, MarketplaceListingPublic } from '../../types'

function errorMessage(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (detail && typeof detail === 'object') return JSON.stringify(detail)
  if (err instanceof Error && err.message) return err.message
  return 'Something went wrong. Please try again.'
}

function downloadFileName(title: string) {
  const cleaned = title.trim() || 'document'
  return /\.[a-z0-9]{2,5}$/i.test(cleaned) ? cleaned : `${cleaned}.pdf`
}

function MineralTags({ listing }: { listing: MarketplaceListingPublic }) {
  const primary = (listing.primary_mineral || '').trim()
  const others = (listing.other_minerals || []).filter(Boolean)
  const fallback = listing.commodity_labels || []
  const tags =
    primary || others.length
      ? [
          ...(primary ? [{ label: primary, primary: true }] : []),
          ...others.map((label) => ({ label, primary: false })),
        ]
      : fallback.map((label, i) => ({ label, primary: i === 0 }))

  if (!tags.length) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map(({ label, primary: isPrimary }) => {
        const color = matchGeologicalColor(label)?.hex ?? '#0f766e'
        return (
          <span
            key={`${label}-${isPrimary ? 'p' : 'o'}`}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
              isPrimary
                ? 'bg-terra-500/15 text-terra-800 ring-1 ring-terra-500/30 dark:text-terra-300'
                : 'bg-app-subtle text-app-text-secondary'
            }`}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden
            />
            {label}
          </span>
        )
      })}
    </div>
  )
}

interface MarketplaceListingDetailSheetProps {
  listing: MarketplaceListingPublic
  onClose: () => void
}

export default function MarketplaceListingDetailSheet({
  listing,
  onClose,
}: MarketplaceListingDetailSheetProps) {
  const { user, hasFullMapAccess } = useAuth()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const [contactEmail, setContactEmail] = useState(user?.email ?? '')
  const [sent, setSent] = useState(false)
  const [docSummaryId, setDocSummaryId] = useState<number | null>(null)
  const [docSummary, setDocSummary] = useState<string | null>(null)
  const [plotInsight, setPlotInsight] = useState<AreaInsight | null>(null)
  const [showContact, setShowContact] = useState(false)

  useEffect(() => {
    setMessage('')
    setContactEmail(user?.email ?? '')
    setSent(false)
    setDocSummaryId(null)
    setDocSummary(null)
    setPlotInsight(null)
    setShowContact(false)
  }, [listing.id, user?.email])

  const hasPublicContact =
    !!listing.show_contact_public &&
    !!(listing.contact_name || listing.contact_email || listing.contact_phone)
  const canContact = hasPublicContact || !!listing.allow_inquiries
  const loginNext = `/login?next=${encodeURIComponent(`/marketplace?listing=${listing.slug}`)}`
  const hasMapPoint = listing.center_lat != null && listing.center_lng != null
  const docs = listing.documents ?? []

  const inquire = useMutation({
    mutationFn: () =>
      marketplaceApi.inquire(listing.slug, {
        message,
        contact_email: contactEmail || user?.email || undefined,
      }),
    onSuccess: () => {
      setSent(true)
      setMessage('')
      queryClient.invalidateQueries({ queryKey: ['marketplace-inquiries'] })
    },
  })

  const summarizeDoc = useMutation({
    mutationFn: (docId: number) => marketplaceApi.summarizeDocument(listing.slug, docId),
    onSuccess: (res, docId) => {
      setDocSummaryId(docId)
      setDocSummary(res.data.summary)
    },
  })

  const summarizePlot = useMutation({
    mutationFn: async () => {
      if (listing.center_lat == null || listing.center_lng == null) {
        throw new Error('This listing has no map location yet.')
      }
      const { data } = await analyticsApi.areaInsights(listing.center_lat, listing.center_lng, 11, {
        country: DEFAULT_COUNTRY_CODE,
      })
      if (!data.ai_insight?.trim() && !data.minerals?.length && data.requires_subscription) {
        throw new Error(data.upgrade_message || 'Upgrade to get a Terra summary for this plot.')
      }
      if (!data.ai_insight?.trim() && !data.minerals?.length && !data.terrain_context) {
        throw new Error('Terra could not generate a summary for this area yet.')
      }
      void marketplaceApi.trackEvent(listing.slug, 'terra_summary').catch(() => undefined)
      return data
    },
    onSuccess: (data) => setPlotInsight(data),
  })

  const onSummarizeDocument = (doc: MarketplaceListingDocument) => {
    if (!user) return
    setDocSummaryId(doc.id)
    setDocSummary(null)
    summarizeDoc.mutate(doc.id)
  }

  const meta = [listing.geometry_type, listing.buffer_km ? `${listing.buffer_km} km buffer` : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-app-surface/95 backdrop-blur-md">
      <header className="shrink-0 border-b app-divider px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-app-muted">
              Selected plot
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-app-text sm:text-xl">
              {listing.title}
            </h2>
            {meta ? <p className="mt-1 text-xs text-app-muted">{meta}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-2.5 py-1.5 text-sm text-app-muted transition-colors hover:bg-app-subtle hover:text-app-text"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="mt-3">
          <MineralTags listing={listing} />
          {!listing.primary_mineral &&
          !(listing.other_minerals?.length) &&
          !(listing.commodity_labels?.length) ? (
            <p className="text-xs text-app-muted">No minerals listed for this plot.</p>
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-6 px-5 py-5">
          {(listing.summary || listing.description) && (
            <section className="space-y-2">
              {listing.summary ? (
                <p className="text-sm leading-relaxed text-app-text-secondary">{listing.summary}</p>
              ) : null}
              {listing.description && listing.description.trim() !== listing.summary?.trim() ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-app-text">
                  {listing.description}
                </p>
              ) : null}
            </section>
          )}

          {docs.length > 0 ? (
            <section>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-app-muted">
                  Documents
                </h3>
                <span className="text-[11px] text-app-muted">{docs.length}</span>
              </div>
              <ul className="overflow-hidden rounded-xl border border-app-border">
                {docs.map((doc, index) => (
                  <li
                    key={doc.id}
                    className={`bg-app-bg/30 px-3.5 py-3 ${
                      index > 0 ? 'border-t border-app-border' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-app-text" title={doc.title}>
                        {doc.title}
                      </p>
                      <div className="flex shrink-0 items-center gap-2.5">
                        {doc.file_url ? (
                          <a
                            href={doc.file_url}
                            download={downloadFileName(doc.title)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-terra-700 hover:underline dark:text-terra-300"
                            onClick={() => {
                              void marketplaceApi
                                .trackEvent(listing.slug, 'document_download')
                                .catch(() => undefined)
                            }}
                          >
                            Download
                          </a>
                        ) : (
                          <span className="text-xs text-app-muted">Unavailable</span>
                        )}
                        {user ? (
                          <button
                            type="button"
                            className="text-xs font-semibold text-terra-700 hover:underline disabled:opacity-60 dark:text-terra-300"
                            disabled={summarizeDoc.isPending && docSummaryId === doc.id}
                            onClick={() => onSummarizeDocument(doc)}
                          >
                            {summarizeDoc.isPending && docSummaryId === doc.id
                              ? '…'
                              : docSummaryId === doc.id && docSummary
                                ? 'Refresh'
                                : 'Summarize'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {docSummaryId === doc.id && summarizeDoc.isError ? (
                      <p className="mt-2 text-xs text-red-600">{errorMessage(summarizeDoc.error)}</p>
                    ) : null}
                    {docSummaryId === doc.id && docSummary ? (
                      <div className="mt-2 border-t border-app-border/70 pt-2">
                        <AssistantMessageContent
                          content={docSummary}
                          role="assistant"
                          compact
                          className="text-sm leading-relaxed text-app-text [&_p]:mb-2 [&_p:last-child]:mb-0"
                        />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            {hasMapPoint ? (
              <MarketplacePlotInsightCard
                signedIn={!!user}
                loginNext={loginNext}
                loading={summarizePlot.isPending}
                error={summarizePlot.isError ? errorMessage(summarizePlot.error) : null}
                insight={plotInsight}
                hasFullAccess={hasFullMapAccess}
                onGenerate={() => {
                  setPlotInsight(null)
                  summarizePlot.mutate()
                }}
                onClear={() => {
                  setPlotInsight(null)
                  summarizePlot.reset()
                }}
              />
            ) : (
              <p className="rounded-xl border border-dashed border-app-border px-3.5 py-3 text-sm text-app-muted">
                This listing has no map location yet, so Terra cannot summarize the area.
              </p>
            )}
          </section>
        </div>
      </div>

      {canContact ? (
        <div className="shrink-0 border-t app-divider bg-app-surface/90 px-5 py-3.5 backdrop-blur-sm">
          {!showContact ? (
            <button
              type="button"
              className="btn-primary w-full text-sm"
              onClick={() => setShowContact(true)}
            >
              Contact owner
            </button>
          ) : (
            <div className="max-h-[min(40vh,20rem)] space-y-3 overflow-y-auto">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-app-text">Contact owner</p>
                <button
                  type="button"
                  className="text-xs font-medium text-app-muted hover:text-app-text"
                  onClick={() => setShowContact(false)}
                >
                  Close
                </button>
              </div>
              {hasPublicContact ? (
                <dl className="space-y-1 rounded-xl bg-app-bg/50 px-3.5 py-3 text-sm text-app-text">
                  {listing.contact_name ? <dd className="font-medium">{listing.contact_name}</dd> : null}
                  {listing.contact_email ? (
                    <dd>
                      <a
                        className="text-terra-700 hover:underline dark:text-terra-300"
                        href={`mailto:${listing.contact_email}`}
                      >
                        {listing.contact_email}
                      </a>
                    </dd>
                  ) : null}
                  {listing.contact_phone ? (
                    <dd>
                      <a
                        className="text-terra-700 hover:underline dark:text-terra-300"
                        href={`tel:${listing.contact_phone}`}
                      >
                        {listing.contact_phone}
                      </a>
                    </dd>
                  ) : null}
                </dl>
              ) : null}
              {listing.allow_inquiries ? (
                <MarketplaceContactCard
                  listingTitle={listing.title}
                  loginNext={loginNext}
                  signedIn={!!user}
                  replyEmail={user?.email ?? null}
                  contactEmail={contactEmail}
                  onContactEmailChange={setContactEmail}
                  message={message}
                  onMessageChange={setMessage}
                  sent={sent}
                  sending={inquire.isPending}
                  error={inquire.isError ? errorMessage(inquire.error) : null}
                  onSubmit={() => inquire.mutate()}
                />
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </aside>
  )
}
