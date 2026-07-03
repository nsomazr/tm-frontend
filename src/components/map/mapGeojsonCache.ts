import { mapsApi } from '../../api'

type GeoJsonPayload = Awaited<ReturnType<typeof mapsApi.geojson>>['data']

const cache = new Map<string, Promise<GeoJsonPayload>>()

export function loadLayerGeojson(slug: string, force = false): Promise<GeoJsonPayload> {
  if (!force) {
    const cached = cache.get(slug)
    if (cached) return cached
  } else {
    cache.delete(slug)
  }

  const request = mapsApi.geojson(slug).then((response) => response.data)
  cache.set(slug, request)
  request.catch(() => {
    cache.delete(slug)
  })
  return request
}

export function clearLayerGeojsonCache() {
  cache.clear()
}
