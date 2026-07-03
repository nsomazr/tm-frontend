import { useState } from 'react'
import { isAxiosError } from 'axios'
import { reportsApi } from '../../api'
import FileUploadField from '../ui/FileUploadField'

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

interface ReportWritingAssistantProps {
  metadata: ReportWritingMetadata
  disabled?: boolean
  onApplyDraft: (draft: { executiveSummary: string; keyFindings: string }) => void
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

export default function ReportWritingAssistant({
  metadata,
  disabled,
  onApplyDraft,
}: ReportWritingAssistantProps) {
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

  async function runAssist(userInstruction: string, history: ChatMessage[]) {
    if (!metadata.title.trim() || !metadata.mineralName) {
      setError('Add a title and mineral in Report details before using the assistant.')
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
    fd.append('current_key_findings', JSON.stringify(textToFindings(metadata.currentKeyFindings)))
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
        const detail = err.response?.data as { detail?: string } | undefined
        setError(detail?.detail || 'Report assistant request failed.')
      } else {
        setError('Report assistant request failed.')
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
    <section className="rounded-xl border border-app-border bg-app-subtle/40 overflow-hidden">
      <div className="px-4 py-3 border-b app-divider">
        <h3 className="text-sm font-semibold text-app-text">AI writing assistant</h3>
        <p className="text-xs text-app-muted mt-1">
          Paste notes or upload reference material. The assistant drafts the report. You review, edit, and
          publish. No PDF upload in write mode.
        </p>
      </div>

      <div className="px-4 py-4 space-y-4">
        <label className="block">
          <span className="text-xs font-medium text-app-text-secondary">Reference notes (optional)</span>
          <textarea
            value={contextText}
            onChange={(e) => setContextText(e.target.value)}
            disabled={disabled || loading}
            placeholder="Geological notes, survey excerpts, licensing context, field observations…"
            className="input mt-1.5 min-h-[88px] text-sm"
            rows={4}
          />
        </label>

        <FileUploadField
          label="Reference file (optional)"
          accept={CONTEXT_ACCEPT}
          value={contextFile}
          onChange={setContextFile}
          disabled={disabled || loading}
          placeholder="PDF, Word, or text file for context"
          hint="Used as background only, not published as the report PDF."
        />

        {messages.length > 0 && (
          <div className="rounded-lg border border-app-border bg-app-surface max-h-44 overflow-y-auto p-3 space-y-2">
            {messages.map((msg, i) => (
              <div
                key={`${msg.role}-${i}`}
                className={`text-xs leading-relaxed ${
                  msg.role === 'user' ? 'text-app-text-secondary' : 'text-app-text'
                }`}
              >
                <span className="font-semibold capitalize">{msg.role === 'user' ? 'You' : 'Assistant'}: </span>
                {msg.content}
              </div>
            ))}
          </div>
        )}

        {pendingDraft && (
          <div className="rounded-lg border border-terra-500/30 bg-terra-50/50 dark:bg-terra-950/20 p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-terra-800 dark:text-terra-200">Draft ready for approval</p>
              <span className="text-[10px] text-app-text-muted">{pendingDraft.modelUsed}</span>
            </div>
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
            <button
              type="button"
              onClick={handleApplyDraft}
              className="btn-primary text-xs py-1.5 px-3"
            >
              Apply draft to editor
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
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
            placeholder="e.g. Emphasize alluvial gold in eastern belt, keep tone investor-friendly"
            className="input flex-1 text-sm"
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={disabled || loading}
            className="btn-primary text-sm shrink-0 disabled:opacity-50"
          >
            {loading ? 'Drafting…' : messages.length ? 'Refine draft' : 'Generate draft'}
          </button>
        </div>

        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </section>
  )
}
