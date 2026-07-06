import { useQuery } from '@tanstack/react-query'
import { fetchAllMapLayers } from '../api'
import type { MapLayer } from '../types'

const ADMIN_LAYERS_KEY = ['admin-layers'] as const

/** All map layers for admin screens (paginated fetch, shared cache). */
export function useAdminLayers() {
  return useQuery<MapLayer[]>({
    queryKey: ADMIN_LAYERS_KEY,
    queryFn: () => fetchAllMapLayers({ include_inactive: '1' }),
    staleTime: 5 * 60 * 1000,
  })
}

export { ADMIN_LAYERS_KEY }
