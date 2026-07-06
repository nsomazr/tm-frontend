import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, mineralsApi } from '../../api'
import { useDisplayName } from '../../i18n/useDisplayName'
import ListPagination from '../../components/ui/ListPagination'
import { toast } from '../../components/ui/toast'
import { usePagination } from '../../hooks/usePagination'
import type { MineralManagerAssignment, User } from '../../types'

interface ManagerGroup {
  user: User
  assignments: MineralManagerAssignment[]
  mineralIds: number[]
  canPublish: boolean
}

function ManagerMineralsEditor({
  group,
  minerals,
  onClose,
  onSave,
  saving,
}: {
  group: ManagerGroup
  minerals: { id: number; name: string; name_sw?: string }[]
  onClose: () => void
  onSave: (mineralIds: number[], canPublish: boolean) => void
  saving: boolean
}) {
  const displayName = useDisplayName()
  const [selected, setSelected] = useState<number[]>(group.mineralIds)
  const [canPublish, setCanPublish] = useState(group.canPublish)

  const toggle = (id: number) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <div className="bg-app-surface rounded-xl shadow-xl border border-app-border w-full max-w-lg p-6">
        <h2 className="text-lg font-bold text-app-text mb-1">
          Manage commodities for {group.user.username}
        </h2>
        <p className="text-sm text-app-muted mb-4">
          Select every mineral or commodity this manager can edit. One manager can manage many.
        </p>
        <div className="max-h-64 overflow-y-auto rounded-lg border border-app-border divide-y divide-app-border/60">
          {minerals.map((mineral) => (
            <label
              key={mineral.id}
              className="flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer hover:bg-app-subtle"
            >
              <input
                type="checkbox"
                checked={selected.includes(mineral.id)}
                onChange={() => toggle(mineral.id)}
              />
              <span className="text-app-text">{displayName(mineral)}</span>
            </label>
          ))}
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-app-text">
          <input
            type="checkbox"
            checked={canPublish}
            onChange={(e) => setCanPublish(e.target.checked)}
          />
          Can publish layers
        </label>
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="btn-secondary text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(selected, canPublish)}
            disabled={saving}
            className="btn-primary text-sm"
          >
            {saving ? 'Saving…' : `Save (${selected.length})`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MineralManagersPage() {
  const qc = useQueryClient()
  const displayName = useDisplayName()
  const [userId, setUserId] = useState('')
  const [selectedMineralIds, setSelectedMineralIds] = useState<number[]>([])
  const [canPublish, setCanPublish] = useState(false)
  const [editingGroup, setEditingGroup] = useState<ManagerGroup | null>(null)

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

  const sync = useMutation({
    mutationFn: (payload: { user: number; minerals: number[]; can_publish: boolean }) =>
      adminApi.syncManagerMinerals(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mineral-managers'] })
      setUserId('')
      setSelectedMineralIds([])
      setCanPublish(false)
      setEditingGroup(null)
      toast.success('Manager assignments updated')
    },
    onError: () => toast.error('Could not update assignments'),
  })

  const mineralList = minerals?.results ?? []

  const managerGroups = useMemo(() => {
    const byUser = new Map<number, ManagerGroup>()
    for (const assignment of assignments?.results ?? []) {
      const existing = byUser.get(assignment.user)
      if (existing) {
        existing.assignments.push(assignment)
        existing.mineralIds.push(assignment.mineral)
        existing.canPublish = existing.canPublish || assignment.can_publish
      } else {
        byUser.set(assignment.user, {
          user: assignment.user_detail,
          assignments: [assignment],
          mineralIds: [assignment.mineral],
          canPublish: assignment.can_publish,
        })
      }
    }
    return Array.from(byUser.values()).sort((a, b) =>
      a.user.username.localeCompare(b.user.username)
    )
  }, [assignments?.results])

  const managerPagination = usePagination(managerGroups)

  const toggleNewMineral = (id: number) => {
    setSelectedMineralIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    )
  }

  const handleAssign = () => {
    if (!userId || selectedMineralIds.length === 0) return
    const existing = managerGroups.find((group) => group.user.id === Number(userId))
    const merged = existing
      ? Array.from(new Set([...existing.mineralIds, ...selectedMineralIds]))
      : selectedMineralIds
    sync.mutate({
      user: Number(userId),
      minerals: merged,
      can_publish: canPublish || existing?.canPublish || false,
    })
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-app-text mb-6">Mineral Managers</h1>
      <p className="text-app-muted text-sm mb-6 max-w-3xl">
        Assign one manager to multiple minerals or commodities. They can upload layers, edit
        coordinates, and manage reports only for the commodities you select below.
      </p>

      <div className="card mb-8">
        <h2 className="font-bold text-app-text mb-4">Assign manager</h2>
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] gap-4">
          <select value={userId} onChange={(e) => setUserId(e.target.value)} className="input">
            <option value="">Select user</option>
            {users?.results.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username} ({u.email})
              </option>
            ))}
          </select>
          <div className="rounded-lg border border-app-border max-h-40 overflow-y-auto divide-y divide-app-border/60">
            {mineralList.length === 0 ? (
              <p className="px-3 py-2 text-sm text-app-muted">No minerals available.</p>
            ) : (
              mineralList.map((mineral) => (
                <label
                  key={mineral.id}
                  className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-app-subtle"
                >
                  <input
                    type="checkbox"
                    checked={selectedMineralIds.includes(mineral.id)}
                    onChange={() => toggleNewMineral(mineral.id)}
                  />
                  <span>{displayName(mineral)}</span>
                </label>
              ))
            )}
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={canPublish}
                onChange={(e) => setCanPublish(e.target.checked)}
              />
              Can publish
            </label>
            <button
              onClick={handleAssign}
              disabled={!userId || selectedMineralIds.length === 0 || sync.isPending}
              className="btn-primary text-sm whitespace-nowrap"
            >
              {sync.isPending ? 'Saving…' : 'Assign commodities'}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="font-bold text-app-text mb-4">Managers and commodities</h2>
        {managerGroups.length === 0 ? (
          <p className="text-app-muted text-sm">No manager assignments yet.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Manager</th>
                <th>Commodities</th>
                <th>Can publish</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {managerPagination.pageItems.map((group) => (
                <tr key={group.user.id}>
                  <td className="text-app-text">
                    <div className="font-medium">{group.user.username}</div>
                    <div className="text-xs text-app-muted">{group.user.email}</div>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1.5">
                      {group.assignments.map((assignment) => (
                        <span
                          key={assignment.id}
                          className="inline-flex items-center rounded-full bg-app-subtle px-2.5 py-0.5 text-xs text-app-text"
                        >
                          {assignment.mineral_name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>{group.canPublish ? 'Yes' : 'No'}</td>
                  <td>
                    <button
                      onClick={() => setEditingGroup(group)}
                      className="text-terra-600 dark:text-terra-400 text-xs hover:underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <ListPagination
          page={managerPagination.page}
          pageCount={managerPagination.pageCount}
          total={managerPagination.total}
          pageSize={managerPagination.pageSize}
          onPageChange={managerPagination.setPage}
          className="mt-4"
        />
      </div>

      {editingGroup && (
        <ManagerMineralsEditor
          group={editingGroup}
          minerals={mineralList}
          saving={sync.isPending}
          onClose={() => setEditingGroup(null)}
          onSave={(mineralIds, nextCanPublish) =>
            sync.mutate({
              user: editingGroup.user.id,
              minerals: mineralIds,
              can_publish: nextCanPublish,
            })
          }
        />
      )}
    </div>
  )
}
