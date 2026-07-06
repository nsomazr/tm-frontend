import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { SendArrowIcon } from '../assistant/AssistantIcons'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export interface ReportChatContextChip {
  label: string
  value: string
}

interface ReportChatComposerProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  error?: string | null
  hint?: string
  contextLine?: string
  contextChips?: ReportChatContextChip[]
  file?: File | null
  onFileChange?: (file: File | null) => void
  accept?: string
  showAttach?: boolean
  submitAriaLabel?: string
  variant?: 'default' | 'canvas'
}

function PaperclipIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path
        d="M14.5 6.5l-5 5a2.5 2.5 0 0 0 3.5 3.5l5.5-5.5a4 4 0 0 0-5.5-5.5l-6 6a5.5 5.5 0 0 0 7.8 7.8l5.2-5.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function ReportChatComposer({
  value,
  onChange,
  onSubmit,
  placeholder = 'Describe the report…',
  disabled = false,
  loading = false,
  error = null,
  hint,
  contextLine,
  contextChips = [],
  file = null,
  onFileChange,
  accept = '.pdf,.docx,.txt,.md,.csv',
  showAttach = true,
  submitAriaLabel = 'Send',
  variant = 'default',
}: ReportChatComposerProps) {
  const inputId = useId()
  const fileInputId = useId()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const canSend = !disabled && !loading && value.trim().length > 0
  const resolvedContext =
    contextLine ||
    (contextChips.length > 0 ? contextChips.map((chip) => chip.value).join(' · ') : '')

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [value])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSend) return
    onSubmit()
  }

  function pickFile() {
    if (!disabled && !loading) fileInputRef.current?.click()
  }

  function handleFileDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (disabled || loading || !onFileChange) return
    const dropped = e.dataTransfer.files?.[0] ?? null
    if (dropped) onFileChange(dropped)
  }

  return (
    <form
      onSubmit={handleSubmit}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled && onFileChange) setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleFileDrop}
      className={`report-chat-composer ${variant === 'canvas' ? 'report-chat-composer--canvas' : ''} ${dragOver ? 'report-chat-composer--drag' : ''}`}
    >
      {resolvedContext && variant !== 'canvas' && (
        <p className="report-chat-composer__context" title={resolvedContext}>
          {resolvedContext}
        </p>
      )}

      {file && onFileChange && (
        <div className="report-chat-composer__attachment">
          <span className="report-chat-composer__attachment-icon" aria-hidden>
            <PaperclipIcon className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm text-app-text">{file.name}</span>
          <span className="text-xs text-app-text-muted shrink-0">{formatFileSize(file.size)}</span>
          {!disabled && !loading && (
            <button
              type="button"
              onClick={() => {
                onFileChange(null)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
              className="report-chat-composer__attachment-clear"
              aria-label="Remove file"
            >
              ×
            </button>
          )}
        </div>
      )}

      <div className="report-chat-composer__row">
        {showAttach && onFileChange && (
          <>
            <input
              ref={fileInputRef}
              id={fileInputId}
              type="file"
              accept={accept}
              disabled={disabled || loading}
              className="sr-only"
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={pickFile}
              disabled={disabled || loading}
              className="report-chat-composer__attach"
              aria-label="Attach reference file"
              title="Attach PDF, Word, or text"
            >
              <PaperclipIcon />
            </button>
          </>
        )}

        <label className="sr-only" htmlFor={inputId}>
          Report prompt
        </label>
        <textarea
          ref={textareaRef}
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              if (canSend) onSubmit()
            }
          }}
          placeholder={loading ? 'Generating…' : placeholder}
          disabled={disabled || loading}
          rows={1}
          className="report-chat-composer__input"
        />

        <button
          type="submit"
          disabled={!canSend}
          aria-label={submitAriaLabel}
          title={submitAriaLabel}
          className={`report-chat-composer__send ${canSend ? 'report-chat-composer__send--active' : ''}`}
        >
          {loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <SendArrowIcon />
          )}
        </button>
      </div>

      {(error || hint) && (
        <div className="report-chat-composer__footer">
          {error ? (
            <p className="report-chat-composer__error">{error}</p>
          ) : (
            <p className="report-chat-composer__hint">{hint}</p>
          )}
        </div>
      )}
    </form>
  )
}
