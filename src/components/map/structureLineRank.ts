import type { MapLayer } from '../../types'

/** 1 = primary/major, 2 = secondary, 3 = tertiary/minor */
export type StructureLineRank = 1 | 2 | 3

export const STRUCTURE_RANK_OPTIONS: {
  value: StructureLineRank
  label: string
  shortLabel: string
}[] = [
  { value: 1, label: 'Primary / major', shortLabel: 'Major' },
  { value: 2, label: 'Secondary', shortLabel: 'Secondary' },
  { value: 3, label: 'Tertiary / minor', shortLabel: 'Minor' },
]

const RANK1_RE =
  /\b(primary|major|main|principal|mikuu|css|chief|regional)\b|main-structures?|priority[-_\s]?1\b/i
const RANK2_RE =
  /\b(secondary|intermediate|medium)\b|linear-structures?|priority[-_\s]?2\b|gold-priority-2\b/i
const RANK3_RE =
  /\b(tertiary|minor|auxiliary|subsidiary|local)\b|priority[-_\s]?[34]\b|gold-priority-[34]\b/i

const PROPERTY_KEYS = [
  'structure_rank',
  'structureRank',
  'line_rank',
  'lineRank',
  'structure_class',
  'structureClass',
  'line_class',
  'lineClass',
  'rank',
  'priority',
  'class',
  'type',
  'importance',
  'category',
] as const

function clampRank(value: number): StructureLineRank {
  if (value <= 1) return 1
  if (value >= 3) return 3
  return 2
}

export function inferStructureRankFromText(text: string): StructureLineRank | null {
  const normalized = text.trim()
  if (!normalized) return null
  if (RANK1_RE.test(normalized)) return 1
  if (RANK3_RE.test(normalized)) return 3
  if (RANK2_RE.test(normalized)) return 2
  return null
}

function rankFromPropertyValue(raw: unknown): StructureLineRank | null {
  if (raw == null || raw === '') return null

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return clampRank(Math.round(raw))
  }

  const text = String(raw).trim()
  if (!text) return null

  if (/^[123]$/.test(text)) {
    return clampRank(Number(text))
  }

  return inferStructureRankFromText(text)
}

export function structureRankFromLayerStyle(
  style: Record<string, unknown> | null | undefined
): StructureLineRank | null {
  if (!style) return null
  const explicit = style.structureRank ?? style.lineRank
  if (explicit != null) {
    return rankFromPropertyValue(explicit)
  }
  const lineClass = style.lineClass ?? style.structureClass
  if (lineClass != null) {
    return rankFromPropertyValue(lineClass)
  }
  return null
}

export function resolveStructureRank(
  layer: MapLayer,
  featureProperties?: Record<string, unknown> | null
): StructureLineRank {
  if (featureProperties) {
    for (const key of PROPERTY_KEYS) {
      if (key in featureProperties) {
        const fromProp = rankFromPropertyValue(featureProperties[key])
        if (fromProp) return fromProp
      }
    }
    for (const value of Object.values(featureProperties)) {
      if (typeof value === 'string' && value.trim()) {
        const fromText = inferStructureRankFromText(value)
        if (fromText) return fromText
      }
    }
  }

  const fromStyle = structureRankFromLayerStyle(layer.style)
  if (fromStyle) return fromStyle

  const fromLayerName = inferStructureRankFromText(`${layer.slug} ${layer.name}`)
  if (fromLayerName) return fromLayerName

  return 2
}

export function structureRankLineWidth(rank: StructureLineRank, zoom: number, lowZoom: boolean): number {
  const base = rank === 1 ? 2.4 : rank === 2 ? 1.55 : 0.95
  const cap = rank === 1 ? 3.2 : rank === 2 ? 2.2 : 1.45
  const zoomBoost = Math.max(0, zoom - 6) * (rank === 1 ? 0.18 : rank === 2 ? 0.14 : 0.1)
  const width = Math.min(base + zoomBoost, cap)
  return lowZoom ? Math.max(rank === 3 ? 0.75 : 0.9, width * 0.85) : width
}

export function structureRankDash(rank: StructureLineRank): number[] | undefined {
  if (rank === 1) return undefined
  if (rank === 2) return [10, 5]
  return [6, 4]
}

export function structureRankLegendHeight(rank: StructureLineRank): number {
  if (rank === 1) return 4
  if (rank === 2) return 3
  return 2
}

export function layerStyleWithStructureRank(
  current: Record<string, unknown> | null | undefined,
  rank: StructureLineRank
): Record<string, unknown> {
  return {
    ...(current || {}),
    structureRank: rank,
  }
}

export function suggestStructureRank(layerName: string, layerType: string): StructureLineRank {
  if (layerType !== 'line') return 2
  return inferStructureRankFromText(layerName) ?? 2
}
