import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import SimpleAuthForm from '../components/auth/SimpleAuthForm'
import CompanyCredit from '../components/brand/CompanyCredit'

function authErrorMessage(err: unknown, fallback: string) {
  const detail = (err as { response?: { data?: { detail?: string; email?: string[] } } })?.response?.data
  if (typeof detail?.detail === 'string') return detail.detail
  if (detail?.email?.[0]) return detail.email[0]
  return fallback
}

export default function RegisterPage() {
  const { registerWithOtp, registerWithPassword, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string })?.from || '/'

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) {
    navigate(user.profile_complete ? from : '/complete-profile', { replace: true })
    return null
  }

  const afterAuth = (profileComplete: boolean) => {
    navigate(profileComplete ? from : '/complete-profile', { replace: true })
  }

  const handleSendOtp = async (email: string) => {
    setError('')
    setLoading(true)
    try {
      await registerWithOtp.send(email)
    } catch (err) {
      setError(authErrorMessage(err, 'Could not send verification code'))
      throw err
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (email: string, code: string) => {
    setError('')
    setLoading(true)
    try {
      const profileComplete = await registerWithOtp.verify(email, code)
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
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div>
        <SimpleAuthForm
          mode="register"
          loading={loading}
          error={error}
          onSendOtp={handleSendOtp}
          onVerifyOtp={handleVerifyOtp}
          onPassword={handlePassword}
          footerLink={{ text: 'Have an account?', to: '/login', label: 'Sign in' }}
        />
        <CompanyCredit className="text-center mt-8" />
      </div>
    </div>
  )
}
