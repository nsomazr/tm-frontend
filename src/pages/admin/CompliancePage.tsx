import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api'

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
            {licenses.results.map((l) => (
              <div key={l.id} className="pb-3 flex justify-between items-start not-first:pt-3">
                <div>
                  <p className="font-medium text-app-text">{l.company_name}</p>
                  <p className="text-sm text-app-muted">{l.contact_email}</p>
                  <p className="text-xs text-app-text-muted capitalize">Status: {l.status}</p>
                </div>
                {l.status === 'pending' && (
                  <button
                    onClick={() => approveLicense.mutate(l.id)}
                    className="btn-primary text-xs"
                  >
                    Approve
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="font-bold text-app-text mb-4">Audit Logs</h2>
        <div className="max-h-96 overflow-y-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Resource</th>
              </tr>
            </thead>
            <tbody>
              {logs?.results.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.created_at).toLocaleString()}</td>
                  <td>{log.actor_name || 'N/A'}</td>
                  <td>{log.action}</td>
                  <td>{log.resource_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
