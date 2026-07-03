import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireProfile?: boolean
}

export default function ProtectedRoute({ children, requireProfile = true }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-terra-600 border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (requireProfile && !user.profile_complete && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" state={{ from: location.pathname }} replace />
  }

  return <>{children}</>
}
