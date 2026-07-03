import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mapsApi } from '../../api'
import MapViewer from '../../components/map/MapViewer'
import { useDisplayName } from '../../i18n/useDisplayName'

export default function CoordinatesEditor() {
  const qc = useQueryClient()
  const displayName = useDisplayName()
  const [selectedLayerId, setSelectedLayerId] = useState<number | null>(null)
  const [form, setForm] = useState({
    latitude: '',
    longitude: '',
    label: '',
  })

  const { data: layers } = useQuery({
    queryKey: ['admin-layers'],
    queryFn: () => mapsApi.layers().then((r) => r.data),
  })

  const { data: features, refetch } = useQuery({
    queryKey: ['features', selectedLayerId],
    queryFn: () =>
      mapsApi.features({ layer: String(selectedLayerId!) }).then((r) => r.data),
    enabled: !!selectedLayerId,
  })

  const createFeature = useMutation({
    mutationFn: () => {
      const lng = parseFloat(form.longitude)
      const lat = parseFloat(form.latitude)
      return mapsApi.createFeature({
        layer: selectedLayerId!,
        geometry: { type: 'Point', coordinates: [lng, lat] },
        latitude: form.latitude,
        longitude: form.longitude,
        label: form.label,
        properties: { label: form.label },
      })
    },
    onSuccess: () => {
      refetch()
      qc.invalidateQueries({ queryKey: ['admin-layers'] })
      setForm({ latitude: '', longitude: '', label: '' })
    },
  })

  const deleteFeature = useMutation({
    mutationFn: (id: number) => mapsApi.deleteFeature(id),
    onSuccess: () => refetch(),
  })

  const layerList = layers?.results || []
  const selectedLayer = layerList.find((l) => l.id === selectedLayerId)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Coordinate Editor</h1>
      <p className="text-gray-600 text-sm mb-6">
        Add and manage map coordinates (points, polygons) for each layer.
      </p>

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <label className="block mb-4">
            <span className="text-sm text-gray-600">Select Layer</span>
            <select
              value={selectedLayerId || ''}
              onChange={(e) => setSelectedLayerId(Number(e.target.value) || null)}
              className="input mt-1"
            >
              <option value="">Choose a layer</option>
              {layerList.map((l) => (
                <option key={l.id} value={l.id}>{displayName(l)} ({l.layer_type})</option>
              ))}
            </select>
          </label>

          {selectedLayer && (
            <MapViewer
              layers={[selectedLayer]}
              className="h-[400px] w-full rounded-lg shadow mb-4"
            />
          )}

          {selectedLayerId && (
            <div className="card">
              <h3 className="font-bold mb-3">Add Point Coordinate</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <label>
                  <span className="text-xs text-gray-500">Latitude</span>
                  <input
                    value={form.latitude}
                    onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                    className="input mt-1"
                    placeholder="-6.5"
                  />
                </label>
                <label>
                  <span className="text-xs text-gray-500">Longitude</span>
                  <input
                    value={form.longitude}
                    onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                    className="input mt-1"
                    placeholder="34.8"
                  />
                </label>
              </div>
              <label className="block mb-3">
                <span className="text-xs text-gray-500">Label</span>
                <input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  className="input mt-1"
                />
              </label>
              <button
                onClick={() => createFeature.mutate()}
                disabled={!form.latitude || !form.longitude || createFeature.isPending}
                className="btn-primary text-sm"
              >
                Add Coordinate
              </button>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="font-bold mb-3">Features ({features?.results.length || 0})</h3>
          <div className="max-h-[600px] overflow-y-auto space-y-2">
            {features?.results.map((f) => (
              <div key={f.id} className="flex justify-between items-start border-b pb-2 text-sm">
                <div>
                  <p className="font-medium">{f.label || `Feature #${f.id}`}</p>
                  <p className="text-xs text-gray-500">
                    {f.latitude}, {f.longitude}
                  </p>
                </div>
                <button
                  onClick={() => deleteFeature.mutate(f.id)}
                  className="text-red-600 text-xs hover:underline"
                >
                  Delete
                </button>
              </div>
            ))}
            {!features?.results.length && selectedLayerId && (
              <p className="text-gray-500 text-sm">No features in this layer.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
