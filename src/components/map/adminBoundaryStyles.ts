import { Fill, Stroke, Style, Text } from 'ol/style'
import type { FeatureLike } from 'ol/Feature'
import type { Geometry } from 'ol/geom'
import Polygon from 'ol/geom/Polygon'
import MultiPolygon from 'ol/geom/MultiPolygon'
import { BOUNDARY_LEVEL_OPTIONS } from './boundaryLevelOptions'

export interface BoundaryVisibility {
  country: boolean
  regions: boolean
  districts: boolean
  wards: boolean
  villages: boolean
}

export const DEFAULT_BOUNDARY_VISIBILITY: BoundaryVisibility = {
  country: false,
  regions: true,
  districts: false,
  wards: false,
  villages: false,
}

export type BoundaryLevelKey = keyof BoundaryVisibility

export function boundaryVisibilityIsDefault(visibility: BoundaryVisibility) {
  return (
    visibility.country === DEFAULT_BOUNDARY_VISIBILITY.country &&
    visibility.regions === DEFAULT_BOUNDARY_VISIBILITY.regions &&
    visibility.districts === DEFAULT_BOUNDARY_VISIBILITY.districts &&
    visibility.wards === DEFAULT_BOUNDARY_VISIBILITY.wards &&
    visibility.villages === DEFAULT_BOUNDARY_VISIBILITY.villages
  )
}

export function initialBoundaryVisibilityForGeoJson(
  geojson: { type: string; features: unknown[] } | null | undefined
): BoundaryVisibility {
  const next = { ...DEFAULT_BOUNDARY_VISIBILITY }
  const levels = boundaryLevelsFromGeoJson(geojson)
  if (levels.includes('regions')) next.regions = true
  return next
}

export function boundaryLevelsFromGeoJson(
  geojson: { type: string; features: unknown[] } | null | undefined,
  extraLevels: number[] = [],
): BoundaryLevelKey[] {
  const levels = new Set<number>(extraLevels)
  for (const raw of geojson?.features ?? []) {
    const feature = raw as { properties?: { level?: number } }
    const level = Number(feature.properties?.level ?? -1)
    if (level >= 0 && level <= 4) levels.add(level)
  }
  const keys: BoundaryLevelKey[] = []
  if (levels.has(0)) keys.push('country')
  if (levels.has(1)) keys.push('regions')
  if (levels.has(2)) keys.push('districts')
  if (levels.has(3)) keys.push('wards')
  if (levels.has(4)) keys.push('villages')
  return keys
}

const boundaryAccentByLevel = Object.fromEntries(
  BOUNDARY_LEVEL_OPTIONS.map((opt) => [opt.value, opt.accent])
) as Record<number, string>

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function boundaryPalette(level: number) {
  const accent = boundaryAccentByLevel[level] ?? '#64748b'
  return {
    stroke: hexToRgba(accent, 0.88),
    strokeMuted: hexToRgba(accent, 0.62),
    strokeFocus: hexToRgba(accent, 1),
    fillFocus: hexToRgba(accent, 0.14),
    label: hexToRgba(accent, 0.95),
  }
}

export function boundaryAccentColor(level: number) {
  return boundaryAccentByLevel[level] ?? '#64748b'
}

export function countryBoundaryStyle() {
  return new Style({
    stroke: new Stroke({
      color: 'rgba(30, 41, 59, 0.9)',
      width: 2.5,
    }),
    fill: new Fill({ color: 'rgba(148, 163, 184, 0.04)' }),
  })
}

function labelGeometry(feature: FeatureLike): Geometry | undefined {
  const geometry = feature.getGeometry()
  if (!geometry) return undefined

  if (geometry instanceof Polygon) {
    return geometry.getInteriorPoint()
  }

  if (geometry instanceof MultiPolygon) {
    const polygons = geometry.getPolygons()
    if (!polygons.length) return undefined

    let largest = polygons[0]
    let maxArea = largest.getArea()

    for (let i = 1; i < polygons.length; i++) {
      const area = polygons[i].getArea()
      if (area > maxArea) {
        maxArea = area
        largest = polygons[i]
      }
    }

    return largest.getInteriorPoint()
  }

  return undefined
}

function boundaryShapeWithLabel(
  shape: Style,
  showLabels: boolean,
  text: Text | null
): Style | Style[] {
  if (!showLabels || !text) return shape
  return [
    shape,
    new Style({
      geometry: (feature) => labelGeometry(feature),
      text,
    }),
  ]
}

export function regionBoundaryStyle(
  feature: FeatureLike,
  showLabels: boolean,
  focused = false,
  mineralTint?: string | null,
) {
  const name = String(feature.get('name') || '')
  const colors = boundaryPalette(1)
  const highlighted = !!mineralTint
  const shape = new Style({
    stroke: new Stroke({
      color: mineralTint ?? (focused ? colors.strokeFocus : colors.stroke),
      width: highlighted ? 3 : focused ? 3 : 2,
      lineCap: 'round',
      lineJoin: 'round',
    }),
    ...((focused || highlighted) && mineralTint
      ? { fill: new Fill({ color: hexToRgba(mineralTint, 0.28) }) }
      : focused
        ? { fill: new Fill({ color: colors.fillFocus }) }
        : {}),
  })
  const text = name
    ? new Text({
        text: name,
        font: '600 11px system-ui, sans-serif',
        fill: new Fill({ color: colors.label }),
        stroke: new Stroke({ color: 'rgba(255,255,255,0.92)', width: 3 }),
        overflow: false,
      })
    : null
  return boundaryShapeWithLabel(shape, showLabels, text)
}

export function districtBoundaryStyle(
  feature: FeatureLike,
  showLabels: boolean,
  focused = false,
  mineralTint?: string | null,
) {
  const name = String(feature.get('name') || '')
  const colors = boundaryPalette(2)
  const highlighted = !!mineralTint
  const shape = new Style({
    stroke: new Stroke({
      color: mineralTint ?? (focused ? colors.strokeFocus : colors.stroke),
      width: highlighted ? 2.5 : focused ? 2.5 : 1.5,
    }),
    ...((focused || highlighted) && mineralTint
      ? { fill: new Fill({ color: hexToRgba(mineralTint, 0.24) }) }
      : focused
        ? { fill: new Fill({ color: colors.fillFocus }) }
        : {}),
  })
  const text = name
    ? new Text({
        text: name,
        font: '500 9px system-ui, sans-serif',
        fill: new Fill({ color: colors.label }),
        stroke: new Stroke({ color: 'rgba(255,255,255,0.85)', width: 2 }),
        overflow: false,
      })
    : null
  return boundaryShapeWithLabel(shape, showLabels, text)
}

export function wardBoundaryStyle(feature: FeatureLike, showLabels: boolean, focused = false) {
  const name = String(feature.get('name') || '')
  const colors = boundaryPalette(3)
  const shape = new Style({
    stroke: new Stroke({
      color: focused ? colors.strokeFocus : colors.strokeMuted,
      width: focused ? 2 : 1.1,
    }),
    ...(focused ? { fill: new Fill({ color: colors.fillFocus }) } : {}),
  })
  const text = name
    ? new Text({
        text: name,
        font: '500 8px system-ui, sans-serif',
        fill: new Fill({ color: colors.label }),
        stroke: new Stroke({ color: 'rgba(255,255,255,0.85)', width: 2 }),
        overflow: false,
      })
    : null
  return boundaryShapeWithLabel(shape, showLabels, text)
}

export function villageBoundaryStyle(
  feature: FeatureLike,
  focused = false,
  mineralTint?: string | null,
) {
  const colors = boundaryPalette(4)
  const highlighted = !!mineralTint
  return new Style({
    stroke: new Stroke({
      color: mineralTint ?? (focused ? colors.strokeFocus : colors.stroke),
      width: highlighted ? 2.2 : focused ? 2 : 1.4,
      lineCap: 'round',
      lineJoin: 'round',
    }),
    ...((focused || highlighted) && mineralTint
      ? { fill: new Fill({ color: hexToRgba(mineralTint, 0.18) }) }
      : focused
        ? { fill: new Fill({ color: colors.fillFocus }) }
        : {}),
  })
}

/** Text-only style for a high z-index label layer (above mineral overlays). */
export function villageBoundaryLabelStyle(feature: FeatureLike) {
  const name = String(feature.get('name') || '').trim()
  if (!name) return undefined
  const colors = boundaryPalette(4)
  return new Style({
    geometry: (f) => labelGeometry(f),
    text: new Text({
      text: name,
      font: '500 9px system-ui, sans-serif',
      fill: new Fill({ color: colors.label }),
      stroke: new Stroke({ color: 'rgba(255,255,255,0.92)', width: 2.5 }),
      overflow: false,
    }),
  })
}

export function boundaryMinZoom(level: number) {
  if (level === 0) return 0
  if (level === 1) return 4
  if (level === 2) return 6
  if (level === 3) return 8
  return 0
}

export function boundaryLabelZoom(level: number) {
  if (level === 1) return 5
  if (level === 2) return 7
  if (level === 3) return 8
  return 8
}
