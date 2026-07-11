import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { geographyApi } from '../../api'
import BoundaryFileDropzone from '../../components/admin/BoundaryFileDropzone'
import BoundaryLevelPicker from '../../components/admin/BoundaryLevelPicker'
import CountrySelect from '../../components/map/CountrySelect'
import { boundaryLevelByValue } from '../../components/map/boundaryLevelOptions'
import { toast } from '../../components/ui/toast'
import { useTranslation } from '../../i18n/LocaleContext'

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return value
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default function AdminBoundariesPage() {
  const qc = useQueryClient()
  const { t, m } = useTranslation()
  const [searchParams] = useSearchParams()
  const levelParam = Number(searchParams.get('level'))
  const initialLevel =
    Number.isFinite(levelParam) && levelParam >= 0 && levelParam <= 4 ? levelParam : 1
  const [country, setCountry] = useState('TZ')
  const [level, setLevel] = useState(initialLevel)
  const [replace, setReplace] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [importProgress, setImportProgress] = useState<{
    done: number
    total: number
    phase?: string
  } | null>(null)

  const { data: countriesData, isLoading: countriesLoading } = useQuery({
    queryKey: ['countries'],
    queryFn: () => geographyApi.countries().then((r) => r.data),
    staleTime: 30 * 60 * 1000,
  })

  const countries = useMemo(() => {
    if (!countriesData) return []
    const list = Array.isArray(countriesData)
      ? countriesData
      : countriesData.results ?? []
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }, [countriesData])

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-boundary-stats', country],
    queryFn: () => geographyApi.adminBoundaryStats(country).then((r) => r.data),
  })

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Choose a GeoJSON or shapefile ZIP first.')
      const fd = new FormData()
      fd.append('file', file)
      fd.append('country', country)
      fd.append('level', String(level))
      fd.append('replace', replace ? 'true' : 'false')
      fd.append('async', 'true')

      const startRes = await geographyApi.importBoundaries(fd)
      const taskId = startRes.data.task_id
      if (!taskId) {
        return startRes.data
      }

      setImportProgress({ done: 0, total: 0, phase: 'starting' })

      while (true) {
        const { data } = await geographyApi.boundaryImportStatus(taskId)
        if (data.status === 'processing') {
          setImportProgress({
            done: data.done ?? 0,
            total: data.total ?? 0,
            phase: data.phase,
          })
          await sleep(800)
          continue
        }
        if (data.status === 'completed') {
          return data
        }
        if (data.status === 'failed') {
          throw new Error(data.error || 'Import failed')
        }
        await sleep(800)
      }
    },
    onSuccess: (res) => {
      const picked = boundaryLevelByValue(res.level ?? level)
      toast.success(t('adminBoundaries.importSuccess', { layer: picked.boundaryLabel }), {
        description: t('adminBoundaries.importSuccessDesc', {
          count: res.imported ?? 0,
          country: res.country ?? country,
        }),
      })
      setFile(null)
      void qc.invalidateQueries({ queryKey: ['admin-boundary-stats', country] })
      void qc.invalidateQueries({ queryKey: ['country-boundaries', country] })
      void qc.invalidateQueries({ queryKey: ['country-focus', country] })
      void qc.invalidateQueries({ queryKey: ['countries-with-boundaries'] })
    },
    onError: (err: Error) => {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
      toast.error(m.adminBoundaries.importFailed, {
        description: typeof detail === 'string' ? detail : err.message,
      })
    },
    onSettled: () => {
      setImportProgress(null)
    },
  })

  const levelMeta = boundaryLevelByValue(level)
  const progressPct =
    importProgress && importProgress.total > 0
      ? Math.min(100, Math.round((importProgress.done / importProgress.total) * 100))
      : null

  return (
    <div>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-app-text">{m.adminBoundaries.title}</h1>
          <p className="text-sm text-app-muted mt-0.5">{m.adminBoundaries.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link
            to="/admin/geological-reference"
            className="font-medium text-terra-600 dark:text-terra-400 hover:underline"
          >
            Geo reference
          </Link>
          <Link to="/" className="font-medium text-terra-600 dark:text-terra-400 hover:underline">
            {m.adminBoundaries.previewOnMap}
          </Link>
        </div>
      </header>

      <section className="rounded-xl border border-app-border bg-app-surface overflow-hidden">
        <div className="px-4 py-3 sm:px-5 border-b app-divider space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-app-text">{m.adminBoundaries.country}</span>
            {stats?.last_updated && (
              <span className="text-[11px] text-app-text-muted tabular-nums">
                {m.adminBoundaries.lastUpdated} {formatDate(stats.last_updated)}
              </span>
            )}
          </div>
          {countriesLoading ? (
            <p className="text-sm text-app-muted">{m.adminBoundaries.loading}</p>
          ) : (
            <CountrySelect
              countries={countries}
              value={country}
              onChange={setCountry}
              placeholder="Search name or code…"
              showCountHint={false}
            />
          )}
        </div>

        <div className="px-4 py-3 sm:px-5 border-b app-divider">
          {statsLoading ? (
            <p className="text-sm text-app-muted">{m.adminBoundaries.loading}</p>
          ) : (
            <BoundaryLevelPicker value={level} onChange={setLevel} stats={stats} />
          )}
        </div>

        <div className="px-4 py-3 sm:px-5 space-y-3">
          <div>
            <span className="text-sm font-medium text-app-text">{m.adminBoundaries.file}</span>
            <div className="mt-1.5">
              <BoundaryFileDropzone
                file={file}
                onFileChange={setFile}
                disabled={importMutation.isPending}
              />
            </div>
          </div>

          {importMutation.isPending && importProgress && (
            <div className="rounded-lg border border-app-border bg-app-bg px-3 py-2.5 space-y-2">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-app-secondary">
                  {importProgress.phase === 'parsing'
                    ? m.adminBoundaries.importParsing
                    : m.adminBoundaries.importProcessing}
                </span>
                {importProgress.total > 0 && (
                  <span className="tabular-nums text-app-muted">
                    {t('adminBoundaries.importProgress', {
                      done: importProgress.done.toLocaleString(),
                      total: importProgress.total.toLocaleString(),
                    })}
                  </span>
                )}
              </div>
              <div className="h-1.5 rounded-full bg-app-subtle overflow-hidden">
                <div
                  className="h-full rounded-full bg-terra-600 transition-all duration-300"
                  style={{ width: `${progressPct ?? 8}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={replace}
                onChange={(e) => setReplace(e.target.checked)}
                className="checkbox"
                disabled={importMutation.isPending}
              />
              <span>
                {t('adminBoundaries.replaceExisting', {
                  layer: levelMeta.label.toLowerCase(),
                })}
              </span>
            </label>
            <button
              type="button"
              onClick={() => importMutation.mutate()}
              disabled={!file || importMutation.isPending || countries.length === 0}
              className="btn-primary w-full sm:w-auto shrink-0"
            >
              {importMutation.isPending ? m.adminBoundaries.uploading : m.adminBoundaries.upload}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
