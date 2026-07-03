import type { ReactNode } from 'react'

interface MarketingHeroProps {
  eyebrow?: string
  title: ReactNode
  subtitle: string
  children?: ReactNode
}

export default function MarketingHero({ eyebrow, title, subtitle, children }: MarketingHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-app-border bg-app-bg text-app-text dark:border-transparent dark:bg-slate-950 dark:text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(22,163,74,0.14),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(22,163,74,0.35),transparent)]" />
      <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:48px_48px] dark:opacity-[0.07] dark:bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)]" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 text-center">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-terra-600 dark:text-terra-300 mb-2">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-snug max-w-3xl mx-auto text-app-text dark:text-white">
          {title}
        </h1>
        <p className="mt-3 text-sm sm:text-base text-app-muted dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
          {subtitle}
        </p>
        {children && <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>}
      </div>
    </section>
  )
}
