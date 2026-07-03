import { useQuery, useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { reportsApi, paymentsApi } from '../api'
import { useAuth } from '../auth/AuthContext'
import PhoneCheckoutModal, { handleCheckoutResponse } from '../components/payments/PhoneCheckoutModal'
import ReportsCatalogTable from '../components/reports/ReportsCatalogTable'
import { useTranslation } from '../i18n/LocaleContext'
import { interpolate } from '../i18n/utils'
import type { Report } from '../types'

function ReportCard({
  report,
  onDownload,
  onPurchase,
  purchasePending,
}: {
  report: Report
  onDownload: (slug: string) => void
  onPurchase: (id: number) => void
  purchasePending: boolean
}) {
  const { user, hasPaidAccess } = useAuth()
  const { m } = useTranslation()
  const r = m.reports

  const fullAccess = report.has_full_access || hasPaidAccess
  const isPreview = report.ai_summary?.is_preview || !fullAccess
  const findingsCount = report.key_findings_count ?? report.ai_summary?.key_findings?.length ?? 0

  return (
    <article className="card overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                fullAccess
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
                  : 'bg-amber-50 text-amber-800 ring-1 ring-amber-600/20'
              }`}
            >
              {fullAccess ? r.fullAccessBadge : r.previewBadge}
            </span>
            {report.mineral_name && (
              <span className="text-xs text-slate-500">{report.mineral_name}</span>
            )}
            {report.region_name && (
              <span className="text-xs text-slate-400">· {report.region_name}</span>
            )}
          </div>

          <h2 className="text-lg font-bold text-slate-900">{report.title}</h2>

          {report.ai_summary && (
            <div className={`mt-3 relative ${isPreview ? 'pr-1' : ''}`}>
              <p className={`text-sm text-slate-600 leading-relaxed ${isPreview ? 'line-clamp-3' : ''}`}>
                {report.ai_summary.summary}
              </p>
              {isPreview && (
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent"
                  aria-hidden
                />
              )}
            </div>
          )}

          {fullAccess && report.ai_summary?.key_findings && report.ai_summary.key_findings.length > 0 && (
            <ul className="mt-4 space-y-1.5">
              {report.ai_summary.key_findings.map((finding, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700">
                  <span className="text-terra-600 shrink-0">✓</span>
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          )}

          {isPreview && findingsCount > 0 && (
            <p className="mt-3 text-xs text-slate-500">
              🔒 {interpolate(r.findingsLocked, { count: findingsCount })}
            </p>
          )}

          {isPreview && (
            <p className="mt-2 text-xs text-slate-500">{r.unlockFindings}</p>
          )}
        </div>

        <div className="md:text-right shrink-0 flex flex-col items-stretch md:items-end gap-2">
          {!fullAccess && (
            <p className="font-bold text-terra-700 text-lg">
              {Number(report.price).toLocaleString()} {report.currency}
            </p>
          )}

          {fullAccess && hasPaidAccess ? (
            <button
              type="button"
              onClick={() => onDownload(report.slug)}
              className="btn-primary text-sm"
            >
              {r.includedCta}
            </button>
          ) : report.is_purchased ? (
            <button
              type="button"
              onClick={() => onDownload(report.slug)}
              className="btn-primary text-sm"
            >
              {r.downloadCta}
            </button>
          ) : fullAccess ? (
            <button
              type="button"
              onClick={() => onDownload(report.slug)}
              className="btn-primary text-sm"
            >
              {r.downloadCta}
            </button>
          ) : !user ? (
            <Link to="/login" className="btn-secondary text-sm text-center">
              {r.signInCta}
            </Link>
          ) : hasPaidAccess ? null : (
            <>
              <Link to="/subscriptions" className="btn-primary text-sm text-center">
                {r.upgradeCta}
              </Link>
              <button
                type="button"
                onClick={() => onPurchase(report.id)}
                disabled={purchasePending}
                className="text-xs text-slate-500 hover:text-terra-700 underline disabled:opacity-50"
              >
                {r.purchaseCta}
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  )
}

export default function DownloadsPage() {
  const { user, hasPaidAccess } = useAuth()
  const { m } = useTranslation()
  const r = m.reports
  const [checkoutReportId, setCheckoutReportId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => reportsApi.list().then((res) => res.data),
  })

  const purchase = useMutation({
    mutationFn: ({ reportId, msisdn }: { reportId: number; msisdn?: string }) =>
      paymentsApi.checkout({ order_type: 'download', report_id: reportId, msisdn }),
    onSuccess: ({ data: checkoutData }) => {
      setCheckoutReportId(null)
      handleCheckoutResponse(checkoutData)
    },
  })

  const download = async (slug: string) => {
    const { data: blob } = await reportsApi.download(slug)
    const url = window.URL.createObjectURL(new Blob([blob]))
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug}.pdf`
    a.click()
  }

  const reports = data?.results || []

  return (
    <div className="animate-fade-in max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="mb-8 sm:mb-10">
        <Link to="/" className="text-sm text-terra-600 hover:text-terra-700 font-medium">
          ← {r.browseMap}
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mt-4">{r.title}</h1>
        <p className="text-slate-600 mt-2 max-w-2xl">{r.subtitle}</p>
      </div>

      {hasPaidAccess && (
        <div className="mb-8 rounded-xl bg-terra-50 border border-terra-100 px-4 py-3 text-sm text-terra-900">
          {r.supportNote}
        </div>
      )}

      {!hasPaidAccess && (
        <div className="mb-8 rounded-xl bg-slate-100 border border-slate-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-slate-700">{r.unlockFindings}</p>
          <Link to="/subscriptions" className="btn-primary text-sm shrink-0 text-center">
            {r.upgradeCta}
          </Link>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">{r.loading}</p>
      ) : reports.length === 0 ? (
        <div className="card text-center text-slate-500">{r.empty}</div>
      ) : hasPaidAccess ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">{interpolate(r.catalogCount, { count: reports.length })}</p>
          <ReportsCatalogTable
            reports={reports}
            labels={{
              colReport: r.colReport,
              colMineral: r.colMineral,
              colRegion: r.colRegion,
              colFindings: r.colFindings,
              colAction: r.colAction,
              downloadCta: r.includedCta,
              noRegion: r.noRegion,
            }}
            onDownload={download}
          />
        </div>
      ) : (
        <div className="grid gap-6">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onDownload={download}
              onPurchase={(id) => setCheckoutReportId(id)}
              purchasePending={purchase.isPending}
            />
          ))}
        </div>
      )}

      <PhoneCheckoutModal
        open={checkoutReportId !== null}
        defaultPhone={user?.phone || ''}
        title="Confirm report purchase"
        description="Enter your mobile money number to pay via Selcom."
        confirmLabel="Pay now"
        loading={purchase.isPending}
        onCancel={() => setCheckoutReportId(null)}
        onConfirm={(msisdn) => {
          if (checkoutReportId !== null) purchase.mutate({ reportId: checkoutReportId, msisdn })
        }}
      />
    </div>
  )
}
