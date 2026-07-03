import type { ReactNode } from 'react'

interface MarketingHeroProps {
  eyebrow?: string
  title: ReactNode
  subtitle: string
  children?: ReactNode
}

export default function MarketingHero({ eyebrow, title, subtitle, children }: MarketingHeroProps) {
  return (
    <section className="relative overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(22,163,74,0.35),transparent)]" />
      <div className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-terra-300 mb-4">{eyebrow}</p>
        )}
        <h1 className="text-3xl sm:text-5xl lg:text-[3.25rem] font-bold tracking-tight leading-[1.1] max-w-4xl mx-auto">
          {title}
        </h1>
        <p className="mt-5 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
          {subtitle}
        </p>
        {children && <div className="mt-10 flex flex-wrap justify-center gap-3">{children}</div>}
      </div>
    </section>
  )
}
