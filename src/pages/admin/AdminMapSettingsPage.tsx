import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { geographyApi, mapsApi } from '../../api'
import {
  coordinateSystemById,
  defaultCoordinateSystemForCountry,
  storeCoordinateSystem,
  type CoordinateSystemId,
} from '../../components/map/coordinateSystems'
import CoordinateSystemList from '../../components/map/CoordinateSystemList'
import { toast } from '../../components/ui/toast'
import { useDisplayName } from '../../i18n/useDisplayName'
import type { Country } from '../../types'

function normalizeCountries(data: Country[] | { results?: Country[] } | undefined): Country[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  return data.results ?? []
}

export default function AdminMapSettingsPage() {
  const qc = useQueryClient()
  const displayName = useDisplayName()
  const [countryCode, setCountryCode] = useState('TZ')

  const { data: countriesData, isLoading: countriesLoading } = useQuery({
    queryKey: ['countries'],
    queryFn: () => geographyApi.countries().then((r) => r.data),
  })

  const countries = useMemo(() => normalizeCountries(countriesData), [countriesData])

  const { data, isLoading } = useQuery({
    queryKey: ['map-platform-settings', countryCode],
    queryFn: () => mapsApi.platformSettings(countryCode).then((r) => r.data),
  })

  const save = useMutation({
    mutationFn: (coordinate_system: CoordinateSystemId) =>
      mapsApi.updatePlatformSettings({ country: countryCode, coordinate_system }),
    onSuccess: (res) => {
      const id = res.data.coordinate_system as CoordinateSystemId
      storeCoordinateSystem(id, res.data.country)
      qc.setQueryData(['map-platform-settings', res.data.country], res.data)
      toast.success(`Coordinate system updated for ${res.data.country}`)
    },
    onError: () => toast.error('Could not save coordinate system'),
  })

  const active = data?.coordinate_system ?? defaultCoordinateSystemForCountry(countryCode)
  const current = coordinateSystemById(active as CoordinateSystemId)
  const selectedCountry = countries.find((c) => c.code === countryCode)
  const countryCenter =
    selectedCountry?.center_lat != null && selectedCountry?.center_lng != null
      ? { lat: selectedCountry.center_lat, lng: selectedCountry.center_lng }
      : null
  const recommendedDefault = defaultCoordinateSystemForCountry(countryCode)
  const recommendedLabel = coordinateSystemById(recommendedDefault).label
  const countryName = selectedCountry ? displayName(selectedCountry) : countryCode

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-app-text">Map settings</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-app-muted">
          Set the default coordinate reference system per country. Build a WGS 84 UTM zone, or
          pick from the recommended and regional catalog.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-sm">
        <div className="border-b app-divider bg-gradient-to-br from-app-subtle/90 to-app-surface px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <label className="block min-w-0 flex-1 sm:max-w-xs">
              <span className="text-xs font-semibold uppercase tracking-wide text-app-muted">
                Country
              </span>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                disabled={countriesLoading}
                className="mt-1.5 w-full rounded-xl border border-app-border bg-app-surface px-3 py-2.5 text-sm text-app-text"
              >
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {displayName(country)} ({country.code})
                  </option>
                ))}
              </select>
            </label>

            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <div className="rounded-xl border border-app-border bg-app-surface px-3.5 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-app-muted">
                  Active CRS
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-app-text" title={current.label}>
                  {current.label}
                </p>
                <p className="text-xs tabular-nums text-app-muted">{current.epsg}</p>
              </div>
              {active !== recommendedDefault ? (
                <button
                  type="button"
                  disabled={save.isPending}
                  onClick={() => save.mutate(recommendedDefault)}
                  className="btn-secondary text-sm"
                  title={recommendedLabel}
                >
                  Use recommended
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {isLoading ? (
          <p className="px-5 py-10 text-sm text-app-muted sm:px-6">Loading coordinate systems…</p>
        ) : (
          <CoordinateSystemList
            value={active as CoordinateSystemId}
            onSelect={(id) => {
              if (id !== active) save.mutate(id)
            }}
            countryCode={countryCode}
            countryCenter={countryCenter}
            disabled={save.isPending}
            className="pt-4"
          />
        )}

        <div className="border-t app-divider bg-app-subtle/40 px-5 py-4 sm:px-6">
          <p className="text-xs leading-relaxed text-app-text-muted">
            Selection for <span className="font-medium text-app-text-secondary">{countryName}</span>{' '}
            applies immediately. Explore entry stays WGS 84; coordinate labels use this CRS.
          </p>
        </div>
      </section>

      <p className="text-sm text-app-muted">
        <Link to="/maps" className="font-medium text-terra-600 hover:underline dark:text-terra-400">
          Open map
        </Link>{' '}
        to verify labels.
      </p>
    </div>
  )
}
