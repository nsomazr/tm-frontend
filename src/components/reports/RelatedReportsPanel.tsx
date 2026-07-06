import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '../../api'
import type { Report } from '../../types'

interface RelatedReportsPanelProps {
  lat?: number
  lng?: number
  mineralSlug?: string
  layerIds?: number[]
  boundaryId?: number
  compact?: boolean
}

export default function RelatedReportsPanel({
  lat,
  lng,
  mineralSlug,
  layerIds,
  boundaryId,
  compact = false,
}: RelatedReportsPanelProps) {
  const enabled = !!(lat && lng) || !!mineralSlug || !!(layerIds && layerIds.length)

  const { data, isLoading } = useQuery({
    queryKey: ['contextual-reports', lat, lng, mineralSlug, layerIds?.join(','), boundaryId],
    queryFn: () =>
      reportsApi
        .contextual({
          ...(lat != null ? { lat: String(lat) } : {}),
          ...(lng != null ? { lng: String(lng) } : {}),
          ...(mineralSlug ? { mineral_slug: mineralSlug } : {}),
          ...(layerIds?.length ? { layer_ids: layerIds.join(',') } : {}),
          ...(boundaryId ? { boundary_id: String(boundaryId) } : {}),
        })
        .then((r) => r.data.results),
    enabled,
    staleTime: 60_000,
  })

  const reports = data ?? []
  if (!enabled || (!isLoading && reports.length === 0)) return null

  return (
    <div className={compact ? 'space-y-2' : 'card !p-4'}>
      <p className={`font-semibold text-app-text ${compact ? 'text-xs' : 'text-sm'}`}>Related reports</p>
      {isLoading ? (
        <p className="text-xs text-app-muted">Loading…</p>
      ) : (
        <ul className={`space-y-2 ${compact ? '' : 'mt-2'}`}>
          {reports.map((report: Report) => (
            <li key={report.id}>
              <Link
                to={report.has_article ? `/downloads/${report.slug}/read` : `/downloads/${report.slug}`}
                className="block rounded-lg border border-app-border px-3 py-2 hover:bg-app-subtle transition-colors"
              >
                <p className="text-sm font-medium text-app-text line-clamp-1">{report.title}</p>
                <p className="text-xs text-app-muted mt-0.5">
                  {report.mineral_name}
                  {report.region_name ? ` · ${report.region_name}` : ''}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
