import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useMapEntitlements } from '../../hooks/useMapEntitlements'
import WorkspaceTabs from '../../components/layout/WorkspaceTabs'
import WorkspaceSidebar, { WorkspaceMobileNav } from '../../components/layout/WorkspaceSidebar'

const mainLinks = [
  { to: '/dashboard', label: 'Overview', end: true },
  { to: '/dashboard/assistant', label: 'Ask Terra' },
  { to: '/dashboard/subscription', label: 'Subscription' },
  { to: '/dashboard/billing', label: 'Billing' },
  { to: '/dashboard/analytics', label: 'Analytics' },
  { to: '/downloads', label: 'Report catalog' },
  { to: '/dashboard/reports', label: 'My downloads' },
]

const quickLinks = [{ to: '/', label: 'Map' }]

export default function DashboardLayout() {
  const { user } = useAuth()
  const { hasFullMapAccess } = useMapEntitlements()
  const { pathname } = useLocation()
  const isAssistantPage = pathname === '/dashboard/assistant'

  const accountLinks = mainLinks.map((link) => ({
    ...link,
    badge:
      link.to === '/dashboard/analytics' && !hasFullMapAccess ? (
        <span className="ml-1 text-[10px] text-amber-600">Pro</span>
      ) : undefined,
  }))

  return (
    <div className="flex h-full bg-app-bg">
      <WorkspaceSidebar
        storageKey="tm-dashboard-sidebar"
        workspaceTabs={<WorkspaceTabs sidebar />}
        header={
          <div>
            <p className="font-semibold text-app-text truncate">{user?.first_name || user?.username}</p>
            <p className="text-xs text-app-muted truncate mt-0.5">{user?.email}</p>
          </div>
        }
        groups={[{ id: 'account', title: 'Account', links: accountLinks }]}
        footerLinks={quickLinks}
      />

      <div
        className={`flex-1 min-w-0 pb-16 md:pb-0 ${
          isAssistantPage ? 'flex flex-col min-h-0 overflow-hidden' : 'overflow-auto'
        }`}
      >
        <div
          className={`max-w-3xl mx-auto px-4 sm:px-8 w-full ${
            isAssistantPage ? 'flex flex-col flex-1 min-h-0 py-4 sm:py-6' : 'py-8'
          }`}
        >
          <Outlet />
        </div>
      </div>
    </div>
  )
}
