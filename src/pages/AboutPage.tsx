import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import MarketingHero from '../components/marketing/MarketingHero'
import MarketingCta, { MarketingCtaLink } from '../components/marketing/MarketingCta'
import MineralPeriodicTable from '../components/map/MineralPeriodicTable'
import CommodityInsightPanel from '../components/map/CommodityInsightPanel'
import { analyticsApi } from '../api'
import { useAuth } from '../auth/AuthContext'
import { useTranslation } from '../i18n/LocaleContext'
import type { MineralCatalogEntry } from '../types'

const PILLAR_ACCENTS = [
  'from-amber-400/20 to-amber-600/5',
  'from-terra-400/20 to-terra-600/5',
  'from-sky-400/20 to-sky-600/5',
  'from-violet-400/20 to-violet-600/5',
]

export default function AboutPage() {
  const { m } = useTranslation()
  const a = m.about
  const navigate = useNavigate()
  const { hasPaidAccess } = useAuth()
  const [selectedCommodity, setSelectedCommodity] = useState<MineralCatalogEntry | null>(null)

  const { data: catalogData } = useQuery({
    queryKey: ['mineral-catalog', 'TZ'],
    queryFn: () => analyticsApi.mineralCatalog('TZ').then((r) => r.data),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  })

  const layerCount = catalogData?.stats?.layer_count

  const stats = useMemo(() => {
    return a.stats.map((s, index) => {
      if (index !== 0 || layerCount == null) return s
      return { ...s, value: String(layerCount) }
    })
  }, [a.stats, layerCount])

  const handleCommoditySelect = (entry: MineralCatalogEntry | null) => {
    if (!entry?.is_mapped) return
    setSelectedCommodity(entry)
  }

  const handleShowOnMap = () => {
    if (!selectedCommodity?.is_mapped || !hasPaidAccess) return
    navigate(`/?mineral=${encodeURIComponent(selectedCommodity.slug)}`)
  }

  return (
    <div className="animate-fade-in">
      <MarketingHero eyebrow={a.eyebrow} title={a.heroTitle} subtitle={a.heroSubtitle}>
        <MarketingCtaLink to="/" variant="primary">
          {a.openMap}
        </MarketingCtaLink>
        <MarketingCtaLink to="/subscriptions">{a.seePlans}</MarketingCtaLink>
      </MarketingHero>

      <section className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {stats.map((s) => (
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

      <section className="bg-slate-50 py-10 sm:py-14 lg:py-16 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-terra-600 mb-2 text-center sm:text-left">
            {m.map.periodicTableTitle}
          </p>
        </div>
        <div className="px-2 sm:px-6 max-w-6xl mx-auto">
          <MineralPeriodicTable
            showcase
            catalog={catalogData?.minerals ?? []}
            selectedSlug={selectedCommodity?.slug}
            onSelect={handleCommoditySelect}
          />
        </div>
      </section>

      {selectedCommodity && (
        <CommodityInsightPanel
          entry={selectedCommodity}
          hasPaidAccess={hasPaidAccess}
          onClose={() => setSelectedCommodity(null)}
          onShowOnMap={handleShowOnMap}
        />
      )}

      <section className="bg-white py-14 sm:py-16 lg:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-terra-600 mb-3">{a.visionEyebrow}</p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 leading-snug">{a.visionTitle}</h2>
          <p className="text-slate-600 mt-5 leading-relaxed text-base sm:text-lg">{a.visionBody}</p>
          <p className="text-slate-500 mt-4 leading-relaxed text-sm sm:text-base">{a.visionNote}</p>
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
                <span className="text-4xl font-bold text-terra-500">{s.step}</span>
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

      <MarketingCta title={a.valuesTitle} subtitle={a.valuesBody}>
        <MarketingCtaLink to="/" variant="primary">
          {a.tryFree}
        </MarketingCtaLink>
        <MarketingCtaLink to="/register">{a.createAccount}</MarketingCtaLink>
      </MarketingCta>
    </div>
  )
}
