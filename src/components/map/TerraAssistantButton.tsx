import { useTranslation } from '../../i18n/LocaleContext'
import { TerraAssistantAvatar } from '../assistant/AssistantIcons'

interface TerraAssistantButtonProps {
  active?: boolean
  onClick: () => void
  className?: string
}

export default function TerraAssistantButton({
  active = false,
  onClick,
  className = '',
}: TerraAssistantButtonProps) {
  const { m } = useTranslation()

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`pointer-events-auto flex items-center gap-2 rounded-full map-chrome px-3.5 py-2 text-sm font-semibold shadow-md transition-colors ${
        active
          ? 'ring-2 ring-terra-500/40 text-terra-800 dark:text-terra-300'
          : 'map-text hover:bg-app-subtle/80'
      } ${className}`}
    >
      <TerraAssistantAvatar className="h-7 w-7" />
      {m.assistant.buttonLabel}
    </button>
  )
}
