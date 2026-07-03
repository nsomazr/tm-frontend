import { NavLink, Outlet, Navigate, Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import WorkspaceTabs from '../../components/layout/WorkspaceTabs'
import { resolveAdminRole, visibleNavGroups } from './adminNav'

function navClass({ isActive }: { isActive: boolean }) {
  return `block px-3 py-2 rounded-lg text-sm transition-colors ${
    isActive ? 'bg-terra-50 text-terra-800 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
  }`
}

export default function AdminLayout() {
  const { user, isManager, isAdmin } = useAuth()
  const accessRole = resolveAdminRole(isAdmin, isManager)
  const groups = visibleNavGroups(accessRole)

  if (!isManager) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="flex h-full bg-slate-50">
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-white border-r border-slate-200">
        <div className="p-4 border-b border-slate-100 space-y-4">
          <WorkspaceTabs />
          <div>
            <p className="font-semibold text-slate-900">{isAdmin ? 'Platform admin' : 'Mineral manager'}</p>
            <p className="text-xs text-slate-500 truncate">{user?.username}</p>
          </div>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto">
          {groups.map((group, gi) => (
            <div key={group.title} className={gi > 0 ? 'mt-5 pt-4 border-t border-slate-100' : ''}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((link) => (
                  <NavLink key={link.to} to={link.to} end={link.end} className={navClass}>
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-100">
          <Link to="/" className="block px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-800">
            Open map
          </Link>
        </div>
      </aside>

      <div className="md:hidden fixed top-16 inset-x-0 z-20 bg-white border-b border-slate-200 px-4 py-2">
        <WorkspaceTabs compact />
      </div>

      <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 px-2 py-2 flex gap-1 overflow-x-auto scrollbar-hide">
        {groups.flatMap((g) => g.items).map((link) => (
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
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
