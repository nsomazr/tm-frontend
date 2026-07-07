import { htmlToPlainText, looksLikeHtml, plainTextToHtml } from './reportEditorText'

const CHANGE_BLOCK_CLASS = 'report-editor-change-block'
const CHANGE_INLINE_CLASS = 'report-editor-change'

type ReportBlock = {
  html: string
  text: string
}

function normalizeCompareText(text: string) {
  return text.replace(/\s+/g, ' ').trim().toLowerCase()
}

function tokenizeWords(text: string) {
  return text.match(/\S+|\s+/g) ?? []
}

function longestCommonSubsequence(a: string[], b: string[]) {
  const rows = a.length + 1
  const cols = b.length + 1
  const table = Array.from({ length: rows }, () => Array<number>(cols).fill(0))

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        table[i][j] = table[i - 1][j - 1] + 1
      } else {
        table[i][j] = Math.max(table[i - 1][j], table[i][j - 1])
      }
    }
  }

  const ops: Array<{ type: 'equal' | 'insert' | 'delete'; value: string }> = []
  let i = a.length
  let j = b.length

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      ops.unshift({ type: 'equal', value: a[i - 1] })
      i -= 1
      j -= 1
    } else if (j > 0 && (i === 0 || table[i][j - 1] >= table[i - 1][j])) {
      ops.unshift({ type: 'insert', value: b[j - 1] })
      j -= 1
    } else {
      ops.unshift({ type: 'delete', value: a[i - 1] })
      i -= 1
    }
  }

  return ops
}

function escapeInline(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function highlightWordDiff(beforePlain: string, afterPlain: string) {
  const ops = longestCommonSubsequence(tokenizeWords(beforePlain), tokenizeWords(afterPlain))
  let html = ''

  for (const op of ops) {
    if (op.type === 'equal') {
      html += escapeInline(op.value)
      continue
    }
    if (op.type === 'insert') {
      html += `<mark class="${CHANGE_INLINE_CLASS}" data-report-change="1">${escapeInline(op.value)}</mark>`
    }
  }

  return html
}

function parseTopLevelBlocks(html: string): ReportBlock[] {
  if (!html.trim()) return []
  const source = looksLikeHtml(html) ? html : plainTextToHtml(html)
  const doc = new DOMParser().parseFromString(source, 'text/html')
  const blocks: ReportBlock[] = []

  for (const node of Array.from(doc.body.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim()
      if (!text) continue
      blocks.push({
        html: `<p>${escapeInline(text)}</p>`,
        text: normalizeCompareText(text),
      })
      continue
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue
    const el = node as HTMLElement
    if (el.classList.contains(CHANGE_BLOCK_CLASS)) {
      const inner = el.innerHTML.trim()
      blocks.push({
        html: inner,
        text: normalizeCompareText(el.textContent ?? ''),
      })
      continue
    }
    blocks.push({
      html: el.outerHTML,
      text: normalizeCompareText(el.textContent ?? ''),
    })
  }

  return blocks
}

function wrapChangeBlock(html: string) {
  return `<div class="${CHANGE_BLOCK_CLASS}" data-report-change="1">${html}</div>`
}

function highlightChangedBlock(beforeBlock: ReportBlock | undefined, afterBlock: ReportBlock) {
  if (!beforeBlock) return wrapChangeBlock(afterBlock.html)

  const tagMatch = afterBlock.html.match(/^<([a-z0-9]+)([^>]*)>([\s\S]*)<\/\1>$/i)
  if (!tagMatch) return wrapChangeBlock(afterBlock.html)

  const [, tag, attrs, inner] = tagMatch
  const blockTags = new Set(['p', 'li', 'h2', 'h3', 'blockquote'])
  if (!blockTags.has(tag.toLowerCase()) || /data-report-change|<mark/i.test(inner)) {
    return wrapChangeBlock(afterBlock.html)
  }

  const beforePlain = htmlToPlainText(beforeBlock.html) || beforeBlock.text
  const afterPlain = htmlToPlainText(afterBlock.html) || afterBlock.text
  const highlightedInner = highlightWordDiff(beforePlain, afterPlain)
  if (!highlightedInner.includes(`class="${CHANGE_INLINE_CLASS}"`)) {
    return wrapChangeBlock(afterBlock.html)
  }

  return `<${tag}${attrs}>${highlightedInner}</${tag}>`
}

export function highlightReportChanges(beforeHtml: string, afterHtml: string) {
  const cleanBefore = stripReportChangeHighlights(beforeHtml)
  const cleanAfter = stripReportChangeHighlights(afterHtml)

  if (!cleanBefore.trim()) {
    const afterBlocks = parseTopLevelBlocks(cleanAfter)
    if (!afterBlocks.length) {
      return { html: cleanAfter, changeCount: 0 }
    }
    return {
      html: afterBlocks.map((block) => wrapChangeBlock(block.html)).join(''),
      changeCount: afterBlocks.length,
    }
  }

  const beforeBlocks = parseTopLevelBlocks(cleanBefore)
  const afterBlocks = parseTopLevelBlocks(cleanAfter)
  const usedBefore = new Set<number>()
  let changeCount = 0
  const parts: string[] = []

  for (const block of afterBlocks) {
    if (!block.text) {
      parts.push(block.html)
      continue
    }

    const exactIndex = beforeBlocks.findIndex(
      (candidate, index) => !usedBefore.has(index) && candidate.text === block.text
    )
    if (exactIndex >= 0) {
      usedBefore.add(exactIndex)
      parts.push(block.html)
      continue
    }

    const nearIndex = beforeBlocks.findIndex((candidate, index) => {
      if (usedBefore.has(index) || !candidate.text || !block.text) return false
      if (candidate.html.match(/^<h[23]/i) && block.html.match(/^<h[23]/i)) {
        return normalizeCompareText(htmlToPlainText(candidate.html)) === normalizeCompareText(htmlToPlainText(block.html))
      }
      return false
    })

    if (nearIndex >= 0 && beforeBlocks[nearIndex].text === block.text) {
      usedBefore.add(nearIndex)
      parts.push(block.html)
      continue
    }

    const relatedIndex = beforeBlocks.findIndex((candidate, index) => {
      if (usedBefore.has(index) || !candidate.text) return false
      const sameKind =
        candidate.html.slice(0, 2) === block.html.slice(0, 2) ||
        (candidate.html.startsWith('<ul') && block.html.startsWith('<ul')) ||
        (candidate.html.startsWith('<ol') && block.html.startsWith('<ol'))
      return sameKind
    })

    const beforeBlock = relatedIndex >= 0 ? beforeBlocks[relatedIndex] : undefined
    if (relatedIndex >= 0) usedBefore.add(relatedIndex)

    if (beforeBlock && beforeBlock.text === block.text) {
      parts.push(block.html)
      continue
    }

    parts.push(highlightChangedBlock(beforeBlock, block))
    changeCount += 1
  }

  return { html: parts.join(''), changeCount }
}

export function stripReportChangeHighlights(html: string) {
  if (!html.trim() || !html.includes('data-report-change')) return html

  const doc = new DOMParser().parseFromString(html, 'text/html')

  doc.querySelectorAll(`mark.${CHANGE_INLINE_CLASS}`).forEach((node) => {
    const parent = node.parentNode
    if (!parent) return
    while (node.firstChild) {
      parent.insertBefore(node.firstChild, node)
    }
    parent.removeChild(node)
  })

  doc.querySelectorAll(`.${CHANGE_BLOCK_CLASS}`).forEach((node) => {
    const parent = node.parentNode
    if (!parent) return
    while (node.firstChild) {
      parent.insertBefore(node.firstChild, node)
    }
    parent.removeChild(node)
  })

  return doc.body.innerHTML
}

export function countReportChangeHighlights(html: string) {
  if (!html.includes('data-report-change')) return 0
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const blocks = doc.querySelectorAll(`.${CHANGE_BLOCK_CLASS}`).length
  if (blocks > 0) return blocks
  return doc.querySelectorAll(`mark.${CHANGE_INLINE_CLASS}`).length
}
