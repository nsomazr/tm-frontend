export interface BoundaryLevelOption {
  value: number
  key: 'country' | 'regions' | 'districts' | 'wards' | 'villages'
  /** Short name for a single unit (e.g. Region, District). */
  label: string
  /** Layer name shown on the map and in uploads (e.g. Region boundaries). */
  boundaryLabel: string
  admon: string
  uploadOrder: number
  /** Accent for admin UI cards */
  accent: string
  accentSoft: string
}

export const BOUNDARY_LEVEL_OPTIONS: BoundaryLevelOption[] = [
  {
    value: 0,
    key: 'country',
    label: 'Country',
    boundaryLabel: 'Country boundary',
    admon: 'ADM0',
    uploadOrder: 1,
    accent: '#64748b',
    accentSoft: 'rgba(100, 116, 139, 0.12)',
  },
  {
    value: 1,
    key: 'regions',
    label: 'Region',
    boundaryLabel: 'Region boundaries',
    admon: 'ADM1',
    uploadOrder: 2,
    accent: '#4b5563',
    accentSoft: 'rgba(75, 85, 99, 0.14)',
  },
  {
    value: 2,
    key: 'districts',
    label: 'District',
    boundaryLabel: 'District boundaries',
    admon: 'ADM2',
    uploadOrder: 3,
    accent: '#0ea5e9',
    accentSoft: 'rgba(14, 165, 233, 0.12)',
  },
  {
    value: 3,
    key: 'wards',
    label: 'Ward',
    boundaryLabel: 'Ward boundaries',
    admon: 'ADM3',
    uploadOrder: 4,
    accent: '#a855f7',
    accentSoft: 'rgba(168, 85, 247, 0.12)',
  },
  {
    value: 4,
    key: 'villages',
    label: 'Village',
    boundaryLabel: 'Village boundaries',
    admon: 'ADM4',
    uploadOrder: 5,
    accent: '#f59e0b',
    accentSoft: 'rgba(245, 158, 11, 0.12)',
  },
]

export function boundaryLevelByValue(value: number): BoundaryLevelOption {
  return BOUNDARY_LEVEL_OPTIONS.find((l) => l.value === value) ?? BOUNDARY_LEVEL_OPTIONS[1]
}
