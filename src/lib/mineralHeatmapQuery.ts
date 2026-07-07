import { analyticsApi } from '../api'
import type { MineralHeatmapData } from '../types'

export type MineralHeatmapQueryPayload = {
  slug: string
  data: MineralHeatmapData
}

export function mineralHeatmapQueryKey(
  slug: string,
  countryCode: string,
  layerScope: string = 'all',
) {
  return ['mineral-heatmap', slug, countryCode, layerScope] as const
}

export async function fetchMineralHeatmap(
  slug: string,
  countryCode: string,
  options?: { layerIds?: number[]; apiSlug?: string },
): Promise<MineralHeatmapQueryPayload> {
  const { data } = await analyticsApi.mineralHeatmap(options?.apiSlug ?? slug, {
    country: countryCode,
    layerIds: options?.layerIds,
  })
  return { slug, data }
}

export function mineralHeatmapLayerScope(layerIds?: number[]): string {
  if (!layerIds?.length) return 'all'
  return layerIds.slice().sort((a, b) => a - b).join(',')
}

export function mineralHeatmapQueryOptions(input: {
  slug: string
  countryCode: string
  layerIds?: number[]
  apiSlug?: string
}) {
  const layerScope = mineralHeatmapLayerScope(input.layerIds)
  return {
    queryKey: mineralHeatmapQueryKey(input.slug, input.countryCode, layerScope),
    queryFn: () =>
      fetchMineralHeatmap(input.slug, input.countryCode, {
        layerIds: input.layerIds,
        apiSlug: input.apiSlug,
      }),
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  }
}
