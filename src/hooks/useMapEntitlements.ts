import { useAuth } from '../auth/AuthContext'

/** Map, analytics, and exploration entitlements (paid subscribers + mineral managers). */
export function useMapEntitlements() {
  const auth = useAuth()
  return {
    user: auth.user,
    refreshUser: auth.refreshUser,
    hasPaidAccess: auth.hasPaidAccess,
    hasFullMapAccess: auth.hasFullMapAccess,
    canSaveExplorations: auth.canSaveExplorations,
    mineralExploration: auth.mineralExploration,
    isManager: auth.isManager,
  }
}
