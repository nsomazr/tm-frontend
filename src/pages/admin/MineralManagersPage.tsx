import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, mineralsApi } from '../../api'
import { useDisplayName } from '../../i18n/useDisplayName'

export default function MineralManagersPage() {
  const qc = useQueryClient()
  const displayName = useDisplayName()
  const [userId, setUserId] = useState('')
  const [mineralId, setMineralId] = useState('')
  const [canPublish, setCanPublish] = useState(false)

  const { data: assignments } = useQuery({
    queryKey: ['mineral-managers'],
    queryFn: () => adminApi.mineralManagers().then((r) => r.data),
  })

  const { data: users } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.users().then((r) => r.data),
  })

  const { data: minerals } = useQuery({
    queryKey: ['minerals'],
    queryFn: () => mineralsApi.list().then((r) => r.data),
  })

  const assign = useMutation({
    mutationFn: () =>
      adminApi.assignManager({
        user: Number(userId),
        mineral: Number(mineralId),
        can_publish: canPublish,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mineral-managers'] })
      setUserId('')
      setMineralId('')
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => adminApi.removeManager(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mineral-managers'] }),
  })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Mineral Managers</h1>
      <p className="text-gray-600 text-sm mb-6">
        Assign managers to specific minerals. Managers can only edit layers and coordinates for their assigned minerals.
      </p>

      <div className="card mb-8">
        <h2 className="font-bold mb-4">Assign Manager</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <select value={userId} onChange={(e) => setUserId(e.target.value)} className="input">
            <option value="">Select User</option>
            {users?.results.map((u) => (
              <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
            ))}
          </select>
          <select value={mineralId} onChange={(e) => setMineralId(e.target.value)} className="input">
            <option value="">Select Mineral</option>
            {minerals?.results.map((m) => (
              <option key={m.id} value={m.id}>{displayName(m)}</option>
            ))}
          </select>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={canPublish} onChange={(e) => setCanPublish(e.target.checked)} />
              Can publish
            </label>
            <button
              onClick={() => assign.mutate()}
              disabled={!userId || !mineralId || assign.isPending}
              className="btn-primary text-sm"
            >
              Assign
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="font-bold mb-4">Current Assignments</h2>
        {!assignments?.results.length ? (
          <p className="text-gray-500 text-sm">No assignments yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2">Manager</th>
                <th className="pb-2">Mineral</th>
                <th className="pb-2">Can Publish</th>
                <th className="pb-2">Assigned</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {assignments.results.map((a) => (
                <tr key={a.id} className="border-b">
                  <td className="py-2">{a.user_detail.username}</td>
                  <td className="py-2">{a.mineral_name}</td>
                  <td className="py-2">{a.can_publish ? 'Yes' : 'No'}</td>
                  <td className="py-2">{new Date(a.assigned_at).toLocaleDateString()}</td>
                  <td className="py-2">
                    <button
                      onClick={() => remove.mutate(a.id)}
                      className="text-red-600 text-xs hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
