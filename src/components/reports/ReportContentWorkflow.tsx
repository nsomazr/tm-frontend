import { useEffect, useRef, useState } from 'react'
import ReportDraftPreview from './ReportDraftPreview'
import ReportFullEditor from './ReportFullEditor'
import ReportStageBar, { type ReportStageView } from './ReportStageBar'
import type { ReportContentMode } from './ReportContentModeTabs'
import { mergeReportDocument, hasSubstantiveDraftContent, isDraftEffectivelyEmpty, isFullRegeneratePrompt, stripAiReportPreamble, stripMarkdownHorizontalRulesFromHtml } from './reportEditorText'
import { stripReportChangeHighlights } from './reportEditorChanges'
import ReportGenerationProgress from './ReportGenerationProgress'
import ReportPromptDock from './ReportPromptDock'
import type { ReportWritingMetadata } from './ReportAssistantPanel'
import { useReportAiDraft } from './useReportAiDraft'

const CONTEXT_ACCEPT = '.pdf,.docx,.txt,.md,.csv'

type ContentView = ReportStageView

interface ReportContentWorkflowProps {
  title: string
  onTitleChange: (value: string) => void
  executiveSummary: string
  onExecutiveSummaryChange: (value: string) => void
  assistantMetadata: ReportWritingMetadata
  assistantDisabled?: boolean
  contentApproved: boolean
  onContentApprovedChange: (approved: boolean) => void
  contentMode?: ReportContentMode
  onContentModeChange?: (mode: ReportContentMode) => void
}

function hasDraftContent(executiveSummary: string) {
  return hasSubstantiveDraftContent(executiveSummary)
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
    if (mineral && region) return `${mineral}: ${region} prospectivity report`
    if (mineral) return `${mineral} prospectivity report`
    if (region) return `${region} prospectivity report`
    return null
  }

  return line.slice(0, 120)
}

function defaultTitlePlaceholder(metadata: ReportWritingMetadata) {
  const mineral = metadata.mineralName?.trim()
  const region = metadata.regionName ? cleanRegionLabel(metadata.regionName) : ''
  if (mineral && region) return `${mineral}: ${region} prospectivity report`
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
  contentMode,
  onContentModeChange,
}: ReportContentWorkflowProps) {
  const hasContent = hasDraftContent(executiveSummary)
  const [prompt, setPrompt] = useState('')
  const [contextFile, setContextFile] = useState<File | null>(null)
  const [enableWebSearch, setEnableWebSearch] = useState(true)
  const [refinePrompt, setRefinePrompt] = useState('')
  const [view, setView] = useState<ContentView>('edit')

  const { generate, loading, progress, progressLabel, error, setError } = useReportAiDraft(assistantMetadata)
  const prevContentRef = useRef(executiveSummary)
  const context = contextLine(assistantMetadata)
  const titlePlaceholder = defaultTitlePlaceholder(assistantMetadata)

  useEffect(() => {
    const changed = prevContentRef.current !== executiveSummary
    prevContentRef.current = executiveSummary
    if (changed && contentApproved) {
      onContentApprovedChange(false)
    }
  }, [executiveSummary, contentApproved, onContentApprovedChange])

  useEffect(() => {
    let next = stripReportChangeHighlights(executiveSummary)
    next = stripAiReportPreamble(next)
    next = stripMarkdownHorizontalRulesFromHtml(next)
    if (next !== executiveSummary) {
      onExecutiveSummaryChange(next)
    }
  }, [executiveSummary, onExecutiveSummaryChange])

  async function handleGenerate(refine = false) {
    const activePrompt = refine ? refinePrompt : prompt
    const forceGenerate =
      isFullRegeneratePrompt(activePrompt) ||
      isDraftEffectivelyEmpty(executiveSummary)
    const useRefine = refine && hasContent && !forceGenerate

    const applied = await generate({
      prompt: activePrompt,
      contextFile,
      enableWebSearch,
      refine: useRefine,
      forceGenerate,
    })
    if (!applied) return

    const merged = stripAiReportPreamble(
      stripReportChangeHighlights(
        mergeReportDocument(applied.executiveSummary, applied.keyFindings),
      ),
    )
    onExecutiveSummaryChange(merged)

    if (!title.trim() && !useRefine && prompt.trim()) {
      const suggested = suggestedTitleFromPrompt(prompt, assistantMetadata)
      if (suggested) onTitleChange(suggested)
    } else if (!title.trim() && !useRefine) {
      onTitleChange(titlePlaceholder)
    }
    if (useRefine) setRefinePrompt('')
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
    <section className="report-editor-workspace">
      {loading && (
        <div className="report-workflow__progress">
          <ReportGenerationProgress progress={progress} label={progressLabel || 'Generating report…'} />
        </div>
      )}

      {(hasContent || onContentModeChange) && (
        <ReportStageBar
          view={view}
          onViewChange={setView}
          contextLine={context}
          contentMode={contentMode}
          onContentModeChange={onContentModeChange}
          showViewToggle={hasContent}
        />
      )}

      <div className="report-editor-workspace__body">
        <div className="report-content-stage">
          {view === 'edit' ? (
            <ReportFullEditor
              title={title}
              titlePlaceholder={titlePlaceholder}
              onTitleChange={onTitleChange}
              executiveSummary={executiveSummary}
              onExecutiveSummaryChange={onExecutiveSummaryChange}
              generating={loading}
              empty={!hasContent}
              hideToolbar={hasContent}
              fitWorkspace
            />
          ) : (
            <ReportDraftPreview
              title={title}
              contextLine={context}
              executiveSummary={executiveSummary}
              approved={contentApproved}
              canApprove={hasContent && Boolean(title.trim())}
              approveError={error}
              loading={loading}
              onApprove={handleApprove}
            />
          )}
        </div>
      </div>

      {view === 'edit' && (
        <div className="report-editor-workspace__dock">
          <ReportPromptDock
            mode={hasContent ? 'refine' : 'generate'}
            value={hasContent ? refinePrompt : prompt}
            onChange={hasContent ? setRefinePrompt : setPrompt}
            onSubmit={() => void handleGenerate(hasContent)}
            loading={loading}
            disabled={assistantDisabled}
            canSubmit={!assistantDisabled}
            error={view === 'edit' ? error : null}
            file={contextFile}
            onFileChange={setContextFile}
            accept={CONTEXT_ACCEPT}
            enableWebSearch={enableWebSearch}
            onEnableWebSearchChange={setEnableWebSearch}
          />
        </div>
      )}
    </section>
  )
}
