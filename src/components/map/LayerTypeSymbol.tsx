import type { MapLayer } from '../../types'
import { resolveStructureRank, structureRankLegendHeight } from './structureLineRank'

function parseColor(layer: MapLayer, key: 'fill' | 'stroke', fallback: string) {
  const raw = layer.style?.[key]
  return typeof raw === 'string' && /^#[0-9A-Fa-f]{6}$/.test(raw) ? raw : fallback
}

export default function LayerTypeSymbol({ layer }: { layer: MapLayer }) {
  const fill = parseColor(layer, 'fill', '#E87722')

  if (layer.layer_type === 'line') {
    const rank = resolveStructureRank(layer)
    const barHeight = structureRankLegendHeight(rank)
    const strokeColor = parseColor(layer, 'stroke', fill !== '#E87722' ? fill : '#334155')
    return (
      <span
        className="w-4 h-4 shrink-0 flex items-center justify-center rounded border border-app-border-strong bg-app-surface shadow-sm"
        aria-hidden
      >
        <span
          className="block w-3 rounded-full"
          style={{ height: barHeight, backgroundColor: strokeColor }}
        />
      </span>
    )
  }

  if (layer.layer_type === 'point') {
    return (
      <span
        className="w-3.5 h-3 shrink-0 drop-shadow-sm"
        style={{
          backgroundColor: fill,
          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
          boxShadow: '0 0 0 2px #fff',
        }}
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
