export type ImageAlign = 'left' | 'center' | 'right' | 'full'
export type ImageWidth = 'small' | 'medium' | 'large' | 'full'

export const IMAGE_ALIGN_OPTIONS: readonly { label: string; value: ImageAlign }[] = [
  { label: 'Left', value: 'left' },
  { label: 'Center', value: 'center' },
  { label: 'Right', value: 'right' },
  { label: 'Full width', value: 'full' },
]

export const IMAGE_WIDTH_OPTIONS: readonly { label: string; value: ImageWidth }[] = [
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
  { label: 'Large', value: 'large' },
  { label: 'Full', value: 'full' },
]

const BLOCK_TAGS = new Set(['P', 'DIV', 'LI', 'BLOCKQUOTE', 'H2', 'H3', 'H4'])

function isHeading(el: HTMLElement) {
  return /^H[1-6]$/.test(el.tagName)
}

function blockElement(node: Node | null, root: HTMLElement): HTMLElement | null {
  let current: Node | null = node
  while (current && current !== root) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const el = current as HTMLElement
      if (BLOCK_TAGS.has(el.tagName) || el.tagName === 'UL' || el.tagName === 'OL') return el
    }
    current = current.parentNode
  }
  return null
}

function extractListLines(container: HTMLElement): string[] {
  const listItems = Array.from(container.querySelectorAll('li'))
  if (listItems.length) {
    return listItems.map((li) => li.textContent?.trim() ?? '').filter(Boolean)
  }

  const blocks = Array.from(container.querySelectorAll('p, div, blockquote, li')).filter(
    (node) => (node.textContent?.trim() ?? '').length > 0
  )
  if (blocks.length > 1) {
    return blocks.map((node) => node.textContent?.trim() ?? '').filter(Boolean)
  }

  const text = container.innerText || container.textContent || ''
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function buildList(ordered: boolean, lines: string[]) {
  const list = document.createElement(ordered ? 'ol' : 'ul')
  for (const line of lines) {
    const li = document.createElement('li')
    li.textContent = line
    list.appendChild(li)
  }
  return list
}

function selectionHasList(range: Range) {
  const fragment = range.cloneContents()
  const probe = document.createElement('div')
  probe.appendChild(fragment)
  return Boolean(probe.querySelector('ul, ol'))
}

function collectSelectedBlocks(surface: HTMLElement, range: Range) {
  const blocks: HTMLElement[] = []
  const walker = document.createTreeWalker(surface, NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      const el = node as HTMLElement
      if (!BLOCK_TAGS.has(el.tagName)) return NodeFilter.FILTER_SKIP
      if (!range.intersectsNode(el)) return NodeFilter.FILTER_SKIP
      if (isHeading(el)) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })

  let node = walker.nextNode()
  while (node) {
    blocks.push(node as HTMLElement)
    node = walker.nextNode()
  }
  return blocks
}

export function applyListCommand(surface: HTMLElement, ordered: boolean) {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return

  surface.focus()
  const range = selection.getRangeAt(0)
  if (!surface.contains(range.commonAncestorContainer)) return

  if (range.collapsed) {
    document.execCommand(ordered ? 'insertOrderedList' : 'insertUnorderedList', false)
    return
  }

  if (selectionHasList(range)) {
    document.execCommand(ordered ? 'insertOrderedList' : 'insertUnorderedList', false)
    return
  }

  const probe = document.createElement('div')
  probe.appendChild(range.cloneContents())
  let lines = extractListLines(probe).filter(Boolean)

  const selectedBlocks = collectSelectedBlocks(surface, range)
  if (selectedBlocks.length > 1) {
    lines = selectedBlocks.map((block) => block.textContent?.trim() ?? '').filter(Boolean)
  }

  if (lines.length <= 1) {
    document.execCommand(ordered ? 'insertOrderedList' : 'insertUnorderedList', false)
    if (!selectionHasList(range)) {
      const line = lines[0] ?? probe.textContent?.trim()
      if (!line) return
      range.deleteContents()
      const list = buildList(ordered, [line])
      range.insertNode(list)
      selection.removeAllRanges()
      const next = document.createRange()
      next.selectNodeContents(list)
      next.collapse(false)
      selection.addRange(next)
    }
    return
  }

  range.deleteContents()
  const list = buildList(ordered, lines)
  range.insertNode(list)

  selection.removeAllRanges()
  const next = document.createRange()
  next.selectNodeContents(list)
  selection.addRange(next)
}

export function figureClassName(align: ImageAlign, width: ImageWidth) {
  return `report-editor-figure report-editor-figure--align-${align} report-editor-figure--width-${width}`
}

export function parseFigureClasses(className: string) {
  const align =
    (['left', 'center', 'right', 'full'] as const).find((value) =>
      className.includes(`report-editor-figure--align-${value}`)
    ) ?? 'center'
  const width =
    (['small', 'medium', 'large', 'full'] as const).find((value) =>
      className.includes(`report-editor-figure--width-${value}`)
    ) ?? 'medium'
  return { align, width }
}

export function createImageFigure(src: string, alt = '') {
  const figure = document.createElement('figure')
  figure.className = figureClassName('center', 'medium')
  figure.contentEditable = 'false'

  const img = document.createElement('img')
  img.src = src
  img.alt = alt
  img.draggable = false
  figure.appendChild(img)
  return figure
}

export function insertImageAtSelection(surface: HTMLElement, src: string) {
  surface.focus()
  const figure = createImageFigure(src)
  const selection = window.getSelection()

  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0)
    if (surface.contains(range.commonAncestorContainer)) {
      range.collapse(false)
      range.insertNode(figure)
      const spacer = document.createElement('p')
      spacer.appendChild(document.createElement('br'))
      figure.after(spacer)
      selection.collapseToEnd()
      return figure
    }
  }

  surface.appendChild(figure)
  const spacer = document.createElement('p')
  spacer.appendChild(document.createElement('br'))
  surface.appendChild(spacer)
  return figure
}

export function updateFigureLayout(
  figure: HTMLElement,
  updates: { align?: ImageAlign; width?: ImageWidth }
) {
  const current = parseFigureClasses(figure.className)
  figure.className = figureClassName(
    updates.align ?? current.align,
    updates.width ?? current.width
  )
}

export function cropImageDataUrl(
  src: string,
  crop: { x: number; y: number; width: number; height: number }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onerror = () => reject(new Error('Invalid image'))
    img.onload = () => {
      const width = Math.max(1, Math.round(crop.width))
      const height = Math.max(1, Math.round(crop.height))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas unavailable'))
        return
      }
      ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.88))
    }
    img.src = src
  })
}

export function readImageFile(file: File, maxWidth = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Only image files are supported'))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Invalid image'))
      img.onload = () => {
        let { width, height } = img
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(String(reader.result))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

export function findSelectedFigure(surface: HTMLElement, target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return null
  if (!surface.contains(target)) return null
  return target.closest('figure.report-editor-figure') as HTMLElement | null
}
