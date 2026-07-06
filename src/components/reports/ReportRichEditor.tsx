import { useEffect, useRef, type CSSProperties } from 'react'
import {
  findingsTextToHtml,
  htmlToFindingsText,
  htmlToPlainText,
  looksLikeHtml,
  plainTextToHtml,
} from './reportEditorText'

type EditorVariant = 'body' | 'findings'

interface ReportRichEditorProps {
  variant: EditorVariant
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: string
  disabled?: boolean
}

function toHtml(variant: EditorVariant, value: string) {
  if (!value.trim()) return ''
  if (variant === 'findings') {
    return looksLikeHtml(value) ? value : findingsTextToHtml(value)
  }
  return looksLikeHtml(value) ? value : plainTextToHtml(value)
}

function fromHtml(variant: EditorVariant, html: string) {
  if (variant === 'findings') return htmlToFindingsText(html)
  return html
}

function exec(command: string, value?: string) {
  document.execCommand(command, false, value)
}

export default function ReportRichEditor({
  variant,
  value,
  onChange,
  placeholder,
  minHeight = '12rem',
  disabled = false,
}: ReportRichEditorProps) {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const lastEmitted = useRef(value)
  const syncing = useRef(false)

  useEffect(() => {
    const surface = surfaceRef.current
    if (!surface || syncing.current) return
    const html = toHtml(variant, value)
    if (surface.innerHTML === html) {
      lastEmitted.current = value
      return
    }
    syncing.current = true
    surface.innerHTML = html || ''
    lastEmitted.current = value
    syncing.current = false
  }, [value, variant])

  function emitChange() {
    const surface = surfaceRef.current
    if (!surface || syncing.current) return
    const output = fromHtml(variant, surface.innerHTML)
    if (output === lastEmitted.current) return
    lastEmitted.current = output
    onChange(output)
  }

  function handleToolbar(action: string) {
    if (disabled) return
    surfaceRef.current?.focus()
    if (action === 'h2') {
      exec('formatBlock', 'h2')
    } else if (action === 'p') {
      exec('formatBlock', 'p')
    } else if (action === 'ul') {
      exec('insertUnorderedList')
    } else {
      exec(action)
    }
    emitChange()
  }

  const toolbar =
    variant === 'findings' ? (
      <>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbar('insertUnorderedList')}>
          • List
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbar('bold')}>
          <strong>B</strong>
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbar('italic')}>
          <em>I</em>
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbar('underline')}>
          <span className="report-rich-editor__underline">U</span>
        </button>
      </>
    ) : (
      <>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbar('h2')}>
          Heading
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbar('p')}>
          Paragraph
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbar('bold')}>
          <strong>B</strong>
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbar('italic')}>
          <em>I</em>
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbar('underline')}>
          <span className="report-rich-editor__underline">U</span>
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => handleToolbar('insertUnorderedList')}>
          • List
        </button>
      </>
    )

  return (
    <div
      className={`report-rich-editor report-rich-editor--${variant}`}
      style={{ '--report-editor-min-height': minHeight } as CSSProperties}
    >
      <div className="report-rich-editor__toolbar" role="toolbar" aria-label="Formatting">
        {toolbar}
      </div>
      <div
        ref={surfaceRef}
        role="textbox"
        aria-multiline="true"
        contentEditable={!disabled}
        suppressContentEditableWarning
        className="report-rich-editor__surface"
        data-placeholder={placeholder}
        onInput={emitChange}
        onBlur={emitChange}
      />
    </div>
  )
}

export function richEditorPlainText(value: string) {
  return htmlToPlainText(value) || value
}
