import type { ReactNode } from 'react'

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }

const BULLET_RE = /^[•\-\*]\s+(.+)$/
const NUMBERED_RE = /^\d+\.\s+(.+)$/
const HEADING_RE = /^(#{1,6})\s+(.+)$/

function parseBlocks(content: string): Block[] {
  const lines = content.split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const trimmed = lines[i].trim()
    if (!trimmed) {
      i++
      continue
    }

    if (BULLET_RE.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length) {
        const match = lines[i].trim().match(BULLET_RE)
        if (!match) break
        items.push(match[1])
        i++
      }
      blocks.push({ type: 'ul', items })
      continue
    }

    const headingMatch = trimmed.match(HEADING_RE)
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      })
      i++
      continue
    }

    if (NUMBERED_RE.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length) {
        const match = lines[i].trim().match(NUMBERED_RE)
        if (!match) break
        items.push(match[1])
        i++
      }
      blocks.push({ type: 'ol', items })
      continue
    }

    const paraLines: string[] = []
    while (i < lines.length) {
      const line = lines[i].trim()
      if (!line) break
      if (BULLET_RE.test(line) || NUMBERED_RE.test(line) || HEADING_RE.test(line)) break
      paraLines.push(line)
      i++
    }
    blocks.push({ type: 'paragraph', text: paraLines.join(' ') })
  }

  return blocks
}

function formatInline(text: string, inverted = false): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong
          key={index}
          className={inverted ? 'font-semibold text-white' : 'font-semibold map-text'}
        >
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })
}

interface AssistantMessageContentProps {
  content: string
  role: 'user' | 'assistant'
  compact?: boolean
  className?: string
}

export default function AssistantMessageContent({
  content,
  role,
  compact = false,
  className = '',
}: AssistantMessageContentProps) {
  if (role === 'user') {
    return <span className={`whitespace-pre-wrap break-words ${className}`}>{content}</span>
  }

  const blocks = parseBlocks(content)
  if (blocks.length === 0) {
    return <span className={className}>{content}</span>
  }

  return (
    <div
      className={`break-words leading-relaxed ${compact ? 'space-y-2 text-sm' : 'space-y-3'} ${className}`}
    >
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          const headingClass =
            block.level <= 2
              ? 'text-base font-bold map-text'
              : block.level <= 4
                ? 'text-sm font-semibold map-text'
                : 'text-sm font-medium map-text-secondary'
          return (
            <p key={index} className={`m-0 leading-snug ${headingClass}`}>
              {formatInline(block.text)}
            </p>
          )
        }

        if (block.type === 'ul') {
          return (
            <div key={index} className="space-y-2">
              {block.items.map((item, itemIndex) => (
                <p key={itemIndex} className="m-0 leading-relaxed">
                  {formatInline(item)}
                </p>
              ))}
            </div>
          )
        }

        if (block.type === 'ol') {
          return (
            <ol key={index} className="list-decimal pl-4 space-y-1.5 marker:font-medium marker:text-terra-700/80">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="pl-0.5 leading-relaxed">
                  {formatInline(item)}
                </li>
              ))}
            </ol>
          )
        }

        return (
          <p key={index} className="leading-relaxed m-0">
            {formatInline(block.text)}
          </p>
        )
      })}
    </div>
  )
}
