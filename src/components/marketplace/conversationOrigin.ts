import type { MarketplaceConversationOrigin } from '../../types'

export function conversationOriginLabel(origin: MarketplaceConversationOrigin): string {
  switch (origin) {
    case 'marketplace_inquiry':
      return 'Marketplace inquiry'
    case 'listing_message':
      return 'Listing message'
    case 'owner_outreach':
      return 'Owner outreach'
    case 'direct':
      return 'Direct message'
    default:
      return 'Message'
  }
}

export function conversationOriginBadgeClass(origin: MarketplaceConversationOrigin): string {
  switch (origin) {
    case 'marketplace_inquiry':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30'
    case 'listing_message':
      return 'bg-terra-50 text-terra-800 border-terra-200 dark:bg-terra-500/10 dark:text-terra-300 dark:border-terra-500/30'
    case 'owner_outreach':
      return 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30'
    case 'direct':
      return 'bg-app-subtle text-app-secondary border-app-divider'
    default:
      return 'bg-app-subtle text-app-secondary border-app-divider'
  }
}
