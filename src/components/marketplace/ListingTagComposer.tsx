import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { SendArrowIcon } from '../assistant/AssistantIcons'
import type { ConversationListingOption } from '../../types'
import {
  applyListingMentionSelection,
  filterListingMentionOptions,
  getListingMentionAtCursor,
} from './listingMention'

interface ListingTagComposerProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  listingOptions: ConversationListingOption[]
  selectedListing: ConversationListingOption | null
  onSelectListing: (option: ConversationListingOption | null) => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  error?: string | null
  hint?: string
  minLength?: number
  minRows?: number
  maxHeight?: number
}

export default function ListingTagComposer({
  value,
  onChange,
  onSubmit,
  listingOptions,
  selectedListing,
  onSelectListing,
  placeholder = 'Write a message…',
  disabled = false,
  loading = false,
  error = null,
  hint,
  minLength = 1,
  minRows = 1,
  maxHeight = 120,
}: ListingTagComposerProps) {
  const inputId = useId()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [cursor, setCursor] = useState(0)
  const [mentionOpen, setMentionOpen] = useState(false)
  const canSend = !disabled && !loading && value.trim().length >= minLength

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
  }, [value, maxHeight])

  const mention = useMemo(
    () => (mentionOpen ? getListingMentionAtCursor(value, cursor) : null),
    [mentionOpen, value, cursor],
  )

  const mentionOptions = useMemo(() => {
    if (!mention) return []
    return filterListingMentionOptions(listingOptions, mention.query).slice(0, 8)
  }, [listingOptions, mention])

  const syncCursor = () => {
    const el = textareaRef.current
    if (!el) return
    setCursor(el.selectionStart ?? value.length)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!canSend) return
    onSubmit()
  }

  const pickListing = (option: ConversationListingOption) => {
    if (mention) {
      onChange(applyListingMentionSelection(value, mention, option))
    }
    onSelectListing(option)
    setMentionOpen(false)
    window.requestAnimationFrame(() => textareaRef.current?.focus())
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1.5">
      {selectedListing ? (
        <div className="flex items-center gap-2 rounded-xl border border-terra-500/25 bg-terra-50/60 px-3 py-2 dark:bg-terra-500/10">
          <span className="min-w-0 flex-1 truncate text-xs text-app-text">
            <span className="font-semibold text-terra-700 dark:text-terra-300">Listing:</span>{' '}
            {selectedListing.title}
          </span>
          <button
            type="button"
            onClick={() => onSelectListing(null)}
            className="shrink-0 rounded-lg px-2 py-1 text-xs text-app-muted hover:bg-app-subtle hover:text-app-text"
            aria-label="Remove listing tag"
          >
            Remove
          </button>
        </div>
      ) : null}

      <div className="relative">
        {mention && mentionOptions.length > 0 ? (
          <div className="absolute bottom-full left-0 z-20 mb-2 w-full max-w-sm overflow-hidden rounded-xl border app-divider bg-app-surface shadow-lg">
            <p className="border-b app-divider px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-app-muted">
              Tag a listing
            </p>
            <ul className="max-h-48 overflow-y-auto py-1">
              {mentionOptions.map((option) => (
                <li key={`${option.role}-${option.id}`}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => pickListing(option)}
                    className="flex w-full flex-col px-3 py-2 text-left hover:bg-app-subtle/70"
                  >
                    <span className="truncate text-sm font-medium text-app-text">{option.title}</span>
                    <span className="text-xs text-app-muted">
                      {option.role === 'owner' ? 'Your listing' : 'Their listing'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div
          className={`flex items-end gap-1 rounded-2xl border bg-app-bg px-2 py-1 shadow-sm transition-colors ${
            disabled
              ? 'border-app-border opacity-60'
              : 'border-app-border focus-within:border-terra-500/50 focus-within:ring-2 focus-within:ring-terra-500/15'
          }`}
        >
          <label className="sr-only" htmlFor={inputId}>
            Message
          </label>
          <textarea
            ref={textareaRef}
            id={inputId}
            value={value}
            onChange={(event) => {
              onChange(event.target.value)
              setCursor(event.target.selectionStart ?? event.target.value.length)
              setMentionOpen(true)
            }}
            onClick={syncCursor}
            onKeyUp={syncCursor}
            onSelect={syncCursor}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setMentionOpen(false)
                return
              }
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                if (canSend) onSubmit()
              }
            }}
            placeholder={placeholder}
            disabled={disabled || loading}
            rows={minRows}
            className="max-h-[5rem] min-h-[2.5rem] flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm leading-snug text-app-text placeholder:text-app-muted focus:outline-none focus:ring-0 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
            title="Send message"
            className={`mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all ${
              canSend
                ? 'bg-terra-600 text-white shadow-sm shadow-terra-600/20 hover:bg-terra-700'
                : 'bg-app-subtle text-app-muted cursor-not-allowed'
            }`}
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <SendArrowIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {(error || hint) && (
        <div className="flex items-center justify-between gap-2 px-1">
          {error ? (
            <p className="text-xs text-red-600">{error}</p>
          ) : hint ? (
            <p className="text-xs text-app-muted">{hint}</p>
          ) : (
            <span />
          )}
        </div>
      )}
    </form>
  )
}
