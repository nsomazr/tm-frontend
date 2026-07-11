import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { geographyApi } from '../../api'
import BoundaryGeologyEditor from '../../components/admin/BoundaryGeologyEditor'
import CountrySelect from '../../components/map/CountrySelect'
import { useTranslation } from '../../i18n/LocaleContext'
import { useDisplayName } from '../../i18n/useDisplayName'

export default function AdminGeologicalReferencePage() {
  const { m } = useTranslation()
  const displayName = useDisplayName()
  const g = m.adminBoundaries.geology
  const [country, setCountry] = useState('TZ')

  const { data: countriesData, isLoading: countriesLoading } = useQuery({
    queryKey: ['countries'],
    queryFn: () => geographyApi.countries().then((r) => r.data),
    staleTime: 30 * 60 * 1000,
  })

  const countries = useMemo(() => {
    if (!countriesData) return []
    const list = Array.isArray(countriesData) ? countriesData : countriesData.results ?? []
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }, [countriesData])

  const selectedCountry = countries.find((c) => c.code === country)

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-app-text">{g.sectionTitle}</h1>
          <p className="text-sm text-app-muted mt-0.5">{g.intro}</p>
        </div>
        <Link
          to="/admin/boundaries"
          className="text-sm font-medium text-terra-600 dark:text-terra-400 hover:underline shrink-0"
        >
          Geo information →
        </Link>
      </header>

      <section className="rounded-xl border border-app-border bg-app-surface p-5 space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-app-secondary">{m.adminBoundaries.country}</span>
          {countriesLoading ? (
            <p className="text-sm text-app-muted">{m.adminBoundaries.loading}</p>
          ) : (
            <CountrySelect
              countries={countries}
              value={country}
              onChange={setCountry}
              placeholder="Search name or code…"
              showCountHint={false}
            />
          )}
          {selectedCountry && (
            <p className="text-xs text-app-text-muted">
              {displayName(selectedCountry)} · upload boundaries first if a level is empty
            </p>
          )}
        </label>

        <BoundaryGeologyEditor country={country} hideIntro />
      </section>
    </div>
  )
}
