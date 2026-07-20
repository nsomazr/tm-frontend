import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { marketplaceApi } from '../../api'
import ListingConversationChat from '../../components/marketplace/ListingConversationChat'
import StartConversationPanel from '../../components/marketplace/StartConversationPanel'
import ConversationOriginBadge from '../../components/marketplace/ConversationOriginBadge'
import ConversationActionsMenu from '../../components/marketplace/ConversationActionsMenu'
import ConversationThreadHeader from '../../components/marketplace/ConversationThreadHeader'
import type { MarketplaceConversation } from '../../types'

function errorMessage(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  if (typeof detail === 'string') return detail
  return 'Could not send message. Please try again.'
}

function conversationPreview(conversation: MarketplaceConversation): string {
  return conversation.role === 'owner'
    ? conversation.buyer_username
    : conversation.owner_username
}

function previewInitial(name: string): string {
  return (name.slice(0, 1) || '?').toUpperCase()
}

function formatRelativeTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'Now'
  if (diffMin < 60) return `${diffMin}m`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function DashboardMarketplaceMessagesPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = Number(searchParams.get('conversation') || '')
  const [activeId, setActiveId] = useState<number | null>(
    Number.isFinite(selectedId) && selectedId > 0 ? selectedId : null,
  )
  const [composeOpen, setComposeOpen] = useState(searchParams.get('new') === '1')
  const [sidebarQuery, setSidebarQuery] = useState('')
  const [inboxTab, setInboxTab] = useState<'inbox' | 'archived'>('inbox')

  const inboxConversationsQuery = useQuery({
    queryKey: ['marketplace-conversations', 'inbox'],
    queryFn: () => marketplaceApi.myConversations().then((r) => r.data),
    refetchInterval: 30_000,
  })

  const archivedConversationsQuery = useQuery({
    queryKey: ['marketplace-conversations', 'archived'],
    queryFn: () => marketplaceApi.myConversations({ archived: true }).then((r) => r.data),
    enabled: inboxTab === 'archived',
    refetchInterval: 30_000,
  })

  const allConversationsQuery = useQuery({
    queryKey: ['marketplace-conversations', 'all'],
    queryFn: () => marketplaceApi.myConversations({ archived: 'all' }).then((r) => r.data),
    enabled: composeOpen,
  })

  const conversations =
    inboxTab === 'archived'
      ? archivedConversationsQuery.data ?? []
      : inboxConversationsQuery.data ?? []
  const allConversations = allConversationsQuery.data ?? inboxConversationsQuery.data ?? []
  const conversationsQuery =
    inboxTab === 'archived' ? archivedConversationsQuery : inboxConversationsQuery

  const detailQuery = useQuery({
    queryKey: ['marketplace-conversation', activeId],
    queryFn: () => {
      if (activeId == null) throw new Error('Missing conversation')
      return marketplaceApi.myConversation(activeId).then((r) => r.data)
    },
    enabled: activeId != null && !composeOpen,
    refetchInterval: 15_000,
  })

  const activeConversation = detailQuery.data ?? null

  const selectConversation = (conversation: MarketplaceConversation) => {
    setComposeOpen(false)
    setActiveId(conversation.id)
    setSearchParams({ conversation: String(conversation.id) }, { replace: true })
  }

  const openConversationById = (conversationId: number) => {
    setComposeOpen(false)
    setActiveId(conversationId)
    setSearchParams({ conversation: String(conversationId) }, { replace: true })
  }

  const openCompose = () => {
    setComposeOpen(true)
    setActiveId(null)
    setSearchParams({ new: '1' }, { replace: true })
  }

  const closeCompose = () => {
    setComposeOpen(false)
    if (activeId) {
      setSearchParams({ conversation: String(activeId) }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }

  const handleStarted = (conversationId: number) => {
    setComposeOpen(false)
    setActiveId(conversationId)
    setSearchParams({ conversation: String(conversationId) }, { replace: true })
    void queryClient.invalidateQueries({ queryKey: ['marketplace-conversations'] })
    void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
  }

  const sendMessage = useMutation({
    mutationFn: ({ body, replyToId }: { body: string; replyToId?: number | null }) => {
      if (activeId == null) throw new Error('Select a conversation')
      return marketplaceApi.sendConversationMessage(activeId, body, replyToId ?? undefined)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['marketplace-conversation', activeId] })
      void queryClient.invalidateQueries({ queryKey: ['marketplace-conversations'] })
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    },
  })

  const deleteConversation = useMutation({
    mutationFn: (id: number) => marketplaceApi.deleteConversation(id),
    onSuccess: (_data, id) => {
      if (activeId === id) {
        setActiveId(null)
        setSearchParams({}, { replace: true })
      }
      void queryClient.invalidateQueries({ queryKey: ['marketplace-conversations'] })
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    },
  })

  const archiveConversation = useMutation({
    mutationFn: ({ id, archived }: { id: number; archived: boolean }) =>
      marketplaceApi.archiveConversation(id, archived),
    onSuccess: (_data, { id, archived }) => {
      if (archived && activeId === id) {
        setActiveId(null)
        setSearchParams({}, { replace: true })
      }
      void queryClient.invalidateQueries({ queryKey: ['marketplace-conversations'] })
    },
  })

  const deleteMessage = useMutation({
    mutationFn: (messageId: number) => {
      if (activeId == null) throw new Error('Select a conversation')
      return marketplaceApi.deleteConversationMessage(activeId, messageId).then((r) => r.data)
    },
    onSuccess: (conversation) => {
      queryClient.setQueryData(['marketplace-conversation', activeId], conversation)
      void queryClient.invalidateQueries({ queryKey: ['marketplace-conversations'] })
    },
  })

  const handleDeleteConversation = (conversationId: number) => {
    if (!window.confirm('Delete this conversation and all its messages?')) return
    void deleteConversation.mutate(conversationId)
  }

  const handleArchiveConversation = (conversationId: number) => {
    void archiveConversation.mutate({ id: conversationId, archived: true })
  }

  const handleUnarchiveConversation = (conversationId: number) => {
    void archiveConversation.mutate({ id: conversationId, archived: false })
  }

  const conversationActionsPending =
    deleteConversation.isPending || archiveConversation.isPending

  const sortedConversations = useMemo(() => {
    const filtered = sidebarQuery.trim()
      ? conversations.filter((conversation) => {
          const haystack = [
            conversation.listing_title,
            conversation.buyer_username,
            conversation.owner_username,
            conversation.origin,
            conversation.last_message?.body ?? '',
          ]
            .join(' ')
            .toLowerCase()
          return haystack.includes(sidebarQuery.trim().toLowerCase())
        })
      : conversations

    return [...filtered].sort((a, b) => {
      if (a.unread !== b.unread) return a.unread ? -1 : 1
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
  }, [conversations, sidebarQuery])

  const unreadCount = (inboxConversationsQuery.data ?? []).filter((conversation) => conversation.unread)
    .length

  const counterpart = activeConversation ? conversationPreview(activeConversation) : ''

  const showSidebar = !composeOpen
  const showMobileInbox = !composeOpen && activeId == null
  const isThreadView = !composeOpen && activeId != null

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] min-h-[36rem] flex-col gap-3 md:h-[calc(100dvh-6rem)]">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/dashboard/marketplace" className="text-xs text-terra-600 hover:underline">
            ← My listings
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-app-text">Messages</h1>
        </div>
        {!composeOpen ? (
          <button type="button" className="btn-primary text-sm" onClick={openCompose}>
            New message
          </button>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border app-divider bg-app-surface shadow-sm">
        {showSidebar ? (
          <aside
            className={`${
              showMobileInbox ? 'flex' : 'hidden'
            } w-full shrink-0 flex-col border-b app-divider md:flex md:w-80 md:border-b-0 md:border-r lg:w-[22rem]`}
          >
            <div className="border-b app-divider px-4 py-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-app-text">Inbox</h2>
                {unreadCount > 0 ? (
                  <span className="rounded-full bg-terra-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                    {unreadCount}
                  </span>
                ) : null}
              </div>
              <input
                type="search"
                value={sidebarQuery}
                onChange={(event) => setSidebarQuery(event.target.value)}
                placeholder="Search conversations…"
                className="w-full rounded-lg border app-divider bg-app-bg px-3 py-2 text-sm text-app-text"
              />
              <div className="mt-3 flex rounded-lg border app-divider bg-app-bg p-0.5">
                <button
                  type="button"
                  onClick={() => setInboxTab('inbox')}
                  className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                    inboxTab === 'inbox'
                      ? 'bg-app-surface text-app-text shadow-sm'
                      : 'text-app-muted hover:text-app-text'
                  }`}
                >
                  Inbox
                </button>
                <button
                  type="button"
                  onClick={() => setInboxTab('archived')}
                  className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                    inboxTab === 'archived'
                      ? 'bg-app-surface text-app-text shadow-sm'
                      : 'text-app-muted hover:text-app-text'
                  }`}
                >
                  Archived
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {conversationsQuery.isLoading ? (
                <p className="px-4 py-8 text-sm text-app-muted">Loading…</p>
              ) : sortedConversations.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm font-medium text-app-text">
                    {inboxTab === 'archived' ? 'No archived conversations' : 'No conversations yet'}
                  </p>
                  <p className="mt-1 text-sm text-app-muted">
                    {inboxTab === 'archived'
                      ? 'Archived threads appear here.'
                      : 'Message a registered user on Terra Meta.'}
                  </p>
                  {inboxTab === 'inbox' ? (
                    <button type="button" className="btn-primary mt-4 text-sm" onClick={openCompose}>
                      New message
                    </button>
                  ) : null}
                </div>
              ) : (
                <ul>
                  {sortedConversations.map((conversation) => {
                    const active = activeId === conversation.id && !composeOpen
                    const name = conversationPreview(conversation)
                    const preview = conversation.last_message
                    const previewText = preview
                      ? preview.is_mine
                        ? `You: ${preview.body}`
                        : preview.body
                      : 'No messages yet'
                    return (
                      <li key={conversation.id} className="group border-b app-divider">
                        <div className="flex items-stretch">
                          <button
                            type="button"
                            onClick={() => selectConversation(conversation)}
                            className={`relative min-w-0 flex-1 px-4 py-3 text-left transition-colors hover:bg-app-subtle/50 ${
                              active
                                ? 'bg-terra-50/70 before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-terra-600 dark:bg-terra-500/10'
                                : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <span
                                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                                  active
                                    ? 'bg-terra-600 text-white'
                                    : 'bg-app-subtle text-app-secondary'
                                }`}
                              >
                                {previewInitial(name)}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex items-baseline justify-between gap-2">
                                  <span
                                    className={`truncate text-sm ${
                                      conversation.unread ? 'font-bold text-app-text' : 'font-semibold text-app-text'
                                    }`}
                                  >
                                    {name}
                                  </span>
                                  {conversation.last_message ? (
                                    <span className="shrink-0 text-[11px] text-app-muted">
                                      {formatRelativeTime(conversation.last_message.created_at)}
                                    </span>
                                  ) : null}
                                </span>
                                {conversation.listing_title ? (
                                  <span className="mt-0.5 inline-flex max-w-full truncate rounded-full bg-app-subtle px-2 py-0.5 text-[10px] font-medium text-terra-700 dark:text-terra-300">
                                    {conversation.listing_title}
                                  </span>
                                ) : null}
                                <span className="mt-1 flex flex-wrap items-center gap-1.5">
                                  <ConversationOriginBadge origin={conversation.origin} />
                                </span>
                                <span
                                  className={`mt-1 block truncate text-xs leading-relaxed ${
                                    conversation.unread ? 'font-medium text-app-text' : 'text-app-muted'
                                  }`}
                                >
                                  {previewText}
                                </span>
                              </span>
                              {conversation.unread ? (
                                <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-terra-500 ring-2 ring-app-surface" />
                              ) : null}
                            </div>
                          </button>
                          <ConversationActionsMenu
                            label={`Conversation actions for ${name}`}
                            archived={conversation.archived ?? false}
                            onArchive={() => handleArchiveConversation(conversation.id)}
                            onUnarchive={() => handleUnarchiveConversation(conversation.id)}
                            onDelete={() => handleDeleteConversation(conversation.id)}
                            archivePending={conversationActionsPending}
                            deletePending={conversationActionsPending}
                            className="flex shrink-0 items-center px-1 opacity-100 md:opacity-0 md:group-hover:opacity-100"
                          />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </aside>
        ) : null}

        <main
          className={`min-w-0 flex-1 ${
            isThreadView ? 'flex min-h-0 flex-col overflow-hidden p-3 sm:p-4' : 'overflow-y-auto p-4 sm:p-6'
          } ${!composeOpen && activeId == null ? 'hidden md:block' : ''}`}
        >
          {composeOpen ? (
            <StartConversationPanel
              conversations={allConversations}
              onStarted={handleStarted}
              onOpenExisting={openConversationById}
              onCancel={closeCompose}
            />
          ) : !activeId ? (
            <div className="flex h-full min-h-[24rem] flex-col items-center justify-center px-6 text-center">
              <p className="text-lg font-medium text-app-text">Select a conversation</p>
              <p className="mt-2 max-w-sm text-sm text-app-muted">
                Choose a thread from your inbox, or start a new one with a registered user.
              </p>
              <button type="button" className="btn-primary mt-5 text-sm" onClick={openCompose}>
                New message
              </button>
            </div>
          ) : activeId ? (
            <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
              <button
                type="button"
                className="mb-3 inline-flex shrink-0 items-center gap-1 text-sm text-app-muted hover:text-app-text md:hidden"
                onClick={() => {
                  setActiveId(null)
                  setSearchParams({}, { replace: true })
                }}
              >
                ← Inbox
              </button>
              {detailQuery.isLoading ? (
                <p className="text-sm text-app-muted">Loading conversation…</p>
              ) : activeConversation ? (
                <>
              <ConversationThreadHeader
                conversation={activeConversation}
                counterpart={counterpart}
                onArchive={() => handleArchiveConversation(activeConversation.id)}
                onUnarchive={() => handleUnarchiveConversation(activeConversation.id)}
                onDelete={() => handleDeleteConversation(activeConversation.id)}
                actionsPending={conversationActionsPending}
              />
              <ListingConversationChat
                conversation={activeConversation}
                sending={sendMessage.isPending}
                onSend={async (body, replyToId) => {
                  await sendMessage.mutateAsync({ body, replyToId })
                }}
                onDeleteMessage={async (messageId) => {
                  await deleteMessage.mutateAsync(messageId)
                }}
              />
              {sendMessage.error || deleteMessage.error || archiveConversation.error ? (
                <p className="mt-1 shrink-0 text-xs text-red-600">
                  {errorMessage(sendMessage.error || deleteMessage.error || archiveConversation.error)}
                </p>
              ) : null}
                </>
              ) : (
                <p className="text-sm text-app-muted">Conversation not found.</p>
              )}
            </div>
          ) : null}
        </main>
      </div>
    </div>
  )
}
