import { useEffect, useRef, useState } from 'react'
import type { MarketplaceMessage } from '../../types'
import ChatReadTicks from './ChatReadTicks'

export type MessageBubbleAction = 'copy' | 'reply' | 'delete'

interface ChatMessageBubbleProps {
  message: MarketplaceMessage
  isFirstInGroup: boolean
  isLastInGroup: boolean
  showMeta: boolean
  onAction: (action: MessageBubbleAction, message: MarketplaceMessage) => void
}

function formatMessageTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function truncateQuote(text: string, max = 120): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1)}…`
}

function bubbleRadius(isMine: boolean, isFirst: boolean, isLast: boolean): string {
  if (isMine) {
    if (isFirst && isLast) return 'rounded-2xl rounded-br-sm'
    if (isFirst) return 'rounded-2xl rounded-br-sm rounded-b-lg'
    if (isLast) return 'rounded-2xl rounded-tr-sm rounded-t-lg'
    return 'rounded-xl rounded-r-sm'
  }
  if (isFirst && isLast) return 'rounded-2xl rounded-bl-sm'
  if (isFirst) return 'rounded-2xl rounded-bl-sm rounded-b-lg'
  if (isLast) return 'rounded-2xl rounded-tl-sm rounded-t-lg'
  return 'rounded-xl rounded-l-sm'
}

function CopyIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" strokeLinecap="round" />
    </svg>
  )
}

function ReplyIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M9 17 4 12l5-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 18v-2a4 4 0 0 0-4-4H4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TrashIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M3 6h18" strokeLinecap="round" />
      <path d="M8 6V4h8v2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" strokeLinecap="round" />
      <path d="M10 11v6M14 11v6" strokeLinecap="round" />
    </svg>
  )
}

function MoreIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="19" cy="12" r="1.75" />
    </svg>
  )
}

export default function ChatMessageBubble({
  message,
  isFirstInGroup,
  isLastInGroup,
  showMeta,
  onAction,
}: ChatMessageBubbleProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [hovering, setHovering] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const radius = bubbleRadius(message.is_mine, isFirstInGroup, isLastInGroup)
  const showActions = menuOpen || hovering

  useEffect(() => {
    if (!menuOpen) return
    const close = (event: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('touchstart', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('touchstart', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const runAction = (action: MessageBubbleAction) => {
    onAction(action, message)
    setMenuOpen(false)
  }

  return (
    <div
      ref={rootRef}
      className={`relative inline-flex max-w-full flex-col ${
        message.is_mine ? 'items-end self-end' : 'items-start self-start'
      }`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Toolbar floats above the bubble — absolute so hover never shifts layout */}
      <div
        className={`absolute bottom-full z-10 flex flex-col ${
          message.is_mine ? 'right-0 items-end' : 'left-0 items-start'
        } ${showActions || menuOpen ? 'pointer-events-auto' : 'pointer-events-none max-md:hidden'}`}
        aria-hidden={!(showActions || menuOpen)}
      >
        <div
          className={`mb-1 flex items-center gap-0.5 rounded-2xl border border-app-border/70 bg-app-surface/95 p-1 shadow-[0_8px_24px_-6px_rgba(15,23,42,0.18)] backdrop-blur-md transition-[opacity,transform] duration-150 ease-out dark:shadow-[0_8px_28px_-4px_rgba(0,0,0,0.45)] ${
            showActions || menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
          }`}
          role="toolbar"
          aria-label="Message actions"
        >
          <button
            type="button"
            onClick={() => runAction('reply')}
            className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-app-secondary transition-colors hover:bg-terra-50 hover:text-terra-800 dark:hover:bg-terra-500/10 dark:hover:text-terra-200"
          >
            <ReplyIcon className="h-3.5 w-3.5 shrink-0" />
            <span>Reply</span>
          </button>
          <span className="mx-0.5 h-5 w-px shrink-0 bg-app-border/80" aria-hidden />
          <button
            type="button"
            onClick={() => runAction('copy')}
            className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-app-secondary transition-colors hover:bg-terra-50 hover:text-terra-800 dark:hover:bg-terra-500/10 dark:hover:text-terra-200"
          >
            <CopyIcon className="h-3.5 w-3.5 shrink-0" />
            <span>Copy</span>
          </button>
          {message.is_mine ? (
            <>
              <span className="mx-0.5 h-5 w-px shrink-0 bg-app-border/80" aria-hidden />
              <button
                type="button"
                onClick={() => runAction('delete')}
                className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <TrashIcon className="h-3.5 w-3.5 shrink-0" />
                <span>Delete</span>
              </button>
            </>
          ) : null}
        </div>
        {/* Invisible bridge keeps hover alive without covering the bubble */}
        <div className="h-2 w-full shrink-0" aria-hidden />
      </div>

      <div className={`flex items-end gap-1 ${message.is_mine ? 'flex-row-reverse' : 'flex-row'}`}>
        <div
          className={`relative max-w-full px-3.5 py-2 text-sm leading-relaxed shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06] ${radius} ${
            message.is_mine
              ? 'bg-gradient-to-br from-terra-600 to-terra-700 text-white dark:from-terra-500 dark:to-terra-600'
              : 'border app-divider bg-app-surface text-app-text'
          }`}
        >
          {message.reply_to ? (
            <div
              className={`mb-2 rounded-lg border-l-[3px] px-2.5 py-1.5 ${
                message.is_mine
                  ? 'border-white/70 bg-white/10 text-white/90'
                  : 'border-terra-500 bg-terra-50/80 text-app-secondary dark:bg-terra-500/10'
              }`}
            >
              <p
                className={`text-[11px] font-semibold ${
                  message.is_mine ? 'text-white/95' : 'text-terra-700 dark:text-terra-300'
                }`}
              >
                {message.reply_to.sender_username}
              </p>
              <p className={`mt-0.5 line-clamp-3 text-xs ${message.is_mine ? 'text-white/85' : 'text-app-muted'}`}>
                {truncateQuote(message.reply_to.body)}
              </p>
            </div>
          ) : null}
          <p className="whitespace-pre-wrap break-words">{message.body}</p>

          {showMeta ? (
            <div
              className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] leading-none ${
                message.is_mine ? 'text-white/80' : 'text-app-muted'
              }`}
            >
              <span>{formatMessageTime(message.created_at)}</span>
              {message.is_mine ? (
                <ChatReadTicks
                  read={message.read_by_recipient}
                  className={message.read_by_recipient ? 'text-sky-200' : 'text-white/75'}
                />
              ) : null}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-transparent text-app-muted transition-all hover:border-app-border hover:bg-app-subtle hover:text-app-text md:hidden ${
            menuOpen ? 'border-app-border bg-app-subtle text-app-text' : 'opacity-60'
          }`}
          aria-label="Message actions"
          aria-expanded={menuOpen}
        >
          <MoreIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
