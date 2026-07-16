import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { geographyApi } from '../../api'
import AdminGeoReferenceMap from '../../components/admin/AdminGeoReferenceMap'
import FileUploadField from '../../components/ui/FileUploadField'
import UploadProgressBar from '../../components/ui/UploadProgressBar'
import { toast } from '../../components/ui/toast'
import CountrySelect from '../../components/map/CountrySelect'
import { LAYER_IMPORT_ACCEPT, LAYER_IMPORT_HINT } from '../../lib/layerImportFileType'
import type { GeoReferenceDataset } from '../../types'

const GEO_REF_QUERY = ['admin-geo-references'] as const

export default function AdminGeologicalReferencePage() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [country, setCountry] = useState('TZ')
  const [file, setFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [focusId, setFocusId] = useState<number | null>(null)

  const { data: countriesData } = useQuery({
    queryKey: ['countries'],
    queryFn: () => geographyApi.countries().then((r) => r.data),
    staleTime: 30 * 60 * 1000,
  })

  const countries = useMemo(() => {
    if (!countriesData) return []
    const list = Array.isArray(countriesData) ? countriesData : countriesData.results ?? []
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }, [countriesData])

  const { data: listData, isLoading } = useQuery({
    queryKey: GEO_REF_QUERY,
    queryFn: () => geographyApi.geoReferences().then((r) => r.data),
  })
  const datasets = listData?.results ?? []

  const { data: mapGeoJson, isFetching: mapLoading } = useQuery({
    queryKey: [...GEO_REF_QUERY, 'geojson', focusId ?? 'all'],
    queryFn: () => geographyApi.geoReferencesGeoJson(focusId ?? undefined).then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Enter a name for this geo information.')
      if (!file) throw new Error('Choose a ZIP / shapefile / GeoJSON upload.')
      const form = new FormData()
      form.append('name', name.trim())
      form.append('file', file)
      if (country) form.append('country', country)
      setUploadProgress(0)
      return geographyApi.createGeoReference(form, (pct) => setUploadProgress(pct))
    },
    onSuccess: (res) => {
      setUploadProgress(null)
      setFile(null)
      setName('')
      setFocusId(res.data.id)
      qc.invalidateQueries({ queryKey: GEO_REF_QUERY })
      toast.success('Geo reference uploaded', {
        description: `${res.data.feature_count.toLocaleString()} features imported.`,
      })
    },
    onError: (err: unknown) => {
      setUploadProgress(null)
      const detail =
        (err as { response?: { data?: { detail?: string } }; message?: string })?.response?.data
          ?.detail ||
        (err as Error)?.message ||
        'Upload failed'
      toast.error('Upload failed', { description: String(detail) })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => geographyApi.deleteGeoReference(id),
    onSuccess: (_res, id) => {
      if (focusId === id) setFocusId(null)
      qc.invalidateQueries({ queryKey: GEO_REF_QUERY })
      toast.success('Geo reference deleted')
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { detail?: string } }; message?: string })?.response?.data
          ?.detail ||
        (err as Error)?.message ||
        'Delete failed'
      toast.error('Delete failed', { description: String(detail) })
    },
  })

  const handleDelete = (row: GeoReferenceDataset) => {
    toast.confirm(`Delete “${row.name}”?`, {
      description: `Removes ${row.feature_count.toLocaleString()} reference features. Ask Terra will stop using this dataset.`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteMutation.mutate(row.id),
    })
  }

  const focusBounds =
    focusId != null ? datasets.find((row) => row.id === focusId)?.bounds ?? null : null

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-app-text">Geo reference</h1>
          <p className="text-sm text-app-muted mt-0.5">
            Upload geological shapefiles for Ask Terra. Admin only; never shown to normal users.
          </p>
        </div>
        <Link
          to="/admin/boundaries"
          className="text-sm font-medium text-terra-600 dark:text-terra-400 hover:underline shrink-0"
        >
          Geo information →
        </Link>
      </header>

      <section className="rounded-xl border border-app-border bg-app-surface p-5 space-y-4">
        <h2 className="text-sm font-semibold text-app-text">Upload geo information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-sm font-medium text-app-secondary">Name of the geo information</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full"
              placeholder="e.g. Central Tanzania basement geology"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-app-secondary">Country</span>
            <CountrySelect
              countries={countries}
              value={country}
              onChange={setCountry}
              placeholder="Search name or code…"
              showCountHint={false}
            />
          </label>
          <div className="block space-y-1.5">
            <span className="text-sm font-medium text-app-secondary">File upload</span>
            <FileUploadField
              accept={LAYER_IMPORT_ACCEPT}
              value={file}
              onChange={(next) => {
                setFile(next)
                setUploadProgress(null)
              }}
              placeholder="ZIP shapefile or GeoJSON"
              hint={LAYER_IMPORT_HINT}
            />
          </div>
        </div>
        {createMutation.isPending && uploadProgress != null && (
          <UploadProgressBar
            progress={uploadProgress}
            label={
              uploadProgress >= 100
                ? 'Upload complete. Processing on server…'
                : 'Uploading file…'
            }
          />
        )}
        <button
          type="button"
          className="btn-primary text-sm"
          disabled={createMutation.isPending || !name.trim() || !file}
          onClick={() => createMutation.mutate()}
        >
          {createMutation.isPending ? 'Uploading…' : 'Upload geo reference'}
        </button>
      </section>

      <section className="rounded-xl border border-app-border bg-app-surface overflow-hidden">
        <div className="px-5 py-3 border-b app-divider flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-app-text">Map of uploaded geo references</h2>
            <p className="text-xs text-app-text-muted mt-0.5">
              {focusId
                ? `Showing ${datasets.find((d) => d.id === focusId)?.name ?? 'selected dataset'}`
                : 'Showing all active geo references'}
              {mapLoading ? ' · Loading…' : ''}
            </p>
          </div>
          {focusId != null && (
            <button
              type="button"
              className="text-xs font-medium text-terra-600 hover:underline"
              onClick={() => setFocusId(null)}
            >
              Show all
            </button>
          )}
        </div>
        <div className="p-3 sm:p-4">
          <AdminGeoReferenceMap geojson={mapGeoJson} bounds={focusBounds} />
        </div>
      </section>

      <section className="rounded-xl border border-app-border bg-app-surface overflow-hidden">
        <div className="px-5 py-3 border-b app-divider">
          <h2 className="text-sm font-semibold text-app-text">Uploaded datasets</h2>
        </div>
        {isLoading ? (
          <p className="px-5 py-8 text-sm text-app-muted">Loading…</p>
        ) : datasets.length === 0 ? (
          <p className="px-5 py-8 text-sm text-app-muted">
            No geo references yet. Upload a ZIP shapefile or GeoJSON above.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-app-border)]">
            {datasets.map((row) => (
              <li
                key={row.id}
                className={`flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between ${
                  focusId === row.id ? 'bg-terra-500/5' : ''
                }`}
              >
                <div className="min-w-0">
                  <p className="font-medium text-app-text truncate">{row.name}</p>
                  <p className="text-xs text-app-text-muted mt-0.5">
                    {row.feature_count.toLocaleString()} features
                    {row.country_code ? ` · ${row.country_code}` : ''}
                    {row.source_filename ? ` · ${row.source_filename}` : ''}
                    {row.uploaded_by_name ? ` · ${row.uploaded_by_name}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    className="text-xs font-medium px-2.5 py-1 rounded-full border border-app-border hover:bg-app-subtle"
                    onClick={() => setFocusId(row.id)}
                  >
                    Show on map
                  </button>
                  <button
                    type="button"
                    className="text-xs font-medium px-2.5 py-1 rounded-full border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-950/40"
                    disabled={deleteMutation.isPending}
                    onClick={() => handleDelete(row)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
