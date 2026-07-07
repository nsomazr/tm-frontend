import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'

interface ActionMenuProps {
  label: string
  children: ReactNode
  align?: 'left' | 'right'
  open?: boolean
  onOpenChange?: (open: boolean) => void
  minWidth?: string
}

function VerticalEllipsisIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </svg>
  )
}

export default function ActionMenu({
  label,
  children,
  align = 'right',
  open: openProp,
  onOpenChange,
  minWidth = '10.5rem',
}: ActionMenuProps) {
  const menuId = useId()
  const [openUncontrolled, setOpenUncontrolled] = useState(false)
  const open = openProp ?? openUncontrolled
  const setOpen = onOpenChange ?? setOpenUncontrolled

  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState<CSSProperties>({ top: 0, left: 0, visibility: 'hidden' })

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return

    const updatePosition = () => {
      const trigger = triggerRef.current
      const menu = menuRef.current
      if (!trigger) return

      const rect = trigger.getBoundingClientRect()
      const menuWidth = menu?.offsetWidth ?? 168
      const menuHeight = menu?.offsetHeight ?? 220
      const margin = 8
      const gap = 4

      const spaceBelow = window.innerHeight - rect.bottom
      const placeAbove = spaceBelow < menuHeight + margin && rect.top > menuHeight + margin
      const top = placeAbove ? rect.top - menuHeight - gap : rect.bottom + gap

      let left = align === 'right' ? rect.right - menuWidth : rect.left
      left = Math.max(margin, Math.min(left, window.innerWidth - menuWidth - margin))

      setCoords({ top, left, visibility: 'visible' })
    }

    updatePosition()
    const frame = requestAnimationFrame(updatePosition)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, align, children])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [open, setOpen])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex size-8 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-subtle hover:text-app-text"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
      >
        <VerticalEllipsisIcon />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            className="fixed z-[300] rounded-lg border border-app-border bg-app-surface py-1 shadow-lg"
            style={{ ...coords, minWidth }}
            onClick={() => setOpen(false)}
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  )
}

export function ActionMenuItem({
  children,
  onClick,
  to,
  disabled,
  destructive,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  to?: string
  disabled?: boolean
  destructive?: boolean
  className?: string
}) {
  const itemClass = `block w-full px-3 py-2 text-left text-xs ${
    destructive
      ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
      : 'text-app-text hover:bg-app-subtle'
  } disabled:opacity-50 disabled:pointer-events-none ${className}`.trim()

  if (to) {
    return (
      <Link to={to} role="menuitem" className={itemClass}>
        {children}
      </Link>
    )
  }

  return (
    <button type="button" role="menuitem" onClick={onClick} disabled={disabled} className={itemClass}>
      {children}
    </button>
  )
}
