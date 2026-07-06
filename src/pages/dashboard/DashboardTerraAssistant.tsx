import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import {
  AnalyticsQuickIcon,
  ChevronRightIcon,
  MapQuickIcon,
  ReportsQuickIcon,
  TerraAssistantAvatar,
} from '../../components/assistant/AssistantIcons'
import TerraAssistantPanel from '../../components/assistant/TerraAssistantPanel'
import { useTranslation } from '../../i18n/LocaleContext'

const QUICK_ACTIONS = [
  { to: '/maps', Icon: MapQuickIcon, titleKey: 'openMap' as const, descKey: 'openMapDesc' as const },
  {
    to: '/dashboard/analytics',
    Icon: AnalyticsQuickIcon,
    titleKey: 'viewAnalytics' as const,
    descKey: 'viewAnalyticsDesc' as const,
  },
  {
    to: '/downloads',
    Icon: ReportsQuickIcon,
    titleKey: 'browseReports' as const,
    descKey: 'browseReportsDesc' as const,
  },
] as const

export default function DashboardTerraAssistant() {
  const { hasPaidAccess, user } = useAuth()
  const { m } = useTranslation()
  const ta = m.assistant

  return (
    <div className="animate-fade-in flex flex-col flex-1 min-h-0 max-w-3xl w-full">
      <header className="shrink-0 mb-4 sm:mb-5">
        <div className="flex items-start gap-3">
          <TerraAssistantAvatar className="h-10 w-10 shrink-0 shadow-sm shadow-terra-600/15" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-app-text tracking-tight">{ta.accountTitle}</h1>
            <p className="text-app-muted mt-1 text-sm leading-relaxed">{ta.accountDescription}</p>
          </div>
        </div>
      </header>

      <div className="shrink-0 grid sm:grid-cols-3 gap-2.5 mb-4 sm:mb-5">
        {QUICK_ACTIONS.map(({ to, Icon, titleKey, descKey }) => (
          <Link
            key={to}
            to={to}
            className="group flex flex-col gap-2 rounded-xl border border-app-border bg-app-surface p-3.5 transition-all duration-200 hover:border-terra-300 hover:shadow-soft dark:hover:shadow-soft-dark"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-terra-50 text-terra-700 dark:bg-terra-950/50 dark:text-terra-300">
                <Icon className="h-4 w-4" />
              </span>
              <ChevronRightIcon className="h-3.5 w-3.5 text-app-muted opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
            </div>
            <div>
              <p className="text-sm font-semibold text-app-text">{ta[titleKey]}</p>
              <p className="text-xs text-app-muted mt-0.5 leading-snug line-clamp-2">{ta[descKey]}</p>
            </div>
          </Link>
        ))}
      </div>

      <section className="flex flex-1 min-h-[280px] flex-col overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-soft dark:shadow-soft-dark">
        <TerraAssistantPanel
          hasPaidAccess={hasPaidAccess}
          initialCredits={user?.assistant_credits ?? null}
          insight={null}
          mode="account"
          layout="fill"
          insightExport
        />
      </section>
    </div>
  )
}
