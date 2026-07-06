import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { geographyApi, mineralsApi, reportsApi, subscriptionsApi } from '../api'
import { useAuth } from '../auth/AuthContext'
import { ReportQuotaBanner } from '../components/reports/ReportQuotaBanner'
import { ReportCatalogTeaser } from '../components/reports/ReportPreviewContent'
import { useTranslation } from '../i18n/LocaleContext'
import { interpolate } from '../i18n/utils'

export default function DownloadsPage() {
  const { user, hasPaidAccess } = useAuth()
  const { m } = useTranslation()
  const r = m.reports
  const [mineralFilter, setMineralFilter] = useState('')
  const [regionFilter, setRegionFilter] = useState('')

  const { data: minerals } = useQuery({
    queryKey: ['minerals'],
    queryFn: () => mineralsApi.list().then((res) => res.data),
  })

  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: () => geographyApi.regions().then((res) => res.data),
  })

  const listParams = useMemo(() => {
    const params: Record<string, string> = {}
    if (mineralFilter) params.mineral = mineralFilter
    if (regionFilter) params.region = regionFilter
    return params
  }, [mineralFilter, regionFilter])

  const { data, isLoading } = useQuery({
    queryKey: ['reports', listParams],
    queryFn: () => reportsApi.list(listParams).then((res) => res.data),
  })

  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => subscriptionsApi.me().then((res) => res.data).catch(() => null),
    enabled: !!user && hasPaidAccess,
  })

  const reports = data?.results || []
  const quota = subscription?.download_quota

  return (
    <div className="animate-fade-in max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="mb-8 sm:mb-10">
        <Link to="/" className="text-sm text-terra-600 hover:text-terra-700 font-medium">
          ← {r.browseMap}
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mt-4">{r.title}</h1>
        <p className="text-slate-600 mt-2 max-w-2xl">{r.subtitle}</p>
      </div>

      {quota && !quota.unlimited && <ReportQuotaBanner quota={quota} />}

      {hasPaidAccess && (
        <div className="mb-8 rounded-xl bg-terra-50 border border-terra-100 px-4 py-3 text-sm text-terra-900">
          {r.supportNote}
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <select
          value={mineralFilter}
          onChange={(e) => setMineralFilter(e.target.value)}
          className="input max-w-xs text-sm"
        >
          <option value="">{r.filterAllMinerals}</option>
          {(minerals?.results ?? []).map((mineral) => (
            <option key={mineral.id} value={String(mineral.id)}>
              {mineral.name}
            </option>
          ))}
        </select>
        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          className="input max-w-xs text-sm"
        >
          <option value="">{r.filterAllRegions}</option>
          {(regions?.results ?? []).map((region) => (
            <option key={region.id} value={String(region.id)}>
              {region.name}
            </option>
          ))}
        </select>
      </div>

      {!hasPaidAccess && (
        <div className="mb-8 rounded-xl bg-slate-100 border border-slate-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-slate-700">{r.previewBanner}</p>
          <Link to="/subscriptions" className="btn-primary text-sm shrink-0 text-center">
            {r.upgradeCta}
          </Link>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">{r.loading}</p>
      ) : reports.length === 0 ? (
        <div className="card text-center text-slate-500">{r.empty}</div>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-slate-600">{interpolate(r.catalogCount, { count: reports.length })}</p>
          {reports.map((report) => (
            <ReportCatalogTeaser key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  )
}
