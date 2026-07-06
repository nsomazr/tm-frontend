import type OlMap from 'ol/Map'

export interface MapViewMetrics {
  viewAreaKm2: number
  viewportWidth: number
  viewportHeight: number
}

/** Ground area (km²) of the map's current visible extent. */
export function getMapViewMetrics(map: OlMap): MapViewMetrics | null {
  const size = map.getSize()
  if (!size || size[0] <= 0 || size[1] <= 0) return null

  const extent = map.getView().calculateExtent(size)
  const widthM = extent[2] - extent[0]
  const heightM = extent[3] - extent[1]
  if (widthM <= 0 || heightM <= 0) return null

  return {
    viewAreaKm2: (widthM * heightM) / 1_000_000,
    viewportWidth: size[0],
    viewportHeight: size[1],
  }
}
