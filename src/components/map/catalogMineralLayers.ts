import type { MapLayer } from '../../types'

/** Mirrors backend PERIODIC_LAYER_SLUGS for client-side layer grouping. */
const PERIODIC_LAYER_SLUGS: Record<string, string[]> = {
  lithium: ['lithium', 'lithium-points'],
  graphite: ['graphite'],
  'iron-ore': ['iron-ore', 'iron'],
  nickel: ['nickel'],
  copper: ['copper'],
  gold: ['gold'],
  tanzanite: ['tanzanite'],
  diamond: ['diamond'],
}

export function catalogLayerMatchesSlug(layer: MapLayer, catalogSlug: string): boolean {
  if (!catalogSlug) return false
  if (layer.slug === catalogSlug) return true
  if (layer.mineral_slug === catalogSlug) return true
  if (layer.associated_catalog_slugs?.includes(catalogSlug)) return true
  const aliases = PERIODIC_LAYER_SLUGS[catalogSlug] ?? []
  return aliases.includes(layer.slug)
}

export function layersForCatalogSlug(catalogSlug: string, layers: MapLayer[]): MapLayer[] {
  if (!catalogSlug) return []
  return layers.filter((layer) => catalogLayerMatchesSlug(layer, catalogSlug))
}
