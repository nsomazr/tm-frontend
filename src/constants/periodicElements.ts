/** Standard periodic table layout (118 elements + series placeholders). */

export type ElementCategory =
  | 'alkali'
  | 'alkaline-earth'
  | 'transition'
  | 'basic-metal'
  | 'semimetal'
  | 'nonmetal'
  | 'halogen'
  | 'noble'
  | 'lanthanide'
  | 'actinide'

export interface PeriodicElement {
  symbol: string
  name: string
  category: ElementCategory
}

/** 0 = empty, -1 = lanthanide series placeholder, -2 = actinide series placeholder. */
export const MAIN_TABLE_GRID: number[][] = [
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
  [3, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 6, 7, 8, 9, 10, 0],
  [11, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 13, 14, 15, 16, 17, 18, 0],
  [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
  [37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54],
  [55, 56, -1, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86],
  [87, 88, -2, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118],
]

export const LANTHANIDE_SERIES = [57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71]
export const ACTINIDE_SERIES = [89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103]

export const PERIODIC_GRID_COLS = 18
export const PERIODIC_GRID_ROWS = 7

export const ELEMENT_CATEGORY_COLORS: Record<ElementCategory, string> = {
  alkali: '#f4a6a6',
  'alkaline-earth': '#ffcc99',
  transition: '#ffe680',
  'basic-metal': '#a8d4f5',
  semimetal: '#b8e0a8',
  nonmetal: '#98d998',
  halogen: '#7fd9d9',
  noble: '#8eb8f0',
  lanthanide: '#c9a0e8',
  actinide: '#e8a0d4',
}

export const ELEMENTS_BY_Z: Record<number, PeriodicElement> = {
  1: { symbol: 'H', name: 'Hydrogen', category: 'nonmetal' },
  2: { symbol: 'He', name: 'Helium', category: 'noble' },
  3: { symbol: 'Li', name: 'Lithium', category: 'alkali' },
  4: { symbol: 'Be', name: 'Beryllium', category: 'alkaline-earth' },
  5: { symbol: 'B', name: 'Boron', category: 'semimetal' },
  6: { symbol: 'C', name: 'Carbon', category: 'nonmetal' },
  7: { symbol: 'N', name: 'Nitrogen', category: 'nonmetal' },
  8: { symbol: 'O', name: 'Oxygen', category: 'nonmetal' },
  9: { symbol: 'F', name: 'Fluorine', category: 'halogen' },
  10: { symbol: 'Ne', name: 'Neon', category: 'noble' },
  11: { symbol: 'Na', name: 'Sodium', category: 'alkali' },
  12: { symbol: 'Mg', name: 'Magnesium', category: 'alkaline-earth' },
  13: { symbol: 'Al', name: 'Aluminum', category: 'basic-metal' },
  14: { symbol: 'Si', name: 'Silicon', category: 'semimetal' },
  15: { symbol: 'P', name: 'Phosphorus', category: 'nonmetal' },
  16: { symbol: 'S', name: 'Sulfur', category: 'nonmetal' },
  17: { symbol: 'Cl', name: 'Chlorine', category: 'halogen' },
  18: { symbol: 'Ar', name: 'Argon', category: 'noble' },
  19: { symbol: 'K', name: 'Potassium', category: 'alkali' },
  20: { symbol: 'Ca', name: 'Calcium', category: 'alkaline-earth' },
  21: { symbol: 'Sc', name: 'Scandium', category: 'transition' },
  22: { symbol: 'Ti', name: 'Titanium', category: 'transition' },
  23: { symbol: 'V', name: 'Vanadium', category: 'transition' },
  24: { symbol: 'Cr', name: 'Chromium', category: 'transition' },
  25: { symbol: 'Mn', name: 'Manganese', category: 'transition' },
  26: { symbol: 'Fe', name: 'Iron', category: 'transition' },
  27: { symbol: 'Co', name: 'Cobalt', category: 'transition' },
  28: { symbol: 'Ni', name: 'Nickel', category: 'transition' },
  29: { symbol: 'Cu', name: 'Copper', category: 'transition' },
  30: { symbol: 'Zn', name: 'Zinc', category: 'transition' },
  31: { symbol: 'Ga', name: 'Gallium', category: 'basic-metal' },
  32: { symbol: 'Ge', name: 'Germanium', category: 'semimetal' },
  33: { symbol: 'As', name: 'Arsenic', category: 'semimetal' },
  34: { symbol: 'Se', name: 'Selenium', category: 'nonmetal' },
  35: { symbol: 'Br', name: 'Bromine', category: 'halogen' },
  36: { symbol: 'Kr', name: 'Krypton', category: 'noble' },
  37: { symbol: 'Rb', name: 'Rubidium', category: 'alkali' },
  38: { symbol: 'Sr', name: 'Strontium', category: 'alkaline-earth' },
  39: { symbol: 'Y', name: 'Yttrium', category: 'transition' },
  40: { symbol: 'Zr', name: 'Zirconium', category: 'transition' },
  41: { symbol: 'Nb', name: 'Niobium', category: 'transition' },
  42: { symbol: 'Mo', name: 'Molybdenum', category: 'transition' },
  43: { symbol: 'Tc', name: 'Technetium', category: 'transition' },
  44: { symbol: 'Ru', name: 'Ruthenium', category: 'transition' },
  45: { symbol: 'Rh', name: 'Rhodium', category: 'transition' },
  46: { symbol: 'Pd', name: 'Palladium', category: 'transition' },
  47: { symbol: 'Ag', name: 'Silver', category: 'transition' },
  48: { symbol: 'Cd', name: 'Cadmium', category: 'transition' },
  49: { symbol: 'In', name: 'Indium', category: 'basic-metal' },
  50: { symbol: 'Sn', name: 'Tin', category: 'basic-metal' },
  51: { symbol: 'Sb', name: 'Antimony', category: 'semimetal' },
  52: { symbol: 'Te', name: 'Tellurium', category: 'semimetal' },
  53: { symbol: 'I', name: 'Iodine', category: 'halogen' },
  54: { symbol: 'Xe', name: 'Xenon', category: 'noble' },
  55: { symbol: 'Cs', name: 'Cesium', category: 'alkali' },
  56: { symbol: 'Ba', name: 'Barium', category: 'alkaline-earth' },
  57: { symbol: 'La', name: 'Lanthanum', category: 'lanthanide' },
  58: { symbol: 'Ce', name: 'Cerium', category: 'lanthanide' },
  59: { symbol: 'Pr', name: 'Praseodymium', category: 'lanthanide' },
  60: { symbol: 'Nd', name: 'Neodymium', category: 'lanthanide' },
  61: { symbol: 'Pm', name: 'Promethium', category: 'lanthanide' },
  62: { symbol: 'Sm', name: 'Samarium', category: 'lanthanide' },
  63: { symbol: 'Eu', name: 'Europium', category: 'lanthanide' },
  64: { symbol: 'Gd', name: 'Gadolinium', category: 'lanthanide' },
  65: { symbol: 'Tb', name: 'Terbium', category: 'lanthanide' },
  66: { symbol: 'Dy', name: 'Dysprosium', category: 'lanthanide' },
  67: { symbol: 'Ho', name: 'Holmium', category: 'lanthanide' },
  68: { symbol: 'Er', name: 'Erbium', category: 'lanthanide' },
  69: { symbol: 'Tm', name: 'Thulium', category: 'lanthanide' },
  70: { symbol: 'Yb', name: 'Ytterbium', category: 'lanthanide' },
  71: { symbol: 'Lu', name: 'Lutetium', category: 'lanthanide' },
  72: { symbol: 'Hf', name: 'Hafnium', category: 'transition' },
  73: { symbol: 'Ta', name: 'Tantalum', category: 'transition' },
  74: { symbol: 'W', name: 'Tungsten', category: 'transition' },
  75: { symbol: 'Re', name: 'Rhenium', category: 'transition' },
  76: { symbol: 'Os', name: 'Osmium', category: 'transition' },
  77: { symbol: 'Ir', name: 'Iridium', category: 'transition' },
  78: { symbol: 'Pt', name: 'Platinum', category: 'transition' },
  79: { symbol: 'Au', name: 'Gold', category: 'transition' },
  80: { symbol: 'Hg', name: 'Mercury', category: 'transition' },
  81: { symbol: 'Tl', name: 'Thallium', category: 'basic-metal' },
  82: { symbol: 'Pb', name: 'Lead', category: 'basic-metal' },
  83: { symbol: 'Bi', name: 'Bismuth', category: 'basic-metal' },
  84: { symbol: 'Po', name: 'Polonium', category: 'semimetal' },
  85: { symbol: 'At', name: 'Astatine', category: 'transition' },
  86: { symbol: 'Rn', name: 'Radon', category: 'noble' },
  87: { symbol: 'Fr', name: 'Francium', category: 'alkali' },
  88: { symbol: 'Ra', name: 'Radium', category: 'alkaline-earth' },
  89: { symbol: 'Ac', name: 'Actinium', category: 'actinide' },
  90: { symbol: 'Th', name: 'Thorium', category: 'actinide' },
  91: { symbol: 'Pa', name: 'Protactinium', category: 'actinide' },
  92: { symbol: 'U', name: 'Uranium', category: 'actinide' },
  93: { symbol: 'Np', name: 'Neptunium', category: 'actinide' },
  94: { symbol: 'Pu', name: 'Plutonium', category: 'actinide' },
  95: { symbol: 'Am', name: 'Americium', category: 'actinide' },
  96: { symbol: 'Cm', name: 'Curium', category: 'actinide' },
  97: { symbol: 'Bk', name: 'Berkelium', category: 'actinide' },
  98: { symbol: 'Cf', name: 'Californium', category: 'actinide' },
  99: { symbol: 'Es', name: 'Einsteinium', category: 'actinide' },
  100: { symbol: 'Fm', name: 'Fermium', category: 'actinide' },
  101: { symbol: 'Md', name: 'Mendelevium', category: 'actinide' },
  102: { symbol: 'No', name: 'Nobelium', category: 'actinide' },
  103: { symbol: 'Lr', name: 'Lawrencium', category: 'actinide' },
  104: { symbol: 'Rf', name: 'Rutherfordium', category: 'transition' },
  105: { symbol: 'Db', name: 'Dubnium', category: 'transition' },
  106: { symbol: 'Sg', name: 'Seaborgium', category: 'transition' },
  107: { symbol: 'Bh', name: 'Bohrium', category: 'transition' },
  108: { symbol: 'Hs', name: 'Hassium', category: 'transition' },
  109: { symbol: 'Mt', name: 'Meitnerium', category: 'transition' },
  110: { symbol: 'Ds', name: 'Darmstadtium', category: 'transition' },
  111: { symbol: 'Rg', name: 'Roentgenium', category: 'transition' },
  112: { symbol: 'Cn', name: 'Copernicium', category: 'transition' },
  113: { symbol: 'Nh', name: 'Nihonium', category: 'basic-metal' },
  114: { symbol: 'Fl', name: 'Flerovium', category: 'basic-metal' },
  115: { symbol: 'Mc', name: 'Moscovium', category: 'basic-metal' },
  116: { symbol: 'Lv', name: 'Livermorium', category: 'basic-metal' },
  117: { symbol: 'Ts', name: 'Tennessine', category: 'halogen' },
  118: { symbol: 'Og', name: 'Oganesson', category: 'noble' },
}
