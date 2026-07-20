import ActionMenu, { ActionMenuItem } from '../ui/ActionMenu'

interface ConversationActionsMenuProps {
  label: string
  archived?: boolean
  onArchive: () => void
  onUnarchive: () => void
  onDelete: () => void
  archivePending?: boolean
  deletePending?: boolean
  align?: 'left' | 'right'
  className?: string
}

export default function ConversationActionsMenu({
  label,
  archived = false,
  onArchive,
  onUnarchive,
  onDelete,
  archivePending = false,
  deletePending = false,
  align = 'right',
  className = '',
}: ConversationActionsMenuProps) {
  return (
    <div className={className} onClick={(event) => event.stopPropagation()}>
      <ActionMenu label={label} align={align} minWidth="11rem">
        {archived ? (
          <ActionMenuItem disabled={archivePending} onClick={onUnarchive}>
            Move to inbox
          </ActionMenuItem>
        ) : (
          <ActionMenuItem disabled={archivePending} onClick={onArchive}>
            Archive
          </ActionMenuItem>
        )}
        <ActionMenuItem disabled={deletePending} destructive onClick={onDelete}>
          Delete
        </ActionMenuItem>
      </ActionMenu>
    </div>
  )
}
