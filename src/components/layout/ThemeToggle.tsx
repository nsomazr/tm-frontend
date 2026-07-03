import type { ReactNode } from 'react'
import { useTheme } from '../../theme/ThemeContext'

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zm0 13a3 3 0 100-6 3 3 0 000 6zm-7.25-2.25a.75.75 0 010-1.06l1.06-1.06a.75.75 0 011.06 1.06l-1.06 1.06a.75.75 0 01-1.06 0zm12.5 0a.75.75 0 010-1.06l1.06-1.06a.75.75 0 111.06 1.06l-1.06 1.06a.75.75 0 01-1.06 0zM4.28 15.72a.75.75 0 010-1.06l1.06-1.06a.75.75 0 111.06 1.06l-1.06 1.06a.75.75 0 01-1.06 0zm11.44 0a.75.75 0 010-1.06l1.06-1.06a.75.75 0 111.06 1.06l-1.06 1.06a.75.75 0 01-1.06 0zM2 10a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 012 10zm15.25-.75a.75.75 0 010 1.5h-1.5a.75.75 0 010-1.5h1.5zM4.28 4.28a.75.75 0 011.06 0l1.06 1.06a.75.75 0 11-1.06 1.06L4.28 5.34a.75.75 0 010-1.06zm11.44 0a.75.75 0 011.06 0l1.06 1.06a.75.75 0 11-1.06 1.06l-1.06-1.06a.75.75 0 010-1.06z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M15.98 12.87a5.97 5.97 0 01-5.84 4.7 6 6 0 01-5.99-6.01A5.97 5.97 0 0110.3 5.02 6 6 0 0016 10.01a5.97 5.97 0 00-.02 2.86z" />
    </svg>
  )
}

export default function ThemeToggle({ compact }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme()

  const btn = (mode: 'light' | 'dark', label: string, icon: ReactNode) => (
    <button
      type="button"
      onClick={() => setTheme(mode)}
      className={`segmented-btn px-2.5 py-1 ${theme === mode ? 'segmented-btn-active' : ''}`}
      aria-pressed={theme === mode}
      aria-label={label}
    >
      {icon}
      {!compact && <span>{label}</span>}
    </button>
  )

  return (
    <div className="segmented" role="group" aria-label="Color theme">
      {btn('light', 'Light', <SunIcon className="h-3.5 w-3.5" />)}
      {btn('dark', 'Dark', <MoonIcon className="h-3.5 w-3.5" />)}
    </div>
  )
}
