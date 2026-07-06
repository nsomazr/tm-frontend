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

export function applyGroupOrder(
  layers: MapLayer[],
  groupType: string,
  orderedTopToBottom: MapLayer[]
): MapLayer[] {
  const typeOrder = ['polygon', 'line', 'point'] as const
  const groups = new Map<string, MapLayer[]>()

  for (const type of typeOrder) {
    if (type === groupType) {
      groups.set(type, [...orderedTopToBottom].reverse())
    } else {
      groups.set(type, sortLayersBottomToTop(layers.filter((layer) => layer.layer_type === type)))
    }
  }

  const merged = typeOrder.flatMap((type) => groups.get(type) ?? [])
  return merged.map((layer, index) => ({ ...layer, z_index: index }))
}

export function stackPositionLabel(indexFromTop: number, total: number) {
  if (total <= 1) return 'Only layer in group'
  if (indexFromTop === 0) return 'Top — drawn in front'
  if (indexFromTop === total - 1) return 'Bottom — drawn behind'
  return `${indexFromTop + 1} of ${total}`
}
