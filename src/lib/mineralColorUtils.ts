export function normalizeHex(value: string, fallback = '#0D9488'): string {
  const raw = value.trim()
  const match = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(raw)
  if (!match) return fallback
  let body = match[1]
  if (body.length === 3) {
    body = body.split('').map((ch) => ch + ch).join('')
  }
  return `#${body.toUpperCase()}`
}

export function hexToRgba(hex: string, alpha: number): string {
  const norm = normalizeHex(hex)
  const body = norm.slice(1)
  const value = Number.parseInt(body, 16)
  if (Number.isNaN(value)) {
    return `rgba(13,148,136,${alpha})`
  }
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  const a = Math.max(0, Math.min(1, alpha))
  return `rgba(${r},${g},${b},${a.toFixed(2)})`
}

export interface LayerColorRecord {
  hex: string
  fillRgba: string
  strokeRgba: string
}

export function colorRecordForLayer(hex: string, layerType: string): LayerColorRecord {
  const normalized = normalizeHex(hex)
  const fillAlpha = layerType === 'polygon' ? 0.55 : 0.72
  const strokeAlpha = layerType === 'line' ? 0.95 : 0.88
  return {
    hex: normalized,
    fillRgba: hexToRgba(normalized, fillAlpha),
    strokeRgba: hexToRgba(normalized, strokeAlpha),
  }
}

export function formatColorCodes(record: LayerColorRecord): string {
  return `${record.hex} · ${record.fillRgba}`
}
