import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { authApi } from '../api'
import { OTP_SMS_VALID_SECONDS, OTP_VALID_SECONDS } from '../constants/otp'
import { detectOtpChannel, normalizeTzPhone } from '../lib/phone'
import type { User } from '../types'
import { clearSessionTimers, markSessionStarted } from './sessionTimeout'
import { useSessionTimeout } from './useSessionTimeout'

interface AuthTokensResponse {
  access: string
  refresh: string
  user: User
}

function buildOtpPayload(identifier: string, purpose: 'register' | 'login') {
  const channel = detectOtpChannel(identifier)
  if (channel === 'sms') {
    const phone = normalizeTzPhone(identifier)
    if (!phone) throw new Error('Enter a valid Tanzania mobile number.')
    return { purpose, phone }
  }
  if (channel === 'email') {
    return { purpose, email: identifier.trim().toLowerCase() }
  }
  throw new Error('Enter a valid email address or Tanzania mobile number.')
}

async function sendOtpIdentifier(identifier: string, purpose: 'register' | 'login') {
  const payload = buildOtpPayload(identifier, purpose)
  const { data } = await authApi.sendOtp(payload)
  const channel = (data.channel as 'email' | 'sms' | undefined) ?? (payload.phone ? 'sms' : 'email')
  const expiresIn =
    typeof data.expires_in === 'number'
      ? data.expires_in
      : channel === 'sms'
        ? OTP_SMS_VALID_SECONDS
        : OTP_VALID_SECONDS
  return { channel, expiresIn }
}

async function verifyOtpIdentifier(identifier: string, code: string, purpose: 'register' | 'login') {
  const payload = { ...buildOtpPayload(identifier, purpose), code }
  const { data } = await authApi.verifyOtp(payload)
  return data as AuthTokensResponse
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (emailOrUsername: string, password: string) => Promise<boolean>
  registerWithPassword: (email: string, password: string) => Promise<boolean>
  registerWithOtp: {
    send: (identifier: string) => Promise<{ channel: 'email' | 'sms'; expiresIn: number }>
    verify: (identifier: string, code: string) => Promise<boolean>
  }
  loginWithOtp: {
    send: (identifier: string) => Promise<{ channel: 'email' | 'sms'; expiresIn: number }>
    verify: (identifier: string, code: string) => Promise<boolean>
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
  markSessionStarted()
  return data.user
}

function clearAuthStorage() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  clearSessionTimers()
}

function redirectToLogin() {
  if (typeof window === 'undefined') return
  const path = window.location.pathname + window.location.search
  if (path.startsWith('/login') || path.startsWith('/register')) return
  window.location.assign(`/login?next=${encodeURIComponent(path)}`)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback((redirect = false) => {
    clearAuthStorage()
    setUser(null)
    if (redirect) redirectToLogin()
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await authApi.me()
      setUser(data)
    } catch {
      clearAuthStorage()
      setUser(null)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      refreshUser().finally(() => setLoading(false))
    } else {
      clearSessionTimers()
      setLoading(false)
    }
  }, [refreshUser])

  useSessionTimeout({
    enabled: Boolean(user) && !loading,
    onTimeout: () => logout(true),
  })

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
    send: (identifier: string) => sendOtpIdentifier(identifier, 'register'),
    verify: async (identifier: string, code: string) => {
      const data = await verifyOtpIdentifier(identifier, code, 'register')
      const nextUser = storeSession(data)
      setUser(nextUser)
      return nextUser.profile_complete
    },
  }

  const loginWithOtp = {
    send: (identifier: string) => sendOtpIdentifier(identifier, 'login'),
    verify: async (identifier: string, code: string) => {
      const data = await verifyOtpIdentifier(identifier, code, 'login')
      const nextUser = storeSession(data)
      setUser(nextUser)
      return nextUser.profile_complete
    },
  }

  const register = async (formData: Record<string, string>) => {
    await authApi.register(formData)
    await login(formData.username, formData.password)
  }

  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin'
  const isSuperAdmin = user?.role === 'super_admin'
  const isManager = isAdmin || user?.role === 'mineral_manager'
  const hasPaidAccess = Boolean(user?.has_paid_access) || isAdmin
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
        logout: () => logout(false),
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
