import { Link } from 'react-router-dom'
import MarketingHero from '../components/marketing/MarketingHero'
import { useTranslation } from '../i18n/LocaleContext'

const PILLAR_ACCENTS = [
  'from-amber-400/20 to-amber-600/5',
  'from-terra-400/20 to-terra-600/5',
  'from-sky-400/20 to-sky-600/5',
  'from-violet-400/20 to-violet-600/5',
]

export default function AboutPage() {
  const { m } = useTranslation()
  const a = m.about

  return (
    <div className="animate-fade-in">
      <MarketingHero eyebrow={a.eyebrow} title={a.heroTitle} subtitle={a.heroSubtitle}>
        <Link to="/" className="btn-primary text-sm">{a.openMap}</Link>
        <Link
          to="/subscriptions"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm border border-white/25 text-white hover:bg-white/10 transition-colors"
        >
          {a.seePlans}
        </Link>
      </MarketingHero>

      <section className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {a.stats.map((s) => (
            <div key={s.label} className="text-center sm:text-left">
              <p
                className={`font-bold text-terra-700 leading-snug ${
                  s.value.length > 6 ? 'text-base sm:text-lg' : 'text-2xl sm:text-3xl'
                }`}
              >
                {s.value}
              </p>
              <p className="text-sm text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-terra-600 mb-3">{a.visionEyebrow}</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-snug">{a.visionTitle}</h2>
            <p className="text-slate-600 mt-4 leading-relaxed">{a.visionBody}</p>
            <p className="text-slate-500 mt-3 leading-relaxed text-sm">{a.visionNote}</p>
          </div>
          <div className="relative">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
              <div className="grid grid-cols-3 gap-3">
                {a.sampleMinerals.map((mineral, i) => (
                  <div
                    key={mineral}
                    className="rounded-xl bg-slate-50 border border-slate-100 px-2 py-3 text-center text-xs font-medium text-slate-700"
                    style={{ opacity: 1 - i * 0.05 }}
                  >
                    {mineral}
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-4 text-center">{a.sampleLayers}</p>
            </div>
            <div className="absolute -z-10 -inset-4 rounded-3xl bg-gradient-to-br from-terra-100/80 to-gold-400/20 blur-2xl" />
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">{a.whoTitle}</h2>
            <p className="text-slate-500 mt-3">{a.whoSubtitle}</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {a.audiences.map((item) => (
              <div key={item.title} className="card group hover:border-terra-200/80">
                <h3 className="font-semibold text-slate-900">{item.title}</h3>
                <p className="text-slate-500 text-sm mt-2 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">{a.offersTitle}</h2>
            <p className="text-slate-500 mt-3">{a.offersSubtitle}</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {a.pillars.map((p, i) => (
              <div
                key={p.title}
                className={`rounded-2xl border border-slate-200 bg-gradient-to-br ${PILLAR_ACCENTS[i]} p-6 bg-white`}
              >
                <h3 className="font-semibold text-slate-900 text-lg">{p.title}</h3>
                <p className="text-slate-600 text-sm mt-2 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">{a.howTitle}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {a.steps.map((s) => (
              <div key={s.step}>
                <span className="text-4xl font-bold text-terra-100">{s.step}</span>
                <h3 className="font-semibold text-slate-900 mt-2">{s.title}</h3>
                <p className="text-slate-500 text-sm mt-2 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-terra-600 mb-3">{a.byCompanyTitle}</p>
          <p className="text-slate-600 max-w-2xl mx-auto leading-relaxed">{a.byCompanyBody}</p>
          <a
            href="https://5ggeology.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-6 text-sm font-medium text-terra-700 hover:text-terra-800 underline underline-offset-2"
          >
            {a.visitCompany}
          </a>
        </div>
      </section>

      <section className="bg-slate-900 text-white py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold">{a.valuesTitle}</h2>
          <p className="text-slate-300 mt-4 max-w-3xl mx-auto leading-relaxed">{a.valuesBody}</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link to="/" className="btn-primary text-sm">{a.tryFree}</Link>
            <Link to="/register" className="btn-secondary text-sm">{a.createAccount}</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
