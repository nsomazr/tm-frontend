import proj4 from 'proj4'
import { register } from 'ol/proj/proj4'
import { transform } from 'ol/proj'
import type { CoordinateDisplayFormat } from './coordinateFormat'
import { decimalToDms } from './coordinateFormat'

/** Stable CRS ids (must stay ≤ 32 chars for Country.coordinate_system). */
export type CoordinateSystemId = string

export type CoordinateSystemRegion =
  | 'global'
  | 'east-africa'
  | 'southern-africa'
  | 'west-africa'
  | 'north-africa'
  | 'europe'
  | 'north-america'
  | 'south-america'
  | 'asia'
  | 'oceania'
  | 'utm'

export interface CoordinateSystemOption {
  id: CoordinateSystemId
  label: string
  epsg: string
  kind: 'geographic' | 'projected'
  region: CoordinateSystemRegion
  /** ISO country codes this CRS is commonly used for. */
  countries?: string[]
  /** Extra search terms (aliases, local names). */
  keywords?: string[]
}

export const COORDINATE_SYSTEM_REGION_LABELS: Record<CoordinateSystemRegion, string> = {
  global: 'Global',
  'east-africa': 'East Africa',
  'southern-africa': 'Southern Africa',
  'west-africa': 'West Africa',
  'north-africa': 'North Africa',
  europe: 'Europe',
  'north-america': 'North America',
  'south-america': 'South America',
  asia: 'Asia',
  oceania: 'Oceania',
  utm: 'WGS 84 UTM zones',
}

/**
 * Static catalog of widely used national/regional CRS.
 * WGS 84 UTM zones are generated on demand (see `wgs84UtmOption`).
 */
export const COORDINATE_SYSTEMS: CoordinateSystemOption[] = [
  // Global
  {
    id: 'wgs84',
    label: 'WGS 84 (GPS)',
    epsg: 'EPSG:4326',
    kind: 'geographic',
    region: 'global',
    keywords: ['gps', 'lat lon', 'worldwide'],
  },
  {
    id: 'webmercator',
    label: 'WGS 84 Web Mercator',
    epsg: 'EPSG:3857',
    kind: 'projected',
    region: 'global',
    keywords: ['google', 'slippy', 'web maps'],
  },

  // East Africa
  {
    id: 'arc1960',
    label: 'Arc 1960',
    epsg: 'EPSG:4210',
    kind: 'geographic',
    region: 'east-africa',
    countries: ['TZ', 'KE', 'UG'],
    keywords: ['tanzania', 'kenya', 'uganda'],
  },
  {
    id: 'arc1960-utm35s',
    label: 'Arc 1960 / UTM 35S',
    epsg: 'EPSG:21035',
    kind: 'projected',
    region: 'east-africa',
    countries: ['TZ', 'KE', 'UG', 'RW', 'BI'],
  },
  {
    id: 'arc1960-utm36s',
    label: 'Arc 1960 / UTM 36S',
    epsg: 'EPSG:21036',
    kind: 'projected',
    region: 'east-africa',
    countries: ['TZ', 'KE', 'UG'],
  },
  {
    id: 'arc1960-utm37s',
    label: 'Arc 1960 / UTM 37S',
    epsg: 'EPSG:21037',
    kind: 'projected',
    region: 'east-africa',
    countries: ['TZ', 'KE'],
  },
  {
    id: 'adindan',
    label: 'Adindan',
    epsg: 'EPSG:4201',
    kind: 'geographic',
    region: 'east-africa',
    countries: ['ET', 'SD', 'ER'],
    keywords: ['ethiopia', 'sudan', 'eritrea'],
  },

  // Southern Africa
  {
    id: 'hartebeesthoek94',
    label: 'Hartebeesthoek94',
    epsg: 'EPSG:4148',
    kind: 'geographic',
    region: 'southern-africa',
    countries: ['ZA', 'LS', 'SZ', 'NA', 'BW'],
    keywords: ['south africa', 'wgs84'],
  },
  {
    id: 'cape',
    label: 'Cape',
    epsg: 'EPSG:4222',
    kind: 'geographic',
    region: 'southern-africa',
    countries: ['ZA', 'ZW', 'BW', 'LS'],
    keywords: ['south africa legacy'],
  },

  // West Africa
  {
    id: 'minna',
    label: 'Minna',
    epsg: 'EPSG:4263',
    kind: 'geographic',
    region: 'west-africa',
    countries: ['NG'],
    keywords: ['nigeria'],
  },
  {
    id: 'accra',
    label: 'Accra',
    epsg: 'EPSG:4168',
    kind: 'geographic',
    region: 'west-africa',
    countries: ['GH'],
    keywords: ['ghana'],
  },

  // North Africa
  {
    id: 'egypt1907',
    label: 'Egypt 1907',
    epsg: 'EPSG:4229',
    kind: 'geographic',
    region: 'north-africa',
    countries: ['EG'],
  },
  {
    id: 'merchich',
    label: 'Merchich',
    epsg: 'EPSG:4261',
    kind: 'geographic',
    region: 'north-africa',
    countries: ['MA'],
    keywords: ['morocco'],
  },
  {
    id: 'carthage',
    label: 'Carthage',
    epsg: 'EPSG:4223',
    kind: 'geographic',
    region: 'north-africa',
    countries: ['TN'],
    keywords: ['tunisia'],
  },

  // Europe
  {
    id: 'etrs89',
    label: 'ETRS89',
    epsg: 'EPSG:4258',
    kind: 'geographic',
    region: 'europe',
    countries: ['DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'PL', 'SE', 'NO', 'FI', 'AT', 'CH', 'PT', 'IE', 'DK'],
    keywords: ['europe'],
  },
  {
    id: 'osgb36',
    label: 'OSGB36 / British National Grid',
    epsg: 'EPSG:27700',
    kind: 'projected',
    region: 'europe',
    countries: ['GB'],
    keywords: ['uk', 'britain', 'ordnance survey'],
  },
  {
    id: 'pulkovo42',
    label: 'Pulkovo 1942',
    epsg: 'EPSG:4284',
    kind: 'geographic',
    region: 'europe',
    countries: ['RU', 'UA', 'BY', 'KZ'],
    keywords: ['russia', 'soviet'],
  },

  // North America
  {
    id: 'nad83',
    label: 'NAD83',
    epsg: 'EPSG:4269',
    kind: 'geographic',
    region: 'north-america',
    countries: ['US', 'CA', 'MX'],
    keywords: ['usa', 'canada', 'mexico'],
  },
  {
    id: 'nad27',
    label: 'NAD27',
    epsg: 'EPSG:4267',
    kind: 'geographic',
    region: 'north-america',
    countries: ['US', 'CA', 'MX'],
    keywords: ['legacy north america'],
  },

  // South America
  {
    id: 'sirgas2000',
    label: 'SIRGAS 2000',
    epsg: 'EPSG:4674',
    kind: 'geographic',
    region: 'south-america',
    countries: ['BR', 'AR', 'CL', 'CO', 'PE', 'VE', 'EC', 'BO', 'PY', 'UY'],
    keywords: ['brazil', 'latin america'],
  },
  {
    id: 'psad56',
    label: 'PSAD56',
    epsg: 'EPSG:4248',
    kind: 'geographic',
    region: 'south-america',
    countries: ['BO', 'CL', 'CO', 'EC', 'GY', 'PE', 'VE'],
    keywords: ['south america legacy'],
  },

  // Asia
  {
    id: 'cgcs2000',
    label: 'CGCS2000',
    epsg: 'EPSG:4490',
    kind: 'geographic',
    region: 'asia',
    countries: ['CN'],
    keywords: ['china'],
  },
  {
    id: 'tokyo',
    label: 'Tokyo',
    epsg: 'EPSG:4301',
    kind: 'geographic',
    region: 'asia',
    countries: ['JP'],
    keywords: ['japan legacy'],
  },
  {
    id: 'jgd2011',
    label: 'JGD2011',
    epsg: 'EPSG:6668',
    kind: 'geographic',
    region: 'asia',
    countries: ['JP'],
    keywords: ['japan'],
  },
  {
    id: 'kalianpur77',
    label: 'Kalianpur 1975',
    epsg: 'EPSG:4146',
    kind: 'geographic',
    region: 'asia',
    countries: ['IN'],
    keywords: ['india'],
  },

  // Oceania
  {
    id: 'gda94',
    label: 'GDA94',
    epsg: 'EPSG:4283',
    kind: 'geographic',
    region: 'oceania',
    countries: ['AU'],
    keywords: ['australia'],
  },
  {
    id: 'gda2020',
    label: 'GDA2020',
    epsg: 'EPSG:7844',
    kind: 'geographic',
    region: 'oceania',
    countries: ['AU'],
    keywords: ['australia'],
  },
  {
    id: 'nzgd2000',
    label: 'NZGD2000',
    epsg: 'EPSG:4167',
    kind: 'geographic',
    region: 'oceania',
    countries: ['NZ'],
    keywords: ['new zealand'],
  },
]

/** Preferred default CRS when a country has no saved platform setting. */
export const COUNTRY_DEFAULT_CRS: Record<string, CoordinateSystemId> = {
  TZ: 'arc1960',
  KE: 'arc1960',
  UG: 'arc1960',
  RW: 'arc1960-utm35s',
  BI: 'arc1960-utm35s',
  ET: 'adindan',
  SD: 'adindan',
  ER: 'adindan',
  ZA: 'hartebeesthoek94',
  NA: 'hartebeesthoek94',
  BW: 'hartebeesthoek94',
  LS: 'hartebeesthoek94',
  SZ: 'hartebeesthoek94',
  ZW: 'cape',
  NG: 'minna',
  GH: 'accra',
  EG: 'egypt1907',
  MA: 'merchich',
  TN: 'carthage',
  GB: 'osgb36',
  US: 'nad83',
  CA: 'nad83',
  MX: 'nad83',
  BR: 'sirgas2000',
  AR: 'sirgas2000',
  CL: 'sirgas2000',
  CO: 'sirgas2000',
  PE: 'sirgas2000',
  CN: 'cgcs2000',
  JP: 'jgd2011',
  IN: 'kalianpur77',
  AU: 'gda2020',
  NZ: 'nzgd2000',
  RU: 'pulkovo42',
  DE: 'etrs89',
  FR: 'etrs89',
  ES: 'etrs89',
  IT: 'etrs89',
  NL: 'etrs89',
}

export const DEFAULT_COORDINATE_SYSTEM: CoordinateSystemId = 'wgs84'
export const COORDINATE_SYSTEM_STORAGE_PREFIX = 'terra-map-crs'
export const COORDINATE_SYSTEM_CHANGE_EVENT = 'terra-map-crs-change'

const PROJ4_DEFS: Record<string, string> = {
  // East Africa Arc 1960
  'EPSG:4210': '+proj=longlat +ellps=clrk80 +towgs84=-160,-6,-302,0,0,0,0 +no_defs +type=crs',
  'EPSG:21035':
    '+proj=utm +zone=35 +south +ellps=clrk80 +towgs84=-160,-6,-302,0,0,0,0 +units=m +no_defs +type=crs',
  'EPSG:21036':
    '+proj=utm +zone=36 +south +ellps=clrk80 +towgs84=-160,-6,-302,0,0,0,0 +units=m +no_defs +type=crs',
  'EPSG:21037':
    '+proj=utm +zone=37 +south +ellps=clrk80 +towgs84=-160,-6,-302,0,0,0,0 +units=m +no_defs +type=crs',
  // Regional datums (approx Helmert where commonly published)
  'EPSG:4201': '+proj=longlat +ellps=clrk80 +towgs84=-166,-15,204,0,0,0,0 +no_defs +type=crs',
  'EPSG:4148': '+proj=longlat +ellps=WGS84 +towgs84=0,0,0,0,0,0,0 +no_defs +type=crs',
  'EPSG:4222': '+proj=longlat +a=6378249.145 +rf=293.4663077 +towgs84=-136,-108,-292,0,0,0,0 +no_defs +type=crs',
  'EPSG:4263': '+proj=longlat +ellps=clrk80 +towgs84=-92,-93,122,0,0,0,0 +no_defs +type=crs',
  'EPSG:4168': '+proj=longlat +a=6378300 +rf=296 +towgs84=-199,32,322,0,0,0,0 +no_defs +type=crs',
  'EPSG:4229': '+proj=longlat +ellps=helmert +towgs84=-130,110,-13,0,0,0,0 +no_defs +type=crs',
  'EPSG:4261': '+proj=longlat +ellps=clrk80 +towgs84=31,146,47,0,0,0,0 +no_defs +type=crs',
  'EPSG:4223': '+proj=longlat +ellps=clrk80 +towgs84=-263,6,431,0,0,0,0 +no_defs +type=crs',
  'EPSG:4258': '+proj=longlat +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +no_defs +type=crs',
  'EPSG:27700':
    '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs +type=crs',
  'EPSG:4284': '+proj=longlat +ellps=krass +towgs84=23.92,-141.27,-80.9,0,0.35,0.82,-0.12 +no_defs +type=crs',
  'EPSG:4269': '+proj=longlat +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +no_defs +type=crs',
  'EPSG:4267': '+proj=longlat +ellps=clrk66 +datum=NAD27 +no_defs +type=crs',
  'EPSG:4674': '+proj=longlat +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +no_defs +type=crs',
  'EPSG:4248': '+proj=longlat +ellps=intl +towgs84=-288,175,-376,0,0,0,0 +no_defs +type=crs',
  'EPSG:4490': '+proj=longlat +ellps=GRS80 +no_defs +type=crs',
  'EPSG:4301': '+proj=longlat +ellps=bessel +towgs84=-148,507,685,0,0,0,0 +no_defs +type=crs',
  'EPSG:6668': '+proj=longlat +ellps=GRS80 +no_defs +type=crs',
  'EPSG:4146': '+proj=longlat +a=6377299.151 +rf=300.8017255 +towgs84=295,736,257,0,0,0,0 +no_defs +type=crs',
  'EPSG:4283': '+proj=longlat +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +no_defs +type=crs',
  'EPSG:7844': '+proj=longlat +ellps=GRS80 +no_defs +type=crs',
  'EPSG:4167': '+proj=longlat +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +no_defs +type=crs',
}

let registered = false
const registeredUtm = new Set<string>()

export function coordinateSystemStorageKey(countryCode: string) {
  return `${COORDINATE_SYSTEM_STORAGE_PREFIX}-${countryCode.toUpperCase()}`
}

export function parseWgs84UtmId(id: string): { zone: number; south: boolean } | null {
  const match = id.trim().toLowerCase().match(/^wgs84-utm(\d{1,2})([ns])$/)
  if (!match) return null
  const zone = Number(match[1])
  if (!Number.isInteger(zone) || zone < 1 || zone > 60) return null
  return { zone, south: match[2] === 's' }
}

export function wgs84UtmId(zone: number, south: boolean): CoordinateSystemId {
  return `wgs84-utm${zone}${south ? 's' : 'n'}`
}

export function wgs84UtmOption(zone: number, south: boolean): CoordinateSystemOption {
  const id = wgs84UtmId(zone, south)
  const epsg = `EPSG:${south ? 32700 + zone : 32600 + zone}`
  return {
    id,
    label: `WGS 84 / UTM ${zone}${south ? 'S' : 'N'}`,
    epsg,
    kind: 'projected',
    region: 'utm',
    keywords: ['utm', 'projected', 'metres'],
  }
}

/** Suggest UTM zone from longitude (−180…180). */
export function utmZoneFromLongitude(lng: number): number {
  const zone = Math.floor((lng + 180) / 6) + 1
  return Math.min(60, Math.max(1, zone))
}

export function suggestedUtmForCountry(
  countryCode: string,
  center?: { lat: number; lng: number } | null,
): CoordinateSystemOption | null {
  if (!center || !Number.isFinite(center.lat) || !Number.isFinite(center.lng)) return null
  return wgs84UtmOption(utmZoneFromLongitude(center.lng), center.lat < 0)
}

export function defaultCoordinateSystemForCountry(countryCode: string): CoordinateSystemId {
  return COUNTRY_DEFAULT_CRS[countryCode.toUpperCase()] ?? DEFAULT_COORDINATE_SYSTEM
}

function ensureUtmRegistered(zone: number, south: boolean) {
  const epsg = `EPSG:${south ? 32700 + zone : 32600 + zone}`
  if (registeredUtm.has(epsg)) return
  const def = south
    ? `+proj=utm +zone=${zone} +south +datum=WGS84 +units=m +no_defs +type=crs`
    : `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs +type=crs`
  proj4.defs(epsg, def)
  registeredUtm.add(epsg)
  if (registered) register(proj4)
}

export function registerCoordinateProjections() {
  if (!registered) {
    for (const [code, def] of Object.entries(PROJ4_DEFS)) {
      proj4.defs(code, def)
    }
    register(proj4)
    registered = true
  }
}

export function coordinateSystemById(id: CoordinateSystemId): CoordinateSystemOption {
  const staticMatch = COORDINATE_SYSTEMS.find((c) => c.id === id)
  if (staticMatch) return staticMatch
  const utm = parseWgs84UtmId(id)
  if (utm) return wgs84UtmOption(utm.zone, utm.south)
  return COORDINATE_SYSTEMS.find((c) => c.id === 'wgs84') ?? COORDINATE_SYSTEMS[0]
}

export function isCoordinateSystemId(value: string): value is CoordinateSystemId {
  if (COORDINATE_SYSTEMS.some((c) => c.id === value)) return true
  return parseWgs84UtmId(value) != null
}

export function allCoordinateSystemOptions(extraUtm?: CoordinateSystemOption | null): CoordinateSystemOption[] {
  const options = [...COORDINATE_SYSTEMS]
  if (extraUtm && !options.some((o) => o.id === extraUtm.id)) {
    options.push(extraUtm)
  }
  return options
}

export function recommendedCoordinateSystems(
  countryCode: string,
  center?: { lat: number; lng: number } | null,
): CoordinateSystemOption[] {
  const code = countryCode.toUpperCase()
  const recommended: CoordinateSystemOption[] = []
  const seen = new Set<string>()

  const push = (option: CoordinateSystemOption | undefined | null) => {
    if (!option || seen.has(option.id)) return
    seen.add(option.id)
    recommended.push(option)
  }

  push(coordinateSystemById(defaultCoordinateSystemForCountry(code)))
  for (const option of COORDINATE_SYSTEMS) {
    if (option.countries?.includes(code)) push(option)
  }
  push(suggestedUtmForCountry(code, center))
  push(coordinateSystemById('wgs84'))
  push(coordinateSystemById('webmercator'))
  return recommended
}

export function searchCoordinateSystems(
  query: string,
  options: CoordinateSystemOption[] = COORDINATE_SYSTEMS,
): CoordinateSystemOption[] {
  const q = query.trim().toLowerCase()
  if (!q) return options
  return options.filter((option) => {
    const haystack = [
      option.id,
      option.label,
      option.epsg,
      option.region,
      COORDINATE_SYSTEM_REGION_LABELS[option.region],
      ...(option.countries ?? []),
      ...(option.keywords ?? []),
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
}

export function readStoredCoordinateSystem(countryCode = 'TZ'): CoordinateSystemId {
  if (typeof window === 'undefined') return defaultCoordinateSystemForCountry(countryCode)
  const stored = localStorage.getItem(coordinateSystemStorageKey(countryCode))
  if (stored && isCoordinateSystemId(stored)) return stored
  const legacy = localStorage.getItem('terra-map-crs')
  if (legacy && isCoordinateSystemId(legacy)) return legacy
  return defaultCoordinateSystemForCountry(countryCode)
}

export function storeCoordinateSystem(id: CoordinateSystemId, countryCode = 'TZ') {
  if (typeof window === 'undefined') return
  localStorage.setItem(coordinateSystemStorageKey(countryCode), id)
  window.dispatchEvent(
    new CustomEvent(COORDINATE_SYSTEM_CHANGE_EVENT, {
      detail: { id, countryCode: countryCode.toUpperCase() },
    }),
  )
}

export interface TransformedCoordinate {
  x: number
  y: number
  kind: 'geographic' | 'projected'
}

function ensureSystemProjection(system: CoordinateSystemOption) {
  registerCoordinateProjections()
  const utm = parseWgs84UtmId(system.id)
  if (utm) ensureUtmRegistered(utm.zone, utm.south)
}

export function transformMapCoordinate(
  mapCoordinate: number[],
  systemId: CoordinateSystemId,
): TransformedCoordinate {
  const system = coordinateSystemById(systemId)
  ensureSystemProjection(system)

  if (system.epsg === 'EPSG:3857') {
    const [x, y] = mapCoordinate
    return { x, y, kind: 'projected' }
  }

  const wgs84 = transform(mapCoordinate, 'EPSG:3857', 'EPSG:4326')

  if (system.epsg === 'EPSG:4326') {
    return { x: wgs84[0], y: wgs84[1], kind: 'geographic' }
  }

  const [x, y] = transform(wgs84, 'EPSG:4326', system.epsg)
  return { x, y, kind: system.kind }
}

export function lonLatFromCrs(
  x: number,
  y: number,
  systemId: CoordinateSystemId,
): [number, number] {
  const system = coordinateSystemById(systemId)
  ensureSystemProjection(system)
  if (system.epsg === 'EPSG:4326') return [x, y]
  if (system.epsg === 'EPSG:3857') {
    const [lng, lat] = transform([x, y], 'EPSG:3857', 'EPSG:4326')
    return [lng, lat]
  }
  const [lng, lat] = transform([x, y], system.epsg, 'EPSG:4326')
  return [lng, lat]
}

export function lonLatToCrs(
  lng: number,
  lat: number,
  systemId: CoordinateSystemId,
): TransformedCoordinate {
  const system = coordinateSystemById(systemId)
  ensureSystemProjection(system)
  if (system.epsg === 'EPSG:4326') {
    return { x: lng, y: lat, kind: 'geographic' }
  }
  if (system.epsg === 'EPSG:3857') {
    const [x, y] = transform([lng, lat], 'EPSG:4326', 'EPSG:3857')
    return { x, y, kind: 'projected' }
  }
  const [x, y] = transform([lng, lat], 'EPSG:4326', system.epsg)
  return { x, y, kind: system.kind }
}

export function formatCoordinate(
  coord: TransformedCoordinate,
  kind: 'geographic' | 'projected',
  format: CoordinateDisplayFormat = 'decimal',
): string {
  if (kind === 'geographic') {
    if (format === 'dms') {
      return `${decimalToDms(coord.y, 'lat')}, ${decimalToDms(coord.x, 'lng')}`
    }
    const lon = coord.x.toFixed(6)
    const lat = coord.y.toFixed(6)
    return `${lat}°, ${lon}°`
  }
  const easting = Math.round(coord.x).toLocaleString()
  const northing = Math.round(coord.y).toLocaleString()
  return `E ${easting}  N ${northing}`
}

export function formatCoordinateParts(
  coord: TransformedCoordinate,
  kind: 'geographic' | 'projected',
  format: CoordinateDisplayFormat = 'decimal',
): { primary: string; secondary: string } | null {
  if (kind !== 'geographic') return null
  if (format === 'dms') {
    return {
      primary: decimalToDms(coord.y, 'lat'),
      secondary: decimalToDms(coord.x, 'lng'),
    }
  }
  return {
    primary: `${coord.y.toFixed(6)}°`,
    secondary: `${coord.x.toFixed(6)}°`,
  }
}
