import type { MapLayer } from '../../types'
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style'
import type { FeatureLike } from 'ol/Feature'
import type { BasemapId } from './basemaps'
import { isImageryBasemap } from './basemaps'
import { zoomFromResolution } from './mapUtils'

export type MapColorTheme = 'light' | 'dark'

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

function isMainStructure(layer: MapLayer) {
  return /main-structures|mikuu|css/i.test(layer.slug + layer.name)
}

function lineStrokeColor(main: boolean, lowZoom: boolean, darkTheme: boolean) {
  if (darkTheme) {
    return main
      ? lowZoom
        ? 'rgba(255,255,255,0.55)'
        : 'rgba(255,255,255,0.88)'
      : lowZoom
        ? 'rgba(255,255,255,0.4)'
        : 'rgba(255,255,255,0.68)'
  }
  return main
    ? lowZoom
      ? 'rgba(20,20,20,0.45)'
      : 'rgba(20,20,20,0.72)'
    : lowZoom
      ? 'rgba(60,60,60,0.35)'
      : 'rgba(60,60,60,0.55)'
}

export function buildLayerStyle(
  layer: MapLayer,
  basemap: BasemapId,
  zoom = 8,
  theme: MapColorTheme = 'light'
): Style {
  const style = layer.style || {}
  const onImagery = isImageryBasemap(basemap)
  const fill = parseColor((style.fill as string) || '', '#E87722')
  const strokeRaw = parseColor((style.stroke as string) || '', '#1a1a1a')

  if (layer.layer_type === 'point') {
    return new Style({
      image: new CircleStyle({
        radius: onImagery ? 7 : 6,
        fill: new Fill({ color: fill }),
        stroke: new Stroke({ color: '#ffffff', width: 2 }),
      }),
    })
  }

  if (layer.layer_type === 'line') {
    const main = isMainStructure(layer)
    const baseWidth = main ? 1.8 : 1.2
    const zoomBoost = Math.max(0, zoom - 6) * 0.15
    const width = Math.min(baseWidth + zoomBoost, main ? 2.5 : 1.8)
    const lowZoom = zoom < 6
    return new Style({
      stroke: new Stroke({
        color: lineStrokeColor(main, lowZoom, theme === 'dark'),
        width: lowZoom ? Math.max(0.9, width * 0.85) : width,
        lineCap: 'round',
        lineJoin: 'round',
        lineDash: main ? undefined : [6, 4],
      }),
    })
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
  return (_feature: FeatureLike, resolution: number) => {
    const zoom = zoomFromResolution(resolution)
    // Mobile country view is ~zoom 4–5; still draw faint lines when the user enables them.
    if (layer.layer_type === 'line' && zoom < 4) {
      return undefined
    }
    return buildLayerStyle(layer, basemap, zoom, theme)
  }
}

export function buildHighlightStyle(layer: MapLayer, basemap: BasemapId): Style {
  const style = layer.style || {}
  const fill = parseColor((style.fill as string) || '', '#E87722')

  if (layer.layer_type === 'point') {
    return new Style({
      image: new CircleStyle({
        radius: 9,
        fill: new Fill({ color: fill }),
        stroke: new Stroke({ color: '#ffffff', width: 3 }),
      }),
    })
  }

  if (layer.layer_type === 'line') {
    return new Style({
      stroke: new Stroke({
        color: '#E87722',
        width: 2.5,
        lineCap: 'round',
      }),
    })
  }

  return new Style({
    fill: new Fill({ color: hexWithAlpha(fill, 0.78) }),
    stroke: new Stroke({ color: '#E87722', width: 2.5 }),
  })
}
