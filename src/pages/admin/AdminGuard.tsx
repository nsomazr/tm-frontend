import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import type { AdminRole } from './adminNav'
import { resolveAdminRole } from './adminNav'

export function AdminOnly({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth()
  if (!isAdmin) return <Navigate to="/admin" replace />
  return children
}

export function RequireAdminRole({ role, children }: { role: AdminRole; children: ReactNode }) {
  const { isAdmin, isManager } = useAuth()
  const userRole = resolveAdminRole(isAdmin, isManager)
  if (userRole !== role && !(role === 'manager' && userRole === 'admin')) {
    return <Navigate to="/admin" replace />
  }
  return children
}
