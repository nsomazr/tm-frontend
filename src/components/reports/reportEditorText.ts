export type LayerRegionRef = {
  regionId: number | null
  regionName: string | null
}

export function boundaryMatchesLayerRegions(
  boundary: {
    id: number
    name: string
    level: number
    parentId: number | null
    regionId: number | null
  },
  byId: Map<
    number,
    {
      id: number
      name: string
      level: number
      parentId: number | null
      regionId: number | null
    }
  >,
  layerRegions: LayerRegionRef[]
) {
  if (!layerRegions.length) return true

  const hasRegionData = layerRegions.some(
    (row) => row.regionId != null || Boolean(row.regionName?.trim())
  )
  if (!hasRegionData) return true

  const regionIds = new Set(
    layerRegions.map((row) => row.regionId).filter((id): id is number => id != null)
  )
  const regionNames = new Set(
    layerRegions
      .map((row) => row.regionName?.trim().toLowerCase())
      .filter(Boolean) as string[]
  )

  if (boundary.regionId != null && regionIds.has(boundary.regionId)) return true
  if (regionIds.has(boundary.id)) return true

  let current: typeof boundary | undefined = boundary
  while (current) {
    if (current.level === 1 && regionNames.has(current.name.toLowerCase())) return true
    if (regionIds.has(current.id)) return true
    current = current.parentId ? byId.get(current.parentId) : undefined
  }

  return false
}

export function activeLayerRegions(layerRegions: LayerRegionRef[]) {
  return layerRegions.filter((row) => row.regionId != null || Boolean(row.regionName?.trim()))
}

export function buildLocationSuggestions(
  boundaries: {
    id: number
    name: string
    level: number
  }[],
  selectedIds: Set<number>,
  limit = 16
) {
  return [...boundaries]
    .sort((a, b) => {
      const aSelected = selectedIds.has(a.id) ? 1 : 0
      const bSelected = selectedIds.has(b.id) ? 1 : 0
      if (aSelected !== bSelected) return aSelected - bSelected
      if (a.level !== b.level) return a.level - b.level
      return a.name.localeCompare(b.name)
    })
    .slice(0, limit)
}

export function regionBoundaryIdsForLayers(
  boundaries: {
    id: number
    name: string
    level: number
    parentId: number | null
    regionId: number | null
  }[],
  layerRegions: LayerRegionRef[]
) {
  const ids: number[] = []
  for (const ref of layerRegions) {
    const match =
      boundaries.find(
        (row) =>
          row.level === 1 &&
          ref.regionId != null &&
          (row.id === ref.regionId || row.regionId === ref.regionId)
      ) ??
      boundaries.find(
        (row) =>
          row.level === 1 &&
          ref.regionName &&
          row.name.toLowerCase() === ref.regionName.toLowerCase()
      )
    if (match && !ids.includes(match.id)) ids.push(match.id)
  }
  return ids
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function looksLikeHtml(text: string) {
  return /<\/?[a-z][\s\S]*>/i.test(text)
}

const REPORT_HTML_TAGS = new Set(['h2', 'h3', 'p', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'br'])

export function sanitizeReportHtml(html: string) {
  if (!html.trim()) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')

  function clean(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent ?? ''
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return ''
    const el = node as HTMLElement
    const tag = el.tagName.toLowerCase()
    if (!REPORT_HTML_TAGS.has(tag)) {
      return Array.from(el.childNodes).map(clean).join('')
    }
    const inner = Array.from(el.childNodes).map(clean).join('')
    if (tag === 'br') return '<br>'
    return `<${tag}>${inner}</${tag}>`
  }

  return Array.from(doc.body.childNodes).map(clean).join('')
}

export function reportPreviewText(text: string, maxLength = 200) {
  const plain = htmlToPlainText(text) || stripLeakedJson(text)
  const trimmed = plain.trim()
  if (!trimmed) return ''
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength)}…` : trimmed
}

const REPORT_SECTION_HEADINGS = [
  'Executive Summary',
  'Regional Geological Setting',
  'Mineral Potential and Deposit Types',
  'Exploration History and Opportunities',
  'Infrastructure, Access, and Jurisdiction',
  'Risk Factors and Data Limitations',
  'Recommendations and Next Steps',
] as const

const SECTION_HEADING_SET = new Set<string>(REPORT_SECTION_HEADINGS)

/** Remove JSON field leakage when model output is truncated or malformed. */
export function stripLeakedJson(text: string) {
  let result = text.trim()
  if (!result) return ''

  if (result.startsWith('{') || result.includes('"executive_summary"')) {
    const summaryMatch = result.match(/"executive_summary"\s*:\s*"((?:[^"\\]|\\.)*)"/s)
    if (summaryMatch) {
      try {
        result = JSON.parse(`"${summaryMatch[1]}"`)
      } catch {
        result = summaryMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')
      }
    }
  }

  result = result.replace(/",?\s*"key_findings"\s*:\s*\[[\s\S]*$/i, '')
  result = result.replace(/",?\s*"assistant_reply"\s*:\s*"[\s\S]*$/i, '')
  result = result.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t')
  return result.trim()
}

/** Turn AI plain-text report into structured HTML with section headings. */
export function formatReportPlainToHtml(text: string) {
  const cleaned = stripLeakedJson(text)
  if (!cleaned) return ''
  if (looksLikeHtml(cleaned)) return cleaned

  const parts: string[] = []
  const lines = cleaned.split('\n')
  let paragraphLines: string[] = []

  function flushParagraph() {
    if (!paragraphLines.length) return
    const block = paragraphLines.join('\n').trim()
    if (block) {
      parts.push(`<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    }
    paragraphLines = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      flushParagraph()
      continue
    }
    const normalized = line.replace(/^#+\s*/, '')
    if (SECTION_HEADING_SET.has(normalized)) {
      flushParagraph()
      parts.push(`<h2>${escapeHtml(normalized)}</h2>`)
      continue
    }
    paragraphLines.push(line)
  }
  flushParagraph()

  return parts.join('') || plainTextToHtml(cleaned)
}

export function reportWordCount(text: string) {
  const plain = htmlToPlainText(text) || stripLeakedJson(text)
  return plain.trim() ? plain.trim().split(/\s+/).length : 0
}

export function reportFindingsCount(text: string) {
  const { findings } = splitReportDocument(text)
  const plain = findings || htmlToFindingsText(text) || text
  return plain
    .split('\n')
    .map((line) => line.trim().replace(/^[-•]\s*/, ''))
    .filter(Boolean).length
}

export function appendFindingsSection(bodyHtml: string, findingsText: string) {
  const items = findingsText
    .split('\n')
    .map((line) => line.trim().replace(/^[-•]\s*/, ''))
    .filter(Boolean)
  if (!items.length) return bodyHtml
  const findingsHtml = findingsTextToHtml(items.join('\n'))
  const section = `<h2>Key Findings</h2>${findingsHtml}`
  const trimmed = bodyHtml.trim()
  return trimmed ? `${trimmed}${section}` : section
}

export function mergeReportDocument(executiveSummary: string, keyFindings: string) {
  if (!keyFindings.trim()) return executiveSummary
  const plain = htmlToPlainText(executiveSummary)
  if (/key findings/i.test(plain)) return executiveSummary
  return appendFindingsSection(executiveSummary, keyFindings)
}

export function splitReportDocument(html: string) {
  if (!html.trim()) return { body: '', findings: '' }
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const children = Array.from(doc.body.childNodes)
  let splitIndex = -1

  for (let i = 0; i < children.length; i++) {
    const node = children[i]
    if (node.nodeType !== Node.ELEMENT_NODE) continue
    const el = node as HTMLElement
    const tag = el.tagName.toLowerCase()
    const text = el.textContent?.trim() ?? ''
    if ((tag === 'h2' || tag === 'h3') && /^key findings$/i.test(text)) {
      splitIndex = i
      break
    }
  }

  if (splitIndex === -1) return { body: html, findings: '' }

  const bodyDiv = document.createElement('div')
  const findingsDiv = document.createElement('div')
  children.slice(0, splitIndex).forEach((node) => bodyDiv.appendChild(node.cloneNode(true)))
  children.slice(splitIndex + 1).forEach((node) => findingsDiv.appendChild(node.cloneNode(true)))

  return {
    body: bodyDiv.innerHTML.trim(),
    findings: htmlToFindingsText(findingsDiv.innerHTML),
  }
}

export function plainTextToHtml(text: string) {
  if (!text.trim()) return ''
  if (looksLikeHtml(text)) return text
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

export function htmlToPlainText(html: string) {
  if (!html.trim()) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const blocks: string[] = []

  for (const node of Array.from(doc.body.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const value = node.textContent?.trim()
      if (value) blocks.push(value)
      continue
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue
    const el = node as HTMLElement
    const tag = el.tagName.toLowerCase()
    if (tag === 'ul' || tag === 'ol') {
      for (const li of Array.from(el.querySelectorAll('li'))) {
        const line = li.textContent?.trim()
        if (line) blocks.push(line)
      }
      continue
    }
    const value = el.textContent?.trim()
    if (value) blocks.push(value)
  }

  if (!blocks.length) return doc.body.textContent?.trim() ?? ''
  return blocks.join('\n\n')
}

export function findingsTextToHtml(text: string) {
  if (!text.trim()) return ''
  if (looksLikeHtml(text)) return text
  const items = text
    .split('\n')
    .map((line) => line.trim().replace(/^[-•]\s*/, ''))
    .filter(Boolean)
  if (!items.length) return ''
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
}

export function htmlToFindingsText(html: string) {
  if (!html.trim()) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const items = Array.from(doc.querySelectorAll('li'))
    .map((li) => li.textContent?.trim())
    .filter(Boolean) as string[]
  if (items.length) return items.join('\n')
  return htmlToPlainText(html)
    .split('\n')
    .map((line) => line.trim().replace(/^[-•]\s*/, ''))
    .filter(Boolean)
    .join('\n')
}
