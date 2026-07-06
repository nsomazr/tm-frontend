/** Platform commodity slots on the periodic table (static roster + catalog overrides). */

export interface TrackedElementCommodity {
  z: number
  slug: string
  fallbackColor: string
}

export interface SpecialCommoditySlot {
  slug: string
  symbol: string
  label: string
  fallbackColor: string
}

/**
 * Core Terra Meta commodities - always shown on the table.
 * Mapped layers use live map colors; unmapped slots stay blurred.
 */
export const TRACKED_ELEMENT_COMMODITIES: TrackedElementCommodity[] = [
  { z: 3, slug: 'lithium', fallbackColor: '#00CED1' },
  { z: 6, slug: 'graphite', fallbackColor: '#2D2D2D' },
  { z: 26, slug: 'iron-ore', fallbackColor: '#4A3728' },
  { z: 28, slug: 'nickel', fallbackColor: '#708090' },
  { z: 29, slug: 'copper', fallbackColor: '#B87333' },
  { z: 79, slug: 'gold', fallbackColor: '#E87722' },
]

export const SPECIAL_COMMODITY_FALLBACKS: SpecialCommoditySlot[] = [
  {
    slug: 'tanzanite',
    symbol: 'Tz',
    label: 'Tanzanite',
    fallbackColor: '#7B2D8E',
  },
  {
    slug: 'diamond',
    symbol: 'Dm',
    label: 'Diamond',
    fallbackColor: '#BACE73',
  },
]

export interface CommoditySlot {
  z: number
  slug: string
  fallbackColor: string
  entry: import('../types').MineralCatalogEntry | null
}

export function specialSlotMeta(slug: string): SpecialCommoditySlot | undefined {
  return SPECIAL_COMMODITY_FALLBACKS.find((s) => s.slug === slug)
}

function commodityScore(entry: import('../types').MineralCatalogEntry) {
  return (entry.is_mapped ? 10_000 : 0) + entry.feature_count
}

/** Static tracked slots merged with any catalog layer that resolves to an element (Z). */
export function buildCommoditySlots(catalog: import('../types').MineralCatalogEntry[]): Map<number, CommoditySlot> {
  const map = new Map<number, CommoditySlot>()

  for (const tracked of TRACKED_ELEMENT_COMMODITIES) {
    const entry =
      catalog.find((e) => e.slug === tracked.slug || e.layer_slug === tracked.slug) ?? null
    map.set(tracked.z, {
      z: tracked.z,
      slug: tracked.slug,
      fallbackColor: tracked.fallbackColor,
      entry,
    })
  }

  for (const entry of catalog) {
    if (entry.slug === 'general' || entry.periodic_z == null) continue
    const z = entry.periodic_z
    const existing = map.get(z)
    const bestEntry =
      !existing?.entry || commodityScore(entry) > commodityScore(existing.entry)
        ? entry
        : existing.entry

    map.set(z, {
      z,
      slug: bestEntry?.slug ?? entry.slug,
      fallbackColor: bestEntry?.color ?? existing?.fallbackColor ?? entry.color,
      entry: bestEntry,
    })
  }

  return map
}

export function buildSpecialSlots(catalog: import('../types').MineralCatalogEntry[]): SpecialCommoditySlot[] {
  const bySlug = new Map<string, SpecialCommoditySlot>()

  for (const fallback of SPECIAL_COMMODITY_FALLBACKS) {
    bySlug.set(fallback.slug, fallback)
  }

  for (const entry of catalog) {
    if (!entry.periodic_special) continue
    const fallback = specialSlotMeta(entry.periodic_special)
    bySlug.set(entry.periodic_special, {
      slug: entry.slug,
      symbol: fallback?.symbol ?? entry.slug.slice(0, 2).toUpperCase(),
      label: fallback?.label ?? entry.name,
      fallbackColor: entry.color || fallback?.fallbackColor || '#64748B',
    })
  }

  return [...bySlug.values()]
}
