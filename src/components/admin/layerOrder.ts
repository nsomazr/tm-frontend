import type { MapLayer } from '../../types'

/** Relative type order bottom → top (polygons under structures under points). */
export const LAYER_TYPE_STACK_ORDER: Record<string, number> = {
  polygon: 0,
  line: 1,
  point: 2,
}

/**
 * OpenLayers z-index bands so heatmaps can sit between polygons and structures:
 * polygons → heatmap → structures → points.
 */
export const LAYER_OL_Z_BAND: Record<string, number> = {
  polygon: 3600,
  line: 3700,
  point: 3800,
}

/** Heatmap / contour between polygon and line bands. */
export const MINERAL_HEATMAP_OL_Z = 3650
export const MINERAL_HEATMAP_CONTOUR_OL_Z = 3655

/** Coverage used for stacking: prefer real polygon area, else feature count. */
export function layerCoverageScore(layer: MapLayer): number {
  if (layer.layer_type === 'polygon') {
    const area = Number(layer.area_km2)
    if (Number.isFinite(area) && area > 0) return area
  }
  return Math.max(0, layer.feature_count ?? 0)
}

/**
 * Bottom → top stack order for the map:
 * polygons under lines under points; within a type, larger coverage under smaller.
 */
export function compareLayersBottomToTop(a: MapLayer, b: MapLayer): number {
  const typeDiff =
    (LAYER_TYPE_STACK_ORDER[a.layer_type] ?? 1) - (LAYER_TYPE_STACK_ORDER[b.layer_type] ?? 1)
  if (typeDiff !== 0) return typeDiff
  const coverageDiff = layerCoverageScore(b) - layerCoverageScore(a)
  if (coverageDiff !== 0) return coverageDiff
  if (a.z_index !== b.z_index) return a.z_index - b.z_index
  return a.name.localeCompare(b.name)
}

export function sortLayersBottomToTop(layers: MapLayer[]) {
  return [...layers].sort(compareLayersBottomToTop)
}

export function sortLayersTopToBottom(layers: MapLayer[]) {
  return [...layers].sort((a, b) => compareLayersBottomToTop(b, a))
}

/** Assign sequential z_index (0 = bottom) using the default coverage-aware stack. */
export function applyDefaultTypeStack(layers: MapLayer[]): MapLayer[] {
  return sortLayersBottomToTop(layers).map((layer, index) => ({ ...layer, z_index: index }))
}

/** Rank within each layer type (0 = bottom of that type band). */
export function stackRanksWithinType(layers: MapLayer[]): Map<number, number> {
  const ranks = new Map<number, number>()
  const byType = new Map<string, MapLayer[]>()
  for (const layer of layers) {
    const type = layer.layer_type || 'polygon'
    const list = byType.get(type) ?? []
    list.push(layer)
    byType.set(type, list)
  }
  for (const list of byType.values()) {
    list.sort(compareLayersBottomToTop)
    list.forEach((layer, index) => ranks.set(layer.id, index))
  }
  return ranks
}

/** Stable map draw ranks (0 = bottom) from the default stack rules. */
export function stackIndicesBottomToTop(layers: MapLayer[]): Map<number, number> {
  const sorted = sortLayersBottomToTop(layers)
  return new Map(sorted.map((layer, index) => [layer.id, index]))
}

/** Absolute OpenLayers z-index for a mineral data layer. */
export function openLayersZIndexForLayer(layer: MapLayer, rankWithinType = 0): number {
  const band = LAYER_OL_Z_BAND[layer.layer_type] ?? 3650
  return band + Math.max(0, Math.min(99, rankWithinType))
}

export function applyGroupOrder(
  layers: MapLayer[],
  groupType: string,
  orderedTopToBottom: MapLayer[]
): MapLayer[] {
  const typeOrder = ['polygon', 'line', 'point'] as const
  const groups = new Map<string, MapLayer[]>()
  const assigned = new Set<number>()

  for (const type of typeOrder) {
    if (type === groupType) {
      // Caller provides top→bottom UI order; keep that for the group, still coverage-aware for other types.
      const ordered = [...orderedTopToBottom].reverse()
      groups.set(type, ordered)
      ordered.forEach((layer) => assigned.add(layer.id))
    } else {
      const bucket = sortLayersBottomToTop(layers.filter((layer) => layer.layer_type === type))
      groups.set(type, bucket)
      bucket.forEach((layer) => assigned.add(layer.id))
    }
  }

  const leftovers = sortLayersBottomToTop(layers.filter((layer) => !assigned.has(layer.id)))
  const merged: MapLayer[] = []
  const seen = new Set<number>()
  for (const layer of [...typeOrder.flatMap((type) => groups.get(type) ?? []), ...leftovers]) {
    if (seen.has(layer.id)) continue
    seen.add(layer.id)
    merged.push(layer)
  }
  return merged.map((layer, index) => ({ ...layer, z_index: index }))
}

export function uniqueLayerIds(ids: number[]): number[] {
  const seen = new Set<number>()
  const unique: number[] = []
  for (const id of ids) {
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue
    seen.add(id)
    unique.push(id)
  }
  return unique
}

export function stackPositionLabel(indexFromTop: number, total: number) {
  if (total <= 1) return 'Only layer in group'
  if (indexFromTop === 0) return 'Top (drawn in front)'
  if (indexFromTop === total - 1) return 'Bottom (drawn behind)'
  return `${indexFromTop + 1} of ${total}`
}
