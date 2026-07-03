import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface MarketingCtaProps {
  title: ReactNode
  subtitle: string
  children: ReactNode
}

export default function MarketingCta({ title, subtitle, children }: MarketingCtaProps) {
  return (
    <section className="relative overflow-hidden border-t border-app-border bg-app-subtle py-14 dark:border-transparent dark:bg-slate-900 dark:text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_50%_100%,rgba(22,163,74,0.08),transparent)] dark:bg-[radial-gradient(ellipse_70%_80%_at_50%_100%,rgba(22,163,74,0.2),transparent)]" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-app-text dark:text-white">{title}</h2>
        <p className="text-app-muted dark:text-slate-400 mt-2 text-sm max-w-3xl mx-auto leading-relaxed">{subtitle}</p>
        <div className="flex flex-wrap justify-center gap-3 mt-6">{children}</div>
      </div>
    </section>
  )
}

interface MarketingCtaLinkProps {
  to: string
  children: ReactNode
  variant?: 'primary' | 'secondary'
}

export function MarketingCtaLink({ to, children, variant = 'secondary' }: MarketingCtaLinkProps) {
  return (
    <Link
      to={to}
      className={
        variant === 'primary'
          ? 'btn-primary text-sm'
          : 'btn-secondary text-sm'
      }
    >
      {children}
    </Link>
  )
}
