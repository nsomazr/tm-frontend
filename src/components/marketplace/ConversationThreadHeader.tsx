import { Link } from 'react-router-dom'
import type { MarketplaceConversation } from '../../types'
import ConversationActionsMenu from './ConversationActionsMenu'
import ConversationOriginBadge from './ConversationOriginBadge'

function previewInitial(name: string): string {
  return (name.slice(0, 1) || '?').toUpperCase()
}

interface ConversationThreadHeaderProps {
  conversation: MarketplaceConversation
  counterpart: string
  onArchive: () => void
  onUnarchive: () => void
  onDelete: () => void
  actionsPending?: boolean
}

export default function ConversationThreadHeader({
  conversation,
  counterpart,
  onArchive,
  onUnarchive,
  onDelete,
  actionsPending = false,
}: ConversationThreadHeaderProps) {
  return (
    <div className="mb-3 flex shrink-0 items-center gap-3 border-b app-divider pb-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-terra-600 to-terra-700 text-sm font-bold text-white shadow-sm">
        {previewInitial(counterpart)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-semibold text-app-text">{counterpart}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <ConversationOriginBadge origin={conversation.origin} />
          {conversation.listing_title ? (
            <>
              <span className="inline-flex max-w-full truncate rounded-full bg-app-subtle px-2.5 py-0.5 text-xs font-medium text-terra-700 dark:text-terra-300">
                {conversation.listing_title}
              </span>
              {conversation.listing_slug ? (
                <Link
                  to={`/marketplace?listing=${encodeURIComponent(conversation.listing_slug)}`}
                  className="text-xs font-medium text-terra-600 hover:underline"
                >
                  View listing
                </Link>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
      <ConversationActionsMenu
        label={`Conversation actions for ${counterpart}`}
        archived={conversation.archived ?? false}
        onArchive={onArchive}
        onUnarchive={onUnarchive}
        onDelete={onDelete}
        archivePending={actionsPending}
        deletePending={actionsPending}
      />
    </div>
  )
}
