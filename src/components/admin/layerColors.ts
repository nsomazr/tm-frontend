import { matchGeologicalColor } from '../../constants/geologicalMineralColors'
import { colorRecordForLayer, normalizeHex } from '../../lib/mineralColorUtils'

export const LAYER_COLOR_PALETTE = [
  '#0D9488',
  '#E87722',
  '#2563EB',
  '#7C3AED',
  '#DB2777',
  '#CA8A04',
  '#059669',
  '#DC2626',
  '#0891B2',
  '#9333EA',
  '#B45309',
  '#4F46E5',
  '#BE185D',
  '#0E7490',
  '#65A30D',
] as const

export type LayerStyleSuggestion = {
  fill: string
  stroke: string
  strokeWidth: number
  fillRgba: string
  strokeRgba: string
  /** Human label when suggestion came from geological match or commodity. */
  sourceLabel?: string
}

function normalizeColor(color: string) {
  return normalizeHex(color).toLowerCase()
}

/** HTML color inputs require lowercase #rrggbb. */
export function colorInputValue(color: string) {
  return normalizeHex(color).toLowerCase()
}

function hashHue(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 360
}

function hslToHex(h: number, s: number, l: number) {
  const sat = s / 100
  const light = l / 100
  const c = (1 - Math.abs(2 * light - 1)) * sat
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = light - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

function uniqueFallbackColor(seed: string, used: Set<string>) {
  for (let i = 0; i < 360; i++) {
    const hue = (hashHue(seed) + i * 37) % 360
    const hex = hslToHex(hue, 62, 42)
    if (!used.has(normalizeColor(hex))) return hex
  }
  return LAYER_COLOR_PALETTE[hashHue(seed) % LAYER_COLOR_PALETTE.length]
}

function toSuggestion(
  hex: string,
  layerType: string,
  sourceLabel?: string
): LayerStyleSuggestion {
  const record = colorRecordForLayer(hex, layerType)
  return {
    fill: record.hex,
    stroke: record.hex,
    strokeWidth: 1.5,
    fillRgba: record.fillRgba,
    strokeRgba: record.strokeRgba,
    sourceLabel,
  }
}

/**
 * Suggest a map color for a new layer.
 * Priority: geological match from name → preferred commodity color → free palette → unique HSL.
 */
export function suggestLayerStyle(
  layerName: string,
  usedColors: string[] = [],
  layerType: string = 'polygon',
  preferredHex?: string | null
): LayerStyleSuggestion {
  const used = new Set(usedColors.map(normalizeColor).filter(Boolean))
  const geological = matchGeologicalColor(layerName)
  if (geological && !used.has(normalizeColor(geological.hex))) {
    return toSuggestion(geological.hex, layerType, geological.label)
  }

  if (preferredHex) {
    const preferred = normalizeHex(preferredHex)
    if (!used.has(normalizeColor(preferred))) {
      return toSuggestion(preferred, layerType, 'Commodity color')
    }
  }

  const fromPalette = LAYER_COLOR_PALETTE.find((color) => !used.has(normalizeColor(color)))
  if (fromPalette) {
    return toSuggestion(fromPalette, layerType, 'Available palette color')
  }

  return toSuggestion(uniqueFallbackColor(layerName || 'layer', used), layerType, 'Unique color')
}

export function layerFillColor(style: { fill?: unknown; stroke?: unknown; fillRgba?: unknown } | null | undefined) {
  return typeof style?.fill === 'string' ? style.fill : ''
}

export function layerFillRgba(style: { fillRgba?: unknown } | null | undefined) {
  return typeof style?.fillRgba === 'string' ? style.fillRgba : ''
}

export function layerDisplayColor(layer: { layer_type: string; style?: Record<string, unknown> | null }) {
  const style = layer.style || {}
  if (layer.layer_type === 'line') {
    if (typeof style.stroke === 'string' && style.stroke) return style.stroke
    if (typeof style.fill === 'string' && style.fill) return style.fill
    return '#64748B'
  }
  return layerFillColor(style) || '#0D9488'
}

export function layerStyleWithColor(
  current: Record<string, unknown> | null | undefined,
  layerType: string,
  color: string
) {
  const record = colorRecordForLayer(color, layerType)
  const style = { ...(current || {}) }
  if (layerType === 'line') {
    style.stroke = record.hex
    style.fill = record.hex
  } else {
    style.fill = record.hex
    style.stroke = record.hex
  }
  style.fillRgba = record.fillRgba
  style.strokeRgba = record.strokeRgba
  if (style.strokeWidth == null) style.strokeWidth = 1.5
  return style
}
