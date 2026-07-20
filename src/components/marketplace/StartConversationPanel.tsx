import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { marketplaceApi } from '../../api'
import type {
  ConversationListingOption,
  MarketplaceConversation,
  MarketplaceUserSearchResult,
} from '../../types'
import ListingTagComposer from './ListingTagComposer'
import { findConversationForUser } from './listingMention'

const MIN_MESSAGE = 10

function errorMessage(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  if (typeof detail === 'string') return detail
  return 'Could not start the conversation. Please try again.'
}

function userInitials(user: MarketplaceUserSearchResult): string {
  const parts = user.display_name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return (user.username.slice(0, 2) || 'U').toUpperCase()
}

interface StartConversationPanelProps {
  conversations: MarketplaceConversation[]
  onStarted: (conversationId: number) => void
  onOpenExisting: (conversationId: number) => void
  onCancel: () => void
}

export default function StartConversationPanel({
  conversations,
  onStarted,
  onOpenExisting,
  onCancel,
}: StartConversationPanelProps) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<MarketplaceUserSearchResult | null>(null)
  const [selectedListing, setSelectedListing] = useState<ConversationListingOption | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [query])

  const searchQuery = useQuery({
    queryKey: ['marketplace-user-search', debouncedQuery],
    queryFn: () => marketplaceApi.searchUsers(debouncedQuery).then((r) => r.data),
    enabled: !selectedUser && debouncedQuery.length >= 2,
  })

  const listingOptionsQuery = useQuery({
    queryKey: ['marketplace-conversation-listings', selectedUser?.id],
    queryFn: () => {
      if (!selectedUser) throw new Error('Missing user')
      return marketplaceApi.conversationListingOptions(selectedUser.id).then((r) => r.data)
    },
    enabled: !!selectedUser,
  })

  const listingOptions = listingOptionsQuery.data ?? []

  const startConversation = useMutation({
    mutationFn: () => {
      if (!selectedUser) throw new Error('Choose a recipient')
      return marketplaceApi.startConversation({
        recipient_user_id: selectedUser.id,
        message: message.trim(),
        ...(selectedListing ? { listing_id: selectedListing.id } : {}),
      })
    },
    onSuccess: (response) => {
      onStarted(response.data.id)
    },
  })

  const handlePickUser = (user: MarketplaceUserSearchResult) => {
    const existing = findConversationForUser(conversations, user.username)
    if (existing) {
      onOpenExisting(existing.id)
      return
    }
    setSelectedUser(user)
    setSelectedListing(null)
    setMessage('')
    setQuery('')
  }

  const clearUser = () => {
    setSelectedUser(null)
    setSelectedListing(null)
    setQuery('')
    setMessage('')
  }

  const canSend =
    !!selectedUser && message.trim().length >= MIN_MESSAGE && !startConversation.isPending

  const composeHint = useMemo(() => {
    if (message.trim().length > 0 && message.trim().length < MIN_MESSAGE) {
      return `${message.trim().length}/${MIN_MESSAGE}+ characters`
    }
    if (listingOptions.length > 0) {
      return 'Type @ to tag a listing · Shift+Enter for a new line'
    }
    return 'Shift+Enter for a new line'
  }, [listingOptions.length, message])

  return (
    <div className="mx-auto flex h-full w-full max-w-xl flex-col">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-app-text">New message</h2>
          <p className="mt-0.5 text-xs text-app-muted">
            Search a user to message. Existing chats open automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-app-muted transition-colors hover:text-app-text"
        >
          Cancel
        </button>
      </div>

      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-app-muted">
            To
          </label>
          {selectedUser ? (
            <div className="flex items-center gap-3 rounded-xl border app-divider bg-app-subtle/40 px-3 py-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terra-500/12 text-sm font-semibold text-terra-700 dark:text-terra-300">
                {userInitials(selectedUser)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-app-text">
                  {selectedUser.display_name}
                </span>
                <span className="block truncate text-xs text-app-muted">@{selectedUser.username}</span>
              </span>
              <button
                type="button"
                onClick={clearUser}
                className="shrink-0 rounded-lg px-2 py-1 text-xs text-app-muted hover:bg-app-bg hover:text-app-text"
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, username, or email…"
                className="w-full rounded-xl border app-divider bg-app-bg px-4 py-3 text-sm text-app-text focus:border-terra-500 focus:outline-none focus:ring-2 focus:ring-terra-500/20"
                autoFocus
              />
              {debouncedQuery.length >= 2 ? (
                <div className="mt-2 overflow-hidden rounded-xl border app-divider bg-app-bg">
                  {searchQuery.isLoading ? (
                    <p className="px-4 py-4 text-sm text-app-muted">Searching…</p>
                  ) : (searchQuery.data ?? []).length === 0 ? (
                    <p className="px-4 py-4 text-sm text-app-muted">No users matched.</p>
                  ) : (
                    <ul className="divide-y app-divider">
                      {(searchQuery.data ?? []).map((user) => {
                        const existing = findConversationForUser(conversations, user.username)
                        return (
                          <li key={user.id}>
                            <button
                              type="button"
                              onClick={() => handlePickUser(user)}
                              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-app-subtle/70"
                            >
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-terra-500/12 text-xs font-semibold text-terra-700 dark:text-terra-300">
                                {userInitials(user)}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-app-text">
                                  {user.display_name}
                                </span>
                                <span className="block truncate text-xs text-app-muted">
                                  @{user.username}
                                  {existing ? ' · Open conversation' : ' · New message'}
                                </span>
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-xs text-app-muted">Type at least 2 characters to search.</p>
              )}
            </>
          )}
        </div>

        {selectedUser ? (
          <ListingTagComposer
            value={message}
            onChange={setMessage}
            listingOptions={listingOptions}
            selectedListing={selectedListing}
            onSelectListing={setSelectedListing}
            onSubmit={() => {
              if (canSend) startConversation.mutate()
            }}
            placeholder="Write your first message…"
            disabled={!selectedUser}
            loading={startConversation.isPending}
            minLength={MIN_MESSAGE}
            error={startConversation.error ? errorMessage(startConversation.error) : null}
            hint={composeHint}
            minRows={2}
            maxHeight={140}
          />
        ) : null}
      </div>
    </div>
  )
}
