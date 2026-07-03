import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useTranslation } from '../../i18n/LocaleContext'
import Logo from '../brand/Logo'
import CompanyCredit from '../brand/CompanyCredit'
import LanguageSwitch from './LanguageSwitch'
import WorkspaceTabs, { isWorkspaceRoute } from './WorkspaceTabs'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
    isActive ? 'bg-terra-50 text-terra-800' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
  }`

function UserMenu() {
  const { user, logout, loading } = useAuth()
  const { m } = useTranslation()
  if (loading) return <div className="w-24 h-9" />

  if (user) {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="hidden lg:inline text-sm text-slate-500 truncate max-w-[120px]">{user.username}</span>
        <button
          onClick={logout}
          className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-50"
        >
          {m.nav.logout}
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-50">
        {m.nav.signIn}
      </Link>
      <Link to="/register" className="btn-primary text-sm !py-2 !px-4">
        {m.nav.register}
      </Link>
    </div>
  )
}

function HeaderNav({ className }: { className?: string }) {
  const { hasPaidAccess } = useAuth()
  const { m } = useTranslation()
  const links = [
    { to: '/', label: m.nav.map },
    ...(hasPaidAccess ? [{ to: '/downloads', label: m.nav.reports }] : []),
    { to: '/subscriptions', label: m.nav.pricing },
    { to: '/about', label: m.nav.about },
  ]

  return (
    <nav className={className}>
      {links.map((link) => (
        <NavLink key={link.to} to={link.to} end={link.to === '/'} className={navLinkClass}>
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}

export default function Layout() {
  const { user } = useAuth()
  const { m } = useTranslation()
  const location = useLocation()
  const isMapPage = location.pathname === '/' || location.pathname === '/maps'
  const isWorkspace = isWorkspaceRoute(location.pathname)

  const header = (
    <header className="shrink-0 bg-white border-b border-slate-200 shadow-sm z-20">
      <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 flex items-center gap-4">
        <Link to="/" className="shrink-0 flex items-center">
          <Logo variant="icon" className="h-10 w-10 md:hidden" />
          <Logo variant="wordmark" className="hidden md:block h-11 w-auto" />
        </Link>
        <HeaderNav className="hidden md:flex items-center gap-1 flex-1 justify-center" />
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <LanguageSwitch compact />
          {user && (
            <div className="hidden sm:block">
              <WorkspaceTabs compact />
            </div>
          )}
          <UserMenu />
        </div>
      </div>
      <div className="md:hidden border-t border-slate-100 px-4 py-2 flex items-center gap-3">
        {user && <WorkspaceTabs compact />}
        <HeaderNav className="flex gap-1 overflow-x-auto scrollbar-hide flex-1" />
      </div>
    </header>
  )

  if (isMapPage || isWorkspace) {
    return (
      <div className="h-screen flex flex-col bg-slate-100">
        {header}
        <main className="flex-1 min-h-0 overflow-auto">
          <Outlet />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {header}
      <main className="flex-1"><Outlet /></main>
      <footer className="border-t border-slate-200 bg-white py-8 px-4 text-center space-y-2">
        <div className="text-sm text-slate-500">
          <Link to="/about" className="text-terra-600 hover:text-terra-700 font-medium">{m.footer.about}</Link>
          <span className="mx-2">·</span>
          {m.footer.tagline}
        </div>
        <CompanyCredit />
      </footer>
    </div>
  )
}
