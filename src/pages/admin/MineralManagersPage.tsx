import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, mineralsApi } from '../../api'
import { useDisplayName } from '../../i18n/useDisplayName'
import ListPagination from '../../components/ui/ListPagination'
import { usePagination } from '../../hooks/usePagination'

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

  const assignmentList = assignments?.results ?? []
  const assignmentPagination = usePagination(assignmentList)

  return (
    <div>
      <h1 className="text-2xl font-bold text-app-text mb-6">Mineral Managers</h1>
      <p className="text-app-muted text-sm mb-6">
        Assign managers to specific minerals. Managers can only edit layers and coordinates for their assigned minerals.
      </p>

      <div className="card mb-8">
        <h2 className="font-bold text-app-text mb-4">Assign Manager</h2>
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
        <h2 className="font-bold text-app-text mb-4">Current Assignments</h2>
        {!assignments?.results.length ? (
          <p className="text-app-muted text-sm">No assignments yet.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Manager</th>
                <th>Mineral</th>
                <th>Can Publish</th>
                <th>Assigned</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {assignmentPagination.pageItems.map((a) => (
                <tr key={a.id}>
                  <td className="text-app-text">{a.user_detail.username}</td>
                  <td>{a.mineral_name}</td>
                  <td>{a.can_publish ? 'Yes' : 'No'}</td>
                  <td>{new Date(a.assigned_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      onClick={() => remove.mutate(a.id)}
                      className="text-red-600 dark:text-red-400 text-xs hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <ListPagination
          page={assignmentPagination.page}
          pageCount={assignmentPagination.pageCount}
          total={assignmentPagination.total}
          pageSize={assignmentPagination.pageSize}
          onPageChange={assignmentPagination.setPage}
          className="mt-4"
        />
      </div>
    </div>
  )
}
