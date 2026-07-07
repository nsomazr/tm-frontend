/** Per-layer reference buffer bounds (km) for insight influence zones. */
export const LAYER_BUFFER_KM_MIN = 1
export const LAYER_BUFFER_KM_MAX = 50

export function clampBufferKm(value: number): number {
  return Math.min(LAYER_BUFFER_KM_MAX, Math.max(LAYER_BUFFER_KM_MIN, Math.round(value)))
}

export function formatBufferKmLabel(km: number): string {
  return `${km} km`
}

export function formatBufferKmRange(): string {
  return `${LAYER_BUFFER_KM_MIN} to ${LAYER_BUFFER_KM_MAX} km`
}
