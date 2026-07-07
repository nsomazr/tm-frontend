import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { geographyApi, mapsApi } from '../../api'
import {
  COORDINATE_SYSTEMS,
  coordinateSystemById,
  storeCoordinateSystem,
  type CoordinateSystemId,
} from '../../components/map/coordinateSystems'
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

  const active = data?.coordinate_system ?? 'arc1960'
  const current = coordinateSystemById(active as CoordinateSystemId)
  const selectedCountry = countries.find((c) => c.code === countryCode)

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-app-muted mb-1">Platform</p>
        <h1 className="text-2xl font-bold text-app-text">Map settings</h1>
        <p className="mt-2 text-sm text-app-muted max-w-xl">
          Choose the coordinate reference system (CRS) used on the public map for each country.
          Explore area labels, saved point lists, and coordinate readouts follow the active
          country on the map. Map users cannot change this; only platform admins can.
        </p>
      </div>

      <section className="rounded-xl border border-app-border bg-app-surface overflow-hidden">
        <div className="border-b app-divider px-5 py-4 space-y-3">
          <div>
            <h2 className="font-semibold text-app-text">Coordinate reference system</h2>
            <p className="text-sm text-app-muted mt-1">
              Tanzania datasets commonly use <strong className="text-app-text-secondary">Arc 1960</strong>{' '}
              geographic or UTM south zones 35S–37S. WGS 84 is used for GPS / satellite data.
            </p>
          </div>
          <label className="block max-w-xs">
            <span className="text-xs font-semibold uppercase tracking-wide text-app-muted">Country</span>
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
        </div>

        {isLoading ? (
          <p className="px-5 py-8 text-sm text-app-muted">Loading…</p>
        ) : (
          <ul className="divide-y divide-app-border/40">
            {COORDINATE_SYSTEMS.map((crs) => {
              const selected = active === crs.id
              return (
                <li key={crs.id}>
                  <button
                    type="button"
                    disabled={save.isPending}
                    onClick={() => {
                      if (crs.id !== active) save.mutate(crs.id)
                    }}
                    className={`flex w-full items-start gap-3 px-5 py-4 text-left transition-colors ${
                      selected
                        ? 'bg-terra-500/8'
                        : 'hover:bg-app-subtle/80'
                    } disabled:opacity-60`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        selected
                          ? 'border-terra-600 bg-terra-600 text-white'
                          : 'border-app-border-strong bg-app-surface'
                      }`}
                      aria-hidden
                    >
                      {selected && (
                        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M2.5 6l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-app-text">{crs.label}</span>
                      <span className="block text-xs text-app-text-muted mt-0.5">
                        {crs.epsg}
                        {' · '}
                        {crs.kind === 'geographic' ? 'Geographic (lat/lon)' : 'Projected (easting/northing)'}
                      </span>
                    </span>
                    {selected && (
                      <span className="shrink-0 rounded-full bg-terra-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-terra-700 dark:text-terra-300">
                        Active
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
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
            Changes apply immediately for everyone viewing the map in this country. Manual coordinate
            entry in Explore area always uses WGS84 lat/lng; labels display in the selected CRS above.
          </p>
        </div>
      </section>

      <p className="mt-6 text-sm text-app-muted">
        <Link to="/maps" className="text-terra-600 dark:text-terra-400 hover:underline">
          Open map
        </Link>
        {' '}to verify coordinate labels.
      </p>
    </div>
  )
}
