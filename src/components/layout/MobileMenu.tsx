import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useTranslation } from '../../i18n/LocaleContext'
import LanguageSwitch from './LanguageSwitch'
import ThemeToggle from './ThemeToggle'
import WorkspaceTabs from './WorkspaceTabs'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-terra-50 text-terra-700 dark:bg-terra-500/10 dark:text-terra-400'
      : 'text-app-text-secondary hover:bg-app-subtle'
  }`

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export default function MobileMenu() {
  const [open, setOpen] = useState(false)
  const { user, logout, loading } = useAuth()
  const { m } = useTranslation()

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, close])

  const navLinks = [
    { to: '/', label: m.nav.map, end: true },
    { to: '/about', label: m.nav.about },
    { to: '/subscriptions', label: m.nav.pricing },
    { to: '/downloads', label: m.nav.reports },
  ]

  const panel = open ? (
    <>
      <button
        type="button"
        aria-label={m.nav.menuClose}
        className="mobile-menu-backdrop"
        onClick={close}
      />
      <aside className="mobile-menu-panel" role="dialog" aria-modal="true" aria-label={m.nav.menu}>
        <div className="flex items-center justify-between border-b app-divider px-4 py-3">
          <span className="text-sm font-semibold text-app-text">{m.nav.menu}</span>
          <button
            type="button"
            onClick={close}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-app-text-secondary hover:bg-app-subtle"
            aria-label={m.nav.menuClose}
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-4">
          <nav className="space-y-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={navLinkClass}
                onClick={close}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {user && (
            <div className="mt-6">
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-app-muted">
                {m.nav.workspace}
              </p>
              <WorkspaceTabs sidebar />
            </div>
          )}

          <div className="mt-6 space-y-4">
            <div>
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-app-muted">
                {m.nav.language}
              </p>
              <LanguageSwitch />
            </div>
            <div>
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-app-muted">
                {m.nav.theme}
              </p>
              <ThemeToggle />
            </div>
          </div>

          <div className="mt-auto pt-6">
            {loading ? (
              <div className="h-10" />
            ) : user ? (
              <div className="space-y-3 border-t app-divider pt-4">
                <p className="truncate px-1 text-sm text-app-muted">{user.username}</p>
                <button
                  type="button"
                  onClick={() => {
                    close()
                    logout()
                  }}
                  className="btn-secondary w-full text-sm"
                >
                  {m.nav.logout}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 border-t app-divider pt-4">
                <Link to="/login" onClick={close} className="btn-secondary w-full text-center text-sm">
                  {m.nav.signIn}
                </Link>
                <Link to="/register" onClick={close} className="btn-primary w-full text-center text-sm">
                  {m.nav.register}
                </Link>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  ) : null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-app-text-secondary transition-colors hover:bg-app-subtle active:scale-[0.97]"
        aria-label={m.nav.menu}
        aria-expanded={open}
      >
        <MenuIcon className="h-5 w-5" />
      </button>
      {panel && createPortal(panel, document.body)}
    </>
  )
}
