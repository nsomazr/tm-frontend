import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { adminApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import ActionMenu, { ActionMenuItem } from '../../components/ui/ActionMenu'
import ListPagination from '../../components/ui/ListPagination'
import PasswordInput from '../../components/ui/PasswordInput'
import { toast } from '../../components/ui/toast'
import { usePagination } from '../../hooks/usePagination'
import type { User } from '../../types'

const ASSIGNABLE_ROLES: User['role'][] = ['free', 'subscriber', 'mineral_manager', 'admin', 'super_admin']

function isPrivileged(user?: User) {
  return user?.role === 'admin' || user?.role === 'super_admin'
}

function roleOptionsForActor(isSuperAdmin: boolean, target?: User): User['role'][] {
  if (isSuperAdmin) return ASSIGNABLE_ROLES
  return ASSIGNABLE_ROLES.filter((r) => r !== 'admin' && r !== 'super_admin' && !isPrivileged(target))
}

function roleLabel(role: User['role']) {
  return role.replace(/_/g, ' ')
}

function roleBadgeClass(role: User['role']) {
  switch (role) {
    case 'super_admin':
      return 'bg-violet-500/12 text-violet-800 dark:text-violet-300'
    case 'admin':
      return 'bg-sky-500/12 text-sky-800 dark:text-sky-300'
    case 'mineral_manager':
      return 'bg-amber-500/12 text-amber-900 dark:text-amber-300'
    case 'subscriber':
      return 'bg-emerald-500/12 text-emerald-800 dark:text-emerald-300'
    default:
      return 'bg-app-subtle text-app-text-secondary'
  }
}

function displayName(user: User) {
  const full = `${user.first_name} ${user.last_name}`.trim()
  return full || user.username
}

function initials(user: User) {
  const full = `${user.first_name} ${user.last_name}`.trim()
  if (full) {
    return full
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')
  }
  return user.username.slice(0, 2).toUpperCase()
}

function formatJoined(iso?: string) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function UserActionsMenu({
  user,
  isSelf,
  isSuperAdmin,
  busy,
  onChangeRole,
  onToggleActive,
  onDelete,
}: {
  user: User
  isSelf: boolean
  isSuperAdmin: boolean
  busy?: boolean
  onChangeRole: (role: User['role']) => void
  onToggleActive: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const options = roleOptionsForActor(isSuperAdmin, user)
  const canManage = !isSelf && options.length > 0
  const canToggleActive = !isSelf && (isSuperAdmin || !isPrivileged(user))
  const canDelete = !isSelf && (isSuperAdmin || !isPrivileged(user))

  if (isSelf) {
    return <span className="text-xs font-medium text-app-text-muted">Current account</span>
  }

  if (!canManage && !canToggleActive && !canDelete) {
    return <span className="text-xs text-app-text-muted capitalize">{roleLabel(user.role)}</span>
  }

  return (
    <ActionMenu
      label={`Actions for ${displayName(user)}`}
      open={open}
      onOpenChange={setOpen}
      minWidth="12rem"
    >
      {canManage &&
        options.map((role) => (
          <ActionMenuItem
            key={role}
            disabled={busy || role === user.role}
            onClick={() => onChangeRole(role)}
            className="capitalize"
          >
            {role === user.role ? `Role: ${roleLabel(role)}` : `Set as ${roleLabel(role)}`}
          </ActionMenuItem>
        ))}
      {canToggleActive && (
        <ActionMenuItem disabled={busy} onClick={onToggleActive}>
          {user.is_active === false ? 'Activate account' : 'Deactivate account'}
        </ActionMenuItem>
      )}
      {canDelete && (
        <ActionMenuItem disabled={busy} destructive onClick={onDelete}>
          Delete user
        </ActionMenuItem>
      )}
    </ActionMenu>
  )
}

export default function UsersPage() {
  const { user: currentUser, isSuperAdmin } = useAuth()
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showCreate, setShowCreate] = useState(false)
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const [roleFilter, setRoleFilter] = useState<'all' | User['role']>('all')
  const [menuUserId, setMenuUserId] = useState<number | null>(null)
  const [form, setForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'admin' as 'admin' | 'super_admin',
  })

  useEffect(() => {
    const q = searchParams.get('q') ?? ''
    setQuery((prev) => (prev === q ? prev : q))
  }, [searchParams])

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.users().then((r) => r.data),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-users'] })

  const updateUser = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<User> }) => adminApi.updateUser(id, data),
    onSuccess: () => {
      invalidate()
      toast.success('User updated')
    },
    onError: (err: { response?: { data?: { detail?: string; role?: string[]; is_active?: string[] } } }) => {
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.role?.[0] ||
        err.response?.data?.is_active?.[0] ||
        'Could not update user.'
      toast.error('Update failed', { description: String(detail) })
    },
  })

  const deleteUser = useMutation({
    mutationFn: (id: number) => adminApi.deleteUser(id),
    onSuccess: () => {
      invalidate()
      toast.success('User deleted')
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast.error('Could not delete user', {
        description: String(err.response?.data?.detail || 'Delete failed.'),
      })
    },
  })

  const createAdmin = useMutation({
    mutationFn: () => adminApi.createAdmin(form),
    onSuccess: () => {
      invalidate()
      setShowCreate(false)
      setForm({ email: '', password: '', first_name: '', last_name: '', phone: '', role: 'admin' })
      toast.success('Admin account created')
    },
    onError: (err: { response?: { data?: { detail?: string; role?: string[] } } }) => {
      const detail = err.response?.data?.detail || err.response?.data?.role?.[0] || 'Could not create admin.'
      toast.error('Could not create admin', { description: String(detail) })
    },
  })

  const users = data?.results || []

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter((user) => {
      if (roleFilter !== 'all' && user.role !== roleFilter) return false
      if (!q) return true
      const haystack = [user.username, user.email, user.first_name, user.last_name, user.organization]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [users, query, roleFilter])

  const pagination = usePagination(filtered)

  const counts = useMemo(() => {
    const byRole = Object.fromEntries(ASSIGNABLE_ROLES.map((role) => [role, 0])) as Record<User['role'], number>
    let inactive = 0
    for (const user of users) {
      byRole[user.role] = (byRole[user.role] ?? 0) + 1
      if (user.is_active === false) inactive += 1
    }
    return { total: users.length, inactive, byRole }
  }, [users])

  function confirmDelete(user: User) {
    toast.confirm(`Delete ${displayName(user)}?`, {
      description: 'This permanently removes the account. This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteUser.mutate(user.id),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-app-text">User Management</h1>
          <p className="text-sm text-app-muted mt-1 max-w-2xl">
            {isSuperAdmin
              ? 'Create admins, change roles, and activate or remove accounts.'
              : 'Manage subscribers and mineral managers. Admin accounts are managed by super admins.'}
          </p>
        </div>
        {isSuperAdmin && (
          <button type="button" onClick={() => setShowCreate(true)} className="btn-primary text-sm">
            Add admin
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-app-border bg-app-surface px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-app-muted">Users</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-app-text">{counts.total}</p>
        </div>
        <div className="rounded-xl border border-app-border bg-app-surface px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-app-muted">Inactive</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-app-text">{counts.inactive}</p>
        </div>
        <div className="rounded-xl border border-app-border bg-app-surface px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-app-muted">Managers</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-app-text">
            {counts.byRole.mineral_manager}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            const next = e.target.value
            setQuery(next)
            pagination.setPage(1)
            const params = new URLSearchParams(searchParams)
            if (next.trim()) params.set('q', next.trim())
            else params.delete('q')
            setSearchParams(params, { replace: true })
          }}
          placeholder="Search name, email, username…"
          className="input w-full max-w-sm text-sm"
        />
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => {
              setRoleFilter('all')
              pagination.setPage(1)
            }}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              roleFilter === 'all'
                ? 'bg-terra-600 text-white'
                : 'bg-app-subtle text-app-text-secondary hover:bg-app-border/60'
            }`}
          >
            All
          </button>
          {ASSIGNABLE_ROLES.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => {
                setRoleFilter(role)
                pagination.setPage(1)
              }}
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors ${
                roleFilter === role
                  ? 'bg-terra-600 text-white'
                  : 'bg-app-subtle text-app-text-secondary hover:bg-app-border/60'
              }`}
            >
              {roleLabel(role)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-app-muted">Loading…</p>
      ) : (
        <section className="overflow-hidden rounded-xl border border-app-border bg-app-surface">
          {!filtered.length ? (
            <p className="px-5 py-10 text-center text-sm text-app-text-muted">
              No users match this search.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Joined</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagination.pageItems.map((user) => {
                      const isSelf = user.id === currentUser?.id
                      const active = user.is_active !== false
                      return (
                        <tr key={user.id} className={!active ? 'opacity-70' : undefined}>
                          <td>
                            <div className="flex items-center gap-3 min-w-[12rem]">
                              <span
                                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-terra-500/12 text-xs font-bold text-terra-800 dark:text-terra-300"
                                aria-hidden
                              >
                                {initials(user)}
                              </span>
                              <div className="min-w-0">
                                <p className="font-medium text-app-text truncate">
                                  {displayName(user)}
                                  {isSelf && (
                                    <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-terra-700 dark:text-terra-300">
                                      You
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-app-text-muted truncate">@{user.username}</p>
                              </div>
                            </div>
                          </td>
                          <td className="text-app-text-secondary">
                            {user.email || <span className="text-app-text-muted">-</span>}
                          </td>
                          <td>
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold capitalize ${roleBadgeClass(user.role)}`}
                            >
                              {roleLabel(user.role)}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                                active
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-app-text-muted'
                              }`}
                            >
                              <span
                                className={`size-1.5 rounded-full ${
                                  active ? 'bg-emerald-500' : 'bg-app-border'
                                }`}
                              />
                              {active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap text-app-text-muted text-sm">
                            {formatJoined(user.created_at)}
                          </td>
                          <td className="text-right">
                            <div className="inline-flex justify-end">
                              <UserActionsMenu
                                user={user}
                                isSelf={isSelf}
                                isSuperAdmin={!!isSuperAdmin}
                                busy={
                                  (updateUser.isPending && menuUserId === user.id) ||
                                  (deleteUser.isPending && menuUserId === user.id)
                                }
                                onChangeRole={(role) => {
                                  setMenuUserId(user.id)
                                  updateUser.mutate({ id: user.id, data: { role } })
                                }}
                                onToggleActive={() => {
                                  setMenuUserId(user.id)
                                  updateUser.mutate({
                                    id: user.id,
                                    data: { is_active: user.is_active === false },
                                  })
                                }}
                                onDelete={() => {
                                  setMenuUserId(user.id)
                                  confirmDelete(user)
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <ListPagination
                page={pagination.page}
                pageCount={pagination.pageCount}
                total={pagination.total}
                pageSize={pagination.pageSize}
                onPageChange={pagination.setPage}
                className="px-4 pb-4"
              />
            </>
          )}
        </section>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close"
            onClick={() => setShowCreate(false)}
          />
          <div
            className="relative z-10 card w-full max-w-md rounded-t-2xl sm:rounded-xl !mb-0 max-h-[min(90vh,640px)] overflow-y-auto"
            role="dialog"
            aria-labelledby="create-admin-title"
          >
            <h2 id="create-admin-title" className="text-lg font-bold text-app-text mb-1">
              Create admin account
            </h2>
            <p className="text-sm text-app-text-muted mb-4">
              New admins can sign in with this email and temporary password.
            </p>
            <div className="space-y-3">
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input w-full"
              />
              <PasswordInput
                placeholder="Temporary password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
