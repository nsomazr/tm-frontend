import { Fragment, useState } from 'react'
import type { Report } from '../../types'

interface ReportsCatalogTableLabels {
  colReport: string
  colMineral: string
  colRegion: string
  colFindings: string
  colAction: string
  downloadCta: string
  noRegion: string
}

interface ReportsCatalogTableProps {
  reports: Report[]
  labels: ReportsCatalogTableLabels
  onDownload: (slug: string) => void
}

export default function ReportsCatalogTable({ reports, labels, onDownload }: ReportsCatalogTableProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null)

  return (
    <div className="card-flat overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              <th className="text-left py-3 px-4 font-semibold text-slate-700">{labels.colReport}</th>
              <th className="text-left py-3 px-4 font-semibold text-slate-700 hidden sm:table-cell">
                {labels.colMineral}
              </th>
              <th className="text-left py-3 px-4 font-semibold text-slate-700 hidden md:table-cell">
                {labels.colRegion}
              </th>
              <th className="text-center py-3 px-4 font-semibold text-slate-700 w-24 hidden lg:table-cell">
                {labels.colFindings}
              </th>
              <th className="text-right py-3 px-4 font-semibold text-slate-700 w-36">{labels.colAction}</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => {
              const expanded = expandedId === report.id
              const findings = report.ai_summary?.key_findings ?? []
              const findingsCount = report.key_findings_count ?? findings.length

              return (
                <Fragment key={report.id}>
                  <tr
                    className={`border-b border-slate-50 cursor-pointer transition-colors hover:bg-terra-50/40 ${
                      expanded ? 'bg-terra-50/30' : ''
                    }`}
                    onClick={() => setExpandedId(expanded ? null : report.id)}
                  >
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-900">{report.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 sm:hidden">
                        {[report.mineral_name, report.region_name].filter(Boolean).join(' · ')}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-slate-600 hidden sm:table-cell">{report.mineral_name || '—'}</td>
                    <td className="py-3 px-4 text-slate-600 hidden md:table-cell">
                      {report.region_name || labels.noRegion}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600 tabular-nums hidden lg:table-cell">
                      {findingsCount}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDownload(report.slug)
                        }}
                        className="btn-primary text-xs py-1.5 px-3"
                      >
                        {labels.downloadCta}
                      </button>
                    </td>
                  </tr>
                  {expanded && report.ai_summary && (
                    <tr className="border-b border-slate-50 bg-slate-50/50">
                      <td colSpan={5} className="px-4 py-4">
                        <p className="text-sm text-slate-700 leading-relaxed">{report.ai_summary.summary}</p>
                        {findings.length > 0 && (
                          <ul className="mt-3 space-y-1.5">
                            {findings.map((finding, i) => (
                              <li key={i} className="flex gap-2 text-sm text-slate-700">
                                <span className="text-terra-600 shrink-0">✓</span>
                                <span>{finding}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
