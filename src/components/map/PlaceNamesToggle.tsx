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
        className="rounded border-app-border-strong text-terra-600 focus:ring-terra-500/30 size-3.5"
      />
      {m.map.placeNames}
    </label>
  )
}
