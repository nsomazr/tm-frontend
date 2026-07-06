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
  { slug: 'gold', label: 'Gold', aliases: ['gold', 'dhahabu', 'au'], hex: '#E87722', note: 'Precious metal: warm gold / amber', category: 'precious' },
  { slug: 'silver', label: 'Silver', aliases: ['silver', 'fedha', 'ag'], hex: '#C0C0C0', note: 'Precious metal: silver gray', category: 'precious' },
  { slug: 'copper', label: 'Copper', aliases: ['copper', 'shaba', 'cu'], hex: '#B87333', note: 'Base metal: copper brown', category: 'base' },
  { slug: 'iron-ore', label: 'Iron ore', aliases: ['iron', 'iron ore', 'fe', 'magnetite', 'hematite'], hex: '#4A3728', note: 'Iron / BIF: dark rust brown', category: 'base' },
  { slug: 'nickel', label: 'Nickel', aliases: ['nickel', 'ni'], hex: '#708090', note: 'Base metal: blue-gray', category: 'base' },
  { slug: 'lithium', label: 'Lithium', aliases: ['lithium', 'li', 'spodumene'], hex: '#00CED1', note: 'Battery metal: cyan', category: 'battery' },
  { slug: 'graphite', label: 'Graphite', aliases: ['graphite', 'carbon'], hex: '#2D2D2D', note: 'Industrial: charcoal', category: 'industrial' },
  { slug: 'diamond', label: 'Diamond', aliases: ['diamond', 'almasi', 'kimberlite'], hex: '#BACE73', note: 'Gem: pale chartreuse', category: 'gem' },
  { slug: 'tanzanite', label: 'Tanzanite', aliases: ['tanzanite', 'zoisite'], hex: '#7B2D8E', note: 'Gem: violet (Tanzania)', category: 'gem' },
  { slug: 'coal', label: 'Coal', aliases: ['coal', 'makaa'], hex: '#1A1A1A', note: 'Energy: near black', category: 'energy' },
  { slug: 'uranium', label: 'Uranium', aliases: ['uranium', 'u'], hex: '#32CD32', note: 'Radioactive: map green (USGS-style)', category: 'energy' },
  { slug: 'tin', label: 'Tin', aliases: ['tin', 'sn', 'cassiterite'], hex: '#A8A8A8', note: 'Base metal: light gray', category: 'base' },
  { slug: 'tungsten', label: 'Tungsten', aliases: ['tungsten', 'w', 'wolframite'], hex: '#36454F', note: 'Critical metal: charcoal blue', category: 'base' },
  { slug: 'zinc', label: 'Zinc', aliases: ['zinc', 'zn', 'sphalerite'], hex: '#7A8B8B', note: 'Base metal: blue-gray', category: 'base' },
  { slug: 'lead', label: 'Lead', aliases: ['lead', 'pb', 'galena'], hex: '#6B6B6B', note: 'Base metal: medium gray', category: 'base' },
  { slug: 'cobalt', label: 'Cobalt', aliases: ['cobalt', 'co'], hex: '#0047AB', note: 'Battery metal: cobalt blue', category: 'battery' },
  { slug: 'manganese', label: 'Manganese', aliases: ['manganese', 'mn', 'pyrolusite'], hex: '#8B4513', note: 'Industrial: saddle brown', category: 'industrial' },
  { slug: 'bauxite', label: 'Bauxite / Al', aliases: ['bauxite', 'aluminium', 'aluminum', 'al'], hex: '#CD853F', note: 'Aluminum ore: sandy brown', category: 'industrial' },
  { slug: 'phosphate', label: 'Phosphate', aliases: ['phosphate', 'phosphorite'], hex: '#E07A5F', note: 'Fertilizer: coral', category: 'industrial' },
  { slug: 'limestone', label: 'Limestone', aliases: ['limestone', 'lime'], hex: '#F5F5DC', note: 'Industrial: beige', category: 'industrial' },
  { slug: 'gypsum', label: 'Gypsum', aliases: ['gypsum', 'sulfate'], hex: '#E8E4D9', note: 'Industrial: off-white', category: 'industrial' },
  { slug: 'salt', label: 'Salt', aliases: ['salt', 'chumvi', 'halite'], hex: '#F0F8FF', note: 'Evaporite: alice blue', category: 'industrial' },
  { slug: 'rare-earth', label: 'Rare earth', aliases: ['rare earth', 'ree', 'neodymium'], hex: '#9932CC', note: 'Critical minerals: dark orchid', category: 'battery' },
  { slug: 'gemstone', label: 'Gemstones', aliases: ['gem', 'gemstone', 'ruby', 'sapphire', 'emerald'], hex: '#9B59B6', note: 'Colored gems: purple', category: 'gem' },
  { slug: 'oil-gas', label: 'Oil / gas', aliases: ['oil', 'gas', 'petroleum', 'hydrocarbon'], hex: '#1C2833', note: 'Energy: midnight blue', category: 'energy' },
  { slug: 'water', label: 'Groundwater', aliases: ['water', 'groundwater', 'aquifer'], hex: '#3498DB', note: 'Hydrogeology: blue', category: 'hydro' },
  { slug: 'vanadium', label: 'Vanadium', aliases: ['vanadium', 'v', 'vanadinite'], hex: '#4169E1', note: 'Battery metal: royal blue', category: 'battery' },
  { slug: 'platinum', label: 'Platinum', aliases: ['platinum', 'pt', 'pgm'], hex: '#E5E4E2', note: 'Precious / PGM: platinum gray', category: 'precious' },
  { slug: 'palladium', label: 'Palladium', aliases: ['palladium', 'pd'], hex: '#CED0DD', note: 'Precious / PGM: pale silver', category: 'precious' },
  { slug: 'chromium', label: 'Chromium', aliases: ['chromium', 'cr', 'chromite'], hex: '#5C4033', note: 'Critical metal: chromite brown', category: 'base' },
  { slug: 'molybdenum', label: 'Molybdenum', aliases: ['molybdenum', 'mo', 'molybdenite'], hex: '#778899', note: 'Base metal: light slate', category: 'base' },
  { slug: 'titanium', label: 'Titanium', aliases: ['titanium', 'ti', 'ilmenite', 'rutile'], hex: '#878681', note: 'Industrial: titanium gray', category: 'industrial' },
  { slug: 'tantalum', label: 'Tantalum', aliases: ['tantalum', 'ta', 'coltan'], hex: '#4B0082', note: 'Critical metal: indigo', category: 'battery' },
  { slug: 'niobium', label: 'Niobium', aliases: ['niobium', 'nb', 'columbite'], hex: '#7B68EE', note: 'Critical metal: medium slate blue', category: 'battery' },
  { slug: 'antimony', label: 'Antimony', aliases: ['antimony', 'sb', 'stibnite'], hex: '#9FA096', note: 'Industrial: gray-green', category: 'industrial' },
  { slug: 'zircon', label: 'Zircon', aliases: ['zircon', 'zr', 'zircon sand'], hex: '#D4AF37', note: 'Industrial: golden sand', category: 'industrial' },
  { slug: 'thorium', label: 'Thorium', aliases: ['thorium', 'th'], hex: '#FF4500', note: 'Radioactive: orange-red', category: 'energy' },
  { slug: 'potash', label: 'Potash', aliases: ['potash', 'k', 'sylvite'], hex: '#FF6B35', note: 'Fertilizer: orange', category: 'industrial' },
  { slug: 'sulfur', label: 'Sulfur', aliases: ['sulfur', 'sulphur', 's'], hex: '#D4C430', note: 'Industrial: sulfur yellow', category: 'industrial' },
  { slug: 'fluorspar', label: 'Fluorspar', aliases: ['fluorspar', 'fluorite', 'fluorine'], hex: '#9966CC', note: 'Industrial: amethyst purple', category: 'industrial' },
  { slug: 'kaolin', label: 'Kaolin / clay', aliases: ['kaolin', 'clay', 'china clay'], hex: '#F4E4BC', note: 'Industrial: pale clay', category: 'industrial' },
  { slug: 'sand-gravel', label: 'Sand & gravel', aliases: ['sand', 'gravel', 'aggregate'], hex: '#C2B280', note: 'Construction: sand tan', category: 'industrial' },
  { slug: 'peat', label: 'Peat', aliases: ['peat', 'tourbe'], hex: '#3D2817', note: 'Energy: dark peat', category: 'energy' },
  { slug: 'geothermal', label: 'Geothermal', aliases: ['geothermal', 'geothermal energy'], hex: '#E25822', note: 'Energy: flame orange', category: 'energy' },
  { slug: 'ruby', label: 'Ruby', aliases: ['ruby'], hex: '#E0115F', note: 'Gem: ruby red', category: 'gem' },
  { slug: 'sapphire', label: 'Sapphire', aliases: ['sapphire'], hex: '#0F52BA', note: 'Gem: sapphire blue', category: 'gem' },
  { slug: 'emerald', label: 'Emerald', aliases: ['emerald'], hex: '#50C878', note: 'Gem: emerald green', category: 'gem' },
  { slug: 'mercury', label: 'Mercury', aliases: ['mercury', 'hg', 'cinnabar'], hex: '#A9A9A9', note: 'Hazardous: dark silver', category: 'base' },
  { slug: 'natural-gas', label: 'Natural gas', aliases: ['natural gas', 'lng', 'lpg'], hex: '#4A5568', note: 'Energy: blue-gray', category: 'energy' },
]

/** Category display order for the color picker. */
export const MINERAL_COLOR_CATEGORY_ORDER: GeologicalColorCategory[] = [
  'precious',
  'base',
  'battery',
  'industrial',
  'energy',
  'gem',
  'hydro',
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
