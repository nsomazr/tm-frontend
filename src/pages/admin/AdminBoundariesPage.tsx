import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { geographyApi } from '../../api'
import BoundaryFileDropzone from '../../components/admin/BoundaryFileDropzone'
import BoundaryLevelPicker from '../../components/admin/BoundaryLevelPicker'
import CountrySelect from '../../components/map/CountrySelect'
import { BOUNDARY_LEVEL_OPTIONS, boundaryLevelByValue } from '../../components/map/boundaryLevelOptions'
import { toast } from '../../components/ui/toast'
import { useTranslation } from '../../i18n/LocaleContext'
import { useDisplayName } from '../../i18n/useDisplayName'

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
  const displayName = useDisplayName()
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

  const selectedCountry = countries.find((c) => c.code === country)

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
    <div className="max-w-3xl">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-app-text">{m.adminBoundaries.title}</h1>
          <p className="text-sm text-app-muted mt-1">{m.adminBoundaries.subtitle}</p>
        </div>
        <Link
          to="/"
          className="text-sm font-medium text-terra-600 dark:text-terra-400 hover:underline shrink-0"
        >
          {m.adminBoundaries.previewOnMap} →
        </Link>
      </header>

      <section className="rounded-xl border border-app-border bg-app-surface p-5 mb-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <h2 className="font-semibold text-app-text">{m.adminBoundaries.currentCoverage}</h2>
          {selectedCountry && (
            <span className="text-sm text-app-muted">{displayName(selectedCountry)}</span>
          )}
        </div>
        {statsLoading ? (
          <p className="text-sm text-app-muted">{m.adminBoundaries.loading}</p>
        ) : (
          <>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              {BOUNDARY_LEVEL_OPTIONS.map((opt) => (
                <div key={opt.value}>
                  <dt className="text-app-muted text-xs">{opt.boundaryLabel}</dt>
                  <dd className="font-semibold text-app-text tabular-nums text-lg mt-0.5">
                    {stats?.counts[String(opt.value) as '0' | '1' | '2' | '3' | '4'] ?? 0}
                  </dd>
                </div>
              ))}
            </dl>
            {stats?.last_updated && (
              <p className="text-xs text-app-muted mt-4 pt-4 border-t border-app-border">
                {m.adminBoundaries.lastUpdated}: {formatDate(stats.last_updated)}
              </p>
            )}
          </>
        )}
      </section>

      <section className="rounded-xl border border-app-border bg-app-surface p-5 space-y-5">
        <h2 className="font-semibold text-app-text">{m.adminBoundaries.importTitle}</h2>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-app-secondary">{m.adminBoundaries.country}</span>
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
        </label>

        <BoundaryLevelPicker value={level} onChange={setLevel} stats={stats} />

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-app-secondary">{m.adminBoundaries.file}</span>
          <BoundaryFileDropzone
            file={file}
            onFileChange={setFile}
            disabled={importMutation.isPending}
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-app-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={replace}
            onChange={(e) => setReplace(e.target.checked)}
            className="rounded border-app-border text-terra-600"
            disabled={importMutation.isPending}
          />
          {t('adminBoundaries.replaceExisting', { layer: levelMeta.boundaryLabel.toLowerCase() })}
        </label>

        {importMutation.isPending && importProgress && (
          <div className="rounded-lg border border-app-border bg-app-bg px-4 py-3 space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
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
            <div className="h-2 rounded-full bg-app-subtle overflow-hidden">
              <div
                className="h-full rounded-full bg-terra-600 transition-all duration-300"
                style={{ width: `${progressPct ?? 8}%` }}
              />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => importMutation.mutate()}
          disabled={!file || importMutation.isPending || countries.length === 0}
          className="w-full rounded-lg bg-terra-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-terra-700 disabled:opacity-50 transition-colors"
        >
          {importMutation.isPending ? m.adminBoundaries.uploading : m.adminBoundaries.upload}
        </button>
      </section>
    </div>
  )
}
