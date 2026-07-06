import axios from 'axios'
import { LOCALE_STORAGE_KEY } from '../i18n/LocaleContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8085/api/v1'

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

function clearAuthTokens() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const locale = localStorage.getItem(LOCALE_STORAGE_KEY)
  if (locale === 'en' || locale === 'sw') {
    config.headers['Accept-Language'] = locale
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status !== 401 || !original || original._authRetry) {
      return Promise.reject(error)
    }

    const refresh = localStorage.getItem('refresh_token')
    if (refresh && !original._tokenRefreshAttempted) {
      original._tokenRefreshAttempted = true
      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh/`, { refresh })
        localStorage.setItem('access_token', data.access)
        if (data.refresh) {
          localStorage.setItem('refresh_token', data.refresh)
        }
        original.headers.Authorization = `Bearer ${data.access}`
        return api(original)
      } catch {
        clearAuthTokens()
      }
    }

    if (localStorage.getItem('access_token')) {
      clearAuthTokens()
    }

    original._authRetry = true
    delete original.headers.Authorization
    return api(original)
  }
)

export default api
