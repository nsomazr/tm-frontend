import { useCallback, useRef, useState, type DragEvent, type KeyboardEvent, type MouseEvent } from 'react'
import { useTranslation } from '../../i18n/LocaleContext'

interface BoundaryFileDropzoneProps {
  file: File | null
  onFileChange: (file: File | null) => void
  disabled?: boolean
}

export default function BoundaryFileDropzone({
  file,
  onFileChange,
  disabled = false,
}: BoundaryFileDropzoneProps) {
  const { m } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const accept = '.json,.geojson,.zip,.shp'

  const pickFile = useCallback(
    (next: File | null) => {
      if (!next) {
        onFileChange(null)
        return
      }
      const name = next.name.toLowerCase()
      const ok =
        name.endsWith('.json') ||
        name.endsWith('.geojson') ||
        name.endsWith('.zip') ||
        name.endsWith('.shp')
      if (ok) onFileChange(next)
    },
    [onFileChange]
  )

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (disabled) return
      const dropped = e.dataTransfer.files?.[0]
      if (dropped) pickFile(dropped)
    },
    [disabled, pickFile]
  )

  const clearFile = (e: MouseEvent | KeyboardEvent) => {
    e.stopPropagation()
    onFileChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-1.5">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault()
          if (!disabled) setDragOver(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setDragOver(false)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={`w-full rounded-lg border border-dashed px-3 py-3 text-left transition-colors ${
          dragOver
            ? 'border-terra-600 bg-terra-500/5'
            : file
              ? 'border-terra-600/50 bg-terra-500/5'
              : 'border-app-border-strong hover:border-terra-600/40 hover:bg-app-subtle/40'
        } disabled:opacity-50 disabled:pointer-events-none`}
      >
        {file ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-app-text truncate">{file.name}</p>
              <p className="text-xs text-app-muted mt-0.5">
                {(file.size / 1024 / 1024).toFixed(2)} MB · {m.adminBoundaries.tapToReplace}
              </p>
            </div>
            <span
              role="button"
              tabIndex={0}
              onClick={clearFile}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  clearFile(e)
                }
              }}
              className="shrink-0 text-xs text-app-muted hover:text-app-text"
              aria-label={m.adminBoundaries.clearFile}
            >
              {m.adminBoundaries.clearFile}
            </span>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-app-text">{m.adminBoundaries.dropzoneTitle}</p>
            <p className="text-xs text-app-muted mt-0.5">{m.adminBoundaries.dropzoneHint}</p>
          </>
        )}
      </button>
    </div>
  )
}
