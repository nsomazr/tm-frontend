import { useEffect, useRef, useState } from 'react'
import type { MarketplaceConversation, MarketplaceMessage } from '../../types'
import ChatMessageBubble, { type MessageBubbleAction } from './ChatMessageBubble'
import MarketplaceChatComposer from './MarketplaceChatComposer'

const MIN_MESSAGE = 10

interface ListingConversationChatProps {
  conversation: MarketplaceConversation | null
  counterpartLabel?: string
  emptyHint?: string
  sending?: boolean
  onSend: (body: string, replyToId?: number | null) => Promise<void>
  onDeleteMessage?: (messageId: number) => Promise<void>
  compact?: boolean
}

function senderInitial(username: string): string {
  return (username.slice(0, 1) || '?').toUpperCase()
}

function isSameMinute(a: string, b: string): boolean {
  const da = new Date(a)
  const db = new Date(b)
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate() &&
    da.getHours() === db.getHours() &&
    da.getMinutes() === db.getMinutes()
  )
}

function isSameDay(a: string, b: string): boolean {
  const da = new Date(a)
  const db = new Date(b)
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}

function formatDateLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (isSameDay(value, today.toISOString())) return 'Today'
  if (isSameDay(value, yesterday.toISOString())) return 'Yesterday'
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function truncateQuote(text: string, max = 120): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1)}…`
}

export default function ListingConversationChat({
  conversation,
  counterpartLabel,
  emptyHint = 'Send a message to start the conversation.',
  sending = false,
  onSend,
  onDeleteMessage,
  compact = false,
}: ListingConversationChatProps) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [replyTo, setReplyTo] = useState<MarketplaceMessage | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const messages = conversation?.messages ?? []

  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [messages.length, conversation?.id, replyTo?.id])

  useEffect(() => {
    if (copiedId == null) return
    const timer = window.setTimeout(() => setCopiedId(null), 2000)
    return () => window.clearTimeout(timer)
  }, [copiedId])

  const handleSend = async () => {
    const text = draft.trim()
    if (text.length < MIN_MESSAGE) {
      setError(`At least ${MIN_MESSAGE} characters required.`)
      return
    }
    setError('')
    await onSend(text, replyTo?.id ?? null)
    setDraft('')
    setReplyTo(null)
  }

  const handleBubbleAction = async (action: MessageBubbleAction, message: MarketplaceMessage) => {
    if (action === 'reply') {
      setReplyTo(message)
      setError('')
      return
    }
    if (action === 'delete') {
      if (!message.is_mine || !onDeleteMessage) return
      if (!window.confirm('Delete this message?')) return
      try {
        await onDeleteMessage(message.id)
        if (replyTo?.id === message.id) setReplyTo(null)
      } catch {
        setError('Could not delete message.')
      }
      return
    }
    try {
      await navigator.clipboard.writeText(message.body)
      setCopiedId(message.id)
    } catch {
      setError('Could not copy message.')
    }
  }

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${compact ? 'gap-2' : 'gap-3'}`}>
      {counterpartLabel ? (
        <p className="shrink-0 text-xs text-app-muted">
          Chat with <span className="font-medium text-app-text">{counterpartLabel}</span>
        </p>
      ) : null}

      <div
        ref={scrollRef}
        className={`min-h-0 flex-1 overflow-y-auto rounded-xl bg-[linear-gradient(180deg,rgba(248,250,252,0.5)_0%,transparent_120px)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.25)_0%,transparent_120px)] ${
          compact ? 'max-h-56 px-1' : 'px-2 py-2'
        }`}
      >
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[10rem] items-center justify-center rounded-2xl border border-dashed app-divider bg-app-subtle/20 px-6 py-10 text-center">
            <div>
              <p className="text-sm font-medium text-app-text">No messages yet</p>
              <p className="mt-1 text-sm text-app-muted">{emptyHint}</p>
            </div>
          </div>
        ) : (
          <ul className="space-y-1">
            {messages.map((message: MarketplaceMessage, index: number) => {
              const prev = messages[index - 1]
              const next = messages[index + 1]
              const isFirstInGroup = !prev || prev.is_mine !== message.is_mine
              const isLastInGroup = !next || next.is_mine !== message.is_mine
              const showMeta =
                isLastInGroup ||
                !next ||
                !isSameMinute(message.created_at, next.created_at) ||
                next.is_mine !== message.is_mine
              const showDate = !prev || !isSameDay(prev.created_at, message.created_at)

              return (
                <li key={message.id}>
                  {showDate ? (
                    <div className="my-4 flex justify-center">
                      <span className="rounded-full border app-divider bg-app-surface/90 px-3 py-1 text-[11px] font-medium text-app-muted shadow-sm">
                        {formatDateLabel(message.created_at)}
                      </span>
                    </div>
                  ) : null}

                  <div
                    className={`flex gap-2 py-0.5 ${message.is_mine ? 'justify-end' : 'justify-start'} ${
                      isFirstInGroup ? 'mt-2' : ''
                    }`}
                  >
                    {!message.is_mine ? (
                      isFirstInGroup ? (
                        <span className="mt-auto mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-app-subtle to-app-bg text-xs font-semibold text-app-secondary ring-1 ring-app-border">
                          {senderInitial(message.sender_username)}
                        </span>
                      ) : (
                        <span className="w-8 shrink-0" aria-hidden />
                      )
                    ) : null}

                    <div
                      className={`min-w-0 max-w-[min(88%,30rem)] ${
                        message.is_mine ? 'items-end' : 'items-start'
                      } flex flex-col`}
                    >
                      {!message.is_mine && isFirstInGroup ? (
                        <p className="mb-1 px-1 text-[11px] font-semibold text-app-muted">
                          {message.sender_username}
                        </p>
                      ) : null}

                      <ChatMessageBubble
                        message={{
                          ...message,
                          reply_to: message.reply_to ?? null,
                          read_by_recipient: message.read_by_recipient ?? false,
                        }}
                        isFirstInGroup={isFirstInGroup}
                        isLastInGroup={isLastInGroup}
                        showMeta={showMeta}
                        onAction={(action, msg) => void handleBubbleAction(action, msg)}
                      />

                      {copiedId === message.id ? (
                        <p className="mt-0.5 px-1 text-[10px] text-terra-600">Copied</p>
                      ) : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="shrink-0 space-y-2 border-t app-divider bg-app-surface/80 pt-3 backdrop-blur-sm">
        {replyTo ? (
          <div className="flex items-start gap-2 rounded-xl border border-terra-500/25 bg-terra-50/60 px-3 py-2 dark:bg-terra-500/10">
            <div className="min-w-0 flex-1 border-l-2 border-terra-500 pl-2">
              <p className="text-[11px] font-semibold text-terra-700 dark:text-terra-300">
                Replying to {replyTo.sender_username}
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs text-app-muted">
                {truncateQuote(replyTo.body)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="shrink-0 rounded-lg px-2 py-1 text-xs text-app-muted hover:bg-app-subtle hover:text-app-text"
              aria-label="Cancel reply"
            >
              ✕
            </button>
          </div>
        ) : null}

        <MarketplaceChatComposer
          value={draft}
          onChange={setDraft}
          onSubmit={() => void handleSend()}
          placeholder={replyTo ? 'Write your reply…' : 'Type a message…'}
          disabled={!conversation}
          loading={sending}
          minLength={MIN_MESSAGE}
          error={error}
          hint={
            draft.trim().length > 0 && draft.trim().length < MIN_MESSAGE
              ? `${draft.trim().length}/${MIN_MESSAGE}+ characters`
              : 'Enter to send · Shift+Enter for new line'
          }
          minRows={1}
          maxHeight={compact ? 96 : 128}
        />
      </div>
    </div>
  )
}
