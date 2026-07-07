import { useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import { toast } from '../../components/ui/toast'
import { reportsApi } from '../../api'
import { splitReportDocument, htmlToFindingsText, formatReportPlainToHtml, stripLeakedJson, plainWordCount } from './reportEditorText'
import type { ReportWritingMetadata } from './ReportAssistantPanel'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ReportAiDraft {
  executiveSummary: string
  keyFindings: string[]
  modelUsed: string
  assistantReply: string
}

const GENERATION_STEPS = [
  { label: 'Reading layer and location context', until: 16 },
  { label: 'Searching web for relevant sources', until: 32 },
  { label: 'Reading uploaded reference documents', until: 44 },
  { label: 'Drafting geological narrative', until: 68 },
  { label: 'Extracting key findings', until: 86 },
  { label: 'Finalizing draft', until: 94 },
] as const

const GENERATION_STEPS_NO_SEARCH = [
  { label: 'Reading layer and location context', until: 22 },
  { label: 'Reading uploaded reference documents', until: 38 },
  { label: 'Drafting geological narrative', until: 68 },
  { label: 'Extracting key findings', until: 86 },
  { label: 'Finalizing draft', until: 94 },
] as const

function textToFindings(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim().replace(/^[-•]\s*/, ''))
    .filter(Boolean)
}

function findingsToText(findings: string[]) {
  return findings.join('\n')
}

function normalizeFindings(items: unknown): string[] {
  if (!items) return []
  if (Array.isArray(items)) {
    return items
      .map((item) => stripLeakedJson(String(item)).trim())
      .filter(Boolean)
  }
  if (typeof items === 'string') {
    return items
      .split('\n')
      .map((line) => line.trim().replace(/^[-•]\s*/, ''))
      .filter(Boolean)
  }
  return []
}

function normalizeBody(text: string) {
  return formatReportPlainToHtml(text)
}

function draftWordCount(rawSummary: string, htmlSummary: string) {
  return Math.max(plainWordCount(rawSummary), plainWordCount(htmlSummary))
}

function validateDraftLength(
  rawSummary: string,
  htmlSummary: string,
  findingsCount: number,
  refine: boolean,
  modelUsed: string,
): string | null {
  const words = draftWordCount(rawSummary, htmlSummary)

  if (findingsCount > 0 && words < 12) {
    return 'AI returned only key findings, not a full report. Try “Full 3-5 page report for this layer” or turn on web search.'
  }

  if (refine) {
    if (words < 8) {
      return `AI returned an empty edit (${modelUsed}). Try a more specific instruction.`
    }
    return null
  }

  if (words < 35) {
    return `AI returned only ${words} words (${modelUsed}). The model may be unavailable or rate-limited — check Assistant settings, try again, or enable web search.`
  }

  return null
}

function flattenApiError(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    return value.map(flattenApiError).filter(Boolean).join(' ')
  }
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .map(flattenApiError)
      .filter(Boolean)
      .join(' ')
  }
  return String(value)
}

function formatAiAssistError(err: unknown): string {
  if (!isAxiosError(err)) {
    return 'Assistant request failed. Check your network connection and try again.'
  }

  const data = err.response?.data

  if (typeof data === 'string' && data.trim()) return data

  if (data && typeof data === 'object') {
    if ('detail' in data) {
      const detail = flattenApiError((data as { detail?: unknown }).detail)
      if (detail) return detail
    }

    const fieldMessages = Object.entries(data as Record<string, unknown>)
      .filter(([key]) => key !== 'detail')
      .map(([key, value]) => {
        const msg = flattenApiError(value)
        return msg ? `${key}: ${msg}` : ''
      })
      .filter(Boolean)
    if (fieldMessages.length) return fieldMessages.join(' · ')
  }

  if (err.response?.status === 502) {
    return 'AI service unavailable. Check that an LLM provider (Ollama, Groq, or Gemini) is configured.'
  }
  if (err.response?.status === 503) {
    return 'Server is under pressure. Free disk space and retry.'
  }
  return 'Assistant request failed.'
}

export function useReportAiDraft(metadata: ReportWritingMetadata) {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [lastDraft, setLastDraft] = useState<ReportAiDraft | null>(null)
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  function stopProgressTimer() {
    if (progressTimer.current) {
      clearInterval(progressTimer.current)
      progressTimer.current = null
    }
  }

  function startProgressTimer(enableWebSearch: boolean) {
    stopProgressTimer()
    let stepIndex = 0
    const steps = enableWebSearch ? GENERATION_STEPS : GENERATION_STEPS_NO_SEARCH
    setProgress(0)
    setProgressLabel(steps[0].label)

    progressTimer.current = setInterval(() => {
      setProgress((prev) => {
        const cap = steps[stepIndex]?.until ?? 94
        const next = Math.min(cap, prev + 1.8)
        if (next >= cap && stepIndex < steps.length - 1) {
          stepIndex += 1
          setProgressLabel(steps[stepIndex].label)
        }
        return next
      })
    }, 280)
  }

  async function generate(options: {
    prompt: string
    contextFile?: File | null
    enableWebSearch?: boolean
    refine?: boolean
    forceGenerate?: boolean
  }) {
    if (!metadata.mineralName) {
      setError('Select a map layer in step 1 before generating.')
      return null
    }

    const forceGenerate = options.forceGenerate === true
    const refine = !forceGenerate && options.refine === true

    const prompt =
      options.prompt.trim() ||
      'Draft a comprehensive 3-5 page geological prospectivity report covering all standard sections (geological setting, mineral potential, exploration, risks, and recommendations).'

    setLoading(true)
    setError(null)
    const enableWebSearch = options.enableWebSearch ?? true
    startProgressTimer(enableWebSearch)

    const history = refine ? messages : []
    if (refine) {
      setMessages([...history, { role: 'user', content: prompt }])
    } else {
      setMessages([{ role: 'user', content: prompt }])
    }

    const { body, findings } = splitReportDocument(metadata.currentExecutiveSummary)
    const findingsPlain = findings || htmlToFindingsText(metadata.currentKeyFindings)

    const fd = new FormData()
    fd.append('title', metadata.title)
    fd.append('mineral_name', metadata.mineralName)
    fd.append('region_name', metadata.regionName)
    fd.append('description', metadata.description)
    fd.append('context_text', '')
    fd.append('instruction', prompt)
    fd.append('enable_web_search', enableWebSearch ? 'true' : 'false')
    fd.append('current_executive_summary', forceGenerate ? '' : body)
    fd.append('current_key_findings', forceGenerate ? '' : findingsPlain)
    fd.append('messages', JSON.stringify(refine ? history : []))
    if (options.contextFile) {
      fd.append('context_file', options.contextFile)
    }

    try {
      const { data } = await reportsApi.adminAiAssist(fd)
      const webSearch = data.web_search

      if (enableWebSearch && webSearch?.requested && !webSearch?.used) {
        toast.warning('No web sources added', {
          description:
            webSearch.warning ||
            'Web search did not return citable sources. References were not appended to the draft.',
        })
      }

      const rawSummary = stripLeakedJson(data.executive_summary || '')
      const draft: ReportAiDraft = {
        executiveSummary: normalizeBody(rawSummary),
        keyFindings: normalizeFindings(data.key_findings),
        modelUsed: data.model_used,
        assistantReply: stripLeakedJson(data.assistant_reply || '') || 'Draft ready for your review.',
      }

      const validationError = validateDraftLength(
        rawSummary,
        draft.executiveSummary,
        draft.keyFindings.length,
        refine,
        draft.modelUsed || 'unknown model',
      )
      if (validationError) {
        setError(validationError)
        setProgress(0)
        setProgressLabel('')
        return null
      }

      setLastDraft(draft)
      setMessages((prev) => [...prev, { role: 'assistant', content: draft.assistantReply }])
      setProgress(100)
      setProgressLabel('Draft ready')
      return {
        executiveSummary: draft.executiveSummary,
        keyFindings: findingsToText(draft.keyFindings),
      }
    } catch (err) {
      setError(formatAiAssistError(err))
      setProgress(0)
      setProgressLabel('')
      return null
    } finally {
      stopProgressTimer()
      setLoading(false)
    }
  }

  function reset() {
    stopProgressTimer()
    setMessages([])
    setLastDraft(null)
    setError(null)
    setProgress(0)
    setProgressLabel('')
  }

  return { generate, loading, progress, progressLabel, error, messages, lastDraft, reset, setError }
}
