/** Report AOI buffer bounds (km). */
export const REPORT_BUFFER_KM_MIN = 1
export const REPORT_BUFFER_KM_MAX = 20

export function clampReportBufferKm(value: number): number {
  return Math.min(REPORT_BUFFER_KM_MAX, Math.max(REPORT_BUFFER_KM_MIN, Math.round(value)))
}

export function formatReportBufferKmRange(): string {
  return `${REPORT_BUFFER_KM_MIN}–${REPORT_BUFFER_KM_MAX} km`
}

/** Approximate circular area (km²) for a buffer radius, for map preview overlays. */
export function bufferRadiusToAreaKm2(radiusKm: number): number {
  return Math.PI * Math.max(radiusKm, 0.01) ** 2
}
