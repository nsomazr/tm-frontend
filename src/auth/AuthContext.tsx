import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { authApi } from '../api'
import type { User } from '../types'

interface AuthTokensResponse {
  access: string
  refresh: string
  user: User
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (emailOrUsername: string, password: string) => Promise<boolean>
  registerWithPassword: (email: string, password: string) => Promise<boolean>
  registerWithOtp: {
    send: (email: string) => Promise<void>
    verify: (email: string, code: string) => Promise<boolean>
  }
  loginWithOtp: {
    send: (email: string) => Promise<void>
    verify: (email: string, code: string) => Promise<boolean>
  }
  register: (data: Record<string, string>) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  isAdmin: boolean
  isSuperAdmin: boolean
  isManager: boolean
  hasPaidAccess: boolean
  hasFullMapAccess: boolean
  canSaveExplorations: boolean
  mineralExploration: import('../types').MineralExplorationQuota | null
}

const AuthContext = createContext<AuthContextType | null>(null)

function storeSession(data: AuthTokensResponse) {
  localStorage.setItem('access_token', data.access)
  localStorage.setItem('refresh_token', data.refresh)
  return data.user
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const { data } = await authApi.me()
      setUser(data)
    } catch {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      setUser(null)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      refreshUser().finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (emailOrUsername: string, password: string) => {
    const { data } = await authApi.login(emailOrUsername, password)
    const nextUser = storeSession(data)
    setUser(nextUser)
    return nextUser.profile_complete
  }

  const registerWithPassword = async (email: string, password: string) => {
    const { data } = await authApi.signupPassword(email, password)
    const nextUser = storeSession(data)
    setUser(nextUser)
    return nextUser.profile_complete
  }

  const registerWithOtp = {
    send: async (email: string) => {
      await authApi.sendOtp(email, 'register')
    },
    verify: async (email: string, code: string) => {
      const { data } = await authApi.verifyOtp(email, code, 'register')
      const nextUser = storeSession(data)
      setUser(nextUser)
      return nextUser.profile_complete
    },
  }

  const loginWithOtp = {
    send: async (email: string) => {
      await authApi.sendOtp(email, 'login')
    },
    verify: async (email: string, code: string) => {
      const { data } = await authApi.verifyOtp(email, code, 'login')
      const nextUser = storeSession(data)
      setUser(nextUser)
      return nextUser.profile_complete
    },
  }

  const register = async (formData: Record<string, string>) => {
    await authApi.register(formData)
    await login(formData.username, formData.password)
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
  }

  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin'
  const isSuperAdmin = user?.role === 'super_admin'
  const isManager = isAdmin || user?.role === 'mineral_manager'
  const hasPaidAccess = user?.has_paid_access ?? isAdmin
  const hasFullMapAccess = hasPaidAccess || user?.role === 'mineral_manager'
  const canSaveExplorations = user?.can_save_explorations ?? isAdmin
  const mineralExploration = user?.mineral_exploration ?? null

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        registerWithPassword,
        registerWithOtp,
        loginWithOtp,
        register,
        logout,
        refreshUser,
        isAdmin,
        isSuperAdmin,
        isManager,
        hasPaidAccess,
        hasFullMapAccess,
        canSaveExplorations,
        mineralExploration,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
