export type LayerRegionRef = {
  regionId: number | null
  regionName: string | null
}

export type LayerBoundaryCoverageRef = {
  region_ids: number[]
  district_ids: number[]
  ward_ids: number[]
  village_ids: number[]
  feature_count: number
  bounds: { west: number; south: number; east: number; north: number } | null
  center: { lat: number; lng: number } | null
}

type BoundaryRow = {
  id: number
  name: string
  level: number
  parentId: number | null
  regionId: number | null
  centerLat?: number | null
  centerLng?: number | null
}

function boundaryWithinSeeds(
  boundary: BoundaryRow,
  seedIds: Set<number>,
  byId: Map<number, BoundaryRow>
) {
  let current: BoundaryRow | undefined = boundary
  while (current) {
    if (seedIds.has(current.id)) return true
    current = current.parentId ? byId.get(current.parentId) : undefined
  }
  return false
}

export function expandCoverageBoundaryIds(
  allBoundaries: BoundaryRow[],
  coverage: LayerBoundaryCoverageRef,
  byId: Map<number, BoundaryRow>
) {
  const seedIds = new Set<number>([
    ...coverage.region_ids,
    ...coverage.district_ids,
    ...coverage.ward_ids,
    ...coverage.village_ids,
  ])
  if (!seedIds.size) return new Set<number>()

  const allowed = new Set<number>()
  for (const id of seedIds) {
    allowed.add(id)
    let current = byId.get(id)
    while (current?.parentId) {
      allowed.add(current.parentId)
      current = byId.get(current.parentId)
    }
  }
  for (const row of allBoundaries) {
    if (boundaryWithinSeeds(row, seedIds, byId)) allowed.add(row.id)
  }
  return allowed
}

export function boundariesForLayerCoverage<T extends BoundaryRow>(
  allBoundaries: T[],
  coverage: LayerBoundaryCoverageRef | null | undefined,
  byId: Map<number, T>,
  layerRegions: LayerRegionRef[]
): T[] {
  if (coverage && coverage.feature_count > 0) {
    const allowed = expandCoverageBoundaryIds(allBoundaries, coverage, byId)
    if (allowed.size) return allBoundaries.filter((row) => allowed.has(row.id))
  }

  if (coverage?.region_ids.length) {
    const allowed = expandCoverageBoundaryIds(allBoundaries, coverage, byId)
    if (allowed.size) return allBoundaries.filter((row) => allowed.has(row.id))
  }

  if (!layerRegions.length) return []
  const activeRegions = activeLayerRegions(layerRegions)
  if (activeRegions.length) {
    return allBoundaries.filter((row) => boundaryMatchesLayerRegions(row, byId, activeRegions))
  }
  return []
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

export function normalizeReportTypography(text: string) {
  return text
    .replace(/\u2014/g, ', ')
    .replace(/\u2013/g, '-')
    .replace(/,\s+,/g, ', ')
}

export function looksLikeHtml(text: string) {
  return /<\/?[a-z][\s\S]*>/i.test(text)
}

const REPORT_HTML_TAGS = new Set([
  'h2',
  'h3',
  'p',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'del',
  'ul',
  'ol',
  'li',
  'br',
  'blockquote',
  'hr',
  'a',
  'font',
  'span',
  'figure',
  'img',
  'mark',
  'div',
])

const REPORT_IMG_SRC = /^(https?:\/\/|data:image\/)/i
const TEXT_ALIGN_VALUES = new Set(['left', 'center', 'right', 'justify'])
const TEXT_ALIGN_TAGS = new Set(['p', 'h2', 'h3', 'blockquote', 'li'])

function readTextAlign(el: HTMLElement) {
  const styleAlign = el.style?.textAlign?.trim().toLowerCase()
  if (styleAlign && TEXT_ALIGN_VALUES.has(styleAlign)) return styleAlign
  const align = el.getAttribute('align')?.trim().toLowerCase()
  if (align && TEXT_ALIGN_VALUES.has(align)) return align
  return ''
}

function textAlignStyleAttr(align: string) {
  return align ? ` style="text-align: ${align}"` : ''
}

export function sanitizeReportHtml(html: string) {
  if (!html.trim()) return ''
  html = stripMarkdownHorizontalRulesFromHtml(normalizeMarkdownInHtml(html))
  const doc = new DOMParser().parseFromString(html, 'text/html')

  function clean(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeHtml(normalizeReportTypography(node.textContent ?? ''))
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return ''
    const el = node as HTMLElement
    const tag = el.tagName.toLowerCase()

    if (tag === 'br') return '<br>'
    if (tag === 'hr') return '<hr>'

    if (tag === 'p') {
      const textOnly = (el.textContent ?? '').trim()
      if (isMarkdownHorizontalRule(textOnly)) return ''
    }

    if (!REPORT_HTML_TAGS.has(tag)) {
      return Array.from(el.childNodes).map(clean).join('')
    }

    const inner = Array.from(el.childNodes).map(clean).join('')

    if (tag === 'a') {
      const href = el.getAttribute('href')?.trim()
      if (!href || !/^https?:\/\//i.test(href)) return inner
      return `<a href="${href.replace(/"/g, '&quot;')}" rel="noopener noreferrer">${inner}</a>`
    }
    if (tag === 'font') {
      const color = el.getAttribute('color')?.trim()
      return color ? `<font color="${color.replace(/"/g, '')}">${inner}</font>` : inner
    }
    if (tag === 'span') {
      const color = el.style?.color?.trim()
      return color ? `<span style="color: ${color.replace(/"/g, '')}">${inner}</span>` : inner
    }
    if (tag === 'img') {
      const src = el.getAttribute('src')?.trim()
      if (!src || !REPORT_IMG_SRC.test(src)) return ''
      const alt = el.getAttribute('alt')?.trim() ?? ''
      const safeAlt = alt.replace(/"/g, '&quot;')
      const safeSrc = src.replace(/"/g, '&quot;')
      return `<img src="${safeSrc}" alt="${safeAlt}">`
    }
    if (tag === 'figure') {
      const className = el.className
        .split(/\s+/)
        .filter((name) => name.startsWith('report-editor-figure'))
        .join(' ')
      const attrs = className ? ` class="${className.replace(/"/g, '')}"` : ''
      return `<figure${attrs}>${inner}</figure>`
    }
    if (tag === 'mark') {
      const className = el.className
        .split(/\s+/)
        .filter((name) => name === 'report-editor-change')
        .join(' ')
      if (!className) return inner
      return `<mark class="${className}">${inner}</mark>`
    }
    if (tag === 'div') {
      const className = el.className
        .split(/\s+/)
        .filter((name) => name === 'report-editor-change-block')
        .join(' ')
      if (className) return `<div class="${className}">${inner}</div>`
      const align = readTextAlign(el)
      if (align) return `<p${textAlignStyleAttr(align)}>${inner}</p>`
      return inner
    }

    if (TEXT_ALIGN_TAGS.has(tag)) {
      const align = readTextAlign(el)
      return `<${tag}${textAlignStyleAttr(align)}>${inner}</${tag}>`
    }

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
  'References and Sources',
] as const

export const REPORT_SECTION_TITLES: readonly string[] = REPORT_SECTION_HEADINGS

const SECTION_HEADING_SET = new Set<string>(REPORT_SECTION_HEADINGS)

function unwrapMarkdownHeadingLine(line: string) {
  let text = line.trim().replace(/^#+\s*/, '')
  text = text.replace(/^\d+[.)]\s+/, '')
  const boldWrapped = text.match(/^\*\*(.+?)\*\*:?\s*$/)
  if (boldWrapped) text = boldWrapped[1].trim()
  return text
}

function matchReportSectionHeading(line: string): string | null {
  const normalized = unwrapMarkdownHeadingLine(line)
  if (SECTION_HEADING_SET.has(normalized)) return normalized
  const lower = normalized.toLowerCase()
  for (const heading of REPORT_SECTION_HEADINGS) {
    if (heading.toLowerCase() === lower) return heading
  }
  if (looksLikeCustomSectionHeading(normalized)) return normalized
  return null
}

function looksLikeCustomSectionHeading(text: string): boolean {
  const normalized = text.trim()
  if (!normalized || normalized.length >= 80 || !/\s/.test(normalized)) return false
  if (/^references\b/i.test(normalized)) return true
  if (normalized === normalized.toUpperCase() && normalized.length > 5) return true
  const words = normalized.split(/\s+/).filter(Boolean)
  if (words.length < 2) return false
  const titleLike = words.filter(
    (word) => word[0] === word[0]?.toUpperCase() && word.slice(1) === word.slice(1).toLowerCase(),
  ).length
  return titleLike >= Math.ceil(words.length * 0.8)
}

export function isCitationLikeFinding(text: string): boolean {
  const stripped = text.trim()
  if (!stripped) return true
  const lower = stripped.toLowerCase()
  if (/https?:\/\//i.test(stripped)) return true
  if (/^\[pdf\]/i.test(stripped)) return true
  if (/\.(pdf|docx)\b/i.test(stripped)) return true
  if (/\s[-–—]\s*https?:\/\//i.test(stripped)) return true
  if (/^".+"\s*$/.test(stripped)) return true
  if (stripped.endsWith('...')) return true
  if (/:\s*a review\s*$/i.test(stripped)) return true
  if (
    /\b(overview of deposits|prospecting in .+ using|mineral resource update|booklet final|technical report summary)\b/i.test(
      lower,
    )
  ) {
    return true
  }
  if (/\busing\s+\.\.\./i.test(lower)) return true
  if (
    stripped.length > 100 &&
    /\b(report|study|review|overview of|technical report)\b/i.test(lower) &&
    !/\b(should|recommend|risk|potential|drill|exploration|reserve|grade|camp|objective|recovery)\b/i.test(
      lower,
    )
  ) {
    return true
  }
  return false
}

export function filterReportFindings(items: string[]): string[] {
  return items.map((item) => item.trim()).filter((item) => item && !isCitationLikeFinding(item))
}

export function filterReportFindingsText(text: string): string {
  const items = text
    .split('\n')
    .map((line) => line.trim().replace(/^[-•]\s*/, ''))
    .filter(Boolean)
  return filterReportFindings(items).join('\n')
}

function formatInlineMarkdown(text: string) {
  let result = ''
  const pattern = /\*\*(.+?)\*\*/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    result += escapeHtml(text.slice(lastIndex, match.index))
    result += `<strong>${escapeHtml(match[1])}</strong>`
    lastIndex = pattern.lastIndex
  }
  result += escapeHtml(text.slice(lastIndex))
  return result
}

const MARKDOWN_BULLET_RE = /^[-•*]\s+/
const MARKDOWN_HORIZONTAL_RULE_RE = /^[-*_]{3,}\s*$/

function stripMarkdownBullet(line: string) {
  return line.replace(MARKDOWN_BULLET_RE, '')
}

function isMarkdownHorizontalRule(line: string) {
  return MARKDOWN_HORIZONTAL_RULE_RE.test(line.trim())
}

/** Drop markdown `---` / `***` divider lines saved as HTML paragraphs. */
export function stripMarkdownHorizontalRulesFromHtml(html: string) {
  if (!html.trim()) return html
  return html
    .replace(/<p>\s*[-*_]{3,}\s*<\/p>/gi, '')
    .replace(/<br\s*\/?>\s*[-*_]{3,}\s*(?=<br\s*\/?>|$)/gi, '')
    .replace(/[-*_]{3,}\s*<br\s*\/?>/gi, '')
}

/** Convert leftover `**bold**` markdown inside stored HTML (e.g. AI key findings). */
export function normalizeMarkdownInHtml(html: string) {
  if (!html.trim() || !/\*\*.+?\*\*/.test(html)) return html
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
  const textNodes: Text[] = []
  let node: Node | null
  while ((node = walker.nextNode())) {
    const text = node.textContent ?? ''
    if (/\*\*.+?\*\*/.test(text)) textNodes.push(node as Text)
  }
  for (const textNode of textNodes) {
    const parent = textNode.parentElement
    if (!parent) continue
    const tag = parent.tagName.toLowerCase()
    if (tag === 'strong' || tag === 'b') continue
    const span = doc.createElement('span')
    span.innerHTML = formatInlineMarkdown(textNode.textContent ?? '')
    parent.replaceChild(span, textNode)
  }
  return doc.body.innerHTML
}

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

function stripAiReportPreambleHtml(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const children = Array.from(doc.body.childNodes)
  let startIndex = -1

  for (let i = 0; i < children.length; i++) {
    const node = children[i]
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement
      const tag = el.tagName.toLowerCase()
      if (tag === 'hr') continue
      const text = el.textContent?.trim() ?? ''
      if ((tag === 'h2' || tag === 'h3' || tag === 'p') && matchReportSectionHeading(text)) {
        startIndex = i
        break
      }
    }
  }

  if (startIndex <= 0) return html

  const wrapper = document.createElement('div')
  children.slice(startIndex).forEach((node) => wrapper.appendChild(node.cloneNode(true)))
  return wrapper.innerHTML.trim()
}

/** Remove assistant preamble ("Certainly! Below is…") before the first report section. */
export function plainWordCount(text: string) {
  const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return plain ? plain.split(' ').filter(Boolean).length : 0
}

export function stripAiReportPreamble(text: string) {
  const cleaned = text.trim()
  if (!cleaned) return ''
  const beforeWords = plainWordCount(cleaned)

  let stripped: string
  if (looksLikeHtml(cleaned)) {
    stripped = stripAiReportPreambleHtml(cleaned)
  } else {
    const lines = cleaned.split('\n')
    let startIndex = -1
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line || /^[-*_]{3,}\s*$/.test(line)) continue
      if (matchReportSectionHeading(line)) {
        startIndex = i
        break
      }
    }
    stripped = startIndex <= 0 ? cleaned : lines.slice(startIndex).join('\n').trim()
  }

  const afterWords = plainWordCount(stripped)
  if (beforeWords >= 80 && afterWords < Math.max(40, beforeWords * 0.25)) {
    return cleaned
  }
  return stripped
}

/** Turn AI plain-text report into structured HTML with section headings. */
export function formatReportPlainToHtml(text: string) {
  const cleaned = stripAiReportPreamble(stripLeakedJson(text))
  if (!cleaned) return ''
  if (looksLikeHtml(cleaned)) return normalizeMarkdownInHtml(stripAiReportPreambleHtml(cleaned))

  const parts: string[] = []
  const lines = cleaned.split('\n')
  let paragraphLines: string[] = []
  let listLines: string[] = []
  let referenceLines: string[] = []
  let inReferences = false
  let inKeyFindings = false

  function flushParagraph() {
    if (!paragraphLines.length) return
    const block = paragraphLines.join('\n').trim()
    if (block) {
      parts.push(`<p>${formatInlineMarkdown(block).replace(/\n/g, '<br>')}</p>`)
    }
    paragraphLines = []
  }

  function flushList() {
    if (!listLines.length) return
    const items = listLines
      .map((line) => stripMarkdownBullet(line))
      .filter((line) => line && (!inKeyFindings || inReferences || !isCitationLikeFinding(line)))
      .map((line) => `<li>${formatInlineMarkdown(line)}</li>`)
      .join('')
    if (!items) {
      listLines = []
      return
    }
    parts.push(`<ul>${items}</ul>`)
    listLines = []
  }

  function flushReferences() {
    if (!referenceLines.length) return
    const items = referenceLines
      .map((line) => {
        const match = line.match(/^(\d+)\.\s*(.+?)\s*[-–—]\s*(https?:\/\/\S+)\s*$/)
        if (!match) return `<li>${escapeHtml(line)}</li>`
        const title = match[2].trim()
        const url = match[3].trim()
        return `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(title)}</a></li>`
      })
      .join('')
    parts.push(`<ul>${items}</ul>`)
    referenceLines = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      if (inReferences) flushReferences()
      else {
        flushList()
        flushParagraph()
      }
      continue
    }
    if (isMarkdownHorizontalRule(line)) {
      flushList()
      flushParagraph()
      continue
    }
    const sectionTitle = matchReportSectionHeading(line)
    if (sectionTitle) {
      if (inReferences) {
        flushReferences()
        inReferences = false
      }
      flushList()
      flushParagraph()
      inKeyFindings = /^key findings$/i.test(sectionTitle)
      inReferences = /^references\b/i.test(sectionTitle)
      parts.push(`<h2>${escapeHtml(sectionTitle)}</h2>`)
      continue
    }
    if (inReferences && /^\d+\.\s/.test(line)) {
      referenceLines.push(line)
      continue
    }
    if (inReferences) {
      flushReferences()
      inReferences = false
    }
    if (MARKDOWN_BULLET_RE.test(line)) {
      flushParagraph()
      listLines.push(line)
      continue
    }
    flushList()
    paragraphLines.push(line)
  }
  if (inReferences) flushReferences()
  flushList()
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
  const items = filterReportFindings(
    findingsText
      .split('\n')
      .map((line) => line.trim().replace(/^[-•]\s*/, ''))
      .filter(Boolean),
  )
  if (!items.length) return bodyHtml
  const findingsHtml = findingsTextToHtml(items.join('\n'))
  const section = `<h2>Key Findings</h2>${findingsHtml}`
  const trimmed = bodyHtml.trim()
  return trimmed ? `${trimmed}${section}` : section
}

export function isReferencesHeading(text: string): boolean {
  return /^references\b/i.test((text || '').trim())
}

export function splitReferencesSection(html: string) {
  if (!html.trim()) return { body: '', references: '' }
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const children = Array.from(doc.body.childNodes)
  let splitIndex = -1

  for (let i = 0; i < children.length; i++) {
    const node = children[i]
    if (node.nodeType !== Node.ELEMENT_NODE) continue
    const el = node as HTMLElement
    const tag = el.tagName.toLowerCase()
    const text = el.textContent?.trim() ?? ''
    if ((tag === 'h2' || tag === 'h3') && isReferencesHeading(text)) {
      splitIndex = i
      break
    }
  }

  if (splitIndex === -1) return { body: html, references: '' }

  const bodyDiv = document.createElement('div')
  const refsDiv = document.createElement('div')
  children.slice(0, splitIndex).forEach((node) => bodyDiv.appendChild(node.cloneNode(true)))
  children.slice(splitIndex).forEach((node) => refsDiv.appendChild(node.cloneNode(true)))

  // Normalize heading label for consistent PDF/article detection.
  const first = refsDiv.querySelector('h2, h3')
  if (first && isReferencesHeading(first.textContent || '')) {
    first.textContent = 'References and Sources'
  }

  return {
    body: bodyDiv.innerHTML.trim(),
    references: refsDiv.innerHTML.trim(),
  }
}

/** Ensure Key Findings precedes References and Sources in the editor document. */
export function normalizeReportSectionOrder(html: string) {
  if (!html.trim()) return html
  const { body: beforeFindings, findings } = splitReportDocument(html)
  if (findings) {
    const { body: main, references } = splitReferencesSection(beforeFindings)
    const findingsHtml = `<h2>Key Findings</h2>${findingsTextToHtml(filterReportFindingsText(findings))}`
    return `${main}${findingsHtml}${references}`
  }
  const { body, references } = splitReferencesSection(html)
  return references ? `${body}${references}` : html
}

export function mergeReportDocument(executiveSummary: string, keyFindings: string) {
  const normalized = normalizeReportSectionOrder(executiveSummary)
  const filteredFindings = filterReportFindingsText(keyFindings)
  if (!filteredFindings.trim()) return normalized

  const plain = htmlToPlainText(normalized)
  if (/key findings/i.test(plain)) return normalized

  const { body, references } = splitReferencesSection(normalized)
  const withFindings = appendFindingsSection(body, filteredFindings)
  return references ? `${withFindings}${references}` : withFindings
}

export function splitReportDocument(html: string) {
  if (!html.trim()) return { body: '', findings: '', references: '' }
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

  if (splitIndex === -1) {
    const { body, references } = splitReferencesSection(html)
    return { body, findings: '', references }
  }

  const bodyDiv = document.createElement('div')
  const afterFindingsDiv = document.createElement('div')
  children.slice(0, splitIndex).forEach((node) => bodyDiv.appendChild(node.cloneNode(true)))
  children.slice(splitIndex + 1).forEach((node) => afterFindingsDiv.appendChild(node.cloneNode(true)))

  const { body: findingsOnly, references } = splitReferencesSection(afterFindingsDiv.innerHTML)
  const rawFindingLines = htmlToFindingsText(findingsOnly)
    .split('\n')
    .map((line) => line.trim().replace(/^[-•]\s*/, ''))
    .filter(Boolean)
  const findingsText = filterReportFindings(rawFindingLines).join('\n')
  const recoveredCitations = rawFindingLines.filter((line) => isCitationLikeFinding(line))

  let resolvedReferences = references.trim()
  if (!resolvedReferences && recoveredCitations.length) {
    const items = recoveredCitations.map((line) => `<li>${escapeHtml(line)}</li>`).join('')
    resolvedReferences = `<h2>References and Sources</h2><ul>${items}</ul>`
  }

  return {
    body: bodyDiv.innerHTML.trim(),
    findings: findingsText,
    references: resolvedReferences,
  }
}

export function plainTextToHtml(text: string) {
  if (!text.trim()) return ''
  if (looksLikeHtml(text)) return normalizeMarkdownInHtml(text)
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)
      if (lines.length > 0 && lines.every((line) => MARKDOWN_BULLET_RE.test(line))) {
        return `<ul>${lines
          .map((line) => `<li>${formatInlineMarkdown(stripMarkdownBullet(line))}</li>`)
          .join('')}</ul>`
      }
      const bodyLines = lines.filter((line) => !isMarkdownHorizontalRule(line))
      if (!bodyLines.length) return ''
      return `<p>${formatInlineMarkdown(bodyLines.join('\n')).replace(/\n/g, '<br>')}</p>`
    })
    .filter(Boolean)
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
  if (looksLikeHtml(text)) return normalizeMarkdownInHtml(text)
  const items = filterReportFindings(
    text
      .split('\n')
      .map((line) => line.trim().replace(MARKDOWN_BULLET_RE, ''))
      .filter(Boolean),
  )
  if (!items.length) return ''
  return `<ul>${items.map((item) => `<li>${formatInlineMarkdown(item)}</li>`).join('')}</ul>`
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

const FULL_REGENERATE_PROMPT_RE =
  /\b(rewrite|regenerate|start over|from scratch|redo|write again|whole report|full report|new draft|replace all|rebuild|rewrite the whole)\b/i

export function isFullRegeneratePrompt(prompt: string) {
  return FULL_REGENERATE_PROMPT_RE.test(prompt.trim())
}

export function reportBodyWordCount(html: string) {
  if (!html.trim()) return 0
  const { body } = splitReportDocument(html)
  const plain = htmlToPlainText(body || html)
  return plain.trim() ? plain.trim().split(/\s+/).length : 0
}

/** True when the narrative body is too short to refine (e.g. only Key Findings remain). */
export function isDraftEffectivelyEmpty(html: string, minWords = 40) {
  return reportBodyWordCount(html) < minWords
}

export function hasSubstantiveDraftContent(html: string, minWords = 40) {
  return reportBodyWordCount(html) >= minWords
}
