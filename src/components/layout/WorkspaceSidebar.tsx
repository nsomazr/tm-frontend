import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useTranslation } from '../../i18n/LocaleContext'
import WorkspaceTabs from './WorkspaceTabs'

export interface SidebarLink {
  to: string
  label: string
  end?: boolean
  badge?: ReactNode
}

export interface SidebarGroup {
  id: string
  title: string
  links: SidebarLink[]
  defaultOpen?: boolean
}

interface WorkspaceSidebarProps {
  storageKey: string
  workspaceTabs?: ReactNode
  header: ReactNode
  groups: SidebarGroup[]
  footerLinks?: SidebarLink[]
}

function navClass({ isActive }: { isActive: boolean }) {
  return `block px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out ${
    isActive
      ? 'bg-app-accent-soft text-terra-800 dark:text-terra-300'
      : 'text-app-secondary hover:bg-app-subtle hover:text-app-text'
  }`
}

function footerClass() {
  return 'block px-3 py-2 rounded-lg text-sm text-app-muted hover:bg-app-subtle hover:text-app-secondary transition-all duration-300 ease-in-out'
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-app-muted transition-transform duration-300 ease-in-out ${open ? 'rotate-180' : ''}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function PanelToggleIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      {collapsed ? (
        <path
          fillRule="evenodd"
          d="M12.79 5.23a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 11-1.06-1.06L15.44 10 12.79 7.35a.75.75 0 010-1.06zM3.75 4.5a.75.75 0 00-.75.75v9.5c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5H4.5V5.25a.75.75 0 00-.75-.75z"
          clipRule="evenodd"
        />
      ) : (
        <path
          fillRule="evenodd"
          d="M7.21 14.77a.75.75 0 01-.02-1.06L9.168 10 7.23 7.26a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02zM3.75 4.5a.75.75 0 00-.75.75v9.5c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5H4.5V5.25a.75.75 0 00-.75-.75z"
          clipRule="evenodd"
        />
      )}
    </svg>
  )
}

function readSectionState(storageKey: string, groups: SidebarGroup[]): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(`${storageKey}:sections`)
    if (raw) return JSON.parse(raw) as Record<string, boolean>
  } catch {
    /* ignore */
  }
  return Object.fromEntries(groups.map((g) => [g.id, g.defaultOpen !== false]))
}

function CollapsedWorkspaceTabs() {
  const { isManager } = useAuth()
  const { m } = useTranslation()

  if (!isManager) {
    return (
      <NavLink
        to="/dashboard"
        title={m.nav.account}
        className={({ isActive }) =>
          `flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold transition-colors ${
            isActive
              ? 'bg-app-accent-soft text-terra-800 dark:text-terra-300'
              : 'text-app-muted hover:bg-app-subtle hover:text-app-text'
          }`
        }
      >
        A
      </NavLink>
    )
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <NavLink
        to="/dashboard"
        title={m.nav.account}
        className={({ isActive }) =>
          `flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold transition-colors ${
            isActive
              ? 'bg-app-accent-soft text-terra-800 dark:text-terra-300'
              : 'text-app-muted hover:bg-app-subtle hover:text-app-text'
          }`
        }
      >
        A
      </NavLink>
      <NavLink
        to="/admin"
        title={m.nav.admin}
        className={({ isActive }) =>
          `flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold transition-colors ${
            isActive
              ? 'bg-app-accent-soft text-terra-800 dark:text-terra-300'
              : 'text-app-muted hover:bg-app-subtle hover:text-app-text'
          }`
        }
      >
        Ad
      </NavLink>
    </div>
  )
}

export default function WorkspaceSidebar({
  storageKey,
  workspaceTabs,
  header,
  groups,
  footerLinks = [],
}: WorkspaceSidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(`${storageKey}:collapsed`) === '1'
    } catch {
      return false
    }
  })

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    readSectionState(storageKey, groups),
  )

  useEffect(() => {
    try {
      localStorage.setItem(`${storageKey}:collapsed`, collapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [collapsed, storageKey])

  useEffect(() => {
    try {
      localStorage.setItem(`${storageKey}:sections`, JSON.stringify(openSections))
    } catch {
      /* ignore */
    }
  }, [openSections, storageKey])

  const toggleSection = useCallback((id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  if (collapsed) {
    return (
      <aside className="hidden md:flex w-12 shrink-0 flex-col items-center bg-app-surface border-r border-app-border py-3 transition-colors duration-300">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-lg text-app-muted hover:bg-app-subtle hover:text-app-text transition-all duration-300 ease-in-out"
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          <PanelToggleIcon collapsed />
        </button>
        {workspaceTabs ? (
          <div className="mt-3">
            <CollapsedWorkspaceTabs />
          </div>
        ) : null}
      </aside>
    )
  }

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-app-surface border-r border-app-border transition-colors duration-300">
      <div className="border-b app-divider px-4 pt-4 pb-4 space-y-3">
        {workspaceTabs ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">{workspaceTabs}</div>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="shrink-0 p-1.5 rounded-lg text-app-muted hover:bg-app-subtle hover:text-app-secondary transition-all duration-300 ease-in-out"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelToggleIcon collapsed={false} />
            </button>
          </div>
        ) : (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="p-1.5 rounded-lg text-app-muted hover:bg-app-subtle hover:text-app-secondary transition-all duration-300 ease-in-out"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelToggleIcon collapsed={false} />
            </button>
          </div>
        )}
        {header}
      </div>

      <nav className="flex-1 p-3 overflow-y-auto space-y-1">
        {groups.map((group, gi) => {
          const open = openSections[group.id] !== false
          return (
            <div key={group.id} className={gi > 0 ? 'pt-3 mt-3 border-t app-divider' : ''}>
              <button
                type="button"
                onClick={() => toggleSection(group.id)}
                className="flex w-full items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-left hover:bg-app-subtle transition-all duration-300 ease-in-out"
                aria-expanded={open}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-app-muted">
                  {group.title}
                </span>
                <Chevron open={open} />
              </button>
              {open && (
                <div className="mt-0.5 space-y-0.5">
                  {group.links.map((link) => (
                    <NavLink key={link.to} to={link.to} end={link.end} className={navClass}>
                      {link.label}
                      {link.badge}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {footerLinks.length > 0 && (
        <div className="p-3 border-t app-divider space-y-0.5">
          {footerLinks.map((link) => (
            <Link key={link.to} to={link.to} className={footerClass()}>
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </aside>
  )
}

export function WorkspaceMobileNav({
  groups,
  primaryTos = ['/admin', '/admin/layers', '/admin/minerals', '/admin/reports'],
  footerLinks = [],
}: {
  groups: SidebarGroup[]
  primaryTos?: string[]
  footerLinks?: SidebarLink[]
}) {
  const [moreOpen, setMoreOpen] = useState(false)
  const location = useLocation()
  const allLinks = groups.flatMap((group) => group.links)
  const primaryLinks = primaryTos
    .map((to) => allLinks.find((link) => link.to === to))
    .filter((link): link is SidebarLink => Boolean(link))
  const linkMatches = (link: SidebarLink) => {
    if (link.end) return location.pathname === link.to
    return location.pathname === link.to || location.pathname.startsWith(`${link.to}/`)
  }
  const onPrimary = primaryLinks.some(linkMatches)
  const moreActive =
    !onPrimary &&
    (location.pathname.startsWith('/admin') ||
      location.pathname.startsWith('/dashboard') ||
      location.pathname.startsWith('/downloads'))

  useEffect(() => {
    setMoreOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!moreOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [moreOpen])

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t app-divider bg-app-surface/95 backdrop-blur-xl px-1.5 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-stretch gap-0.5 transition-colors duration-300"
        aria-label="Admin"
      >
        {primaryLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `min-w-0 flex-1 px-1.5 py-2 rounded-lg text-[11px] font-medium text-center truncate transition-all duration-300 ease-in-out ${
                isActive
                  ? 'bg-app-accent-soft text-terra-800 dark:text-terra-300'
                  : 'text-app-secondary'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`min-w-0 flex-1 px-1.5 py-2 rounded-lg text-[11px] font-medium text-center transition-all duration-300 ease-in-out ${
            moreActive || moreOpen
              ? 'bg-app-accent-soft text-terra-800 dark:text-terra-300'
              : 'text-app-secondary'
          }`}
          aria-expanded={moreOpen}
          aria-haspopup="dialog"
        >
          More
        </button>
      </nav>

      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex items-end justify-center bg-black/40">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More admin pages"
            className="relative z-10 w-full max-h-[min(78vh,36rem)] overflow-hidden rounded-t-2xl border border-app-border bg-app-surface shadow-xl flex flex-col"
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b app-divider">
              <p className="text-sm font-semibold text-app-text">More</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-app-text-muted hover:bg-app-subtle hover:text-app-text"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <WorkspaceTabs sidebar />
              {groups.map((group) => (
                <div key={group.id}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-app-text-muted px-1 mb-1">
                    {group.title}
                  </p>
                  <div className="space-y-0.5">
                    {group.links.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        end={link.end}
                        onClick={() => setMoreOpen(false)}
                        className={navClass}
                      >
                        {link.label}
                        {link.badge}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
              {footerLinks.length > 0 && (
                <div className="border-t app-divider pt-3 space-y-0.5">
                  {footerLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMoreOpen(false)}
                      className={footerClass()}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
