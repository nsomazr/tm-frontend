import { useState } from 'react'
import { isAxiosError } from 'axios'
import { reportsApi } from '../../api'
import FileUploadField from '../ui/FileUploadField'
import { TerraAssistantAvatar } from '../assistant/AssistantIcons'
import { htmlToFindingsText } from './reportEditorText'

export interface ReportWritingMetadata {
  title: string
  mineralName: string
  regionName: string
  description: string
  currentExecutiveSummary: string
  currentKeyFindings: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ReportAssistantPanelProps {
  metadata: ReportWritingMetadata
  disabled?: boolean
  onApplyDraft: (draft: { executiveSummary: string; keyFindings: string }) => void
  onClose?: () => void
}

const CONTEXT_ACCEPT = '.pdf,.docx,.txt,.md,.csv'

function findingsToText(findings: string[]) {
  return findings.join('\n')
}

function textToFindings(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim().replace(/^[-•]\s*/, ''))
    .filter(Boolean)
}

export default function ReportAssistantPanel({
  metadata,
  disabled,
  onApplyDraft,
  onClose,
}: ReportAssistantPanelProps) {
  const [contextText, setContextText] = useState('')
  const [contextFile, setContextFile] = useState<File | null>(null)
  const [instruction, setInstruction] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [pendingDraft, setPendingDraft] = useState<{
    executiveSummary: string
    keyFindings: string[]
    modelUsed: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showContext, setShowContext] = useState(false)

  async function runAssist(userInstruction: string, history: ChatMessage[]) {
    if (!metadata.title.trim() || !metadata.mineralName) {
      setError('Add a title and map layer before using the assistant.')
      return
    }

    setLoading(true)
    setError(null)

    const fd = new FormData()
    fd.append('title', metadata.title)
    fd.append('mineral_name', metadata.mineralName)
    fd.append('region_name', metadata.regionName)
    fd.append('description', metadata.description)
    fd.append('context_text', contextText)
    fd.append('instruction', userInstruction)
    fd.append('current_executive_summary', metadata.currentExecutiveSummary)
    fd.append('current_key_findings', htmlToFindingsText(metadata.currentKeyFindings))
    fd.append('messages', JSON.stringify(history))
    if (contextFile) {
      fd.append('context_file', contextFile)
    }

    try {
      const { data } = await reportsApi.adminAiAssist(fd)
      const assistantReply = data.assistant_reply || 'Draft ready for your review.'
      setMessages((prev) => [...prev, { role: 'assistant', content: assistantReply }])
      setPendingDraft({
        executiveSummary: data.executive_summary,
        keyFindings: data.key_findings,
        modelUsed: data.model_used,
      })
      setInstruction('')
    } catch (err) {
      if (isAxiosError(err)) {
        const data = err.response?.data as { detail?: string } | string | undefined
        const detail =
          typeof data === 'string'
            ? data
            : typeof data?.detail === 'string'
              ? data.detail
              : err.response?.status === 502
                ? 'AI service unavailable. Check that an LLM provider (Ollama, Groq, or Gemini) is configured and running.'
                : err.response?.status === 503
                  ? 'Server is under pressure — free disk space and retry.'
                  : 'Assistant request failed.'
        setError(detail)
      } else {
        setError('Assistant request failed. Check your network connection and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  function handleGenerate() {
    const prompt =
      instruction.trim() ||
      'Draft the full executive summary and key findings from the metadata and reference context.'
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: prompt }]
    setMessages(nextMessages)
    void runAssist(prompt, nextMessages.slice(0, -1))
  }

  function handleApplyDraft() {
    if (!pendingDraft) return
    onApplyDraft({
      executiveSummary: pendingDraft.executiveSummary,
      keyFindings: findingsToText(pendingDraft.keyFindings),
    })
    setPendingDraft(null)
  }

  return (
    <aside className="report-assistant-panel flex flex-col h-full min-h-0 bg-app-surface">
      <div className="px-4 py-3 border-b app-divider flex items-start justify-between gap-3 shrink-0">
        <div className="flex items-start gap-2.5 min-w-0">
          <TerraAssistantAvatar className="h-8 w-8 mt-0.5" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-app-text">Terra Assistant</h2>
            <p className="text-xs text-app-muted mt-0.5 leading-snug">
              Draft or refine the report on this canvas. Review before applying.
            </p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-app-text-muted hover:text-app-text text-lg leading-none px-1 shrink-0"
            aria-label="Close assistant"
          >
            ×
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        <div className="rounded-lg border border-app-border bg-app-subtle/30 px-3 py-2.5 text-xs text-app-text-secondary space-y-1">
          <p>
            <span className="font-medium text-app-text">Layer:</span>{' '}
            {metadata.mineralName || '—'}
          </p>
          <p>
            <span className="font-medium text-app-text">Location:</span>{' '}
            {metadata.regionName || '—'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowContext((open) => !open)}
          className="text-xs font-medium text-terra-600 dark:text-terra-400 hover:underline"
        >
          {showContext ? 'Hide reference material' : '+ Add reference notes or file (optional)'}
        </button>

        {showContext && (
          <div className="space-y-3 rounded-lg border border-app-border bg-app-subtle/30 p-3">
            <label className="block">
              <span className="text-xs font-medium text-app-text-secondary">Notes</span>
              <textarea
                value={contextText}
                onChange={(e) => setContextText(e.target.value)}
                disabled={disabled || loading}
                placeholder="Survey excerpts, field notes, licensing context…"
                className="input mt-1 min-h-[72px] text-sm"
                rows={3}
              />
            </label>
            <FileUploadField
              label="Reference file"
              accept={CONTEXT_ACCEPT}
              value={contextFile}
              onChange={setContextFile}
              disabled={disabled || loading}
              placeholder="PDF, Word, or text"
              hint="Background context only — not published as the report."
            />
          </div>
        )}

        {messages.length > 0 && (
          <div className="rounded-lg border border-app-border max-h-44 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={`${msg.role}-${i}`}
                className={`text-xs leading-relaxed ${
                  msg.role === 'user' ? 'text-app-text-muted' : 'text-app-text'
                }`}
              >
                <span className="font-semibold block mb-0.5">
                  {msg.role === 'user' ? 'You' : 'Terra Assistant'}
                </span>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))}
          </div>
        )}

        {pendingDraft && (
          <div className="rounded-lg border border-terra-500/30 bg-terra-500/8 p-3 space-y-2">
            <p className="text-xs font-semibold text-terra-800 dark:text-terra-200">Draft ready</p>
            <p className="text-xs text-app-text-secondary line-clamp-4 whitespace-pre-wrap">
              {pendingDraft.executiveSummary}
            </p>
            {pendingDraft.keyFindings.length > 0 && (
              <ul className="text-xs text-app-text-secondary list-disc pl-4 space-y-0.5">
                {pendingDraft.keyFindings.slice(0, 4).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            <button type="button" onClick={handleApplyDraft} className="btn-primary text-xs py-1.5 px-3">
              Apply to editor
            </button>
          </div>
        )}

        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>

      <div className="px-4 py-3 border-t app-divider shrink-0 space-y-2 bg-app-subtle/20">
        <div className="flex gap-2">
          <input
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            disabled={disabled || loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleGenerate()
              }
            }}
            placeholder="e.g. Emphasize eastern belt prospectivity, investor tone"
            className="input flex-1 text-sm"
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={disabled || loading}
            className="btn-primary text-sm shrink-0 disabled:opacity-50"
          >
            {loading ? 'Drafting…' : messages.length ? 'Refine' : 'Generate'}
          </button>
        </div>
        <p className="text-[11px] text-app-text-muted">
          Uses title, layer, location, and overview as context.
        </p>
      </div>
    </aside>
  )
}
