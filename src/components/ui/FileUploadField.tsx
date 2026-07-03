import { useId, useRef, type ChangeEvent, type DragEvent } from 'react'

export interface FileUploadFieldProps {
  id?: string
  label?: string
  hint?: string
  accept?: string
  value?: File | null
  onChange: (file: File | null) => void
  disabled?: boolean
  className?: string
  placeholder?: string
  /** Full drop zone (default) or compact button that opens the picker */
  variant?: 'zone' | 'button'
  buttonLabel?: string
  buttonClassName?: string
  /** Clear the native input after each selection (useful for repeat uploads) */
  resetOnSelect?: boolean
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FileUploadField({
  id: idProp,
  label,
  hint,
  accept,
  value = null,
  onChange,
  disabled = false,
  className = '',
  placeholder = 'No file chosen',
  variant = 'zone',
  buttonLabel = 'Choose file',
  buttonClassName = 'btn-secondary text-xs py-2 px-3',
  resetOnSelect = false,
}: FileUploadFieldProps) {
  const autoId = useId()
  const id = idProp ?? autoId
  const inputRef = useRef<HTMLInputElement>(null)
  const dragging = useRef(false)

  function pick() {
    if (!disabled) inputRef.current?.click()
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    onChange(file)
    if (resetOnSelect) e.target.value = ''
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    dragging.current = false
    if (disabled) return
    const file = e.dataTransfer.files?.[0] ?? null
    if (file) onChange(file)
  }

  const input = (
    <input
      ref={inputRef}
      id={id}
      type="file"
      accept={accept}
      disabled={disabled}
      className="sr-only"
      onChange={handleChange}
    />
  )

  if (variant === 'button') {
    return (
      <div className={className}>
        {input}
        <button type="button" onClick={pick} disabled={disabled} className={buttonClassName}>
          {buttonLabel}
        </button>
      </div>
    )
  }

  return (
    <div className={`w-full min-w-[200px] ${className}`}>
      {label && (
        <span className="block text-sm text-app-text-secondary mb-1.5">{label}</span>
      )}
      {input}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={pick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            pick()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          dragging.current = true
        }}
        onDragLeave={() => {
          dragging.current = false
        }}
        onDrop={handleDrop}
        className={`file-upload-zone ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
        aria-disabled={disabled}
      >
        <span className="file-upload-zone__icon" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M12 3v12M7 8l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" strokeLinecap="round" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-app-text">
            <span className="text-terra-600 dark:text-terra-400">Browse</span>
            <span className="text-app-text-muted font-normal"> or drop file here</span>
          </p>
          <p className="text-xs text-app-text-muted mt-0.5 truncate">
            {value ? (
              <>
                <span className="text-app-text-secondary">{value.name}</span>
                <span className="mx-1">·</span>
                {formatFileSize(value.size)}
              </>
            ) : (
              placeholder
            )}
          </p>
        </div>
        {value && !disabled && (
          <button
            type="button"
            className="file-upload-zone__clear"
            onClick={(e) => {
              e.stopPropagation()
              onChange(null)
              if (inputRef.current) inputRef.current.value = ''
            }}
            aria-label="Remove file"
          >
            ×
          </button>
        )}
      </div>
      {hint && <p className="mt-1.5 text-xs text-app-text-muted leading-relaxed">{hint}</p>}
    </div>
  )
}
