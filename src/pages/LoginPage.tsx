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

export default function LoginPage() {
  const { loginWithOtp, login, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string })?.from || '/dashboard'

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
      await loginWithOtp.send(email)
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
      const profileComplete = await loginWithOtp.verify(email, code)
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
      const profileComplete = await login(email, password)
      afterAuth(profileComplete)
    } catch {
      setError('Invalid username, email, or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div>
        <SimpleAuthForm
          mode="login"
          loading={loading}
          error={error}
          onSendOtp={handleSendOtp}
          onVerifyOtp={handleVerifyOtp}
          onPassword={handlePassword}
          footerLink={{ text: 'No account?', to: '/register', label: 'Create one' }}
        />
        <CompanyCredit className="text-center mt-8" />
      </div>
    </div>
  )
}
