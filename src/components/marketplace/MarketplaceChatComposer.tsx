import { useEffect, useId, useRef, type FormEvent } from 'react'
import { SendArrowIcon } from '../assistant/AssistantIcons'

interface MarketplaceChatComposerProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  error?: string | null
  hint?: string
  minLength?: number
  minRows?: number
  maxHeight?: number
}

export default function MarketplaceChatComposer({
  value,
  onChange,
  onSubmit,
  placeholder = 'Write a message…',
  disabled = false,
  loading = false,
  error = null,
  hint,
  minLength = 1,
  minRows = 1,
  maxHeight = 120,
}: MarketplaceChatComposerProps) {
  const inputId = useId()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const canSend = !disabled && !loading && value.trim().length >= minLength

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
  }, [value, maxHeight])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!canSend) return
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1.5">
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
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
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
