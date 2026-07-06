import { useMemo, useState } from 'react'

export interface SearchPickItem {
  id: number
  label: string
  sublabel?: string
  badge?: string
}

interface SearchPickListProps {
  items: SearchPickItem[]
  selectedIds: Set<number>
  onToggle: (id: number) => void
  placeholder?: string
  loading?: boolean
  emptyLabel?: string
  maxHeight?: string
}

export default function SearchPickList({
  items,
  selectedIds,
  onToggle,
  placeholder = 'Search…',
  loading = false,
  emptyLabel = 'Nothing to show',
  maxHeight = 'max-h-52',
}: SearchPickListProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = q
      ? items.filter((item) => {
          const haystack = `${item.label} ${item.sublabel ?? ''} ${item.badge ?? ''}`.toLowerCase()
          return haystack.includes(q)
        })
      : items
    return [...base].sort((a, b) => {
      const aSelected = selectedIds.has(a.id) ? -1 : 1
      const bSelected = selectedIds.has(b.id) ? -1 : 1
      if (aSelected !== bSelected) return aSelected - bSelected
      return a.label.localeCompare(b.label)
    })
  }, [items, query, selectedIds])

  return (
    <div className="space-y-2">
      <input
        type="search"
        value={query}
        disabled={loading}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={loading ? 'Loading…' : placeholder}
        className="input w-full text-sm"
        autoComplete="off"
      />
      <ul
        className={`overflow-y-auto rounded-lg border border-app-border bg-app-surface py-1 ${maxHeight}`}
      >
        {filtered.length === 0 ? (
          <li className="px-3 py-2 text-sm text-app-text-muted">{emptyLabel}</li>
        ) : (
          filtered.map((item) => {
            const checked = selectedIds.has(item.id)
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onToggle(item.id)}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors ${
                    checked ? 'bg-terra-500/8' : 'hover:bg-app-subtle'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                      checked
                        ? 'border-terra-600 bg-terra-600 text-white'
                        : 'border-app-border bg-app-surface'
                    }`}
                    aria-hidden
                  >
                    {checked ? '✓' : ''}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-app-text truncate">{item.label}</span>
                    {item.sublabel && (
                      <span className="block text-xs text-app-text-muted truncate">{item.sublabel}</span>
                    )}
                  </span>
                  {item.badge && (
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-terra-700 dark:text-terra-300">
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            )
          })
        )}
      </ul>
    </div>
  )
}
