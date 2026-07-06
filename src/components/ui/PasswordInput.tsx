import { useState, type InputHTMLAttributes } from 'react'
import { useTranslation } from '../../i18n/LocaleContext'

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1 1 0 0 1 0-.644C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5 1.81 0 3.52-.437 5.04-1.21M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639a10.496 10.496 0 0 1-1.524 2.49M6.228 6.228 3 3m3.228 3.228 14.142 14.142M9.88 9.88l4.24 4.24"
      />
    </svg>
  )
}

export default function PasswordInput({ className = '', ...props }: PasswordInputProps) {
  const { m } = useTranslation()
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative w-full">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={`input pr-11 ${className}`.trim()}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex size-8 items-center justify-center rounded-lg text-app-text-muted hover:text-app-text hover:bg-app-subtle/80 transition-colors"
        aria-label={visible ? m.auth.hidePassword : m.auth.showPassword}
        tabIndex={-1}
      >
        {visible ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
      </button>
    </div>
  )
}
