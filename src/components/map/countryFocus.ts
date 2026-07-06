import { transformExtent } from 'ol/proj'
import type { Country, CountryFocus } from '../../types'

const TANZANIA_RING: number[][] = [
  [29.34, -11.72], [29.55, -10.35], [29.72, -8.95], [30.05, -8.15], [30.75, -7.55],
  [31.85, -8.05], [32.92, -9.15], [33.9, -9.55], [34.05, -10.45], [34.55, -11.05],
  [35.75, -11.45], [37.45, -11.72], [38.55, -11.35], [39.3, -10.15], [39.47, -8.55],
  [39.35, -6.85], [39.05, -5.35], [38.65, -4.55], [37.85, -3.55], [37.15, -2.85],
  [36.35, -1.85], [35.25, -1.05], [34.55, -0.99], [33.45, -1.0], [32.55, -1.05],
  [31.45, -1.55], [30.55, -2.35], [30.05, -3.55], [29.72, -5.25], [29.55, -7.15],
  [29.4, -9.35], [29.34, -11.72],
]

const PRESETS: Record<string, CountryFocus> = {
  TZ: {
    code: 'TZ', name: 'Tanzania', name_sw: 'Tanzania',
    center: { lat: -6.5, lng: 34.8 }, default_zoom: 6.5,
    bounds: { west: 29.34, south: -11.75, east: 40.44, north: -0.99 },
    geojson: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { kind: 'country' }, geometry: { type: 'Polygon', coordinates: [TANZANIA_RING] } }] },
  },
  KE: {
    code: 'KE', name: 'Kenya', name_sw: 'Kenya',
    center: { lat: 0.02, lng: 37.9 }, default_zoom: 6,
    bounds: { west: 33.9, south: -4.7, east: 41.9, north: 5.0 },
    geojson: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { kind: 'country' }, geometry: { type: 'Polygon', coordinates: [[[33.9, -4.7], [41.9, -4.7], [41.9, 5.0], [33.9, 5.0], [33.9, -4.7]]] } }] },
  },
  UG: {
    code: 'UG', name: 'Uganda', name_sw: 'Uganda',
    center: { lat: 1.37, lng: 32.29 }, default_zoom: 6,
    bounds: { west: 29.5, south: -1.5, east: 35.0, north: 4.23 },
    geojson: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { kind: 'country' }, geometry: { type: 'Polygon', coordinates: [[[29.5, -1.5], [35.0, -1.5], [35.0, 4.23], [29.5, 4.23], [29.5, -1.5]]] } }] },
  },
}

export const DEFAULT_COUNTRY_CODE = 'TZ'
export const COUNTRY_FOCUS_STORAGE_KEY = 'terra-map-country'
export const DEFAULT_COUNTRY_FOCUS = PRESETS.TZ

export function clientCountryFocus(code: string): CountryFocus {
  return PRESETS[code.toUpperCase()] ?? DEFAULT_COUNTRY_FOCUS
}

export function resolveCountryFocus(
  code: string,
  apiFocus?: CountryFocus | null,
  country?: Country | null
): CountryFocus {
  if (apiFocus?.bounds) return apiFocus
  const preset = PRESETS[code.toUpperCase()]
  if (preset) return preset
  if (country?.bounds && country.center_lat != null && country.center_lng != null) {
    return {
      code: country.code,
      name: country.name,
      name_sw: country.name_sw,
      center: { lat: country.center_lat, lng: country.center_lng },
      default_zoom: country.default_zoom ?? 5,
      bounds: country.bounds,
    }
  }
  return DEFAULT_COUNTRY_FOCUS
}

export function boundsToExtent(bounds: CountryFocus['bounds']) {
  return transformExtent([bounds.west, bounds.south, bounds.east, bounds.north], 'EPSG:4326', 'EPSG:3857')
}

export function countryOutlineGeoJson(focus: CountryFocus) {
  const features = focus.geojson?.features ?? []
  const countryOnly = features.filter((f) => f.properties?.kind === 'country')
  return { type: 'FeatureCollection' as const, features: countryOnly.length ? countryOnly : features.slice(0, 1) }
}

export function readStoredCountryCode() {
  return DEFAULT_COUNTRY_CODE
}

export function storeCountryCode(code: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(COUNTRY_FOCUS_STORAGE_KEY, code.toUpperCase())
}
