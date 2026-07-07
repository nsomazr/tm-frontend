import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import ReportImageCropDialog from './ReportImageCropDialog'
import ReportLinkDialog, { normalizeLinkUrl } from './ReportLinkDialog'
import {
  applyListCommand,
  findSelectedFigure,
  IMAGE_ALIGN_OPTIONS,
  IMAGE_WIDTH_OPTIONS,
  insertImageAtSelection,
  parseFigureClasses,
  readImageFile,
  updateFigureLayout,
  type ImageAlign,
  type ImageWidth,
} from './reportEditorCommands'
import {
  findingsTextToHtml,
  htmlToFindingsText,
  htmlToPlainText,
  looksLikeHtml,
  normalizeMarkdownInHtml,
  plainTextToHtml,
  stripAiReportPreamble,
  normalizeReportTypography,
  sanitizeReportHtml,
  REPORT_SECTION_TITLES,
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

const TEXT_COLORS = [
  { label: 'Default', value: '#202124' },
  { label: 'Green', value: '#166534' },
  { label: 'Amber', value: '#b45309' },
  { label: 'Slate', value: '#475569' },
] as const

const HIGHLIGHT_COLORS = [
  { label: 'None', value: 'transparent' },
  { label: 'Mint', value: '#dcfce7' },
  { label: 'Yellow', value: '#fef9c3' },
  { label: 'Sky', value: '#e0f2fe' },
] as const

function toHtml(variant: EditorVariant, value: string) {
  if (!value.trim()) return ''
  if (variant === 'findings') {
    return looksLikeHtml(value) ? normalizeMarkdownInHtml(value) : findingsTextToHtml(value)
  }
  const stripped = stripAiReportPreamble(value)
  return looksLikeHtml(stripped) ? normalizeMarkdownInHtml(stripped) : plainTextToHtml(stripped)
}

function fromHtml(variant: EditorVariant, html: string) {
  if (variant === 'findings') return htmlToFindingsText(html)
  return html
}

function exec(command: string, value?: string) {
  document.execCommand(command, false, value)
}

function ToolbarButton({
  label,
  title,
  onClick,
  children,
  disabled,
}: {
  label: string
  title?: string
  onClick: () => void
  children?: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      title={title ?? label}
      aria-label={label}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="report-rich-editor__btn"
    >
      {children ?? label}
    </button>
  )
}

function ToolbarGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="report-rich-editor__group" role="group" aria-label={label}>
      <span className="report-rich-editor__group-label">{label}</span>
      <div className="report-rich-editor__group-items">{children}</div>
    </div>
  )
}

function ToolbarSelect({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: readonly { label: string; value: string }[]
  disabled?: boolean
}) {
  return (
    <label className="report-rich-editor__select-wrap">
      <span className="sr-only">{label}</span>
      <select
        className="report-rich-editor__select"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
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
  const imageInputRef = useRef<HTMLInputElement>(null)
  const lastEmitted = useRef(value)
  const syncing = useRef(false)
  const [textColor, setTextColor] = useState('#202124')
  const [highlightColor, setHighlightColor] = useState('transparent')
  const [selectedFigure, setSelectedFigure] = useState<HTMLElement | null>(null)
  const [figureLayout, setFigureLayout] = useState<{ align: ImageAlign; width: ImageWidth }>({
    align: 'center',
    width: 'medium',
  })
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const savedRangeRef = useRef<Range | null>(null)
  const [linkDialog, setLinkDialog] = useState({
    open: false,
    url: 'https://',
    label: '',
    canRemove: false,
  })

  useEffect(() => {
    const surface = surfaceRef.current
    if (!surface) return
    surface.querySelectorAll('figure.report-editor-figure.is-selected').forEach((node) => {
      node.classList.remove('is-selected')
    })
    selectedFigure?.classList.add('is-selected')
  }, [selectedFigure])

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
    const raw = fromHtml(variant, surface.innerHTML)
    const output =
      variant === 'body'
        ? normalizeReportTypography(sanitizeReportHtml(raw))
        : normalizeReportTypography(raw)
    if (output === lastEmitted.current) return
    lastEmitted.current = output
    onChange(output)
  }

  function saveEditorSelection() {
    const selection = window.getSelection()
    if (
      selection &&
      selection.rangeCount > 0 &&
      surfaceRef.current?.contains(selection.anchorNode)
    ) {
      savedRangeRef.current = selection.getRangeAt(0).cloneRange()
      return savedRangeRef.current
    }
    savedRangeRef.current = null
    return null
  }

  function restoreEditorSelection() {
    const selection = window.getSelection()
    if (!selection || !savedRangeRef.current) return false
    selection.removeAllRanges()
    selection.addRange(savedRangeRef.current)
    return true
  }

  function findAnchorNode(node: Node | null) {
    let current: Node | null = node
    const surface = surfaceRef.current
    while (current && current !== surface) {
      if (current instanceof HTMLAnchorElement) return current
      current = current.parentNode
    }
    return null
  }

  function openLinkDialog() {
    if (disabled) return
    const range = saveEditorSelection()
    const selection = window.getSelection()
    let url = 'https://'
    let label = ''
    let canRemove = false

    if (selection?.anchorNode) {
      const anchor = findAnchorNode(selection.anchorNode)
      if (anchor) {
        url = anchor.getAttribute('href') ?? ''
        label = anchor.textContent?.trim() ?? ''
        canRemove = true
        const anchorRange = document.createRange()
        anchorRange.selectNodeContents(anchor)
        selection.removeAllRanges()
        selection.addRange(anchorRange)
        savedRangeRef.current = anchorRange.cloneRange()
      }
    }

    if (!label && range) {
      label = range.toString().trim()
    }

    setLinkDialog({
      open: true,
      url: url || 'https://',
      label,
      canRemove,
    })
  }

  function closeLinkDialog() {
    setLinkDialog({ open: false, url: 'https://', label: '', canRemove: false })
    savedRangeRef.current = null
  }

  function applyLink(url: string) {
    const surface = surfaceRef.current
    if (!surface) return
    const normalized = normalizeLinkUrl(url)
    if (!normalized) return
    restoreEditorSelection()
    surface.focus()
    exec('createLink', normalized)
    emitChange()
    closeLinkDialog()
  }

  function removeLink() {
    const surface = surfaceRef.current
    if (!surface) return
    restoreEditorSelection()
    surface.focus()
    exec('unlink')
    emitChange()
    closeLinkDialog()
  }

  function run(action: string, arg?: string) {
    if (disabled) return
    const surface = surfaceRef.current
    if (!surface) return
    surface.focus()

    switch (action) {
      case 'h2':
        exec('formatBlock', 'h2')
        break
      case 'h3':
        exec('formatBlock', 'h3')
        break
      case 'p':
        exec('formatBlock', 'p')
        break
      case 'blockquote':
        exec('formatBlock', 'blockquote')
        break
      case 'ul':
        applyListCommand(surface, false)
        break
      case 'ol':
        applyListCommand(surface, true)
        break
      case 'link':
        openLinkDialog()
        return
      case 'hr':
        exec('insertHorizontalRule')
        break
      case 'line':
        exec('insertLineBreak')
        break
      case 'foreColor':
        if (arg) exec('foreColor', arg)
        break
      case 'hiliteColor':
        if (arg) exec('hiliteColor', arg)
        break
      case 'removeFormat':
        exec('removeFormat')
        break
      case 'undo':
        exec('undo')
        break
      case 'redo':
        exec('redo')
        break
      default:
        exec(action, arg)
    }
    emitChange()
  }

  function insertSection(title: string) {
    if (disabled || !title) return
    const surface = surfaceRef.current
    if (!surface) return
    surface.focus()

    const heading = document.createElement('h2')
    heading.textContent = title
    const paragraph = document.createElement('p')
    paragraph.appendChild(document.createElement('br'))

    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      range.collapse(false)
      range.insertNode(paragraph)
      range.insertNode(heading)
      selection.collapseToEnd()
    } else {
      surface.appendChild(heading)
      surface.appendChild(paragraph)
    }
    emitChange()
  }

  function openImagePicker() {
    if (disabled) return
    imageInputRef.current?.click()
  }

  async function handleImageSelected(fileList: FileList | null) {
    const surface = surfaceRef.current
    const input = imageInputRef.current
    if (!surface || !fileList?.length) return

    try {
      const src = await readImageFile(fileList[0])
      const figure = insertImageAtSelection(surface, src)
      setSelectedFigure(figure)
      setFigureLayout(parseFigureClasses(figure.className))
      emitChange()
    } catch {
      window.alert('Could not insert image. Use a PNG or JPEG under 10 MB.')
    } finally {
      if (input) input.value = ''
    }
  }

  function handleSurfaceClick(event: React.MouseEvent<HTMLDivElement>) {
    const surface = surfaceRef.current
    if (!surface) return
    const figure = findSelectedFigure(surface, event.target)
    setSelectedFigure(figure)
    if (figure) setFigureLayout(parseFigureClasses(figure.className))
  }

  function updateSelectedFigureLayout(updates: { align?: ImageAlign; width?: ImageWidth }) {
    if (!selectedFigure) return
    updateFigureLayout(selectedFigure, updates)
    setFigureLayout(parseFigureClasses(selectedFigure.className))
    emitChange()
  }

  function removeSelectedFigure() {
    if (!selectedFigure) return
    selectedFigure.remove()
    setSelectedFigure(null)
    emitChange()
  }

  function openCropDialog() {
    if (!selectedFigure || disabled) return
    const img = selectedFigure.querySelector('img')
    if (!img?.src) return
    setCropSrc(img.src)
  }

  function applyCroppedImage(nextSrc: string) {
    if (!selectedFigure) return
    const img = selectedFigure.querySelector('img')
    if (!img) return
    img.src = nextSrc
    setCropSrc(null)
    emitChange()
  }

  const imageToolbar = selectedFigure ? (
    <div className="report-rich-editor__image-toolbar" role="toolbar" aria-label="Image layout">
      <span className="report-rich-editor__image-label">Image</span>
      <ToolbarButton label="Crop image" onClick={openCropDialog} disabled={disabled}>
        Crop
      </ToolbarButton>
      <ToolbarSelect
        label="Image alignment"
        value={figureLayout.align}
        disabled={disabled}
        options={IMAGE_ALIGN_OPTIONS}
        onChange={(align) => updateSelectedFigureLayout({ align: align as ImageAlign })}
      />
      <ToolbarSelect
        label="Image size"
        value={figureLayout.width}
        disabled={disabled}
        options={IMAGE_WIDTH_OPTIONS}
        onChange={(width) => updateSelectedFigureLayout({ width: width as ImageWidth })}
      />
      <ToolbarButton label="Remove image" onClick={removeSelectedFigure} disabled={disabled}>
        Remove
      </ToolbarButton>
    </div>
  ) : null

  const toolbar =
    variant === 'findings' ? (
      <div className="report-rich-editor__toolbar-rows">
        <div className="report-rich-editor__toolbar-row">
          <ToolbarGroup label="Edit">
            <ToolbarButton label="Undo" title="Undo" onClick={() => run('undo')} disabled={disabled}>
              ↶
            </ToolbarButton>
            <ToolbarButton label="Redo" title="Redo" onClick={() => run('redo')} disabled={disabled}>
              ↷
            </ToolbarButton>
          </ToolbarGroup>
          <ToolbarGroup label="Style">
            <ToolbarButton label="Bullet list" onClick={() => run('ul')} disabled={disabled}>
              • List
            </ToolbarButton>
            <ToolbarButton label="Align left" onClick={() => run('justifyLeft')} disabled={disabled}>
              Left
            </ToolbarButton>
            <ToolbarButton label="Align center" onClick={() => run('justifyCenter')} disabled={disabled}>
              Center
            </ToolbarButton>
            <ToolbarButton label="Bold" onClick={() => run('bold')} disabled={disabled}>
              <strong>B</strong>
            </ToolbarButton>
            <ToolbarButton label="Italic" onClick={() => run('italic')} disabled={disabled}>
              <em>I</em>
            </ToolbarButton>
            <ToolbarButton label="Underline" onClick={() => run('underline')} disabled={disabled}>
              <span className="report-rich-editor__underline">U</span>
            </ToolbarButton>
            <ToolbarButton label="Link" onClick={() => run('link')} disabled={disabled}>
              Link
            </ToolbarButton>
          </ToolbarGroup>
          <ToolbarGroup label="Reset">
            <ToolbarButton label="Clear formatting" onClick={() => run('removeFormat')} disabled={disabled}>
              Clear
            </ToolbarButton>
          </ToolbarGroup>
        </div>
      </div>
    ) : (
      <div className="report-rich-editor__toolbar-rows">
        <div className="report-rich-editor__toolbar-row">
          <ToolbarGroup label="Edit">
            <ToolbarButton label="Undo" title="Undo" onClick={() => run('undo')} disabled={disabled}>
              ↶
            </ToolbarButton>
            <ToolbarButton label="Redo" title="Redo" onClick={() => run('redo')} disabled={disabled}>
              ↷
            </ToolbarButton>
          </ToolbarGroup>
          <ToolbarGroup label="Structure">
            <ToolbarButton label="Section heading" onClick={() => run('h2')} disabled={disabled}>
              H2
            </ToolbarButton>
            <ToolbarButton label="Subheading" onClick={() => run('h3')} disabled={disabled}>
              H3
            </ToolbarButton>
            <ToolbarButton label="Paragraph" onClick={() => run('p')} disabled={disabled}>
              ¶
            </ToolbarButton>
            <ToolbarButton label="Quote" onClick={() => run('blockquote')} disabled={disabled}>
              “
            </ToolbarButton>
            <ToolbarSelect
              label="Insert section"
              value=""
              disabled={disabled}
              options={[
                { label: '+ Section', value: '' },
                ...REPORT_SECTION_TITLES.map((title) => ({ label: title, value: title })),
              ]}
              onChange={(title) => {
                if (title) insertSection(title)
              }}
            />
          </ToolbarGroup>
          <ToolbarGroup label="Style">
            <ToolbarButton label="Bold" onClick={() => run('bold')} disabled={disabled}>
              <strong>B</strong>
            </ToolbarButton>
            <ToolbarButton label="Italic" onClick={() => run('italic')} disabled={disabled}>
              <em>I</em>
            </ToolbarButton>
            <ToolbarButton label="Underline" onClick={() => run('underline')} disabled={disabled}>
              <span className="report-rich-editor__underline">U</span>
            </ToolbarButton>
            <ToolbarButton label="Strikethrough" onClick={() => run('strikeThrough')} disabled={disabled}>
              <span className="report-rich-editor__strike">S</span>
            </ToolbarButton>
            <ToolbarSelect
              label="Text color"
              value={textColor}
              disabled={disabled}
              options={TEXT_COLORS}
              onChange={(color) => {
                setTextColor(color)
                run('foreColor', color)
              }}
            />
            <ToolbarSelect
              label="Highlight"
              value={highlightColor}
              disabled={disabled}
              options={HIGHLIGHT_COLORS}
              onChange={(color) => {
                setHighlightColor(color)
                run('hiliteColor', color)
              }}
            />
          </ToolbarGroup>
        </div>
        <div className="report-rich-editor__toolbar-row">
          <ToolbarGroup label="Align">
            <ToolbarButton label="Align left" onClick={() => run('justifyLeft')} disabled={disabled}>
              Left
            </ToolbarButton>
            <ToolbarButton label="Align center" onClick={() => run('justifyCenter')} disabled={disabled}>
              Center
            </ToolbarButton>
            <ToolbarButton label="Align right" onClick={() => run('justifyRight')} disabled={disabled}>
              Right
            </ToolbarButton>
            <ToolbarButton label="Justify" onClick={() => run('justifyFull')} disabled={disabled}>
              Justify
            </ToolbarButton>
          </ToolbarGroup>
          <ToolbarGroup label="Lists">
            <ToolbarButton label="Bullet list" onClick={() => run('ul')} disabled={disabled}>
              • List
            </ToolbarButton>
            <ToolbarButton label="Numbered list" onClick={() => run('ol')} disabled={disabled}>
              1. List
            </ToolbarButton>
            <ToolbarButton label="Indent" onClick={() => run('indent')} disabled={disabled}>
              →
            </ToolbarButton>
            <ToolbarButton label="Outdent" onClick={() => run('outdent')} disabled={disabled}>
              ←
            </ToolbarButton>
          </ToolbarGroup>
          <ToolbarGroup label="Insert">
            <ToolbarButton label="Insert link" onClick={() => run('link')} disabled={disabled}>
              Link
            </ToolbarButton>
            <ToolbarButton label="Line break" onClick={() => run('line')} disabled={disabled}>
              ↵
            </ToolbarButton>
            <ToolbarButton label="Divider line" onClick={() => run('hr')} disabled={disabled}>
              ---
            </ToolbarButton>
            <ToolbarButton label="Insert image" onClick={openImagePicker} disabled={disabled}>
              Image
            </ToolbarButton>
          </ToolbarGroup>
          <ToolbarGroup label="Reset">
            <ToolbarButton label="Clear formatting" onClick={() => run('removeFormat')} disabled={disabled}>
              Clear
            </ToolbarButton>
          </ToolbarGroup>
        </div>
      </div>
    )

  return (
    <div
      className={`report-rich-editor report-rich-editor--${variant}`}
      style={{ '--report-editor-min-height': minHeight } as CSSProperties}
    >
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => void handleImageSelected(e.target.files)}
      />
      <div className="report-rich-editor__chrome">
        <div className="report-rich-editor__toolbar" role="toolbar" aria-label="Formatting">
          {toolbar}
        </div>
        {imageToolbar}
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
        onClick={handleSurfaceClick}
      />
      <ReportLinkDialog
        open={linkDialog.open}
        url={linkDialog.url}
        selectionLabel={linkDialog.label}
        canRemove={linkDialog.canRemove}
        onClose={closeLinkDialog}
        onApply={applyLink}
        onRemove={removeLink}
      />
      <ReportImageCropDialog
        src={cropSrc ?? ''}
        open={Boolean(cropSrc)}
        onClose={() => setCropSrc(null)}
        onApply={applyCroppedImage}
      />
    </div>
  )
}

export function richEditorPlainText(value: string) {
  return htmlToPlainText(value) || value
}
