import type { MarketplaceConversation, MarketplaceUserSearchResult } from '../../types'

export function conversationWithUser(
  conversations: MarketplaceConversation[],
  user: MarketplaceUserSearchResult,
): MarketplaceConversation | null {
  const matches = conversations.filter(
    (conversation) =>
      conversation.buyer_username === user.username ||
      conversation.owner_username === user.username,
  )
  if (!matches.length) return null

  const direct = matches.find((conversation) => !conversation.listing)
  if (direct) return direct

  return [...matches].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  )[0]
}
