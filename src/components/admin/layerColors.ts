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
}

function normalizeColor(color: string) {
  return color.trim().toLowerCase()
}

function hashHue(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 360
}

export function suggestLayerStyle(
  layerName: string,
  usedColors: string[] = []
): LayerStyleSuggestion {
  const used = new Set(usedColors.map(normalizeColor))
  const fromPalette = LAYER_COLOR_PALETTE.find((color) => !used.has(normalizeColor(color)))
  const fill =
    fromPalette ??
    LAYER_COLOR_PALETTE[hashHue(layerName || 'layer') % LAYER_COLOR_PALETTE.length]

  return {
    fill,
    stroke: fill,
    strokeWidth: 1.5,
  }
}

export function layerFillColor(style: { fill?: unknown; stroke?: unknown } | null | undefined) {
  return typeof style?.fill === 'string' ? style.fill : ''
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
  const style = { ...(current || {}) }
  if (layerType === 'line') {
    style.stroke = color
    style.fill = color
  } else {
    style.fill = color
    style.stroke = color
  }
  if (style.strokeWidth == null) style.strokeWidth = 1.5
  return style
}
