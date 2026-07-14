import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { safeReturnPath } from '../utils/safeRedirect'
import { useAuth } from '../auth/AuthContext'
import AuthShell from '../components/auth/AuthShell'
import SimpleAuthForm from '../components/auth/SimpleAuthForm'

function authErrorMessage(err: unknown, fallback: string) {
  const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data
  if (typeof data?.detail === 'string') return data.detail
  if (Array.isArray(data?.email) && typeof data.email[0] === 'string') return data.email[0]
  if (Array.isArray(data?.phone) && typeof data.phone[0] === 'string') return data.phone[0]
  if (typeof data?.phone === 'string') return data.phone
  if (typeof data?.email === 'string') return data.email
  return fallback
}

export default function RegisterPage() {
  const { registerWithOtp, registerWithPassword, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = safeReturnPath((location.state as { from?: string })?.from, '/')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) {
    navigate(user.profile_complete ? from : '/complete-profile', { replace: true })
    return null
  }

  const afterAuth = (profileComplete: boolean) => {
    navigate(profileComplete ? from : '/complete-profile', { replace: true })
  }

  const handleSendOtp = async (identifier: string) => {
    setError('')
    setLoading(true)
    try {
      return await registerWithOtp.send(identifier)
    } catch (err) {
      setError(authErrorMessage(err, 'Could not send verification code'))
      throw err
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (identifier: string, code: string) => {
    setError('')
    setLoading(true)
    try {
      const profileComplete = await registerWithOtp.verify(identifier, code)
      afterAuth(profileComplete)
    } catch (err) {
      setError(authErrorMessage(err, 'Invalid or expired code'))
    } finally {
      setLoading(false)
    }
  }

  const handlePassword = async (email: string, password: string) => {
    setError('')
    setLoading(true)
    try {
      const profileComplete = await registerWithPassword(email, password)
      afterAuth(profileComplete)
    } catch (err) {
      setError(authErrorMessage(err, 'Registration failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell mode="register">
      <SimpleAuthForm
        mode="register"
        loading={loading}
        error={error}
        onSendOtp={handleSendOtp}
        onVerifyOtp={handleVerifyOtp}
        onPassword={handlePassword}
        footerLink={{ text: 'Have an account?', to: '/login', label: 'Sign in' }}
      />
    </AuthShell>
  )
}
