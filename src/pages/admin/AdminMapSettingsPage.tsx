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

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-app-text">Map settings</h1>
        <p className="mt-0.5 text-sm text-app-muted">
          Choose the default CRS for each country. Search by name, EPSG code, or region.
        </p>
      </div>

      <section className="rounded-xl border border-app-border bg-app-surface overflow-hidden">
        <div className="border-b app-divider px-5 py-4 space-y-3">
          <div>
            <h2 className="font-semibold text-app-text">Coordinate reference system</h2>
            <p className="text-sm text-app-muted mt-0.5">
              Recommended systems appear first for the selected country. Use WGS 84 UTM for a
              local projected grid, or any regional datum from the catalog.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block max-w-xs flex-1 min-w-[12rem]">
              <span className="text-xs font-semibold uppercase tracking-wide text-app-muted">
                Country
              </span>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                disabled={countriesLoading}
                className="mt-1.5 w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text"
              >
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {displayName(country)} ({country.code})
                  </option>
                ))}
              </select>
            </label>
            {active !== recommendedDefault && (
              <button
                type="button"
                disabled={save.isPending}
                onClick={() => save.mutate(recommendedDefault)}
                className="btn-secondary text-sm py-2"
              >
                Use recommended ({coordinateSystemById(recommendedDefault).label})
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <p className="px-5 py-8 text-sm text-app-muted">Loading…</p>
        ) : (
          <CoordinateSystemList
            value={active as CoordinateSystemId}
            onSelect={(id) => {
              if (id !== active) save.mutate(id)
            }}
            countryCode={countryCode}
            countryCenter={countryCenter}
            disabled={save.isPending}
          />
        )}

        <div className="border-t app-divider px-5 py-4 bg-app-subtle/40">
          <p className="text-xs text-app-text-muted">
            Current selection for{' '}
            <span className="font-medium text-app-text-secondary">
              {selectedCountry ? displayName(selectedCountry) : countryCode}
            </span>
            :{' '}
            <span className="font-medium text-app-text-secondary">{current.label}</span>
            {' '}({current.epsg})
          </p>
          <p className="text-xs text-app-text-muted mt-2">
            Applies immediately. Explore entry stays WGS84; labels use this CRS.
          </p>
        </div>
      </section>

      <p className="mt-4 text-sm text-app-muted">
        <Link to="/maps" className="text-terra-600 dark:text-terra-400 hover:underline">
          Open map
        </Link>
        {' '}to verify labels.
      </p>
    </div>
  )
}
