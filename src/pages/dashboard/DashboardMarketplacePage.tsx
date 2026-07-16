import { Link, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { analyticsApi, marketplaceApi } from '../../api'
import AssistantMessageContent from '../../components/assistant/AssistantMessageContent'
import { TerraAssistantAvatar } from '../../components/assistant/AssistantIcons'
import ActionMenu, { ActionMenuItem } from '../../components/ui/ActionMenu'
import ListPagination from '../../components/ui/ListPagination'
import { DEFAULT_COUNTRY_CODE } from '../../components/map/countryFocus'
import { usePagination } from '../../hooks/usePagination'
import type {
  MarketplaceListingOwner,
  MarketplaceListingStatus,
  MarketplaceOwnerAnalyticsListing,
} from '../../types'
import { StatCard } from './DashboardUi'

const LISTINGS_PAGE_SIZE = 8
const INQUIRIES_PAGE_SIZE = 8

function statusLabel(status: MarketplaceListingStatus) {
  if (status === 'published') return 'Published'
  if (status === 'hidden') return 'Hidden'
  return 'Draft'
}

function statusClass(status: MarketplaceListingStatus) {
  if (status === 'published') return 'text-emerald-700 dark:text-emerald-400'
  if (status === 'hidden') return 'text-amber-700 dark:text-amber-400'
  return 'text-app-muted'
}

function publicListingPath(slug: string) {
  return `/marketplace?listing=${encodeURIComponent(slug)}`
}

function errorMessage(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (detail && typeof detail === 'object') return JSON.stringify(detail)
  if (err instanceof Error && err.message) return err.message
  return 'Something went wrong. Please try again.'
}

function ListingActionsMenu({
  row,
  copiedSlug,
  insightBusy,
  statusBusy,
  onCopyLink,
  onTerraInsights,
  onSetStatus,
  onDelete,
}: {
  row: MarketplaceListingOwner
  copiedSlug: string | null
  insightBusy: boolean
  statusBusy: boolean
  onCopyLink: () => void
  onTerraInsights: () => void
  onSetStatus: (status: MarketplaceListingStatus) => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <ActionMenu
      label={`Actions for ${row.title}`}
      open={open}
      onOpenChange={setOpen}
      minWidth="11rem"
    >
      <ActionMenuItem to={`/dashboard/marketplace/${row.id}`}>Edit</ActionMenuItem>
      {row.status === 'published' ? (
        <ActionMenuItem to={publicListingPath(row.slug)}>View public</ActionMenuItem>
      ) : null}
      <ActionMenuItem onClick={onCopyLink}>
        {copiedSlug === row.slug ? 'Copied' : 'Copy link'}
      </ActionMenuItem>
      <ActionMenuItem onClick={onTerraInsights} disabled={insightBusy}>
        {insightBusy ? 'Asking Terra…' : 'Terra insights'}
      </ActionMenuItem>
      {row.status !== 'published' ? (
        <ActionMenuItem
          onClick={() => onSetStatus('published')}
          disabled={statusBusy}
          className="text-emerald-700 dark:text-emerald-400"
        >
          Publish
        </ActionMenuItem>
      ) : (
        <ActionMenuItem
          onClick={() => onSetStatus('hidden')}
          disabled={statusBusy}
          className="text-amber-700 dark:text-amber-400"
        >
          Unpublish
        </ActionMenuItem>
      )}
      <ActionMenuItem
        destructive
        onClick={() => {
          if (confirm('Remove this listing from the marketplace?')) onDelete()
        }}
      >
        Delete
      </ActionMenuItem>
    </ActionMenu>
  )
}

export default function DashboardMarketplacePage() {
  const queryClient = useQueryClient()
  const location = useLocation()
  const [notice, setNotice] = useState('')
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)
  const [insightListingId, setInsightListingId] = useState<number | null>(null)
  const [insightText, setInsightText] = useState<string | null>(null)

  useEffect(() => {
    const fromState = (location.state as { notice?: string } | null)?.notice
    if (fromState) {
      setNotice(fromState)
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const listingsQuery = useQuery({
    queryKey: ['marketplace-my-listings'],
    queryFn: () => marketplaceApi.myListings().then((r) => r.data),
  })
  const inquiriesQuery = useQuery({
    queryKey: ['marketplace-inquiries'],
    queryFn: () => marketplaceApi.myInquiries().then((r) => r.data),
  })
  const analyticsQuery = useQuery({
    queryKey: ['marketplace-my-analytics'],
    queryFn: () => marketplaceApi.myAnalytics().then((r) => r.data),
  })

  const invalidateOwner = () => {
    queryClient.invalidateQueries({ queryKey: ['marketplace-my-listings'] })
    queryClient.invalidateQueries({ queryKey: ['marketplace-my-analytics'] })
  }

  const toggleMap = useMutation({
    mutationFn: ({ id, show_on_map }: { id: number; show_on_map: boolean }) =>
      marketplaceApi.updateListing(id, { show_on_map }),
    onSuccess: invalidateOwner,
  })

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: MarketplaceListingStatus }) =>
      marketplaceApi.updateListing(id, { status }),
    onSuccess: invalidateOwner,
    onError: (err) => setNotice(errorMessage(err)),
  })

  const markRead = useMutation({
    mutationFn: (id: number) => marketplaceApi.markInquiryRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-inquiries'] })
      invalidateOwner()
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => marketplaceApi.deleteListing(id),
    onSuccess: invalidateOwner,
  })

  const plotInsight = useMutation({
    mutationFn: async (row: MarketplaceListingOwner) => {
      if (row.center_lat == null || row.center_lng == null) {
        throw new Error('Add a map area before asking Terra for insights.')
      }
      const { data } = await analyticsApi.areaInsights(row.center_lat, row.center_lng, 11, {
        country: DEFAULT_COUNTRY_CODE,
      })
      const text = data.ai_insight?.trim()
      if (!text) {
        if (data.requires_subscription) {
          throw new Error(data.upgrade_message || 'Upgrade to get Terra insights for this plot.')
        }
        throw new Error('Terra could not generate insights for this area yet.')
      }
      return text
    },
    onSuccess: (text, row) => {
      setInsightListingId(row.id)
      setInsightText(text)
    },
  })

  const listings = listingsQuery.data ?? []
  const inquiries = inquiriesQuery.data ?? []
  const unread = inquiries.filter((i) => !i.is_read).length
  const totals = analyticsQuery.data?.totals
  const insights = analyticsQuery.data?.insights ?? []
  const listingsPagination = usePagination(listings, LISTINGS_PAGE_SIZE)
  const inquiriesPagination = usePagination(inquiries, INQUIRIES_PAGE_SIZE)

  const analyticsById = useMemo(() => {
    const map = new Map<number, MarketplaceOwnerAnalyticsListing>()
    for (const row of analyticsQuery.data?.listings ?? []) {
      map.set(row.id, row)
    }
    return map
  }, [analyticsQuery.data?.listings])

  const copyPublicLink = async (slug: string) => {
    const url = `${window.location.origin}${publicListingPath(slug)}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedSlug(slug)
      window.setTimeout(() => setCopiedSlug((current) => (current === slug ? null : current)), 1800)
    } catch {
      setNotice('Could not copy link. Open View public instead.')
    }
  }

  return (
    <div className="space-y-8">
      {notice ? (
        <p className="rounded-lg bg-terra-50 px-3 py-2 text-sm text-terra-800 dark:bg-terra-500/10 dark:text-terra-300">
          {notice}
        </p>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-app-text">My listings</h1>
          <p className="mt-1 text-sm text-app-muted">
            List exploration or licence areas on the public{' '}
            <Link to="/marketplace" className="text-terra-600 hover:underline">
              marketplace
            </Link>
            .
          </p>
        </div>
        <Link to="/dashboard/marketplace/new" className="btn-primary text-sm">
          New listing
        </Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Listings"
          value={String(totals?.listings ?? listings.length)}
          hint={`${totals?.published ?? 0} published · ${listings.filter((l) => l.show_on_map).length} on map`}
        />
        <StatCard
          label="Views"
          value={String(totals?.views ?? 0)}
          hint={
            totals?.views_30d != null
              ? `${totals.views_30d} in last 30 days`
              : 'Public listing page views'
          }
        />
        <StatCard
          label="Inquiries"
          value={String(totals?.inquiries ?? inquiries.length)}
          hint={
            totals?.inquiry_rate
              ? `${totals.inquiry_rate}% of views · ${totals.inquiries_unread} unread`
              : `${unread} unread`
          }
        />
        <StatCard
          label="Engagement"
          value={String((totals?.document_downloads ?? 0) + (totals?.terra_summaries ?? 0))}
          hint={`${totals?.document_downloads ?? 0} downloads · ${totals?.terra_summaries ?? 0} Terra summaries`}
        />
      </section>

      {(insights.length > 0 || analyticsQuery.isLoading) && (
        <section className="rounded-xl border app-divider bg-app-surface p-4">
          <div className="flex items-start gap-3">
            <TerraAssistantAvatar className="mt-0.5 h-9 w-9" />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-app-text">Marketplace insights</h2>
              {analyticsQuery.isLoading ? (
                <p className="mt-1 text-sm text-app-muted">Loading analytics…</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {insights.map((line) => (
                    <li key={line} className="text-sm text-app-text-secondary">
                      {line}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-app-muted">
                <span>{totals?.map_clicks ?? 0} map clicks</span>
                <span>{totals?.document_downloads_30d ?? 0} downloads (30d)</span>
                <span>{totals?.terra_summaries_30d ?? 0} Terra summaries (30d)</span>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border app-divider bg-app-surface">
        {listingsQuery.isLoading ? (
          <p className="px-4 py-8 text-sm text-app-muted">Loading listings…</p>
        ) : listings.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-app-muted">You have no listings yet.</p>
            <Link to="/dashboard/marketplace/new" className="btn-primary mt-4 inline-flex text-sm">
              Create your first listing
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b app-divider bg-app-subtle/50 text-xs uppercase tracking-wide text-app-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Title</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">On map</th>
                    <th className="px-4 py-3 font-semibold">Views</th>
                    <th className="px-4 py-3 font-semibold">Inquiries</th>
                    <th className="px-4 py-3 font-semibold">Interest</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y app-divider">
                  {listingsPagination.pageItems.map((row: MarketplaceListingOwner) => {
                    const stats = analyticsById.get(row.id)
                    const views = stats?.views ?? row.view_count ?? 0
                    const inquiryTotal = stats?.inquiries ?? row.inquiry_count ?? 0
                    const downloads = stats?.document_downloads ?? row.document_download_count ?? 0
                    const terra = stats?.terra_summaries ?? row.terra_summary_count ?? 0
                    const showingInsight = insightListingId === row.id && insightText

                    return (
                      <tr key={row.id} className="align-middle">
                        <td className="px-4 py-3">
                          <p className="font-medium text-app-text">{row.title}</p>
                          {row.summary && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-app-muted">{row.summary}</p>
                          )}
                          {showingInsight && (
                            <div className="mt-3 max-w-md rounded-lg border app-divider bg-app-subtle/40 p-3">
                              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-app-muted">
                                Terra insights
                              </p>
                              <AssistantMessageContent
                                content={insightText}
                                role="assistant"
                                compact
                                className="text-app-text text-xs"
                              />
                              <button
                                type="button"
                                className="mt-2 text-xs text-app-muted hover:underline"
                                onClick={() => {
                                  setInsightListingId(null)
                                  setInsightText(null)
                                }}
                              >
                                Hide insights
                              </button>
                            </div>
                          )}
                          {plotInsight.isError && insightListingId === row.id && !insightText && (
                            <p className="mt-2 text-xs text-red-600">{errorMessage(plotInsight.error)}</p>
                          )}
                        </td>
                        <td className={`whitespace-nowrap px-4 py-3 ${statusClass(row.status)}`}>
                          {statusLabel(row.status)}
                        </td>
                        <td className="px-4 py-3">
                          <label className="inline-flex items-center gap-2 text-xs text-app-muted">
                            <input
                              type="checkbox"
                              className="checkbox checkbox--sm"
                              checked={row.show_on_map}
                              disabled={toggleMap.isPending || row.status !== 'published'}
                              onChange={(e) =>
                                toggleMap.mutate({ id: row.id, show_on_map: e.target.checked })
                              }
                            />
                            {row.status === 'published' ? (row.show_on_map ? 'Visible' : 'Hidden') : '-'}
                          </label>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-app-text">
                          <span className="font-medium">{views}</span>
                          {(stats?.map_clicks ?? row.map_click_count ?? 0) > 0 && (
                            <p className="text-[11px] text-app-muted">
                              {stats?.map_clicks ?? row.map_click_count} map clicks
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-app-text">
                          {row.inquiry_unread_count > 0 ? (
                            <span className="font-medium text-terra-700 dark:text-terra-300">
                              {row.inquiry_unread_count} new
                            </span>
                          ) : (
                            <span className="text-app-muted">{inquiryTotal}</span>
                          )}
                          {inquiryTotal > 0 && row.inquiry_unread_count > 0 && (
                            <p className="text-[11px] text-app-muted">{inquiryTotal} total</p>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-app-muted">
                          <p>{downloads} downloads</p>
                          <p>{terra} Terra</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ListingActionsMenu
                            row={row}
                            copiedSlug={copiedSlug}
                            insightBusy={plotInsight.isPending && insightListingId === row.id}
                            statusBusy={setStatus.isPending}
                            onCopyLink={() => void copyPublicLink(row.slug)}
                            onTerraInsights={() => {
                              setInsightListingId(row.id)
                              setInsightText(null)
                              plotInsight.mutate(row)
                            }}
                            onSetStatus={(status) => setStatus.mutate({ id: row.id, status })}
                            onDelete={() => remove.mutate(row.id)}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <ListPagination
              className="border-t app-divider px-4 py-3"
              page={listingsPagination.page}
              pageCount={listingsPagination.pageCount}
              total={listingsPagination.total}
              pageSize={listingsPagination.pageSize}
              onPageChange={listingsPagination.setPage}
            />
          </>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-app-text">Inquiry inbox</h2>
          {unread > 0 && (
            <span className="rounded-full bg-terra-100 px-2.5 py-0.5 text-xs font-medium text-terra-800 dark:bg-terra-500/20 dark:text-terra-300">
              {unread} unread
            </span>
          )}
        </div>
        <div className="overflow-hidden rounded-xl border app-divider bg-app-surface">
          {inquiriesQuery.isLoading ? (
            <p className="px-4 py-8 text-sm text-app-muted">Loading inquiries…</p>
          ) : inquiries.length === 0 ? (
            <p className="px-4 py-8 text-sm text-app-muted">No inquiries yet.</p>
          ) : (
            <>
              <ul className="divide-y app-divider">
                {inquiriesPagination.pageItems.map((inquiry) => (
                  <li
                    key={inquiry.id}
                    className={`px-4 py-4 ${inquiry.is_read ? '' : 'bg-terra-50/40 dark:bg-terra-500/5'}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-app-text">
                          {inquiry.from_username}
                          <span className="font-normal text-app-muted"> on </span>
                          <Link
                            to={publicListingPath(inquiry.listing_slug)}
                            className="text-terra-600 hover:underline"
                          >
                            {inquiry.listing_title}
                          </Link>
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-app-text-secondary">
                          {inquiry.message}
                        </p>
                        {inquiry.contact_email && (
                          <a
                            href={`mailto:${inquiry.contact_email}`}
                            className="mt-1 inline-block text-xs text-terra-600 hover:underline"
                          >
                            {inquiry.contact_email}
                          </a>
                        )}
                        <p className="mt-1 text-[11px] text-app-muted">
                          {new Date(inquiry.created_at).toLocaleString()}
                        </p>
                      </div>
                      {!inquiry.is_read && (
                        <button
                          type="button"
                          className="btn-secondary text-xs"
                          disabled={markRead.isPending}
                          onClick={() => markRead.mutate(inquiry.id)}
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <ListPagination
                className="border-t app-divider px-4 py-3"
                page={inquiriesPagination.page}
                pageCount={inquiriesPagination.pageCount}
                total={inquiriesPagination.total}
                pageSize={inquiriesPagination.pageSize}
                onPageChange={inquiriesPagination.setPage}
              />
            </>
          )}
        </div>
      </section>
    </div>
  )
}
