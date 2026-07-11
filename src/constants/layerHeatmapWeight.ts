export const LAYER_HEATMAP_WEIGHT_MIN = 0
export const LAYER_HEATMAP_WEIGHT_MAX = 10
export const LAYER_HEATMAP_WEIGHT_DEFAULT = 5

export function clampHeatmapWeight(value: number): number {
  return Math.min(
    LAYER_HEATMAP_WEIGHT_MAX,
    Math.max(LAYER_HEATMAP_WEIGHT_MIN, Math.round(value)),
  )
}
