import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'

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

export function WorkspaceMobileNav({ links }: { links: SidebarLink[] }) {
  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-app-surface/95 backdrop-blur-xl border-t app-divider px-2 py-2 flex gap-1 overflow-x-auto scrollbar-hide transition-colors duration-300">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            `shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 ease-in-out ${
              isActive ? 'bg-app-accent-soft text-terra-800 dark:text-terra-300' : 'text-app-secondary'
            }`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </div>
  )
}
