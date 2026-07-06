import { useTranslation } from '../../i18n/LocaleContext'
import { TerraAssistantAvatar } from '../assistant/AssistantIcons'

interface TerraAssistantButtonProps {
  active?: boolean
  onClick: () => void
  className?: string
  /** Compact pill for mobile bottom dock row. */
  compact?: boolean
}

export default function TerraAssistantButton({
  active = false,
  onClick,
  className = '',
  compact = false,
}: TerraAssistantButtonProps) {
  const { m } = useTranslation()

  const dockCompact =
    compact ||
    className.includes('w-full')

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`pointer-events-auto flex items-center font-semibold transition-all duration-200 ${
        dockCompact
          ? `h-9 w-full justify-center gap-1.5 rounded-xl border px-2 text-xs shadow-sm ${
              active
                ? 'border-terra-500/40 bg-terra-50 text-terra-800 ring-2 ring-terra-500/35 dark:bg-terra-950/30 dark:text-terra-300'
                : 'map-chrome border-app-border-strong map-text hover:bg-app-subtle'
            }`
          : `gap-2 rounded-full map-chrome px-3.5 py-2 text-sm shadow-md ${
              active
                ? 'ring-2 ring-terra-500/40 text-terra-800 dark:text-terra-300'
                : 'map-text hover:bg-app-subtle/80'
            }`
      } ${className}`}
    >
      <TerraAssistantAvatar className={dockCompact ? 'h-5 w-5' : 'h-7 w-7'} />
      {m.assistant.buttonLabel}
    </button>
  )
}
