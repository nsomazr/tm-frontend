import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { analyticsApi, marketplaceApi } from '../api'
import { useAuth } from '../auth/AuthContext'
import AssistantMessageContent from '../components/assistant/AssistantMessageContent'
import MarketplaceMap from '../components/marketplace/MarketplaceMap'
import MarketplaceContactCard from '../components/marketplace/MarketplaceContactCard'
import MarketplacePlotInsightCard from '../components/marketplace/MarketplacePlotInsightCard'
import { DEFAULT_COUNTRY_CODE } from '../components/map/countryFocus'
import type { AreaInsight, MarketplaceListingDocument, MarketplaceListingPublic } from '../types'

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

function ListingDetailPanel({
  listing,
  onClose,
}: {
  listing: MarketplaceListingPublic
  onClose: () => void
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const [contactEmail, setContactEmail] = useState(user?.email ?? '')
  const [sent, setSent] = useState(false)
  const [docSummaryId, setDocSummaryId] = useState<number | null>(null)
  const [docSummary, setDocSummary] = useState<string | null>(null)
  const [plotInsight, setPlotInsight] = useState<AreaInsight | null>(null)
  const [showContact, setShowContact] = useState(false)

  const hasPublicContact =
    !!listing.show_contact_public &&
    !!(listing.contact_name || listing.contact_email || listing.contact_phone)
  const canContact = hasPublicContact || !!listing.allow_inquiries

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

  const onSubmit = () => {
    inquire.mutate()
  }

  const onSummarizeDocument = (doc: MarketplaceListingDocument) => {
    if (!user) return
    setDocSummaryId(doc.id)
    setDocSummary(null)
    summarizeDoc.mutate(doc.id)
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-l app-divider bg-app-surface shadow-xl md:w-[400px]">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b app-divider px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-app-text">{listing.title}</h2>
          {listing.geometry_type && (
            <p className="mt-0.5 text-xs text-app-muted">
              {listing.geometry_type}
              {listing.buffer_km ? ` · ${listing.buffer_km} km buffer` : ''}
            </p>
          )}
        </div>
        <button type="button" className="btn-secondary !px-2.5 !py-1.5 text-sm" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="max-h-[34%] shrink-0 space-y-3 overflow-y-auto border-b app-divider px-4 py-3">
          {listing.summary && <p className="text-sm text-app-text-secondary">{listing.summary}</p>}
          {listing.description && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-app-muted">Description</h3>
              <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-app-text">{listing.description}</p>
            </div>
          )}

          {!!listing.commodity_labels?.length && (
            <div className="flex flex-wrap gap-1.5">
              {listing.commodity_labels.map((label) => (
                <span
                  key={label}
                  className="rounded-md bg-terra-50 px-2 py-0.5 text-xs font-medium text-terra-800 dark:bg-terra-500/15 dark:text-terra-300"
                >
                  {label}
                </span>
              ))}
            </div>
          )}

          {!!listing.documents?.length && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-app-muted">Documents</h3>
              <ul className="mt-1.5 divide-y app-divider border-t app-divider">
                {listing.documents.map((doc) => (
                  <li key={doc.id} className="py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-app-text" title={doc.title}>
                        {doc.title}
                      </p>
                      <div className="flex shrink-0 items-center gap-3">
                        {doc.file_url ? (
                          <a
                            href={doc.file_url}
                            download={downloadFileName(doc.title)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium text-terra-700 hover:underline dark:text-terra-300"
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
                            className="text-xs font-medium text-terra-700 hover:underline disabled:opacity-60 dark:text-terra-300"
                            disabled={summarizeDoc.isPending && docSummaryId === doc.id}
                            onClick={() => onSummarizeDocument(doc)}
                          >
                            {summarizeDoc.isPending && docSummaryId === doc.id
                              ? 'Summarizing…'
                              : docSummaryId === doc.id && docSummary
                                ? 'Refresh'
                                : 'Terra summary'}
                          </button>
                        ) : (
                          <Link
                            to={`/login?next=${encodeURIComponent(`/marketplace?listing=${listing.slug}`)}`}
                            className="text-xs font-medium text-terra-700 hover:underline dark:text-terra-300"
                          >
                            Sign in
                          </Link>
                        )}
                      </div>
                    </div>
                    {docSummaryId === doc.id && summarizeDoc.isError && (
                      <p className="mt-2 text-sm text-red-600">{errorMessage(summarizeDoc.error)}</p>
                    )}
                    {docSummaryId === doc.id && docSummary && (
                      <div className="mt-2 max-h-36 overflow-y-auto border-t app-divider pt-2">
                        <AssistantMessageContent
                          content={docSummary}
                          role="assistant"
                          compact
                          className="text-app-text text-sm leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0"
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 py-3">
          {listing.center_lat != null && listing.center_lng != null ? (
            <MarketplacePlotInsightCard
              className="min-h-0 flex-1"
              signedIn={!!user}
              loginNext={`/login?next=${encodeURIComponent(`/marketplace?listing=${listing.slug}`)}`}
              loading={summarizePlot.isPending}
              error={summarizePlot.isError ? errorMessage(summarizePlot.error) : null}
              insight={plotInsight}
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
            <div className="flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-dashed app-divider px-4 text-center text-sm text-app-muted">
              Add a map area to this listing to unlock Ask Terra here.
            </div>
          )}

          {canContact ? (
            <div className={`shrink-0 space-y-3 ${showContact ? 'max-h-[42%] overflow-y-auto' : ''}`}>
              <button
                type="button"
                className="btn-secondary w-full text-sm"
                aria-expanded={showContact}
                onClick={() => setShowContact((open) => !open)}
              >
                {showContact ? 'Hide contact' : 'Show contact'}
              </button>

              {showContact ? (
                <div className="space-y-3">
                  {hasPublicContact ? (
                    <div className="rounded-xl border app-divider px-3.5 py-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-app-muted">Owner contact</h3>
                      <dl className="mt-2 space-y-1 text-sm text-app-text">
                        {listing.contact_name ? (
                          <div>
                            <dt className="sr-only">Name</dt>
                            <dd>{listing.contact_name}</dd>
                          </div>
                        ) : null}
                        {listing.contact_email ? (
                          <div>
                            <dt className="sr-only">Email</dt>
                            <dd>
                              <a
                                className="text-terra-600 hover:underline"
                                href={`mailto:${listing.contact_email}`}
                              >
                                {listing.contact_email}
                              </a>
                            </dd>
                          </div>
                        ) : null}
                        {listing.contact_phone ? (
                          <div>
                            <dt className="sr-only">Phone</dt>
                            <dd>
                              <a
                                className="text-terra-600 hover:underline"
                                href={`tel:${listing.contact_phone}`}
                              >
                                {listing.contact_phone}
                              </a>
                            </dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>
                  ) : null}

                  {listing.allow_inquiries ? (
                    <MarketplaceContactCard
                      listingTitle={listing.title}
                      loginNext={`/login?next=${encodeURIComponent(`/marketplace?listing=${listing.slug}`)}`}
                      signedIn={!!user}
                      replyEmail={user?.email ?? null}
                      contactEmail={contactEmail}
                      onContactEmailChange={setContactEmail}
                      message={message}
                      onMessageChange={setMessage}
                      sent={sent}
                      sending={inquire.isPending}
                      error={inquire.isError ? errorMessage(inquire.error) : null}
                      onSubmit={onSubmit}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  )
}

export default function MarketplacePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedSlug = searchParams.get('listing')
  const [query, setQuery] = useState('')

  const listQuery = useQuery({
    queryKey: ['marketplace-listings', query],
    queryFn: () =>
      marketplaceApi
        .listings(query.trim() ? { q: query.trim() } : undefined)
        .then((r) => r.data),
  })

  const geoQuery = useQuery({
    queryKey: ['marketplace-geojson', query],
    queryFn: () =>
      marketplaceApi
        .geojson(query.trim() ? { q: query.trim() } : undefined)
        .then((r) => r.data),
  })

  const detailQuery = useQuery({
    queryKey: ['marketplace-detail', selectedSlug],
    queryFn: () => marketplaceApi.detail(selectedSlug!).then((r) => r.data),
    enabled: !!selectedSlug,
  })

  const listings = listQuery.data ?? []
  const filteredCount = listings.length

  const selectSlug = (slug: string | null, source: 'list' | 'map' = 'list') => {
    if (slug && source === 'map') {
      void marketplaceApi.trackEvent(slug, 'map_click').catch(() => undefined)
    }
    const next = new URLSearchParams(searchParams)
    if (slug) next.set('listing', slug)
    else next.delete('listing')
    setSearchParams(next, { replace: true })
  }

  const emptyHint = useMemo(() => {
    if (listQuery.isLoading || geoQuery.isLoading) return 'Loading listings…'
    if (filteredCount === 0) {
      return query.trim()
        ? 'No listings match your search.'
        : 'No public listings on the map yet. Owners can publish areas from the dashboard.'
    }
    return null
  }, [filteredCount, geoQuery.isLoading, listQuery.isLoading, query])

  return (
    <div className="flex h-full min-h-0 w-full flex-col md:flex-row">
      <div className="flex w-full shrink-0 flex-col border-b app-divider bg-app-surface md:h-full md:w-80 md:border-b-0 md:border-r">
        <div className="border-b app-divider px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-base font-semibold tracking-tight text-app-text">Marketplace</h1>
            <Link
              to="/dashboard/marketplace"
              className="rounded-md px-1.5 py-0.5 text-xs font-medium text-terra-700 transition-colors hover:bg-terra-50 hover:text-terra-800 dark:text-terra-300 dark:hover:bg-terra-500/10"
            >
              My listings
            </Link>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-app-muted">
            Browse exploration and licence areas offered by owners.
          </p>
          <label className="relative mt-3.5 block">
            <span className="sr-only">Search listings</span>
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
              />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title or commodity…"
              className="w-full rounded-xl border border-app-border bg-app-bg py-2.5 pl-9 pr-9 text-sm text-app-text shadow-sm placeholder:text-app-muted/80 transition-[border-color,box-shadow] duration-150 focus:border-terra-500 focus:outline-none focus:ring-2 focus:ring-terra-500/20 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-app-muted transition-colors hover:bg-app-subtle hover:text-app-text"
                aria-label="Clear search"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            ) : null}
          </label>
          {!emptyHint && (
            <p className="mt-2 text-[11px] text-app-muted">
              {filteredCount} listing{filteredCount === 1 ? '' : 's'}
              {query.trim() ? ' match' : ''}
            </p>
          )}
        </div>        <div className="min-h-0 flex-1 overflow-y-auto">
          {emptyHint ? (
            <p className="px-4 py-6 text-sm text-app-muted">{emptyHint}</p>
          ) : (
            <ul className="divide-y app-divider">
              {listings.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => selectSlug(item.slug)}
                    className={`w-full px-4 py-3 text-left transition-colors hover:bg-app-subtle ${
                      selectedSlug === item.slug ? 'bg-terra-50/80 dark:bg-terra-500/10' : ''
                    }`}
                  >
                    <p className="truncate text-sm font-medium text-app-text">{item.title}</p>
                    {item.summary && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-app-muted">{item.summary}</p>
                    )}
                    {!!item.commodity_labels?.length && (
                      <p className="mt-1 truncate text-[11px] text-terra-700 dark:text-terra-300">
                        {item.commodity_labels.join(' · ')}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="relative min-h-[18rem] flex-1">
        <MarketplaceMap
          geojson={geoQuery.data}
          selectedSlug={selectedSlug}
          onSelectSlug={(slug) => selectSlug(slug, slug ? 'map' : 'list')}
          className="absolute inset-0 h-full w-full"
        />
        {selectedSlug && detailQuery.data && (
          <div className="absolute inset-y-0 right-0 z-10 flex max-w-full">
            <ListingDetailPanel listing={detailQuery.data} onClose={() => selectSlug(null)} />
          </div>
        )}
        {selectedSlug && detailQuery.isLoading && (
          <div className="absolute inset-y-0 right-0 z-10 flex w-full items-center justify-center bg-app-surface/90 md:w-[400px]">
            <p className="text-sm text-app-muted">Loading listing…</p>
          </div>
        )}
        {selectedSlug && detailQuery.isError && (
          <div className="absolute inset-y-0 right-0 z-10 flex w-full flex-col items-center justify-center gap-2 bg-app-surface px-4 md:w-[400px]">
            <p className="text-sm text-app-muted">Listing not found or no longer public.</p>
            <button type="button" className="btn-secondary text-sm" onClick={() => selectSlug(null)}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
