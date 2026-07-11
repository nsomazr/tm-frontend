import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api'
import ActionMenu, { ActionMenuItem } from '../../components/ui/ActionMenu'
import ListPagination from '../../components/ui/ListPagination'
import { usePagination } from '../../hooks/usePagination'
import type { AuditLog } from '../../types'

function auditResourceHref(log: AuditLog): string | null {
  const details = log.details ?? {}
  const type = log.resource_type
  if (type === 'MapLayer') {
    if (log.action === 'layer_delete') return '/admin/layers'
    const slug = String(details.slug ?? details.layer_slug ?? '').trim()
    if (slug) return `/admin/minerals?layer=${encodeURIComponent(slug)}`
    return '/admin/layers'
  }
  if (type === 'Ad' || type === 'AdCampaign') return '/admin/ads/campaigns'
  if (type === 'Report') {
    const slug = String(details.slug ?? '').trim()
    return slug ? `/admin/reports/${encodeURIComponent(slug)}/edit` : '/admin/reports'
  }
  if (type === 'User') return '/admin/users'
  if (type === 'Mineral') return '/admin/minerals'
  return null
}

export default function CompliancePage() {
  const qc = useQueryClient()

  const { data: logs } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => adminApi.auditLogs().then((r) => r.data),
  })

  const { data: licenses } = useQuery({
    queryKey: ['licenses'],
    queryFn: () => adminApi.licenses().then((r) => r.data),
  })

  const licenseList = licenses?.results ?? []
  const licensePagination = usePagination(licenseList)
  const auditList = logs?.results ?? []
  const auditPagination = usePagination(auditList)

  const approveLicense = useMutation({
    mutationFn: (id: number) => adminApi.updateLicense(id, { status: 'approved' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['licenses'] }),
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-app-text mb-6">Compliance</h1>

      <div className="card mb-8">
        <h2 className="font-bold text-app-text mb-4">B2B License Agreements</h2>
        {!licenses?.results.length ? (
          <p className="text-sm text-app-muted">No license agreements.</p>
        ) : (
          <div className="app-divide-y">
            {licensePagination.pageItems.map((l) => (
              <div key={l.id} className="pb-3 flex justify-between items-start not-first:pt-3 gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-app-text">{l.company_name}</p>
                  <p className="text-sm text-app-muted">{l.contact_email}</p>
                  <p className="text-xs text-app-text-muted capitalize">Status: {l.status}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {l.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => approveLicense.mutate(l.id)}
                      className="btn-primary text-xs"
                    >
                      Approve
                    </button>
                  )}
                  {l.contact_email && (
                    <a
                      href={`mailto:${l.contact_email}`}
                      className="text-xs font-medium text-terra-600 dark:text-terra-400 hover:underline"
                    >
                      Email
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <ListPagination
          page={licensePagination.page}
          pageCount={licensePagination.pageCount}
          total={licensePagination.total}
          pageSize={licensePagination.pageSize}
          onPageChange={licensePagination.setPage}
          className="mt-4"
        />
      </div>

      <div className="card overflow-hidden !p-0">
        <div className="px-5 py-4 border-b app-divider">
          <h2 className="font-bold text-app-text">Audit Logs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Resource</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {auditPagination.pageItems.map((log) => {
                const href = auditResourceHref(log)
                return (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap text-app-text-muted">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td>{log.actor_name || 'N/A'}</td>
                    <td className="font-mono text-xs">{log.action}</td>
                    <td>{log.resource_type}</td>
                    <td className="text-right">
                      {href || log.actor_name ? (
                        <div className="inline-flex justify-end">
                          <ActionMenu label={`Actions for audit ${log.id}`} minWidth="11rem">
                            {href && <ActionMenuItem to={href}>Open resource</ActionMenuItem>}
                            {log.actor_name && (
                              <ActionMenuItem
                                to={`/admin/users?q=${encodeURIComponent(log.actor_name)}`}
                              >
                                Open actor
                              </ActionMenuItem>
                            )}
                          </ActionMenu>
                        </div>
                      ) : (
                        <span className="text-sm text-app-text-muted">—</span>
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
      </div>
    </div>
  )
}
