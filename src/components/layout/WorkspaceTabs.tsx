import { NavLink } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useTranslation } from '../../i18n/LocaleContext'

function tabClass(isActive: boolean) {
  return `flex-1 text-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive
      ? 'bg-white text-terra-800 shadow-sm'
      : 'text-slate-600 hover:text-slate-900'
  }`
}

/** Switch between personal account and admin workspace. */
export default function WorkspaceTabs({ compact }: { compact?: boolean }) {
  const { isManager } = useAuth()
  const { m } = useTranslation()

  if (!isManager) {
    return (
      <NavLink
        to="/dashboard"
        className={({ isActive }) =>
          `text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
            isActive ? 'bg-terra-50 text-terra-800' : 'text-slate-600 hover:bg-slate-50'
          }`
        }
      >
        {m.nav.account}
      </NavLink>
    )
  }

  if (compact) {
    return (
      <div className="flex items-center rounded-lg bg-slate-100 p-0.5 min-w-[140px]">
        <NavLink to="/dashboard" className={({ isActive }) => tabClass(isActive)}>
          {m.nav.account}
        </NavLink>
        <NavLink to="/admin" className={({ isActive }) => tabClass(isActive)}>
          {m.nav.admin}
        </NavLink>
      </div>
    )
  }

  return (
    <div className="flex rounded-lg bg-slate-100 p-1 gap-1">
      <NavLink to="/dashboard" className={({ isActive }) => tabClass(isActive)}>
        {m.nav.myAccount}
      </NavLink>
      <NavLink to="/admin" className={({ isActive }) => tabClass(isActive)}>
        {m.nav.administration}
      </NavLink>
    </div>
  )
}

export function isWorkspaceRoute(pathname: string) {
  return pathname.startsWith('/dashboard') || pathname.startsWith('/admin')
}
