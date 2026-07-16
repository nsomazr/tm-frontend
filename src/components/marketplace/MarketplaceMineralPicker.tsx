import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '../../api'
import { DEFAULT_COUNTRY_CODE } from '../map/countryFocus'
import { GEOLOGICAL_MINERAL_COLORS, matchGeologicalColor } from '../../constants/geologicalMineralColors'

function normalizeLabel(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function optionKey(value: string) {
  return normalizeLabel(value).toLowerCase()
}

function mineralColor(name: string) {
  return matchGeologicalColor(name)?.hex ?? '#0f766e'
}

function useMineralOptions(extra: string[] = []) {
  const catalogQuery = useQuery({
    queryKey: ['mineral-catalog', DEFAULT_COUNTRY_CODE],
    queryFn: () => analyticsApi.mineralCatalog(DEFAULT_COUNTRY_CODE).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  return useMemo(() => {
    const seen = new Set<string>()
    const options: { label: string; color: string; source: 'layer' | 'reference' | 'custom' }[] = []

    const push = (label: string, source: 'layer' | 'reference' | 'custom') => {
      const clean = normalizeLabel(label)
      if (!clean) return
      const key = optionKey(clean)
      if (seen.has(key)) return
      seen.add(key)
      options.push({ label: clean, color: mineralColor(clean), source })
    }

    for (const entry of catalogQuery.data?.minerals ?? []) {
      if (entry.slug === 'general') continue
      push(entry.name, 'layer')
    }
    for (const entry of GEOLOGICAL_MINERAL_COLORS) {
      push(entry.label, 'reference')
    }
    for (const label of extra) push(label, 'custom')

    return {
      options: options.sort((a, b) => a.label.localeCompare(b.label)),
      loading: catalogQuery.isLoading,
    }
  }, [catalogQuery.data?.minerals, catalogQuery.isLoading, extra])
}

function CustomMineralInline({
  draft,
  setDraft,
  onCommit,
  onCancel,
  placeholder = 'Mineral name',
  commitLabel = 'Add',
}: {
  draft: string
  setDraft: (v: string) => void
  onCommit: () => void
  onCancel: () => void
  placeholder?: string
  commitLabel?: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        className="input min-w-[10rem] flex-1 text-sm"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onCommit()
          }
          if (e.key === 'Escape') onCancel()
        }}
      />
      <button
        type="button"
        className="btn-secondary text-xs !px-3 !py-1.5"
        onClick={onCommit}
        disabled={!draft.trim()}
      >
        {commitLabel}
      </button>
      <button type="button" className="text-xs text-app-muted hover:text-app-text" onClick={onCancel}>
        Cancel
      </button>
    </div>
  )
}

interface PrimaryMineralFieldProps {
  value: string
  onChange: (value: string) => void
  exclude?: string[]
}

export function PrimaryMineralField({ value, onChange, exclude = [] }: PrimaryMineralFieldProps) {
  const extras = useMemo(() => (value ? [value] : []), [value])
  const { options, loading } = useMineralOptions(extras)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  const excludeKeys = useMemo(() => new Set(exclude.map(optionKey)), [exclude])
  const filtered = options.filter((opt) => !excludeKeys.has(optionKey(opt.label)))

  const commitNew = () => {
    const next = normalizeLabel(draft)
    if (!next) return
    onChange(next)
    setDraft('')
    setAdding(false)
  }

  const selectedOption = value
    ? filtered.find((o) => optionKey(o.label) === optionKey(value))
    : undefined

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor="primary-mineral" className="text-sm font-medium text-app-text">
          Primary
        </label>
        {!adding ? (
          <button
            type="button"
            className="text-xs font-medium text-terra-700 hover:underline dark:text-terra-300"
            onClick={() => setAdding(true)}
          >
            + Custom
          </button>
        ) : null}
      </div>

      {adding ? (
        <CustomMineralInline
          draft={draft}
          setDraft={setDraft}
          onCommit={commitNew}
          onCancel={() => {
            setAdding(false)
            setDraft('')
          }}
          placeholder="e.g. Graphite"
          commitLabel="Use"
        />
      ) : (
        <div className="flex items-center gap-2">
          <select
            id="primary-mineral"
            className="input w-full"
            value={selectedOption?.label ?? (value && !selectedOption ? value : '')}
            onChange={(e) => onChange(e.target.value)}
            disabled={loading}
          >
            <option value="">{loading ? 'Loading…' : 'Select…'}</option>
            {value && !selectedOption ? (
              <option value={value}>{value} (custom)</option>
            ) : null}
            {filtered.map((opt) => (
              <option key={opt.label} value={opt.label}>
                {opt.label}
                {opt.source === 'custom' ? ' (custom)' : ''}
              </option>
            ))}
          </select>
          {value ? (
            <span
              className="h-8 w-8 shrink-0 rounded-md border border-app-border"
              style={{ backgroundColor: mineralColor(value) }}
              title={value}
              aria-hidden
            />
          ) : null}
        </div>
      )}
    </div>
  )
}

interface OtherMineralsFieldProps {
  values: string[]
  onChange: (values: string[]) => void
  exclude?: string[]
}

export function OtherMineralsField({ values, onChange, exclude = [] }: OtherMineralsFieldProps) {
  const extras = values
  const { options, loading } = useMineralOptions(extras)
  const [pick, setPick] = useState('')
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  const blocked = useMemo(() => {
    const set = new Set(exclude.map(optionKey))
    for (const v of values) set.add(optionKey(v))
    return set
  }, [exclude, values])

  const available = options.filter((opt) => !blocked.has(optionKey(opt.label)))

  const addLabel = (raw: string) => {
    const next = normalizeLabel(raw)
    if (!next) return
    if (blocked.has(optionKey(next))) return
    onChange([...values, next])
  }

  const removeAt = (index: number) => {
    onChange(values.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor="other-minerals" className="text-sm font-medium text-app-text">
          Also present
        </label>
        {!adding ? (
          <button
            type="button"
            className="text-xs font-medium text-terra-700 hover:underline dark:text-terra-300"
            onClick={() => setAdding(true)}
          >
            + Custom
          </button>
        ) : null}
      </div>

      {values.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {values.map((label, index) => (
            <span
              key={`${label}-${index}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-app-subtle px-2.5 py-1 text-xs font-medium text-app-text ring-1 ring-app-border"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: mineralColor(label) }}
                aria-hidden
              />
              {label}
              <button
                type="button"
                className="ml-0.5 text-app-muted hover:text-app-text"
                aria-label={`Remove ${label}`}
                onClick={() => removeAt(index)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {adding ? (
        <CustomMineralInline
          draft={draft}
          setDraft={setDraft}
          onCommit={() => {
            addLabel(draft)
            setDraft('')
            setAdding(false)
          }}
          onCancel={() => {
            setAdding(false)
            setDraft('')
          }}
          placeholder="New mineral name"
        />
      ) : (
        <select
          id="other-minerals"
          className="input w-full text-sm"
          value={pick}
          disabled={loading || available.length === 0}
          onChange={(e) => {
            const next = e.target.value
            setPick('')
            if (next) addLabel(next)
          }}
        >
          <option value="">
            {loading ? 'Loading…' : available.length ? 'Add mineral…' : 'No more options'}
          </option>
          {available.map((opt) => (
            <option key={opt.label} value={opt.label}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
