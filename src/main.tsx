import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import { LocaleProvider } from './i18n/LocaleContext'
import LocaleEffects from './i18n/LocaleEffects'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 1 } },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <LocaleProvider>
          <AuthProvider>
            <LocaleEffects />
            <App />
          </AuthProvider>
        </LocaleProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
