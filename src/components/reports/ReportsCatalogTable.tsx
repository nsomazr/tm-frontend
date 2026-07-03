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
        <table className="admin-table">
          <thead>
            <tr>
              <th>{labels.colReport}</th>
              <th className="hidden sm:table-cell">{labels.colMineral}</th>
              <th className="hidden md:table-cell">{labels.colRegion}</th>
              <th className="text-center w-24 hidden lg:table-cell">{labels.colFindings}</th>
              <th className="text-right w-36">{labels.colAction}</th>
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
                    className={`cursor-pointer transition-colors hover:bg-app-subtle ${
                      expanded ? 'bg-app-accent-soft/40' : ''
                    }`}
                    onClick={() => setExpandedId(expanded ? null : report.id)}
                  >
                    <td>
                      <p className="font-medium text-app-text">{report.title}</p>
                      <p className="text-xs text-app-muted mt-0.5 sm:hidden">
                        {[report.mineral_name, report.region_name].filter(Boolean).join(' · ')}
                      </p>
                    </td>
                    <td className="hidden sm:table-cell">{report.mineral_name || '-'}</td>
                    <td className="hidden md:table-cell">
                      {report.region_name || labels.noRegion}
                    </td>
                    <td className="text-center tabular-nums hidden lg:table-cell">
                      {findingsCount}
                    </td>
                    <td className="text-right">
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
                    <tr className="bg-app-subtle/60">
                      <td colSpan={5} className="px-4 py-4">
                        <p className="text-sm text-app-text-secondary leading-relaxed">{report.ai_summary.summary}</p>
                        {findings.length > 0 && (
                          <ul className="mt-3 space-y-1.5">
                            {findings.map((finding, i) => (
                              <li key={i} className="flex gap-2 text-sm text-app-text-secondary">
                                <span className="text-terra-600 dark:text-terra-400 shrink-0">✓</span>
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
