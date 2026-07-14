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
 * How often the landing map swaps its random layer batch.
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

/**
 * Pick up to `count` random layer ids for the landing map showcase.
 * Avoids repeating the exact previous set when enough layers exist.
 */
export function pickRandomVisibleLayerIds(
  layers: MapLayer[],
  count: number = LANDING_MAP_LAYER_BATCH,
  previous?: Set<number> | null,
): Set<number> {
  if (layers.length === 0) return new Set()
  if (layers.length <= count) return new Set(layers.map((layer) => layer.id))

  const allIds = layers.map((layer) => layer.id)
  let picked = shuffleIds(allIds).slice(0, count)

  if (previous && previous.size > 0) {
    const identical =
      picked.length === previous.size && picked.every((id) => previous.has(id))
    if (identical) {
      picked = shuffleIds(allIds).slice(0, count)
    }
  }

  return new Set(picked)
}

export function zoomFromResolution(resolution: number): number {
  return Math.log2(156543.03392804097 / resolution)
}
