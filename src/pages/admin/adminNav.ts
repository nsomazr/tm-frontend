export type AdminRole = 'admin' | 'manager'

export interface AdminNavItem {
  to: string
  label: string
  end?: boolean
  roles: AdminRole[]
}

export interface AdminNavGroup {
  title: string
  roles: AdminRole[]
  items: AdminNavItem[]
}

/** Sidebar navigation with RBAC. Admin = super_admin | admin. Manager = mineral_manager (+ admins). */
export const adminNavGroups: AdminNavGroup[] = [
  {
    title: 'Dashboard',
    roles: ['admin', 'manager'],
    items: [{ to: '/admin', label: 'Overview', end: true, roles: ['admin', 'manager'] }],
  },
  {
    title: 'Platform',
    roles: ['admin'],
    items: [
      { to: '/admin/analytics', label: 'Analytics', roles: ['admin'] },
      { to: '/admin/users', label: 'Users', roles: ['admin'] },
      { to: '/admin/revenue', label: 'Payments', roles: ['admin'] },
      { to: '/admin/compliance', label: 'Compliance', roles: ['admin'] },
    ],
  },
  {
    title: 'Map & geology',
    roles: ['admin', 'manager'],
    items: [
      { to: '/admin/coverage', label: 'Coverage', roles: ['admin', 'manager'] },
      { to: '/admin/boundaries', label: 'Boundary layers', roles: ['admin'] },
      { to: '/admin/layers', label: 'Layers', roles: ['admin', 'manager'] },
      { to: '/admin/coordinates', label: 'Coordinates', roles: ['admin', 'manager'] },
      { to: '/admin/reports', label: 'Reports', roles: ['admin', 'manager'] },
      { to: '/admin/minerals', label: 'Minerals / Commodities', roles: ['admin', 'manager'] },
    ],
  },
  {
    title: 'Team',
    roles: ['admin'],
    items: [{ to: '/admin/managers', label: 'Mineral managers', roles: ['admin'] }],
  },
]

export function resolveAdminRole(isAdmin: boolean, isManager: boolean): AdminRole | null {
  if (isAdmin) return 'admin'
  if (isManager) return 'manager'
  return null
}

export function visibleNavGroups(role: AdminRole | null): AdminNavGroup[] {
  if (!role) return []
  return adminNavGroups
    .filter((group) => group.roles.includes(role))
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0)
}
