import type { MineralCatalogEntry } from '../../types'

/** API params for search-context insights from a periodic-table catalog row. */
export function catalogInsightParams(entry: MineralCatalogEntry) {
  if (entry.layer_slug) {
    return { layer_id: entry.id }
  }
  return { mineral_slug: entry.slug }
}

/** Chat API params aligned with search-context insights for the same catalog row. */
export function catalogInsightChatParams(entry: MineralCatalogEntry) {
  if (entry.layer_slug) {
    return { layerId: entry.id, mineralSlug: entry.slug }
  }
  return { mineralSlug: entry.slug }
}
