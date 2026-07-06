import OSM from 'ol/source/OSM'
import XYZ from 'ol/source/XYZ'

export type BasemapId = 'streets' | 'light' | 'dark' | 'satellite' | 'terrain' | 'topo'

export interface BasemapOption {
  id: BasemapId
  label: string
  description: string
  preview: string
  attributions: string
  createSource: () => OSM | XYZ
}

export const BASEMAPS: BasemapOption[] = [
  {
    id: 'streets',
    label: 'Streets',
    description: 'OpenStreetMap roads & labels',
    preview: 'linear-gradient(135deg, #f0f4f8 0%, #cbd5e1 100%)',
    attributions: '© OpenStreetMap',
    createSource: () => createBasemapSource('streets'),
  },
  {
    id: 'light',
    label: 'Light',
    description: 'Clean minimal base',
    preview: 'linear-gradient(135deg, #fafafa 0%, #e2e8f0 100%)',
    attributions: '© CARTO © OSM',
    createSource: () => createBasemapSource('light'),
  },
  {
    id: 'satellite',
    label: 'Satellite',
    description: 'Esri world imagery',
    preview: 'linear-gradient(135deg, #1a3a2a 0%, #0f172a 50%, #1e293b 100%)',
    attributions: '© Esri',
    createSource: () => createBasemapSource('satellite'),
  },
  {
    id: 'terrain',
    label: 'Terrain',
    description: 'Hillshade & elevation',
    preview: 'linear-gradient(135deg, #d4c4a8 0%, #8b7355 50%, #4a6741 100%)',
    attributions: '© OpenTopoMap © OSM',
    createSource: () => createBasemapSource('terrain'),
  },
  {
    id: 'topo',
    label: 'Topo labels',
    description: 'Imagery + place names',
    preview: 'linear-gradient(135deg, #2d5016 0%, #1e3a5f 100%)',
    attributions: '© Esri © CARTO',
    createSource: () => createBasemapSource('topo'),
  },
  {
    id: 'dark',
    label: 'Dark',
    description: 'Night-style base',
    preview: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    attributions: '© CARTO © OSM',
    createSource: () => createBasemapSource('dark'),
  },
]

export function getBasemap(id: BasemapId): BasemapOption {
  return BASEMAPS.find((b) => b.id === id) ?? BASEMAPS[0]
}

export function basemapLabelOverlayVisible(basemap: BasemapId, showPlaceNames: boolean) {
  if (!showPlaceNames) return false
  return basemap === 'topo' || basemap === 'satellite'
}

export function createBasemapSource(id: BasemapId, showPlaceNames = true): OSM | XYZ {
  switch (id) {
    case 'light':
      return new XYZ({
        url: `https://{a-d}.basemaps.cartocdn.com/${showPlaceNames ? 'light_all' : 'light_nolabels'}/{z}/{x}/{y}.png`,
        maxZoom: 20,
        attributions: '© CARTO © OpenStreetMap',
      })
    case 'dark':
      return new XYZ({
        url: `https://{a-d}.basemaps.cartocdn.com/${showPlaceNames ? 'dark_all' : 'dark_nolabels'}/{z}/{x}/{y}.png`,
        maxZoom: 20,
        attributions: '© CARTO © OpenStreetMap',
      })
    case 'streets':
      if (showPlaceNames) return new OSM()
      return new XYZ({
        url: 'https://{a-d}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png',
        maxZoom: 20,
        attributions: '© CARTO © OpenStreetMap',
      })
    case 'satellite':
      return new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
        attributions: 'Tiles © Esri. Source: Esri, Maxar, Earthstar Geographics',
      })
    case 'terrain':
      return new XYZ({
        url: 'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png',
        maxZoom: 17,
        attributions: '© OpenTopoMap © OpenStreetMap',
      })
    case 'topo':
      return new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
        attributions: '© Esri',
      })
    default:
      return new OSM()
  }
}

export function isImageryBasemap(id: BasemapId): boolean {
  return id === 'satellite' || id === 'topo'
}

const STORAGE_KEY = 'tm-basemap'

export function themeDefaultBasemap(theme: 'light' | 'dark'): BasemapId {
  return theme === 'dark' ? 'dark' : 'light'
}

export function loadBasemapPreference(theme: 'light' | 'dark' = 'light'): BasemapId {
  return themeDefaultBasemap(theme)
}

export function saveBasemapPreference(id: BasemapId) {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    /* ignore */
  }
}

/** Optional label overlay for topo mode */
export function createLabelsSource() {
  return new XYZ({
    url: 'https://{a-d}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png',
    maxZoom: 20,
    attributions: '© CARTO',
  })
}
