import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import WorkspaceTabs from '../../components/layout/WorkspaceTabs'
import WorkspaceSidebar, { WorkspaceMobileNav } from '../../components/layout/WorkspaceSidebar'
import { resolveAdminRole, visibleNavGroups } from './adminNav'

export default function AdminLayout() {
  const { user, isManager, isAdmin } = useAuth()
  const accessRole = resolveAdminRole(isAdmin, isManager)
  const groups = visibleNavGroups(accessRole)

  if (!isManager) {
    return <Navigate to="/dashboard" replace />
  }

  const sidebarGroups = groups.map((group) => ({
    id: group.title.toLowerCase().replace(/\s+/g, '-'),
    title: group.title,
    links: group.items.map((item) => ({
      to: item.to,
      label: item.label,
      end: item.end,
    })),
  }))

  const mobileLinks = groups.flatMap((g) =>
    g.items.map((item) => ({
      to: item.to,
      label: item.label,
      end: item.end,
    })),
  )

  return (
    <div className="flex h-full bg-app-bg">
      <WorkspaceSidebar
        storageKey="tm-admin-sidebar"
        workspaceTabs={<WorkspaceTabs sidebar />}
        header={
          <div>
            <p className="font-semibold text-app-text truncate">{isAdmin ? 'Platform admin' : 'Mineral manager'}</p>
            <p className="text-xs text-app-muted truncate mt-0.5">{user?.username}</p>
          </div>
        }
        groups={sidebarGroups}
        footerLinks={[{ to: '/', label: 'Open map' }]}
      />

      <WorkspaceMobileNav links={mobileLinks} />

      <div className="flex-1 min-w-0 pb-16 md:pb-0 overflow-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
