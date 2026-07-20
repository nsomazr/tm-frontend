import type { MarketplaceConversationOrigin } from '../../types'
import { conversationOriginBadgeClass, conversationOriginLabel } from './conversationOrigin'

export default function ConversationOriginBadge({
  origin,
  className = '',
}: {
  origin: MarketplaceConversationOrigin
  className?: string
}) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${conversationOriginBadgeClass(origin)} ${className}`}
    >
      {conversationOriginLabel(origin)}
    </span>
  )
}
