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

function describeLayerAction(log: AuditLog) {
  const details = log.details ?? {}
  switch (log.action) {
    case 'layer_upload':
      return `Uploaded ${String(details.filename ?? 'file')} to ${String(details.layer_name ?? 'layer')}`
    case 'layer_create':
      return `Created layer ${String(details.name ?? '')}`
    case 'layer_update':
      return `Updated ${String(details.name ?? 'layer')}`
    case 'layer_delete':
      return `Deleted ${String(details.name ?? 'layer')}`
    default:
      return log.action
  }
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
          <p className="text-sm text-app-muted mt-1 max-w-2xl">
            Track manager file imports and layer changes: creates, uploads, updates, and deletes.
          </p>
        </div>
        <Link to="/admin/layers" className="btn-secondary text-sm shrink-0">
          Back to layers
        </Link>
      </div>

      <section className="rounded-xl border border-app-border bg-app-surface overflow-hidden">
        <div className="px-5 py-4 border-b app-divider">
          <h2 className="font-semibold text-app-text">Manager uploads</h2>
          <p className="text-sm text-app-text-muted mt-1">
            Recent file imports by mineral managers across all layers.
          </p>
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
        <div className="px-5 py-4 border-b app-divider">
          <h2 className="font-semibold text-app-text">Layer activity log</h2>
          <p className="text-sm text-app-text-muted mt-1">
            Creates, uploads, updates, and deletes recorded for map layers.
          </p>
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
                  </tr>
                </thead>
                <tbody>
                  {auditPagination.pageItems.map((log) => (
                    <tr key={log.id}>
                      <td className="text-app-text-muted whitespace-nowrap">
                        {formatWhen(log.created_at)}
                      </td>
                      <td>{log.actor_name || 'System'}</td>
                      <td>{describeLayerAction(log)}</td>
                    </tr>
                  ))}
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
