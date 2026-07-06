/** Format polygon area for map insights (km² or hectares). */
export function formatAreaKm2(km2: number): string {
  if (km2 < 1) return `${(km2 * 100).toFixed(1)} ha`
  if (km2 < 100) return `${km2.toFixed(2)} km²`
  return `${km2.toFixed(1)} km²`
}
