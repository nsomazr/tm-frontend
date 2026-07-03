import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import type { User } from '../../types'

const ASSIGNABLE_ROLES: User['role'][] = ['free', 'subscriber', 'mineral_manager', 'admin', 'super_admin']

function roleOptionsForActor(isSuperAdmin: boolean, target?: User): User['role'][] {
  if (isSuperAdmin) return ASSIGNABLE_ROLES
  return ASSIGNABLE_ROLES.filter((r) => r !== 'admin' && r !== 'super_admin' && !isPrivileged(target))
}

function isPrivileged(user?: User) {
  return user?.role === 'admin' || user?.role === 'super_admin'
}

export default function UsersPage() {
  const { user: currentUser, isSuperAdmin } = useAuth()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'admin' as 'admin' | 'super_admin',
  })
  const [createError, setCreateError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.users().then((r) => r.data),
  })

  const updateUser = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      adminApi.updateUser(id, { role: role as User['role'] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const createAdmin = useMutation({
    mutationFn: () => adminApi.createAdmin(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setShowCreate(false)
      setForm({ email: '', password: '', first_name: '', last_name: '', phone: '', role: 'admin' })
      setCreateError('')
    },
    onError: (err: { response?: { data?: { detail?: string; role?: string[] } } }) => {
      const detail = err.response?.data?.detail || err.response?.data?.role?.[0] || 'Could not create admin.'
      setCreateError(String(detail))
    },
  })

  const users = data?.results || []

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-app-text">User Management</h1>
          <p className="text-sm text-app-muted mt-1">
            {isSuperAdmin
              ? 'Super admins can create and manage platform administrators.'
              : 'Admins can manage subscribers and mineral managers.'}
          </p>
        </div>
        {isSuperAdmin && (
          <button type="button" onClick={() => setShowCreate(true)} className="btn-primary text-sm">
            Add admin
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-app-muted">Loading…</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="pr-4">Username</th>
                <th className="pr-4">Email</th>
                <th className="pr-4">Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const options = roleOptionsForActor(isSuperAdmin, u)
                const isSelf = u.id === currentUser?.id
                return (
                  <tr key={u.id}>
                    <td className="pr-4 text-app-text">{u.username}</td>
                    <td className="pr-4">{u.email}</td>
                    <td className="pr-4 capitalize">{u.role.replace('_', ' ')}</td>
                    <td>
                      {isSelf ? (
                        <span className="text-xs text-app-text-muted">Current account</span>
                      ) : options.length > 0 ? (
                        <select
                          value={u.role}
                          onChange={(e) => updateUser.mutate({ id: u.id, role: e.target.value })}
                          className="input text-xs py-1"
                        >
                          {options.map((role) => (
                            <option key={role} value={role}>
                              {role.replace('_', ' ')}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-app-text-muted capitalize">{u.role.replace('_', ' ')}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="card w-full max-w-md">
            <h2 className="text-lg font-bold text-app-text mb-4">Create admin account</h2>
            {createError && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">{createError}</p>
            )}
            <div className="space-y-3">
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input w-full"
              />
              <input
                type="password"
                placeholder="Temporary password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input w-full"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="First name"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="input w-full"
                />
                <input
                  type="text"
                  placeholder="Last name"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className="input w-full"
                />
              </div>
              <input
                type="tel"
                placeholder="Phone (optional)"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input w-full"
              />
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as 'admin' | 'super_admin' })}
                className="input w-full"
              >
                <option value="admin">Admin</option>
                <option value="super_admin">Super admin</option>
              </select>
            </div>
            <div className="flex gap-3 justify-end mt-5">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary text-sm">
                Cancel
              </button>
              <button
                type="button"
                disabled={!form.email || !form.password || createAdmin.isPending}
                onClick={() => createAdmin.mutate()}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {createAdmin.isPending ? 'Creating…' : 'Create admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
