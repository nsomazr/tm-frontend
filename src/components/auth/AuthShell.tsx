import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../brand/Logo'
import CompanyCredit from '../brand/CompanyCredit'
import { useTranslation } from '../../i18n/LocaleContext'

function ContourPattern({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 640 800"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M-40 120C80 80 160 160 280 140C400 120 460 40 620 70"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M-20 220C100 190 180 260 300 240C420 220 500 150 660 180"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M-40 340C70 300 170 380 300 350C430 320 520 260 660 300"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M-10 460C110 420 190 500 320 470C450 440 530 380 660 420"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M-30 580C90 540 180 620 310 590C440 560 520 500 660 540"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M40 160C140 210 220 170 320 210C420 250 500 210 600 250"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.55"
      />
      <path
        d="M20 400C140 450 240 390 350 440C460 490 540 430 650 470"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.55"
      />
      <circle cx="190" cy="250" r="3.5" fill="currentColor" opacity="0.7" />
      <circle cx="360" cy="390" r="3" fill="currentColor" opacity="0.55" />
      <circle cx="480" cy="300" r="2.5" fill="currentColor" opacity="0.45" />
    </svg>
  )
}

function BackToMapLink({ className = '' }: { className?: string }) {
  const { m } = useTranslation()
  return (
    <Link to="/" className={`auth-shell__back ${className}`}>
      <span aria-hidden>←</span>
      {m.auth.backToMap}
    </Link>
  )
}

interface AuthShellProps {
  children: ReactNode
  mode?: 'login' | 'register' | 'profile'
}

export default function AuthShell({ children, mode = 'login' }: AuthShellProps) {
  const headline =
    mode === 'register'
      ? 'Build your exploration workspace'
      : mode === 'profile'
        ? 'Almost ready to explore'
        : 'Sign in to Terra Meta'

  const support =
    mode === 'register'
      ? 'Create an account to browse maps, ask Terra, and follow mineral opportunities.'
      : mode === 'profile'
        ? 'Tell us who you are so we can personalize your mineral intelligence.'
        : 'Access maps, marketplace listings, and Ask Terra insights.'

  return (
    <div className="auth-shell relative h-full max-h-[100dvh] overflow-hidden">
      <div className="auth-shell__atmosphere" aria-hidden />
      <div className="auth-shell__layout relative z-[1] mx-auto grid h-full w-full max-w-6xl lg:grid-cols-[1.05fr_0.95fr]">
        <aside className="auth-shell__brand relative hidden min-h-0 overflow-hidden lg:flex lg:flex-col lg:justify-between">
          <ContourPattern className="auth-shell__contours pointer-events-none absolute inset-0 h-full w-full text-white/25" />
          <div className="auth-shell__orb auth-shell__orb--a" aria-hidden />
          <div className="auth-shell__orb auth-shell__orb--b" aria-hidden />

          <div className="relative z-[1] space-y-4">
            <Link to="/" className="inline-flex w-fit items-center">
              <Logo variant="wordmark" className="auth-shell__logo h-10 w-auto brightness-0 invert xl:h-11" />
            </Link>
            <BackToMapLink className="auth-shell__back--brand" />
          </div>

          <div className="relative z-[1] max-w-md space-y-3 auth-shell__intro">
            <p className="auth-shell__eyebrow">Mineral intelligence</p>
            <h1 className="auth-shell__headline">{headline}</h1>
            <p className="auth-shell__support">{support}</p>
          </div>

          <CompanyCredit className="relative z-[1] text-white/70 [&_a]:text-white" />
        </aside>

        <section className="auth-shell__form-col relative flex min-h-0 flex-col justify-center overflow-y-auto">
          <div className="mx-auto mb-4 flex w-full max-w-[24rem] shrink-0 items-center justify-between gap-3 lg:justify-end">
            <Link to="/" className="inline-flex items-center lg:hidden">
              <Logo variant="wordmark" className="h-9 w-auto" />
            </Link>
            <BackToMapLink className="auth-shell__back--form ml-auto" />
          </div>

          <div className="mx-auto mb-4 w-full max-w-[24rem] shrink-0 text-center lg:hidden">
            <p className="auth-shell__mobile-kicker">{headline}</p>
          </div>

          <div className="auth-shell__panel mx-auto w-full max-w-[24rem] shrink-0">{children}</div>

          <CompanyCredit className="mx-auto mt-5 shrink-0 text-center text-slate-500 [&_a]:text-terra-600 lg:hidden" />
        </section>
      </div>
    </div>
  )
}
