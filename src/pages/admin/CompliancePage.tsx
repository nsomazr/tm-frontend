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
      <h1 className="text-2xl font-bold mb-6">Compliance</h1>

      <div className="card mb-8">
        <h2 className="font-bold mb-4">B2B License Agreements</h2>
        {!licenses?.results.length ? (
          <p className="text-sm text-gray-500">No license agreements.</p>
        ) : (
          <div className="space-y-3">
            {licenses.results.map((l) => (
              <div key={l.id} className="border-b pb-3 flex justify-between items-start">
                <div>
                  <p className="font-medium">{l.company_name}</p>
                  <p className="text-sm text-gray-500">{l.contact_email}</p>
                  <p className="text-xs text-gray-400 capitalize">Status: {l.status}</p>
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
        <h2 className="font-bold mb-4">Audit Logs</h2>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2">Time</th>
                <th className="pb-2">Actor</th>
                <th className="pb-2">Action</th>
                <th className="pb-2">Resource</th>
              </tr>
            </thead>
            <tbody>
              {logs?.results.map((log) => (
                <tr key={log.id} className="border-b">
                  <td className="py-1.5">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="py-1.5">{log.actor_name || 'N/A'}</td>
                  <td className="py-1.5">{log.action}</td>
                  <td className="py-1.5">{log.resource_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
