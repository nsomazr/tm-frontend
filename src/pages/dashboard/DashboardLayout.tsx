import { NavLink, Outlet, Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import WorkspaceTabs from '../../components/layout/WorkspaceTabs'

const mainLinks = [
  { to: '/dashboard', label: 'Overview', end: true },
  { to: '/dashboard/subscription', label: 'Subscription' },
  { to: '/dashboard/billing', label: 'Billing' },
  { to: '/dashboard/analytics', label: 'Analytics' },
  { to: '/dashboard/reports', label: 'My reports' },
]

const quickLinks = [
  { to: '/', label: 'Map' },
  { to: '/downloads', label: 'Reports catalog' },
]

function sidebarLinkClass({ isActive }: { isActive: boolean }) {
  return `block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
    isActive ? 'bg-terra-50 text-terra-800' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
  }`
}

export default function DashboardLayout() {
  const { user, hasPaidAccess } = useAuth()

  return (
    <div className="flex h-full bg-slate-50">
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-white border-r border-slate-200">
        <div className="p-4 border-b border-slate-100 space-y-4">
          <WorkspaceTabs />
          <div>
            <p className="font-semibold text-slate-900 truncate">{user?.first_name || user?.username}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Account</p>
          {mainLinks.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={sidebarLinkClass}>
              {link.label}
              {link.to === '/dashboard/analytics' && !hasPaidAccess && (
                <span className="ml-1 text-[10px] text-amber-600">Pro</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-100 space-y-0.5">
          {quickLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="block px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </aside>

      <div className="md:hidden fixed top-16 inset-x-0 z-20 bg-white border-b border-slate-200 px-4 py-2">
        <WorkspaceTabs compact />
      </div>

      <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 px-2 py-2 flex gap-1 overflow-x-auto scrollbar-hide">
        {mainLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `shrink-0 px-3 py-2 rounded-lg text-xs font-medium ${
                isActive ? 'bg-terra-50 text-terra-800' : 'text-slate-600'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </div>

      <div className="flex-1 min-w-0 pb-16 md:pb-0 pt-12 md:pt-0 overflow-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
