import { useEffect, useRef, useState } from 'react'
import ReportFullEditor from './ReportFullEditor'
import { appendFindingsSection, reportWordCount } from './reportEditorText'
import ReportGenerationProgress from './ReportGenerationProgress'
import ReportPromptDock from './ReportPromptDock'
import type { ReportWritingMetadata } from './ReportAssistantPanel'
import { useReportAiDraft } from './useReportAiDraft'

const CONTEXT_ACCEPT = '.pdf,.docx,.txt,.md,.csv'

interface ReportContentWorkflowProps {
  title: string
  onTitleChange: (value: string) => void
  executiveSummary: string
  onExecutiveSummaryChange: (value: string) => void
  assistantMetadata: ReportWritingMetadata
  assistantDisabled?: boolean
  contentApproved: boolean
  onContentApprovedChange: (approved: boolean) => void
}

function hasDraftContent(executiveSummary: string) {
  return executiveSummary.trim().length > 0
}

function cleanRegionLabel(name: string) {
  const trimmed = name.trim()
  const duplicate = trimmed.match(/^(.+?)\s*\(\1\)\s*$/i)
  if (duplicate) return duplicate[1].trim()
  return trimmed
}

function contextLine(metadata: ReportWritingMetadata) {
  const mineral = metadata.mineralName?.trim()
  const region = metadata.regionName ? cleanRegionLabel(metadata.regionName) : ''
  return [mineral, region].filter(Boolean).join(' · ')
}

function suggestedTitleFromPrompt(prompt: string, metadata: ReportWritingMetadata) {
  const line = prompt.trim().split(/\n/)[0]?.trim() ?? ''
  if (!line) return null

  const isGeneric =
    line.length < 20 ||
    /^(describe|write|draft|generate|create|make|report|summarize|explain|full|focus|emphasize)\b/i.test(line) ||
    /\b(this layer|3.?5 page|deposit types|exploration)\b/i.test(line)

  if (isGeneric) {
    const mineral = metadata.mineralName?.trim()
    const region = metadata.regionName ? cleanRegionLabel(metadata.regionName) : ''
    if (mineral && region) return `${mineral} — ${region} prospectivity report`
    if (mineral) return `${mineral} prospectivity report`
    if (region) return `${region} prospectivity report`
    return null
  }

  return line.slice(0, 120)
}

function defaultTitlePlaceholder(metadata: ReportWritingMetadata) {
  const mineral = metadata.mineralName?.trim()
  const region = metadata.regionName ? cleanRegionLabel(metadata.regionName) : ''
  if (mineral && region) return `${mineral} — ${region} prospectivity report`
  if (mineral) return `${mineral} prospectivity report`
  return 'Prospectivity report title'
}

export default function ReportContentWorkflow({
  title,
  onTitleChange,
  executiveSummary,
  onExecutiveSummaryChange,
  assistantMetadata,
  assistantDisabled = false,
  contentApproved,
  onContentApprovedChange,
}: ReportContentWorkflowProps) {
  const hasContent = hasDraftContent(executiveSummary)
  const [prompt, setPrompt] = useState('')
  const [contextFile, setContextFile] = useState<File | null>(null)
  const [refinePrompt, setRefinePrompt] = useState('')

  const { generate, loading, progress, progressLabel, error, setError } = useReportAiDraft(assistantMetadata)
  const prevContentRef = useRef(executiveSummary)
  const context = contextLine(assistantMetadata)
  const words = reportWordCount(executiveSummary)
  const titlePlaceholder = defaultTitlePlaceholder(assistantMetadata)

  useEffect(() => {
    const changed = prevContentRef.current !== executiveSummary
    prevContentRef.current = executiveSummary
    if (changed && contentApproved) {
      onContentApprovedChange(false)
    }
  }, [executiveSummary, contentApproved, onContentApprovedChange])

  async function handleGenerate(refine = false) {
    const applied = await generate({
      prompt: refine ? refinePrompt : prompt,
      contextFile: refine ? null : contextFile,
      refine,
    })
    if (!applied) return

    const merged = appendFindingsSection(applied.executiveSummary, applied.keyFindings)
    onExecutiveSummaryChange(merged)
    if (!title.trim() && !refine && prompt.trim()) {
      const suggested = suggestedTitleFromPrompt(prompt, assistantMetadata)
      if (suggested) onTitleChange(suggested)
    } else if (!title.trim() && !refine) {
      onTitleChange(titlePlaceholder)
    }
    if (refine) setRefinePrompt('')
    else setPrompt('')
  }

  function handleApprove() {
    if (!title.trim()) {
      setError('Add a report title before approving.')
      return
    }
    if (!hasContent) {
      setError('Generate or write report content before approving.')
      return
    }
    setError(null)
    onContentApprovedChange(true)
  }

  return (
    <section className="report-workflow report-workflow--unified">
      {loading && (
        <div className="report-workflow__progress">
          <ReportGenerationProgress progress={progress} label={progressLabel || 'Generating report…'} />
        </div>
      )}

      <ReportFullEditor
        title={title}
        titlePlaceholder={titlePlaceholder}
        contextLine={context}
        onTitleChange={onTitleChange}
        executiveSummary={executiveSummary}
        onExecutiveSummaryChange={onExecutiveSummaryChange}
        generating={loading}
        words={words}
        approved={contentApproved}
        empty={!hasContent}
      />

      <ReportPromptDock
        mode={hasContent ? 'refine' : 'generate'}
        value={hasContent ? refinePrompt : prompt}
        onChange={hasContent ? setRefinePrompt : setPrompt}
        onSubmit={() => void handleGenerate(hasContent)}
        onApprove={handleApprove}
        loading={loading}
        disabled={assistantDisabled}
        canSubmit={!assistantDisabled}
        canApprove={hasContent && Boolean(title.trim())}
        showApprove={hasContent && !contentApproved}
        error={error}
        file={hasContent ? undefined : contextFile}
        onFileChange={hasContent ? undefined : setContextFile}
        accept={CONTEXT_ACCEPT}
      />
    </section>
  )
}
