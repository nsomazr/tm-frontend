import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { CKEditor } from '@ckeditor/ckeditor5-react'
import {
  Alignment,
  BlockQuote,
  Bold,
  ClassicEditor,
  Essentials,
  Heading,
  HorizontalLine,
  Indent,
  IndentBlock,
  Italic,
  Link,
  List,
  Paragraph,
  RemoveFormat,
  Strikethrough,
  Underline,
  Undo,
} from 'ckeditor5'
import 'ckeditor5/ckeditor5.css'
import { htmlToFindingsText, plainTextToHtml, findingsTextToHtml, looksLikeHtml, normalizeMarkdownInHtml, sanitizeReportHtml } from './reportEditorText'

type EditorVariant = 'body' | 'findings'
type EditorLayout = 'default' | 'document-body' | 'document-inline' | 'canvas'

interface ReportRichTextEditorProps {
  variant: EditorVariant
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: string
  disabled?: boolean
  layout?: EditorLayout
}

const BODY_PLUGINS = [
  Essentials,
  Paragraph,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading,
  Link,
  List,
  BlockQuote,
  Alignment,
  Indent,
  IndentBlock,
  Undo,
  RemoveFormat,
  HorizontalLine,
]

const FINDINGS_PLUGINS = [Essentials, Paragraph, Bold, Italic, Underline, List, Undo, RemoveFormat]

function toEditorHtml(variant: EditorVariant, value: string) {
  if (!value.trim()) return ''
  if (variant === 'findings') {
    return looksLikeHtml(value) ? normalizeMarkdownInHtml(value) : findingsTextToHtml(value)
  }
  return looksLikeHtml(value) ? normalizeMarkdownInHtml(value) : plainTextToHtml(value)
}

function fromEditorHtml(variant: EditorVariant, html: string) {
  if (variant === 'findings') {
    return htmlToFindingsText(html)
  }
  return sanitizeReportHtml(html)
}

function syncEditorContent(
  editor: ClassicEditor,
  variant: EditorVariant,
  value: string,
  lastEmitted: { current: string },
) {
  const nextHtml = toEditorHtml(variant, value)
  const currentHtml = editor.getData()
  if (currentHtml === nextHtml || (variant !== 'findings' && currentHtml === value)) {
    lastEmitted.current = value
    return
  }
  editor.setData(nextHtml)
  lastEmitted.current = value
}

export default function ReportRichTextEditor({
  variant,
  value,
  onChange,
  placeholder,
  minHeight = 'min(38vh, 320px)',
  disabled = false,
  layout = 'default',
}: ReportRichTextEditorProps) {
  const editorRef = useRef<ClassicEditor | null>(null)
  const lastEmitted = useRef(value)
  const [editorReady, setEditorReady] = useState(false)
  const editorKey = useMemo(() => `${variant}-${value.length}-${value.slice(0, 32)}`, [variant, value])

  const config = useMemo(
    () => ({
      plugins: variant === 'findings' ? FINDINGS_PLUGINS : BODY_PLUGINS,
      toolbar:
        variant === 'findings'
          ? {
              items: [
                'bulletedList',
                'numberedList',
                '|',
                'bold',
                'italic',
                'underline',
                '|',
                'undo',
                'redo',
              ],
              shouldNotGroupWhenFull: true,
            }
          : {
              items: [
                'heading',
                '|',
                'bold',
                'italic',
                'underline',
                'strikethrough',
                '|',
                'link',
                'bulletedList',
                'numberedList',
                'blockQuote',
                '|',
                'alignment',
                'outdent',
                'indent',
                '|',
                'horizontalLine',
                'removeFormat',
                '|',
                'undo',
                'redo',
              ],
              shouldNotGroupWhenFull: true,
            },
      placeholder,
      heading: {
        options: [
          { model: 'paragraph' as const, title: 'Paragraph', class: 'ck-heading_paragraph' },
          { model: 'heading2' as const, view: 'h2', title: 'Section heading', class: 'ck-heading_heading2' },
          { model: 'heading3' as const, view: 'h3', title: 'Subheading', class: 'ck-heading_heading3' },
        ],
      },
      link: {
        addTargetToExternalLinks: true,
        defaultProtocol: 'https://',
      },
    }),
    [variant, placeholder]
  )

  useEffect(() => {
    if (!editorRef.current || !editorReady) return
    syncEditorContent(editorRef.current, variant, value, lastEmitted)
  }, [value, variant, editorReady])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    editor.isReadOnly = disabled
  }, [disabled])

  const layoutClass =
    layout === 'canvas'
      ? 'report-ckeditor--canvas'
      : layout === 'document-body'
        ? 'report-ckeditor--doc-body'
        : layout === 'document-inline'
          ? 'report-ckeditor--doc-inline'
          : `report-ckeditor--${variant}`

  return (
    <div
      className={`report-ckeditor ${layoutClass}`}
      style={{ '--report-editor-min-height': minHeight } as CSSProperties}
    >
      <CKEditor
        key={editorKey}
        editor={ClassicEditor}
        config={config}
        data={toEditorHtml(variant, value)}
        disabled={disabled}
        onReady={(editor) => {
          editorRef.current = editor
          editor.isReadOnly = disabled
          syncEditorContent(editor, variant, value, lastEmitted)
          setEditorReady(true)
        }}
        onChange={(_event, editor) => {
          const output = fromEditorHtml(variant, editor.getData())
          lastEmitted.current = output
          onChange(output)
        }}
      />
    </div>
  )
}
