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
    <ul className="selection-chip-list">
      {items.map((item) => (
        <li
          key={item.id}
          className="selection-chip-list__chip"
        >
          <span className="selection-chip-list__copy">
            <span className="selection-chip-list__label">{item.label}</span>
            {item.meta && <span className="selection-chip-list__meta">{item.meta}</span>}
          </span>
          {item.badge && <span className="selection-chip-list__badge">{item.badge}</span>}
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="selection-chip-list__remove"
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
