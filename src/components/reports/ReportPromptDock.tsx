import { useId, useRef, useEffect } from 'react'
import { SendArrowIcon } from '../assistant/AssistantIcons'

const GENERATE_CHIPS = [
  'Full 3–5 page report for this layer',
  'Focus on deposits and exploration risks',
] as const

const REFINE_CHIPS = [
  'Expand all sections to 3–5 pages',
  'Add more geological detail',
] as const

interface ReportPromptDockProps {
  mode: 'generate' | 'refine'
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onApprove?: () => void
  loading?: boolean
  disabled?: boolean
  canSubmit?: boolean
  canApprove?: boolean
  showApprove?: boolean
  error?: string | null
  file?: File | null
  onFileChange?: (file: File | null) => void
  accept?: string
}

function PaperclipIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path
        d="M14.5 6.5l-5 5a2.5 2.5 0 0 0 3.5 3.5l5.5-5.5a4 4 0 0 0-5.5-5.5l-6 6a5.5 5.5 0 0 0 7.8 7.8l5.2-5.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function ReportPromptDock({
  mode,
  value,
  onChange,
  onSubmit,
  onApprove,
  loading = false,
  disabled = false,
  canSubmit = false,
  canApprove = false,
  showApprove = false,
  error = null,
  file = null,
  onFileChange,
  accept = '.pdf,.docx,.txt,.md,.csv',
}: ReportPromptDockProps) {
  const inputId = useId()
  const fileInputId = useId()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chips = mode === 'generate' ? GENERATE_CHIPS : REFINE_CHIPS
  const canSend = canSubmit && !disabled && !loading && value.trim().length > 0

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 80)}px`
  }, [value])

  return (
    <div className={`report-prompt-dock report-prompt-dock--${mode}`}>
      <div className="report-prompt-dock__inner">
        <div className="report-prompt-dock__main">
          <div className="report-prompt-dock__chips">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={disabled || loading}
                onClick={() => onChange(chip)}
                className="report-prompt-dock__chip"
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="report-prompt-dock__row">
            {mode === 'generate' && onFileChange && (
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
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || loading}
                  className="report-prompt-dock__attach"
                  aria-label="Attach reference file"
                  title="Attach PDF or notes"
                >
                  <PaperclipIcon />
                </button>
              </>
            )}

            <label className="sr-only" htmlFor={inputId}>
              {mode === 'generate' ? 'Report prompt' : 'Refine prompt'}
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
              placeholder={
                mode === 'generate'
                  ? 'Describe the report you want Terra to draft…'
                  : 'Refine the draft — length, tone, sections…'
              }
              disabled={disabled || loading}
              rows={1}
              className="report-prompt-dock__input"
            />

            {mode === 'generate' ? (
              <button
                type="button"
                onClick={onSubmit}
                disabled={!canSend}
                className="btn-primary report-prompt-dock__generate"
              >
                {loading ? 'Generating…' : 'Generate'}
              </button>
            ) : (
              <button
                type="button"
                onClick={onSubmit}
                disabled={!canSend}
                className={`report-prompt-dock__send ${canSend ? 'report-prompt-dock__send--active' : ''}`}
                aria-label="Refine draft"
              >
                {loading ? <span className="report-prompt-dock__spinner" aria-hidden /> : <SendArrowIcon />}
              </button>
            )}
          </div>

          {file && onFileChange && (
            <p className="report-prompt-dock__file">
              {file.name}
              <button type="button" onClick={() => onFileChange(null)} className="report-prompt-dock__file-clear">
                Remove
              </button>
            </p>
          )}

          {error && <p className="report-prompt-dock__error">{error}</p>}
        </div>

        {showApprove && onApprove && (
          <div className="report-prompt-dock__approve">
            <button
              type="button"
              onClick={onApprove}
              disabled={!canApprove || loading}
              className="btn-primary report-prompt-dock__approve-btn"
            >
              Approve
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
