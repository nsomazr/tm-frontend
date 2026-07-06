interface SelectionChipItem {
  id: string | number
  label: string
  meta?: string
  badge?: string
}

interface SelectionChipListProps {
  items: SelectionChipItem[]
  onRemove: (id: string | number) => void
  emptyLabel?: string
}

export default function SelectionChipList({ items, onRemove, emptyLabel }: SelectionChipListProps) {
  if (!items.length) {
    return emptyLabel ? <p className="text-xs text-app-text-muted">{emptyLabel}</p> : null
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="inline-flex items-center gap-1.5 rounded-lg border border-terra-500/35 bg-terra-500/8 pl-2.5 pr-1.5 py-1 text-sm max-w-full"
        >
          <span className="min-w-0">
            <span className="font-medium text-app-text block truncate">{item.label}</span>
            {item.meta && (
              <span className="text-[11px] text-app-text-muted block truncate">{item.meta}</span>
            )}
          </span>
          {item.badge && (
            <span className="shrink-0 rounded-md bg-terra-600/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-terra-700 dark:text-terra-300">
              {item.badge}
            </span>
          )}
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="shrink-0 rounded-md p-1 text-app-text-muted hover:text-app-text hover:bg-app-subtle transition-colors"
            aria-label={`Remove ${item.label}`}
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  )
}

export type { SelectionChipItem }
