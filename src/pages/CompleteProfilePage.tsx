import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { authApi } from '../api'
import Logo from '../components/brand/Logo'

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
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-terra-600 border-t-transparent" />
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
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo variant="icon" className="h-14 w-14 mx-auto" />
          <h1 className="text-xl font-semibold text-slate-900 mt-4">Finish your profile</h1>
          <p className="text-sm text-slate-500 mt-1">
            One quick step, then you are ready to explore Terra Meta.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card-flat space-y-3">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.first_name}
              onChange={(e) => update('first_name', e.target.value)}
              placeholder="First name"
              className="input"
              required
            />
            <input
              value={form.last_name}
              onChange={(e) => update('last_name', e.target.value)}
              placeholder="Last name"
              className="input"
              required
            />
          </div>
          <input
            value={form.username}
            onChange={(e) => update('username', e.target.value)}
            placeholder="Username"
            className="input"
            required
          />
          <input
            value={form.organization}
            onChange={(e) => update('organization', e.target.value)}
            placeholder="Organization (optional)"
            className="input"
          />
          <input
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder="Phone (optional)"
            className="input"
          />
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Saving…' : 'Continue to Terra Meta'}
          </button>
        </form>
      </div>
    </div>
  )
}
