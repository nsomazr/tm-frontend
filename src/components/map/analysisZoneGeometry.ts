/** Analysis zone geometry and map overlay helpers. */

export interface AnalysisZoneSpec {
  lat: number
  lng: number
  areaKm2: number
  extended?: boolean
  /**
   * `point` — center tightly on the click (feature hit).
   * `zone` — frame the full analysis circle (empty-map click / extended area).
   */
  focusMode?: 'point' | 'zone'
}

/** Radius (km) of a circular zone with the given ground area. */
export function analysisZoneRadiusKm(areaKm2: number): number {
  return Math.sqrt(Math.max(areaKm2, 0.01) / Math.PI)
}

/** Polygon ring approximating a circle [lng, lat] for GeoJSON fallbacks. */
export function analysisZoneCircleRing(
  lat: number,
  lng: number,
  areaKm2: number,
  segments = 72
): number[][] {
  const radiusKm = analysisZoneRadiusKm(areaKm2)
  const latRad = (lat * Math.PI) / 180
  const kmPerDegLat = 111.0
  const kmPerDegLng = 111.0 * Math.max(0.2, Math.cos(latRad))
  const ring: number[][] = []

  for (let i = 0; i <= segments; i += 1) {
    const angle = (2 * Math.PI * i) / segments
    const northKm = radiusKm * Math.cos(angle)
    const eastKm = radiusKm * Math.sin(angle)
    ring.push([lng + eastKm / kmPerDegLng, lat + northKm / kmPerDegLat])
  }

  return ring
}

export function analysisZoneGeoJson(zone: AnalysisZoneSpec) {
  return {
    type: 'Feature' as const,
    properties: {
      areaKm2: zone.areaKm2,
      extended: zone.extended === true,
    },
    geometry: {
      type: 'Polygon' as const,
      coordinates: [analysisZoneCircleRing(zone.lat, zone.lng, zone.areaKm2)],
    },
  }
}

/**
 * Zoom so the circular zone diameter fills roughly targetFraction of the smaller map side.
 * Web Mercator approximation; clamped for Tanzania map use.
 */
export function recommendedZoomForAnalysisZone(
  lat: number,
  areaKm2: number,
  mapWidthPx: number,
  mapHeightPx: number,
  targetFraction = 0.46
): number {
  const diameterKm = analysisZoneRadiusKm(areaKm2) * 2
  const minDim = Math.max(120, Math.min(mapWidthPx, mapHeightPx))
  const latRad = (lat * Math.PI) / 180
  const metersPerPixelAtZoom0 = 156543.03392 * Math.max(0.2, Math.cos(latRad))
  const desiredDiameterPx = minDim * targetFraction
  const desiredMetersPerPixel = (diameterKm * 1000) / desiredDiameterPx
  const zoom = Math.log2(metersPerPixelAtZoom0 / desiredMetersPerPixel)
  return Math.max(6, Math.min(15.5, zoom))
}

export const DEFAULT_ANALYSIS_KM2 = 10

/** Platform cap: included default + paid extension cannot exceed this. */
export const MAX_ANALYSIS_KM2 = 300

export const EXTENSION_KM2_OPTIONS = [10, 25, 50, 100] as const
