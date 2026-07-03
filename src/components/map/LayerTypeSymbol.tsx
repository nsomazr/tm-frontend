import type { MapLayer } from '../../types'

function parseColor(layer: MapLayer, key: 'fill' | 'stroke', fallback: string) {
  const raw = layer.style?.[key]
  return typeof raw === 'string' && /^#[0-9A-Fa-f]{6}$/.test(raw) ? raw : fallback
}

export default function LayerTypeSymbol({ layer }: { layer: MapLayer }) {
  const fill = parseColor(layer, 'fill', '#E87722')

  if (layer.layer_type === 'line') {
    return (
      <span
        className="w-4 h-4 shrink-0 flex items-center justify-center rounded border border-app-border-strong bg-app-surface shadow-sm"
        aria-hidden
      >
        <span className="block w-3 h-[3px] rounded-full bg-slate-700 dark:bg-white" />
      </span>
    )
  }

  if (layer.layer_type === 'point') {
    return (
      <span
        className="w-3 h-3 rounded-full shrink-0 border-2 border-white shadow-sm"
        style={{ backgroundColor: fill }}
        aria-hidden
      />
    )
  }

  return (
    <span
      className="w-3.5 h-3.5 rounded-sm shrink-0 border border-black/15 shadow-sm"
      style={{ backgroundColor: fill }}
      aria-hidden
    />
  )
}
