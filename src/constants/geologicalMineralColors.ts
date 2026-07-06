export type GeologicalColorCategory =
  | 'precious'
  | 'base'
  | 'industrial'
  | 'energy'
  | 'gem'
  | 'battery'
  | 'hydro'

export interface GeologicalColorEntry {
  slug: string
  label: string
  aliases: string[]
  hex: string
  note: string
  category: GeologicalColorCategory
}

/** Standard exploration / geological map colors used by geologists worldwide. */
export const GEOLOGICAL_MINERAL_COLORS: GeologicalColorEntry[] = [
  { slug: 'gold', label: 'Gold', aliases: ['gold', 'dhahabu', 'au'], hex: '#E87722', note: 'Precious metal — warm gold / amber', category: 'precious' },
  { slug: 'silver', label: 'Silver', aliases: ['silver', 'fedha', 'ag'], hex: '#C0C0C0', note: 'Precious metal — silver gray', category: 'precious' },
  { slug: 'copper', label: 'Copper', aliases: ['copper', 'shaba', 'cu'], hex: '#B87333', note: 'Base metal — copper brown', category: 'base' },
  { slug: 'iron-ore', label: 'Iron ore', aliases: ['iron', 'iron ore', 'fe', 'magnetite', 'hematite'], hex: '#4A3728', note: 'Iron / BIF — dark rust brown', category: 'base' },
  { slug: 'nickel', label: 'Nickel', aliases: ['nickel', 'ni'], hex: '#708090', note: 'Base metal — blue-gray', category: 'base' },
  { slug: 'lithium', label: 'Lithium', aliases: ['lithium', 'li', 'spodumene'], hex: '#00CED1', note: 'Battery metal — cyan', category: 'battery' },
  { slug: 'graphite', label: 'Graphite', aliases: ['graphite', 'carbon'], hex: '#2D2D2D', note: 'Industrial — charcoal', category: 'industrial' },
  { slug: 'diamond', label: 'Diamond', aliases: ['diamond', 'almasi', 'kimberlite'], hex: '#BACE73', note: 'Gem — pale chartreuse', category: 'gem' },
  { slug: 'tanzanite', label: 'Tanzanite', aliases: ['tanzanite', 'zoisite'], hex: '#7B2D8E', note: 'Gem — violet (Tanzania)', category: 'gem' },
  { slug: 'coal', label: 'Coal', aliases: ['coal', 'makaa'], hex: '#1A1A1A', note: 'Energy — near black', category: 'energy' },
  { slug: 'uranium', label: 'Uranium', aliases: ['uranium', 'u'], hex: '#32CD32', note: 'Radioactive — map green (USGS-style)', category: 'energy' },
  { slug: 'tin', label: 'Tin', aliases: ['tin', 'sn', 'cassiterite'], hex: '#A8A8A8', note: 'Base metal — light gray', category: 'base' },
  { slug: 'tungsten', label: 'Tungsten', aliases: ['tungsten', 'w', 'wolframite'], hex: '#36454F', note: 'Critical metal — charcoal blue', category: 'base' },
  { slug: 'zinc', label: 'Zinc', aliases: ['zinc', 'zn', 'sphalerite'], hex: '#7A8B8B', note: 'Base metal — blue-gray', category: 'base' },
  { slug: 'lead', label: 'Lead', aliases: ['lead', 'pb', 'galena'], hex: '#6B6B6B', note: 'Base metal — medium gray', category: 'base' },
  { slug: 'cobalt', label: 'Cobalt', aliases: ['cobalt', 'co'], hex: '#0047AB', note: 'Battery metal — cobalt blue', category: 'battery' },
  { slug: 'manganese', label: 'Manganese', aliases: ['manganese', 'mn', 'pyrolusite'], hex: '#8B4513', note: 'Industrial — saddle brown', category: 'industrial' },
  { slug: 'bauxite', label: 'Bauxite / Al', aliases: ['bauxite', 'aluminium', 'aluminum', 'al'], hex: '#CD853F', note: 'Aluminum ore — sandy brown', category: 'industrial' },
  { slug: 'phosphate', label: 'Phosphate', aliases: ['phosphate', 'phosphorite'], hex: '#E07A5F', note: 'Fertilizer — coral', category: 'industrial' },
  { slug: 'limestone', label: 'Limestone', aliases: ['limestone', 'lime'], hex: '#F5F5DC', note: 'Industrial — beige', category: 'industrial' },
  { slug: 'gypsum', label: 'Gypsum', aliases: ['gypsum', 'sulfate'], hex: '#E8E4D9', note: 'Industrial — off-white', category: 'industrial' },
  { slug: 'salt', label: 'Salt', aliases: ['salt', 'chumvi', 'halite'], hex: '#F0F8FF', note: 'Evaporite — alice blue', category: 'industrial' },
  { slug: 'rare-earth', label: 'Rare earth', aliases: ['rare earth', 'ree', 'neodymium'], hex: '#9932CC', note: 'Critical minerals — dark orchid', category: 'battery' },
  { slug: 'gemstone', label: 'Gemstones', aliases: ['gem', 'gemstone', 'ruby', 'sapphire', 'emerald'], hex: '#9B59B6', note: 'Colored gems — purple', category: 'gem' },
  { slug: 'oil-gas', label: 'Oil / gas', aliases: ['oil', 'gas', 'petroleum', 'hydrocarbon'], hex: '#1C2833', note: 'Energy — midnight blue', category: 'energy' },
  { slug: 'water', label: 'Groundwater', aliases: ['water', 'groundwater', 'aquifer'], hex: '#3498DB', note: 'Hydrogeology — blue', category: 'hydro' },
]

function slugifyName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function matchGeologicalColor(layerName: string): GeologicalColorEntry | null {
  if (!layerName.trim()) return null
  const slug = slugifyName(layerName)
  const lower = layerName.toLowerCase()
  for (const entry of GEOLOGICAL_MINERAL_COLORS) {
    if (slug === entry.slug) return entry
    for (const alias of entry.aliases) {
      const aliasSlug = slugifyName(alias)
      if (lower.includes(alias) || (aliasSlug && slug.includes(aliasSlug))) {
        return entry
      }
    }
  }
  return null
}

export function geologicalColorBySlug(slug: string): GeologicalColorEntry | undefined {
  return GEOLOGICAL_MINERAL_COLORS.find((entry) => entry.slug === slug)
}
