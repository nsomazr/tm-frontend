import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mapsApi, mineralsApi } from '../../api'
import { useAlternateName } from '../../i18n/useAlternateName'
import { useDisplayName } from '../../i18n/useDisplayName'

export default function LayersPage() {
  const qc = useQueryClient()
  const displayName = useDisplayName()
  const alternateName = useAlternateName()
  const [selectedLayer, setSelectedLayer] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)

  const { data: layers } = useQuery({
    queryKey: ['admin-layers'],
    queryFn: () => mapsApi.layers().then((r) => r.data),
  })

  useQuery({
    queryKey: ['minerals'],
    queryFn: () => mineralsApi.list().then((r) => r.data),
  })

  const importLayer = useMutation({
    mutationFn: () => {
      const layer = layers?.results.find((l) => l.slug === selectedLayer)
      if (!layer || !uploadFile) throw new Error('Missing layer or file')
      const name = uploadFile.name.toLowerCase()
      let fileType = 'geojson'
      if (name.endsWith('.shp') || name.includes('shp')) fileType = 'shapefile'
      else if (name.endsWith('.zip')) fileType = 'zip'
      return mapsApi.bulkImport(layer.slug, uploadFile, fileType)
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['admin-layers'] })
      setUploadFile(null)
      const status = res.data?.status
      setUploadStatus(status === 'completed' ? 'Import completed successfully.' : 'Import started…')
    },
    onError: (err: Error) => {
      setUploadStatus(`Import failed: ${err.message}`)
    },
  })

  const downloadSample = async (slug: string) => {
    try {
      const { data } = await mapsApi.sampleShapefile(slug)
      const url = URL.createObjectURL(data as Blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${slug}-sample.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Sample shapefile not found. Run: python manage.py generate_sample_shapefiles')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Map Layers</h1>
      <p className="text-sm text-slate-500 mb-6">
        Upload shapefiles or GeoJSON to replace prospects on a layer. Each upload replaces existing features on that layer.
      </p>

      <div className="card mb-8">
        <h2 className="font-bold mb-4">Import Shapefile / GeoJSON</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <label className="flex-1 min-w-[200px]">
            <span className="text-sm text-gray-600">Target layer</span>
            <select
              value={selectedLayer}
              onChange={(e) => setSelectedLayer(e.target.value)}
              className="input mt-1"
            >
              <option value="">Select layer</option>
              {layers?.results.map((l) => (
                <option key={l.id} value={l.slug}>
                  {displayName(l)} ({l.feature_count} features)
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-sm text-gray-600">File (.zip shapefile, .shp, .geojson)</span>
            <input
              type="file"
              accept=".zip,.shp,.geojson,.json"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="block mt-1 text-sm"
            />
          </label>
          <button
            onClick={() => importLayer.mutate()}
            disabled={!selectedLayer || !uploadFile || importLayer.isPending}
            className="btn-primary"
          >
            {importLayer.isPending ? 'Importing…' : 'Upload & replace'}
          </button>
        </div>
        {uploadStatus && (
          <p className="mt-3 text-sm text-slate-600">{uploadStatus}</p>
        )}
        <p className="mt-3 text-xs text-slate-400">
          ZIP must include .shp, .shx, and .dbf. Coordinates should be WGS84 (EPSG:4326).
        </p>
      </div>

      <div className="grid gap-4">
        {layers?.results.map((layer) => (
          <div key={layer.id} className="card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold">{displayName(layer)}</h3>
                <p className="text-sm text-gray-500">
                  {alternateName(layer) ? `${alternateName(layer)} · ` : ''}{layer.layer_type}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {layer.mineral_name} · z-index {layer.z_index} · {layer.feature_count} features
                  {layer.is_preview && ' · Preview (free tier)'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => downloadSample(layer.slug)}
                  className="text-xs px-2 py-1 border border-slate-200 rounded hover:bg-slate-50"
                >
                  Sample ZIP
                </button>
                <span
                  className="w-6 h-6 rounded flex-shrink-0"
                  style={{ backgroundColor: (layer.style?.fill as string) || '#ccc' }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
