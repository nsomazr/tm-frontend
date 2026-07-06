import TerraAssistantPanel, {
  type TerraAssistantMapContext,
} from '../assistant/TerraAssistantPanel'
import { TerraAssistantAvatar } from '../assistant/AssistantIcons'
import { useTranslation } from '../../i18n/LocaleContext'
import type { AreaInsight } from '../../types'
import TerraAssistantButton from './TerraAssistantButton'

interface TerraAssistantLauncherProps {
  open: boolean
  onToggle: () => void
  onClose: () => void
  areaInsight: AreaInsight | null
  insightLoading: boolean
  hasPaidAccess: boolean
  mapContext: TerraAssistantMapContext | null
  getMapSnapshot?: () => Promise<string | null>
  className?: string
}

export default function TerraAssistantLauncher({
  open,
  onToggle,
  onClose,
  areaInsight,
  insightLoading,
  hasPaidAccess,
  mapContext,
  getMapSnapshot,
  className = '',
}: TerraAssistantLauncherProps) {
  const { m } = useTranslation()

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label={m.map.closePanel}
          className="fixed inset-0 z-40 bg-black/20 md:bg-transparent"
          onClick={onClose}
        />
      )}

      <div className={`pointer-events-auto inline-flex flex-col items-end gap-3 ${className}`}>
        {open && (
          <div
            className="z-50 flex w-[min(24rem,calc(100vw-2rem))] max-md:w-[min(22rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-app-border-strong bg-app-surface shadow-2xl animate-fade-in h-[min(32rem,58vh)] max-md:h-[min(28rem,52vh)]"
            role="dialog"
            aria-label={m.assistant.chatTitle}
          >
            <div className="shrink-0 flex items-center justify-between gap-2 border-b app-divider px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <TerraAssistantAvatar className="h-6 w-6" />
                <span className="truncate text-sm font-semibold map-text">{m.assistant.chatTitle}</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded p-1 text-xl leading-none map-text-muted hover:bg-app-subtle hover:text-app-secondary"
                aria-label={m.map.closePanel}
              >
                ×
              </button>
            </div>
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
              <TerraAssistantPanel
                insight={areaInsight}
                loading={insightLoading}
                hasPaidAccess={hasPaidAccess}
                mapContext={mapContext}
                mode="map"
                layout="compact"
                mobileSheet
                insightExport
                getMapSnapshot={getMapSnapshot}
              />
            </div>
          </div>
        )}

        <TerraAssistantButton active={open} onClick={onToggle} />
      </div>
    </>
  )
}
