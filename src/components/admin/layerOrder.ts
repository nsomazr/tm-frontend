import type { MapLayer } from '../../types'

export const LAYER_TYPE_STACK_ORDER: Record<string, number> = {
  polygon: 0,
  line: 1,
  point: 2,
}

export function sortLayersBottomToTop(layers: MapLayer[]) {
  return [...layers].sort((a, b) => a.z_index - b.z_index)
}

export function sortLayersTopToBottom(layers: MapLayer[]) {
  return [...layers].sort((a, b) => b.z_index - a.z_index)
}

export function applyDefaultTypeStack(layers: MapLayer[]): MapLayer[] {
  const sorted = [...layers].sort((a, b) => {
    const typeDiff =
      (LAYER_TYPE_STACK_ORDER[a.layer_type] ?? 1) - (LAYER_TYPE_STACK_ORDER[b.layer_type] ?? 1)
    if (typeDiff !== 0) return typeDiff
    if (a.z_index !== b.z_index) return a.z_index - b.z_index
    return a.name.localeCompare(b.name)
  })
  return sorted.map((layer, index) => ({ ...layer, z_index: index }))
}

export function moveLayerInStack(
  layers: MapLayer[],
  layerId: number,
  direction: 'front' | 'forward' | 'backward' | 'back'
): MapLayer[] {
  const ordered = sortLayersBottomToTop(layers)
  const index = ordered.findIndex((layer) => layer.id === layerId)
  if (index < 0) return layers

  const next = [...ordered]
  const [item] = next.splice(index, 1)
  let target = index

  switch (direction) {
    case 'front':
      target = next.length
      break
    case 'forward':
      target = Math.min(index + 1, next.length)
      break
    case 'backward':
      target = Math.max(index - 1, 0)
      break
    case 'back':
      target = 0
      break
  }

  next.splice(target, 0, item)
  return next.map((layer, i) => ({ ...layer, z_index: i }))
}

export function stackPositionLabel(index: number, total: number) {
  if (total <= 1) return 'Only layer'
  if (index === total - 1) return 'Top'
  if (index === 0) return 'Bottom'
  return `Middle (${index + 1}/${total})`
}
