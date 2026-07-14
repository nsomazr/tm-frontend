import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { authApi } from '../api'
import AuthShell from '../components/auth/AuthShell'

export default function CompleteProfilePage() {
  const { user, refreshUser, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    username: user?.username || '',
    organization: user?.organization || '',
    phone: user?.phone || '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        username: user.username || '',
        organization: user.organization || '',
        phone: user.phone || '',
      })
    }
  }, [user])

  if (authLoading) {
    return (
      <div className="auth-shell relative flex h-[100dvh] max-h-[100dvh] items-center justify-center overflow-hidden">
        <div className="auth-shell__atmosphere" aria-hidden />
        <div className="relative z-[1] h-8 w-8 animate-spin rounded-full border-2 border-terra-600 border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  if (user.profile_complete) {
    navigate('/dashboard', { replace: true })
    return null
  }

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('Please enter your first and last name')
      return
    }
    setSaving(true)
    try {
      await authApi.completeProfile(form)
      await refreshUser()
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const data = (err as { response?: { data?: Record<string, string[]> } })?.response?.data
      const msg =
        data?.username?.[0] ||
        data?.first_name?.[0] ||
        data?.detail ||
        'Could not save profile'
      setError(typeof msg === 'string' ? msg : 'Could not save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AuthShell mode="profile">
      <div className="auth-form w-full">
        <header className="mb-4 sm:mb-5">
          <h2 className="auth-form__title">Finish your profile</h2>
          <p className="auth-form__subtitle mt-1">
            One quick step, then you’re ready to explore Terra Meta.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2.5">
            <label className="block">
              <span className="auth-form__label">First name</span>
              <input
                value={form.first_name}
                onChange={(e) => update('first_name', e.target.value)}
                placeholder="First name"
                className="input mt-1.5"
                required
              />
            </label>
            <label className="block">
              <span className="auth-form__label">Last name</span>
              <input
                value={form.last_name}
                onChange={(e) => update('last_name', e.target.value)}
                placeholder="Last name"
                className="input mt-1.5"
                required
              />
            </label>
          </div>
          <label className="block">
            <span className="auth-form__label">Username</span>
            <input
              value={form.username}
              onChange={(e) => update('username', e.target.value)}
              placeholder="Username"
              className="input mt-1.5"
              required
            />
          </label>
          <label className="block">
            <span className="auth-form__label">Organization</span>
            <input
              value={form.organization}
              onChange={(e) => update('organization', e.target.value)}
              placeholder="Optional"
              className="input mt-1.5"
            />
          </label>
          <label className="block">
            <span className="auth-form__label">Phone</span>
            <input
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="Optional"
              className="input mt-1.5"
            />
          </label>
          <button type="submit" disabled={saving} className="btn-primary mt-1 w-full">
            {saving ? 'Saving…' : 'Continue to Terra Meta'}
          </button>
        </form>
      </div>
    </AuthShell>
  )
}
