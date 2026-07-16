import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useTranslation } from '../../i18n/LocaleContext'
import Logo from '../brand/Logo'
import CompanyCredit from '../brand/CompanyCredit'
import LanguageSwitch from './LanguageSwitch'
import MobileMenu from './MobileMenu'
import MineralsNavMenu from './MineralsNavMenu'
import ThemeToggle from './ThemeToggle'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `nav-link ${isActive ? 'nav-link-active' : ''}`

function UserMenu() {
  const { user, logout, loading } = useAuth()
  const { m } = useTranslation()
  if (loading) return <div className="w-24 h-9" />

  if (user) {
    const planName = user.current_plan?.name ?? 'Explorer'
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          to="/dashboard/subscription"
          className="hidden sm:inline-flex items-center rounded-full border border-terra-200/80 bg-terra-50/80 px-2.5 py-1 text-[11px] font-semibold text-terra-800 dark:border-terra-500/30 dark:bg-terra-500/10 dark:text-terra-300"
          title={`${m.nav.plan}: ${planName}`}
        >
          {planName}
        </Link>
        <Link to="/dashboard" className="nav-link text-xs sm:text-sm whitespace-nowrap px-2">
          {m.nav.dashboard}
        </Link>
        <button onClick={logout} className="nav-link text-xs sm:text-sm whitespace-nowrap px-2">
          {m.nav.logout}
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Link to="/login" className="nav-link">
        {m.nav.signIn}
      </Link>
      <Link to="/register" className="btn-primary text-sm !py-2 !px-4">
        {m.nav.register}
      </Link>
    </div>
  )
}

function HeaderNav({ className, showMinerals }: { className?: string; showMinerals?: boolean }) {
  const { m } = useTranslation()
  const links = [
    { to: '/', label: m.nav.map },
    { to: '/marketplace', label: m.nav.marketplace },
    { to: '/about', label: m.nav.about },
    { to: '/subscriptions', label: m.nav.pricing },
    { to: '/downloads', label: m.nav.reports },
  ]

  return (
    <nav className={`${className ?? ''} flex items-center gap-1`}>
      {links.map((link) => (
        <NavLink key={link.to} to={link.to} end={link.to === '/'} className={navLinkClass}>
          {link.label}
        </NavLink>
      ))}
      {showMinerals && <MineralsNavMenu />}
    </nav>
  )
}

export default function Layout() {
  const { m } = useTranslation()
  const location = useLocation()
  const { hasFullMapAccess } = useAuth()
  const isMapPage = location.pathname === '/' || location.pathname === '/maps'
  const isMarketplacePage = location.pathname === '/marketplace'
  const isAuthPage =
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/complete-profile'
  const isFullscreenPage = isMapPage || isMarketplacePage
  const isWorkspace =
    location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/admin')
  const desktopControlsClass = isFullscreenPage ? 'hidden lg:flex' : 'hidden md:flex'
  const mobileMenuClass = isFullscreenPage ? 'lg:hidden' : 'md:hidden'
  const showMineralsNav = isMapPage && hasFullMapAccess

  if (isAuthPage) {
    return (
      <div className="h-[100dvh] w-full max-w-[100vw] overflow-hidden bg-app-bg">
        <Outlet />
      </div>
    )
  }

  const header = (
    <header className={`app-header w-full max-w-[100vw] overflow-x-clip ${isFullscreenPage ? 'map-page-header shrink-0' : ''}`}>
      <div
        className={`w-full flex items-center gap-1.5 sm:gap-4 min-w-0 ${
          isFullscreenPage ? 'px-2 sm:px-6' : 'max-w-7xl mx-auto px-3 sm:px-6'
        } ${isFullscreenPage ? 'h-12 md:h-16' : 'h-16'}`}
      >
        <Link to="/" className="shrink-0 flex items-center">
          <Logo variant="icon" className={`${isFullscreenPage ? 'h-8 w-8 sm:h-9 sm:w-9' : 'h-10 w-10'} md:hidden`} />
          <Logo variant="wordmark" className="hidden md:block h-11 w-auto" />
        </Link>
        <HeaderNav
          className={`hidden items-center gap-1 flex-1 justify-center min-w-0 ${isFullscreenPage ? 'lg:flex' : 'md:flex'}`}
          showMinerals={showMineralsNav}
        />
        <div className={`ml-auto items-center gap-1 sm:gap-2 shrink-0 ${desktopControlsClass}`}>
          <ThemeToggle compact />
          <LanguageSwitch compact />
          <UserMenu />
        </div>
        <div className={`ml-auto flex shrink-0 items-center gap-1.5 ${mobileMenuClass}`}>
          {isFullscreenPage && <ThemeToggle compact />}
          <MobileMenu />
        </div>
      </div>
    </header>
  )

  if (isFullscreenPage || isWorkspace) {
    return (
      <div className="h-[100dvh] w-full max-w-[100vw] flex flex-col overflow-hidden bg-app-bg">
        {header}
        <main className="flex-1 min-h-0 min-w-0 w-full overflow-x-hidden overflow-y-hidden">
          <Outlet />
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      {header}
      <main className="flex-1"><Outlet /></main>
      <footer className="app-footer">
        <div className="text-sm text-app-muted">
          <Link to="/about" className="text-terra-600 dark:text-terra-400 hover:text-terra-700 dark:hover:text-terra-300 font-medium transition-colors duration-300">
            {m.footer.about}
          </Link>
          <span className="mx-2">·</span>
          {m.footer.tagline}
        </div>
        <CompanyCredit />
      </footer>
    </div>
  )
}
