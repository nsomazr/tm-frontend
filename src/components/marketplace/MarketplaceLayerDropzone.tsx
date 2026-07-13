import { useCallback, useRef, useState, type DragEvent, type KeyboardEvent, type MouseEvent } from 'react'

interface MarketplaceLayerDropzoneProps {
  fileName: string
  error: string
  featureCount?: number | null
  onFile: (file: File | null) => void
  onClear: () => void
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(2)} MB`
}

export default function MarketplaceLayerDropzone({
  fileName,
  error,
  featureCount = null,
  onFile,
  onClear,
}: MarketplaceLayerDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileSize, setFileSize] = useState<number | null>(null)

  const pick = useCallback(
    (file: File | null) => {
      if (!file) {
        setFileSize(null)
        onFile(null)
        return
      }
      setFileSize(file.size)
      onFile(file)
    },
    [onFile],
  )

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const dropped = e.dataTransfer.files?.[0]
      if (dropped) pick(dropped)
    },
    [pick],
  )

  const clear = (e: MouseEvent | KeyboardEvent) => {
    e.stopPropagation()
    setFileSize(null)
    onClear()
    if (inputRef.current) inputRef.current.value = ''
  }

  const loaded = Boolean(fileName)

  return (
    <div className="space-y-1.5">
      <input
        ref={inputRef}
        type="file"
        accept=".geojson,.json,.zip,.shp,application/geo+json,application/json,application/zip"
        className="sr-only"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setDragOver(false)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={`group w-full rounded-xl border border-dashed px-4 py-4 text-left transition-colors ${
          dragOver
            ? 'border-terra-600 bg-terra-500/10'
            : loaded
              ? 'border-terra-600/45 bg-terra-500/5'
              : 'border-app-border-strong bg-app-subtle/30 hover:border-terra-600/40 hover:bg-app-subtle/60'
        }`}
      >
        {loaded ? (
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-terra-600/15 text-terra-700 dark:text-terra-300"
                aria-hidden
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z"
                  />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-app-text">{fileName}</p>
                <p className="mt-0.5 text-xs text-app-muted">
                  Loaded on the map
                  {featureCount != null && featureCount > 0
                    ? ` · ${featureCount} feature${featureCount === 1 ? '' : 's'}`
                    : ''}
                  {fileSize != null ? ` (${formatBytes(fileSize)})` : ''}
                  . Tap to replace.
                </p>
              </div>
            </div>
            <span
              role="button"
              tabIndex={0}
              onClick={clear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  clear(e)
                }
              }}
              className="shrink-0 rounded-md px-2 py-1 text-xs text-app-muted hover:bg-app-subtle hover:text-app-text"
            >
              Clear
            </span>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-app-subtle text-app-muted group-hover:text-terra-700 dark:group-hover:text-terra-300"
              aria-hidden
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 16V7m0 0l-3.5 3.5M12 7l3.5 3.5M5 19h14"
                />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-app-text">Drop a layer here, or browse</p>
              <p className="mt-1 text-xs leading-relaxed text-app-muted">
                Import a licence or block outline as GeoJSON or a shapefile ZIP (Point or Polygon).
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="rounded-md bg-app-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-app-muted ring-1 ring-app-border">
                  .geojson
                </span>
                <span className="rounded-md bg-app-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-app-muted ring-1 ring-app-border">
                  .json
                </span>
                <span className="rounded-md bg-app-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-app-muted ring-1 ring-app-border">
                  .zip
                </span>
                <span className="ml-1 text-[11px] font-medium text-terra-700 dark:text-terra-300">
                  Browse files
                </span>
              </div>
            </div>
          </div>
        )}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
