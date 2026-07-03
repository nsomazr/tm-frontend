import { NavLink } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useTranslation } from '../../i18n/LocaleContext'

function tabClass(isActive: boolean, compact?: boolean) {
  return `${
    compact ? 'flex-1 text-center px-2 py-1.5 text-xs' : 'block w-full px-3 py-2 text-sm'
  } segmented-btn ${isActive ? 'segmented-btn-active' : ''}`
}

/** Switch between personal account and admin workspace. */
export default function WorkspaceTabs({
  compact,
  sidebar,
}: {
  compact?: boolean
  sidebar?: boolean
}) {
  const { isManager } = useAuth()
  const { m } = useTranslation()

  if (!isManager) {
    return (
      <NavLink
        to="/dashboard"
        className={({ isActive }) =>
          `nav-link ${isActive ? 'nav-link-active' : ''}`
        }
      >
        {m.nav.account}
      </NavLink>
    )
  }

  if (sidebar) {
    return (
      <div className="segmented w-full">
        <NavLink to="/dashboard" className={({ isActive }) => tabClass(isActive, true)}>
          {m.nav.account}
        </NavLink>
        <NavLink to="/admin" className={({ isActive }) => tabClass(isActive, true)}>
          {m.nav.admin}
        </NavLink>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="segmented min-w-0 shrink" role="group" aria-label="Workspace">
        <NavLink to="/dashboard" className={({ isActive }) => tabClass(isActive, true)}>
          {m.nav.account}
        </NavLink>
        <NavLink to="/admin" className={({ isActive }) => tabClass(isActive, true)}>
          {m.nav.admin}
        </NavLink>
      </div>
    )
  }

  return (
    <div className="segmented p-1 gap-1">
      <NavLink to="/dashboard" className={({ isActive }) => tabClass(isActive, true)}>
        {m.nav.myAccount}
      </NavLink>
      <NavLink to="/admin" className={({ isActive }) => tabClass(isActive, true)}>
        {m.nav.administration}
      </NavLink>
    </div>
  )
}

export function isWorkspaceRoute(pathname: string) {
  return pathname.startsWith('/dashboard') || pathname.startsWith('/admin')
}
