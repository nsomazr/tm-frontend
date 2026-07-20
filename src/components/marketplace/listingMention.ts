import type { ConversationListingOption } from '../../types'

export function findConversationForUser(
  conversations: Array<{
    id: number
    listing: number | null
    buyer_username: string
    owner_username: string
    updated_at: string
  }>,
  username: string,
) {
  const matches = conversations.filter(
    (conversation) =>
      conversation.buyer_username === username || conversation.owner_username === username,
  )
  if (!matches.length) return null
  const direct = matches.find((conversation) => conversation.listing == null)
  if (direct) return direct
  return [...matches].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  )[0]
}

export function filterListingMentionOptions(
  options: ConversationListingOption[],
  query: string,
): ConversationListingOption[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return options
  return options.filter((option) => {
    const haystack = `${option.title} ${option.slug}`.toLowerCase()
    return haystack.includes(needle)
  })
}

export function getListingMentionAtCursor(text: string, cursor: number) {
  const before = text.slice(0, cursor)
  const match = before.match(/@([^\n@]*)$/)
  if (!match) return null
  return {
    query: match[1],
    start: cursor - match[0].length,
    end: cursor,
  }
}

export function applyListingMentionSelection(
  text: string,
  mention: { start: number; end: number },
  option: ConversationListingOption,
) {
  const prefix = text.slice(0, mention.start)
  const suffix = text.slice(mention.end)
  const insertion = `@${option.title} `
  return `${prefix}${insertion}${suffix}`.replace(/\s{2,}/g, ' ')
}
