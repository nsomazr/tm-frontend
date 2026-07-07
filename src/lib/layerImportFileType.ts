/** Detect backend `file_type` for layer bulk import uploads. */
export function detectLayerImportFileType(filename: string): string {
  const name = filename.toLowerCase()
  if (name.endsWith('.zip')) return 'zip'
  if (name.endsWith('.shp')) return 'shapefile'
  if (name.endsWith('.csv')) return 'csv'
  if (name.endsWith('.geojson')) return 'geojson'
  if (name.endsWith('.json')) return 'json'
  return 'geojson'
}

export const LAYER_IMPORT_ACCEPT = '.zip,.shp,.geojson,.json,.csv'

export const LAYER_IMPORT_HINT =
  'ZIP (shapefile or GeoJSON/CSV inside), .geojson, .json, or .csv. Use WGS84 (EPSG:4326).'

export const LAYER_IMPORT_CSV_HINT =
  'Points: latitude, longitude (+ optional name). Lines/polygons: add feature_id to group vertices in order, or use wkt/geojson/vertices columns.'
