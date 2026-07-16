import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { adminApi, mapsApi } from '../../api'
import ListPagination from '../../components/ui/ListPagination'
import { usePagination } from '../../hooks/usePagination'
import type { AuditLog, LayerUpload } from '../../types'

function formatWhen(iso?: string | null) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString()
}

function actionVerb(action: string) {
  switch (action) {
    case 'layer_upload':
      return 'Upload'
    case 'layer_create':
      return 'Create'
    case 'layer_update':
      return 'Update'
    case 'layer_delete':
      return 'Delete'
    default:
      return action.replace(/^layer_/, '').replace(/_/g, ' ')
  }
}

function actionBadgeClass(action: string) {
  switch (action) {
    case 'layer_create':
      return 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
    case 'layer_upload':
      return 'bg-sky-500/12 text-sky-700 dark:text-sky-300'
    case 'layer_update':
      return 'bg-amber-500/12 text-amber-800 dark:text-amber-300'
    case 'layer_delete':
      return 'bg-red-500/12 text-red-700 dark:text-red-300'
    default:
      return 'bg-app-subtle text-app-text-muted'
  }
}

function changedFieldSummary(changes: unknown): string | null {
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) return null
  const keys = Object.keys(changes as Record<string, unknown>)
  if (!keys.length) return null
  return keys
    .map((key) => key.replace(/_/g, ' '))
    .slice(0, 6)
    .join(', ')
}

function describeLayerAction(log: AuditLog) {
  const details = log.details ?? {}
  switch (log.action) {
    case 'layer_upload':
      return `Uploaded ${String(details.filename ?? 'file')} to ${String(details.layer_name ?? 'layer')}`
    case 'layer_create':
      return `Created layer ${String(details.name ?? '')}`.trim()
    case 'layer_update': {
      const name = String(details.name ?? 'layer')
      const fields = changedFieldSummary(details.changes)
      return fields ? `Updated ${name} (${fields})` : `Updated ${name}`
    }
    case 'layer_delete':
      return `Deleted ${String(details.name ?? 'layer')}`
    default:
      return log.action
  }
}

function layerHref(log: AuditLog): string | null {
  if (log.action === 'layer_delete') return null
  const details = log.details ?? {}
  const slug = String(details.slug ?? details.layer_slug ?? '').trim()
  if (slug) return `/admin/minerals?layer=${encodeURIComponent(slug)}`
  if (log.resource_id) return '/admin/layers'
  return null
}

function uploadStatusClass(status: LayerUpload['status']) {
  switch (status) {
    case 'completed':
      return 'text-emerald-600 dark:text-emerald-400'
    case 'failed':
      return 'text-red-600 dark:text-red-400'
    case 'processing':
      return 'text-blue-600 dark:text-blue-400'
    default:
      return 'text-app-text-muted'
  }
}

export default function LayerActivityPage() {
  const { data: managerUploads, isLoading: uploadsLoading } = useQuery({
    queryKey: ['layer-uploads', 'managers'],
    queryFn: () => mapsApi.uploads({ manager_only: '1' }).then((r) => r.data),
  })

  const { data: layerAudit, isLoading: auditLoading } = useQuery({
    queryKey: ['layer-audit'],
    queryFn: () => adminApi.auditLogs({ resource_type: 'MapLayer' }).then((r) => r.data),
  })

  const uploadsList = managerUploads?.results ?? []
  const uploadsPagination = usePagination(uploadsList)
  const auditList = layerAudit?.results ?? []
  const auditPagination = usePagination(auditList)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-app-text">Activity & logs</h1>
          <p className="text-sm text-app-muted mt-0.5">
            Manager imports and layer create/update/delete events.
          </p>
        </div>
        <Link to="/admin/layers" className="btn-secondary text-sm shrink-0">
          Back to layers
        </Link>
      </div>

      <section className="rounded-xl border border-app-border bg-app-surface overflow-hidden">
        <div className="px-5 py-3 border-b app-divider">
          <h2 className="font-semibold text-app-text">Manager uploads</h2>
        </div>

        {uploadsLoading ? (
          <p className="px-5 py-10 text-center text-sm text-app-text-muted">Loading uploads…</p>
        ) : !uploadsList.length ? (
          <p className="px-5 py-10 text-center text-sm text-app-text-muted">No manager uploads yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Manager</th>
                    <th>Layer</th>
                    <th>File</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadsPagination.pageItems.map((upload) => (
                    <tr key={upload.id}>
                      <td className="text-app-text-muted whitespace-nowrap">
                        {formatWhen(upload.created_at)}
                      </td>
                      <td className="text-app-text">{upload.uploaded_by_name ?? 'Unknown'}</td>
                      <td>
                        {upload.layer_name}
                        <span className="text-app-text-muted"> · {upload.mineral_name}</span>
                      </td>
                      <td className="truncate max-w-[220px]">
                        {upload.filename || upload.file_type}
                      </td>
                      <td className={`capitalize ${uploadStatusClass(upload.status)}`}>
                        {upload.status}
                      </td>
                      <td className="text-right whitespace-nowrap">
                        {upload.layer_slug ? (
                          <Link
                            to={`/admin/minerals?layer=${encodeURIComponent(upload.layer_slug)}`}
                            className="text-sm font-medium text-terra-600 dark:text-terra-400 hover:underline"
                          >
                            Open layer
                          </Link>
                        ) : (
                          <span className="text-sm text-app-text-muted">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ListPagination
              page={uploadsPagination.page}
              pageCount={uploadsPagination.pageCount}
              total={uploadsPagination.total}
              pageSize={uploadsPagination.pageSize}
              onPageChange={uploadsPagination.setPage}
              className="px-4 pb-4"
            />
          </>
        )}
      </section>

      <section className="rounded-xl border border-app-border bg-app-surface overflow-hidden">
        <div className="px-5 py-3 border-b app-divider">
          <h2 className="font-semibold text-app-text">Layer activity log</h2>
        </div>

        {auditLoading ? (
          <p className="px-5 py-10 text-center text-sm text-app-text-muted">Loading activity…</p>
        ) : !auditList.length ? (
          <p className="px-5 py-10 text-center text-sm text-app-text-muted">No layer activity logged yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Details</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {auditPagination.pageItems.map((log) => {
                    const href = layerHref(log)
                    return (
                      <tr key={log.id}>
                        <td className="text-app-text-muted whitespace-nowrap">
                          {formatWhen(log.created_at)}
                        </td>
                        <td>{log.actor_name || 'System'}</td>
                        <td>
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold capitalize ${actionBadgeClass(log.action)}`}
                          >
                            {actionVerb(log.action)}
                          </span>
                        </td>
                        <td className="max-w-[28rem]">
                          <span className="line-clamp-2">{describeLayerAction(log)}</span>
                        </td>
                        <td className="text-right whitespace-nowrap">
                          {href ? (
                            <Link
                              to={href}
                              className="text-sm font-medium text-terra-600 dark:text-terra-400 hover:underline"
                            >
                              Open layer
                            </Link>
                          ) : (
                            <span className="text-sm text-app-text-muted">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <ListPagination
              page={auditPagination.page}
              pageCount={auditPagination.pageCount}
              total={auditPagination.total}
              pageSize={auditPagination.pageSize}
              onPageChange={auditPagination.setPage}
              className="px-4 pb-4"
            />
          </>
        )}
      </section>
    </div>
  )
}
