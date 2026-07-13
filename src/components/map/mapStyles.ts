import type { MapLayer } from '../../types'
import { Style, Fill, Stroke, RegularShape } from 'ol/style'
import type { FeatureLike } from 'ol/Feature'
import type { BasemapId } from './basemaps'
import { isImageryBasemap } from './basemaps'
import { zoomFromResolution } from './mapUtils'
import {
  resolveStructureRank,
  structureRankDash,
  structureRankLineWidth,
  type StructureLineRank,
} from './structureLineRank'

export type MapColorTheme = 'light' | 'dark'

function pointTriangleImage(fill: string, radius: number) {
  return new RegularShape({
    points: 3,
    radius,
    angle: 0,
    fill: new Fill({ color: fill }),
  })
}

function hexWithAlpha(hex: string, alpha: number) {
  const h = hex.replace('#', '')
  if (h.length !== 6) return hex
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function parseColor(hex: string, fallback: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : fallback
}

function featureProperties(feature?: FeatureLike): Record<string, unknown> | null {
  if (!feature || typeof feature.getProperties !== 'function') return null
  const props = feature.getProperties()
  if (!props || typeof props !== 'object') return null
  const { geometry: _geometry, ...rest } = props as Record<string, unknown>
  return rest
}

function lineStrokeColor(rank: StructureLineRank, lowZoom: boolean, darkTheme: boolean) {
  if (darkTheme) {
    if (rank === 1) {
      return lowZoom ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.9)'
    }
    if (rank === 2) {
      return lowZoom ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.78)'
    }
    return lowZoom ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.62)'
  }
  if (rank === 1) {
    return lowZoom ? 'rgba(20,20,20,0.45)' : 'rgba(20,20,20,0.78)'
  }
  if (rank === 2) {
    return lowZoom ? 'rgba(40,40,40,0.38)' : 'rgba(40,40,40,0.62)'
  }
  return lowZoom ? 'rgba(60,60,60,0.32)' : 'rgba(60,60,60,0.52)'
}

function buildLineStyle(
  layer: MapLayer,
  basemap: BasemapId,
  zoom: number,
  theme: MapColorTheme,
  feature?: FeatureLike
) {
  const style = layer.style || {}
  const rank = resolveStructureRank(layer, featureProperties(feature))
  const lowZoom = zoom < 6
  const width = structureRankLineWidth(rank, zoom, lowZoom)
  const lineDash = structureRankDash(rank)
  const customLine = parseColor(
    (style.stroke as string) || (style.fill as string) || '',
    ''
  )

  if (customLine) {
    return new Style({
      stroke: new Stroke({
        color: hexWithAlpha(customLine, lowZoom ? 0.78 : 0.95),
        width,
        lineCap: 'round',
        lineJoin: 'round',
        lineDash,
      }),
    })
  }

  return new Style({
    stroke: new Stroke({
      color: lineStrokeColor(rank, lowZoom, theme === 'dark'),
      width,
      lineCap: 'round',
      lineJoin: 'round',
      lineDash,
    }),
  })
}

export function buildLayerStyle(
  layer: MapLayer,
  basemap: BasemapId,
  zoom = 8,
  theme: MapColorTheme = 'light',
  feature?: FeatureLike
): Style {
  const style = layer.style || {}
  const onImagery = isImageryBasemap(basemap)
  const fill = parseColor((style.fill as string) || '', '#E87722')
  const strokeRaw = parseColor((style.stroke as string) || '', '#1a1a1a')

  if (layer.layer_type === 'point') {
    return new Style({
      image: pointTriangleImage(fill, onImagery ? 8 : 7),
    })
  }

  if (layer.layer_type === 'line') {
    return buildLineStyle(layer, basemap, zoom, theme, feature)
  }

  const fillOpacity = (style.fillOpacity as number) ?? (onImagery ? 0.62 : 0.52)
  const stroke = onImagery ? 'rgba(255,255,255,0.75)' : strokeRaw
  const strokeWidth = onImagery ? 1.2 : (style.strokeWidth as number) || 1

  return new Style({
    fill: new Fill({ color: hexWithAlpha(fill, fillOpacity) }),
    stroke: new Stroke({ color: stroke, width: strokeWidth }),
  })
}

export function buildLayerStyleFunction(layer: MapLayer, basemap: BasemapId, theme: MapColorTheme = 'light') {
  return (feature: FeatureLike, resolution: number) => {
    const zoom = zoomFromResolution(resolution)
    // Mobile country view is ~zoom 4–5; still draw faint lines when the user enables them.
    if (layer.layer_type === 'line' && zoom < 4) {
      return undefined
    }
    return buildLayerStyle(layer, basemap, zoom, theme, feature)
  }
}

export function buildHighlightStyle(layer: MapLayer, basemap: BasemapId, feature?: FeatureLike): Style {
  const style = layer.style || {}
  const fill = parseColor((style.fill as string) || '', '#E87722')

  if (layer.layer_type === 'point') {
    return new Style({
      image: pointTriangleImage(fill, 10),
    })
  }

  if (layer.layer_type === 'line') {
    const stroke = parseColor((style.stroke as string) || (style.fill as string) || '', '#E87722')
    const rank = resolveStructureRank(layer, featureProperties(feature))
    const width = structureRankLineWidth(rank, 10, false) + 0.6
    return new Style({
      stroke: new Stroke({
        color: stroke,
        width,
        lineCap: 'round',
        lineJoin: 'round',
      }),
    })
  }

  return new Style({
    fill: new Fill({ color: hexWithAlpha(fill, 0.78) }),
    stroke: new Stroke({ color: '#E87722', width: 2.5 }),
  })
}
