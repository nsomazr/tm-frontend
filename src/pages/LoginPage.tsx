import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import SimpleAuthForm from '../components/auth/SimpleAuthForm'
import CompanyCredit from '../components/brand/CompanyCredit'

function authErrorMessage(err: unknown, fallback: string) {
  const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data
  if (typeof data?.detail === 'string') return data.detail
  if (Array.isArray(data?.email) && typeof data.email[0] === 'string') return data.email[0]
  if (Array.isArray(data?.phone) && typeof data.phone[0] === 'string') return data.phone[0]
  if (typeof data?.phone === 'string') return data.phone
  if (typeof data?.email === 'string') return data.email
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

  const handleSendOtp = async (identifier: string) => {
    setError('')
    setLoading(true)
    try {
      return await loginWithOtp.send(identifier)
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
      const profileComplete = await loginWithOtp.verify(identifier, code)
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
