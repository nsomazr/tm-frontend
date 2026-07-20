import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { marketplaceApi } from '../../api'
import ListingConversationChat from './ListingConversationChat'
import ConversationActionsMenu from './ConversationActionsMenu'
import type { MarketplaceConversation } from '../../types'

function errorMessage(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  if (typeof detail === 'string') return detail
  return 'Could not send message. Please try again.'
}

interface MarketplaceListingMessagesProps {
  listingSlug: string
  listingTitle: string
  signedIn: boolean
  loginNext: string
  allowInquiries: boolean
  startOpen?: boolean
}

export default function MarketplaceListingMessages({
  listingSlug,
  listingTitle,
  signedIn,
  loginNext,
  allowInquiries,
  startOpen = false,
}: MarketplaceListingMessagesProps) {
  const queryClient = useQueryClient()
  const [contactEmail, setContactEmail] = useState('')
  const [started, setStarted] = useState(startOpen)

  const conversationQuery = useQuery({
    queryKey: ['marketplace-listing-conversation', listingSlug],
    queryFn: () => marketplaceApi.listingConversation(listingSlug).then((r) => r.data.conversation),
    enabled: signedIn && allowInquiries,
  })

  const conversation = conversationQuery.data ?? null

  useEffect(() => {
    if (conversation) setStarted(true)
  }, [conversation])

  const inquire = useMutation({
    mutationFn: (body: string) =>
      marketplaceApi.inquire(listingSlug, {
        message: body,
        contact_email: contactEmail || undefined,
      }),
    onSuccess: () => {
      setStarted(true)
      void queryClient.invalidateQueries({ queryKey: ['marketplace-listing-conversation', listingSlug] })
      void queryClient.invalidateQueries({ queryKey: ['marketplace-conversations'] })
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    },
  })

  const reply = useMutation({
    mutationFn: ({ body, replyToId }: { body: string; replyToId?: number | null }) => {
      if (!conversation) throw new Error('Conversation not loaded')
      return marketplaceApi.sendConversationMessage(conversation.id, body, replyToId ?? undefined)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['marketplace-listing-conversation', listingSlug] })
      void queryClient.invalidateQueries({ queryKey: ['marketplace-conversations'] })
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    },
  })

  const deleteMessage = useMutation({
    mutationFn: (messageId: number) => {
      if (!conversation) throw new Error('Conversation not loaded')
      return marketplaceApi.deleteConversationMessage(conversation.id, messageId).then((r) => r.data)
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['marketplace-listing-conversation', listingSlug], updated)
      void queryClient.invalidateQueries({ queryKey: ['marketplace-conversations'] })
    },
  })

  const deleteConversation = useMutation({
    mutationFn: () => {
      if (!conversation) throw new Error('Conversation not loaded')
      return marketplaceApi.deleteConversation(conversation.id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['marketplace-listing-conversation', listingSlug] })
      void queryClient.invalidateQueries({ queryKey: ['marketplace-conversations'] })
    },
  })

  const archiveConversation = useMutation({
    mutationFn: (archived: boolean) => {
      if (!conversation) throw new Error('Conversation not loaded')
      return marketplaceApi.archiveConversation(conversation.id, archived)
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['marketplace-listing-conversation', listingSlug], updated)
      void queryClient.invalidateQueries({ queryKey: ['marketplace-conversations'] })
    },
  })

  if (!allowInquiries) return null

  if (!signedIn) {
    return (
      <section className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-sm">
        <div className="border-b app-divider px-3.5 py-3">
          <h3 className="text-sm font-semibold text-app-text">Message owner</h3>
          <p className="mt-0.5 text-xs text-app-muted">Registered users can chat about this listing.</p>
        </div>
        <div className="px-3.5 py-4 text-center">
          <Link to={loginNext} className="btn-primary inline-flex text-sm">
            Sign in to message
          </Link>
        </div>
      </section>
    )
  }

  const counterpart =
    conversation?.role === 'owner'
      ? conversation.buyer_username
      : conversation?.owner_username ?? 'listing owner'

  const handleSend = async (body: string, replyToId?: number | null) => {
    if (conversation) {
      await reply.mutateAsync({ body, replyToId })
      return
    }
    await inquire.mutateAsync(body)
  }

  const sending = inquire.isPending || reply.isPending
  const sendError = inquire.error || reply.error

  return (
    <section className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-sm">
      <div className="border-b app-divider px-3.5 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-app-text">
              {conversation ? 'Conversation' : 'Message owner'}
            </h3>
            <p className="mt-0.5 text-xs text-app-muted">
              {conversation
                ? `About ${listingTitle}`
                : 'Introduce yourself and ask about this listing.'}
            </p>
          </div>
          {conversation ? (
            <ConversationActionsMenu
              label="Conversation actions"
              archived={conversation.archived ?? false}
              onArchive={() => void archiveConversation.mutate(true)}
              onUnarchive={() => void archiveConversation.mutate(false)}
              onDelete={() => {
                if (!window.confirm('Delete this conversation and all its messages?')) return
                void deleteConversation.mutate()
              }}
              archivePending={archiveConversation.isPending}
              deletePending={deleteConversation.isPending}
            />
          ) : null}
        </div>
      </div>
      <div className="px-3.5 py-3.5">
        {conversationQuery.isLoading ? (
          <p className="text-sm text-app-muted">Loading conversation…</p>
        ) : conversation || started ? (
          <>
            {!conversation ? (
              <label className="mb-3 block text-sm">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-app-muted">
                  Reply email
                </span>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  placeholder="you@company.com"
                  className="mt-1.5 w-full rounded-xl border app-divider bg-app-bg px-3 py-2 text-sm"
                />
              </label>
            ) : null}
            <ListingConversationChat
              conversation={conversation}
              counterpartLabel={counterpart}
              compact
              sending={sending}
              onSend={handleSend}
              onDeleteMessage={async (messageId) => {
                await deleteMessage.mutateAsync(messageId)
              }}
              emptyHint="Your first message will notify the listing owner by email."
            />
            {sendError || deleteMessage.error || deleteConversation.error || archiveConversation.error ? (
              <p className="mt-2 text-xs text-red-600">
                {errorMessage(
                  sendError || deleteMessage.error || deleteConversation.error || archiveConversation.error,
                )}
              </p>
            ) : null}
          </>
        ) : (
          <button type="button" className="btn-primary w-full text-sm" onClick={() => setStarted(true)}>
            Start conversation
          </button>
        )}
      </div>
    </section>
  )
}
