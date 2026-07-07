import { useTranslation } from '../../i18n/LocaleContext'

interface PlaceNamesToggleProps {
  checked: boolean
  onChange: (next: boolean) => void
  compact?: boolean
  className?: string
}

export default function PlaceNamesToggle({
  checked,
  onChange,
  compact = false,
  className = '',
}: PlaceNamesToggleProps) {
  const { m } = useTranslation()

  return (
    <label
      className={`flex items-center gap-2 text-xs map-text-secondary cursor-pointer ${compact ? 'px-0.5' : 'px-1'} ${className}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="checkbox checkbox--sm"
      />
      {m.map.placeNames}
    </label>
  )
}
