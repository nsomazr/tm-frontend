import type { MapLayer } from '../../types'

/** Default visible layers: polygons, points, and lines all on. */
export function defaultVisibleLayerIds(layers: MapLayer[]): Set<number> {
  return new Set(layers.map((l) => l.id))
}

/** Unpaid static map: every mineral layer stays visible (legacy helper). */
export function allVisibleLayerIds(layers: MapLayer[]): Set<number> {
  return new Set(layers.map((l) => l.id))
}

/** How many free-map layers to show at once on the landing / preview map. */
export const LANDING_MAP_LAYER_BATCH = 15

/**
 * How often the landing map swaps one layer in the visible batch.
 * 2 minutes: enough time to look around, frequent enough to feel alive.
 */
export const LANDING_MAP_LAYER_ROTATION_MS = 2 * 60 * 1000

function shuffleIds(ids: number[]): number[] {
  const next = [...ids]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = next[i]
    next[i] = next[j]
    next[j] = tmp
  }
  return next
}

function layerIds(layers: MapLayer[]): number[] {
  return layers.map((layer) => layer.id)
}

/**
 * Initial free-map batch: show every layer when there are ≤ `count`,
 * otherwise a random sample of exactly `count`.
 */
export function pickRandomVisibleLayerIds(
  layers: MapLayer[],
  count: number = LANDING_MAP_LAYER_BATCH,
  _previous?: Set<number> | null,
): Set<number> {
  if (layers.length === 0) return new Set()
  if (layers.length <= count) return new Set(layerIds(layers))
  return new Set(shuffleIds(layerIds(layers)).slice(0, count))
}

/**
 * Rotate the free-map showcase by replacing exactly one visible layer
 * with one that is currently hidden. Always keeps `min(count, total)` visible.
 *
 * Examples:
 * - 12 layers → show all 12 (no swap)
 * - 16 layers → keep 15, swap 1 each tick
 * - 30 layers → keep 15, mix by swapping 1 each tick
 */
export function rotateLandingVisibleLayerIds(
  layers: MapLayer[],
  previous: Set<number>,
  count: number = LANDING_MAP_LAYER_BATCH,
): Set<number> {
  if (layers.length === 0) return new Set()
  if (layers.length <= count) return new Set(layerIds(layers))

  const allIds = layerIds(layers)
  const allSet = new Set(allIds)
  let visible = [...previous].filter((id) => allSet.has(id))

  if (visible.length < count) {
    const fillers = shuffleIds(allIds.filter((id) => !visible.includes(id)))
    visible = [...visible, ...fillers.slice(0, count - visible.length)]
  } else if (visible.length > count) {
    visible = shuffleIds(visible).slice(0, count)
  }

  const hidden = allIds.filter((id) => !visible.includes(id))
  if (hidden.length === 0) return new Set(visible)

  const removeAt = Math.floor(Math.random() * visible.length)
  const addId = hidden[Math.floor(Math.random() * hidden.length)]
  const next = [...visible]
  next[removeAt] = addId
  return new Set(next)
}

export function zoomFromResolution(resolution: number): number {
  return Math.log2(156543.03392804097 / resolution)
}
