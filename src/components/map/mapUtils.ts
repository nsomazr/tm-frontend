import type { MapLayer } from '../../types'

/** Default visible layers: polygons, points, and lines all on. */
export function defaultVisibleLayerIds(layers: MapLayer[]): Set<number> {
  return new Set(layers.map((l) => l.id))
}

/** Unpaid static map: every mineral layer stays visible. */
export function allVisibleLayerIds(layers: MapLayer[]): Set<number> {
  return new Set(layers.map((l) => l.id))
}

export function zoomFromResolution(resolution: number): number {
  return Math.log2(156543.03392804097 / resolution)
}
