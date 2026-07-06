import { mapsApi } from '../../api'

type GeoJsonPayload = Awaited<ReturnType<typeof mapsApi.geojson>>['data']

const cache = new Map<string, Promise<GeoJsonPayload>>()

function cacheKey(slug: string, mineralSlug?: string) {
  return mineralSlug ? `${mineralSlug}/${slug}` : slug
}

export function loadLayerGeojson(slug: string, force = false, mineralSlug?: string): Promise<GeoJsonPayload> {
  const key = cacheKey(slug, mineralSlug)
  if (!force) {
    const cached = cache.get(key)
    if (cached) return cached
  } else {
    cache.delete(key)
  }

  const request = mapsApi.geojson(slug, mineralSlug).then((response) => response.data)
  cache.set(key, request)
  request.catch(() => {
    cache.delete(key)
  })
  return request
}

export function clearLayerGeojsonCache() {
  cache.clear()
}
