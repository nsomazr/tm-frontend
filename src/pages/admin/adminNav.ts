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
    title: 'Map content',
    roles: ['admin', 'manager'],
    items: [
      { to: '/admin/layers', label: 'Layers', roles: ['admin', 'manager'] },
      { to: '/admin/minerals', label: 'Commodities', roles: ['admin', 'manager'] },
      { to: '/admin/coordinates', label: 'Coordinates', roles: ['admin', 'manager'] },
      { to: '/admin/reports', label: 'Reports', roles: ['admin', 'manager'] },
    ],
  },
  {
    title: 'Insights',
    roles: ['admin', 'manager'],
    items: [
      { to: '/admin/coverage', label: 'Coverage', roles: ['admin', 'manager'] },
      { to: '/admin/mineral-analytics', label: 'Mineral analytics', roles: ['admin'] },
      { to: '/admin/user-activity', label: 'User activity', roles: ['admin'] },
      { to: '/admin/analytics', label: 'Business', roles: ['admin'] },
    ],
  },
  {
    title: 'Map admin',
    roles: ['admin'],
    items: [
      { to: '/admin/boundaries', label: 'Boundaries', roles: ['admin'] },
      { to: '/admin/map-settings', label: 'Map settings', roles: ['admin'] },
      { to: '/admin/layer-activity', label: 'Layer activity', roles: ['admin'] },
    ],
  },
  {
    title: 'Platform',
    roles: ['admin'],
    items: [
      { to: '/admin/users', label: 'Users', roles: ['admin'] },
      { to: '/admin/assistant-settings', label: 'Assistant settings', roles: ['admin'] },
      { to: '/admin/revenue', label: 'Payments', roles: ['admin'] },
      { to: '/admin/compliance', label: 'Compliance', roles: ['admin'] },
    ],
  },
  {
    title: 'Advertising',
    roles: ['admin'],
    items: [
      { to: '/admin/ads/campaigns', label: 'Campaigns', roles: ['admin'] },
      { to: '/admin/ads/performance', label: 'Performance', roles: ['admin'] },
      { to: '/admin/ads/placements', label: 'Placements', roles: ['admin'] },
    ],
  },
  {
    title: 'Team',
    roles: ['admin'],
    items: [
      { to: '/admin/managers', label: 'Mineral managers', roles: ['admin'] },
      { to: '/admin/manager-performance', label: 'Performance', roles: ['admin'] },
    ],
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
