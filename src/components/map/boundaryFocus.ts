import type { AdminBoundaryAtResponse, MineralSearchInsight } from '../../types'

export interface BoundaryFocus {
  id: number
  level: number
  name: string
}

export function hasAdminBoundaryAt(at: AdminBoundaryAtResponse): boolean {
  return !!(at.region || at.district || at.ward || at.village)
}

export function boundaryFocusFromAt(at: AdminBoundaryAtResponse): BoundaryFocus | null {
  if (at.village) {
    return { id: at.village.id, level: 4, name: at.village.name }
  }
  if (at.district) {
    return { id: at.district.id, level: 2, name: at.district.name }
  }
  if (at.ward) {
    return { id: at.ward.id, level: 3, name: at.ward.name }
  }
  if (at.region) {
    return { id: at.region.id, level: 1, name: at.region.name }
  }
  return null
}

export function resolveBoundaryFocus(
  item: MineralSearchInsight | null | undefined,
  geojson: { features?: unknown[] } | null | undefined
): BoundaryFocus | null {
  if (!item) return null

  if (item.type === 'region_boundary') {
    return { id: item.boundary_id ?? item.id, level: 1, name: item.name }
  }
  if (item.type === 'district_boundary') {
    return { id: item.boundary_id ?? item.id, level: 2, name: item.name }
  }
  if (item.type === 'ward_boundary') {
    return { id: item.boundary_id ?? item.id, level: 3, name: item.name }
  }
  if (item.type === 'village_boundary') {
    return { id: item.boundary_id ?? item.id, level: 4, name: item.name }
  }

  if (item.type === 'region' && geojson?.features?.length) {
    for (const raw of geojson.features) {
      const props = (raw as { properties?: { id?: number; level?: number; name?: string; name_sw?: string } })
        .properties
      if (props?.level !== 1 || props.id == null) continue
      if (props.name === item.name || (item.name_sw && props.name_sw === item.name_sw)) {
        return { id: props.id, level: 1, name: item.name }
      }
    }
  }

  return null
}

export function boundaryVisibilityForFocus(focus: BoundaryFocus) {
  if (focus.level === 4) {
    return { country: false, regions: false, districts: false, wards: false, villages: true }
  }
  if (focus.level === 3) {
    return { country: false, regions: false, districts: false, wards: true, villages: false }
  }
  if (focus.level === 2) {
    return { country: false, regions: false, districts: true, wards: false, villages: false }
  }
  return { country: false, regions: true, districts: false, wards: false, villages: false }
}
