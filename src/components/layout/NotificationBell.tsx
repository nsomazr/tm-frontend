import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import ConversationOriginBadge from '../marketplace/ConversationOriginBadge'

function BellIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 01-6 0m6 0H9"
      />
    </svg>
  )
}

function notificationPath(link: string): string {
  if (link.startsWith('/')) return link
  try {
    const url = new URL(link)
    return `${url.pathname}${url.search}`
  } catch {
    return link
  }
}

export default function NotificationBell() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const unreadQuery = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => notificationsApi.unreadCount().then((r) => r.data.count),
    enabled: !!user,
    refetchInterval: 45_000,
  })

  const listQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list().then((r) => r.data),
    enabled: !!user && open,
  })

  const markRead = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    },
  })

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    },
  })

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  if (!user) return null

  const unread = unreadQuery.data ?? 0
  const notifications = listQuery.data ?? []

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-app-text-secondary transition-colors hover:bg-app-subtle hover:text-app-text"
      >
        <BellIcon />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-terra-600 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border app-divider bg-app-surface shadow-xl">
          <div className="flex items-center justify-between gap-2 border-b app-divider px-4 py-3">
            <p className="text-sm font-semibold text-app-text">Notifications</p>
            {unread > 0 ? (
              <button
                type="button"
                className="text-xs font-medium text-terra-600 hover:underline"
                onClick={() => markAllRead.mutate()}
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {listQuery.isLoading ? (
              <p className="px-4 py-6 text-sm text-app-muted">Loading…</p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-app-muted">No notifications yet.</p>
            ) : (
              <ul className="divide-y app-divider">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <Link
                      to={notificationPath(notification.link)}
                      onClick={() => {
                        if (!notification.is_read) markRead.mutate(notification.id)
                        setOpen(false)
                      }}
                      className={`block px-4 py-3 transition-colors hover:bg-app-subtle/70 ${
                        notification.is_read ? '' : 'bg-terra-50/50 dark:bg-terra-500/5'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-app-text">{notification.title}</p>
                        {notification.kind === 'marketplace_inquiry' ? (
                          <ConversationOriginBadge origin="marketplace_inquiry" className="normal-case" />
                        ) : null}
                      </div>
                      {notification.body ? (
                        <p className="mt-1 line-clamp-2 text-xs text-app-text-secondary">{notification.body}</p>
                      ) : null}
                      <p className="mt-1 text-[11px] text-app-muted">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
