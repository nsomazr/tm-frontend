import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { subscriptionsApi } from '../../api'
import { useMapEntitlements } from '../../hooks/useMapEntitlements'
import {
  formatMineralExplorationLimit,
  mineralExplorationSummary,
} from '../../lib/mineralExploration'
import { planTierStyle } from '../../lib/planTiers'
import { EmptyState, PageHeader } from './DashboardUi'

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function UsageMeter({
  label,
  used,
  limit,
  remaining,
  unlimited,
  periodLabel,
  fallback,
}: {
  label: string
  used?: number | null
  limit?: number | null
  remaining?: number | null
  unlimited?: boolean
  periodLabel?: string
  fallback?: string
}) {
  if (unlimited) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-app-text">{label}</p>
          <p className="text-sm font-semibold text-app-text">Unlimited</p>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-terra-500/20">
          <div className="h-full w-full rounded-full bg-terra-600" />
        </div>
      </div>
    )
  }

  if (limit == null && remaining == null && !fallback) return null

  const safeLimit = limit ?? 0
  const safeRemaining = remaining ?? Math.max(0, safeLimit - (used ?? 0))
  const safeUsed = used ?? Math.max(0, safeLimit - safeRemaining)
  const pct = safeLimit > 0 ? Math.min(100, Math.round((safeUsed / safeLimit) * 100)) : 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-app-text">{label}</p>
        <p className="text-sm tabular-nums text-app-text-secondary">
          {safeLimit > 0 ? (
            <>
              <span className="font-semibold text-app-text">{safeRemaining}</span>
              <span className="text-app-muted"> / {safeLimit} left</span>
            </>
          ) : (
            fallback
          )}
        </p>
      </div>
      {safeLimit > 0 ? (
        <div className="h-1.5 overflow-hidden rounded-full bg-app-subtle">
          <div
            className="h-full rounded-full bg-terra-600 transition-[width]"
            style={{ width: `${Math.max(4, 100 - pct)}%` }}
            title={`${safeUsed} used${periodLabel ? ` · ${periodLabel}` : ''}`}
          />
        </div>
      ) : null}
      {periodLabel && safeLimit > 0 ? (
        <p className="text-[11px] text-app-muted">{periodLabel}</p>
      ) : null}
    </div>
  )
}

export default function DashboardSubscription() {
  const { user, mineralExploration, canSaveExplorations, canUseAnalytics } = useMapEntitlements()
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: () => subscriptionsApi.me().then((r) => r.data).catch(() => null),
  })

  const plan = subscription?.is_active ? subscription.plan_detail : null
  const planName = plan?.name ?? user?.current_plan?.name ?? 'Explorer'
  const showsDeepExplore =
    !!plan &&
    (plan.max_explorable_minerals == null || (plan.max_explorable_minerals ?? 0) > 0)
  const creditPeriod = 'this month'
  const downloadPeriod = plan?.billing_cycle === 'annual' ? 'this year' : 'this month'
  const defaultCredits = plan?.billing_cycle === 'annual' ? 5000 : 3000
  const defaultDownloads = plan?.billing_cycle === 'annual' ? 10 : 3

  return (
    <>
      <PageHeader title="Subscription" description="Your plan, renewal, and usage." />

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : plan && subscription?.is_active ? (
        <div className="card !p-0 overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b app-divider px-5 py-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight text-app-text">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold tracking-wide ring-1 ring-inset ${
                      planTierStyle(plan?.slug ?? planName).className
                    }`}
                  >
                    {planName}
                  </span>
                </h2>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300">
                  Active
                </span>
              </div>
              <p className="mt-1 text-sm text-app-muted">
                {plan.billing_cycle === 'annual' ? 'Annual' : 'Monthly'} billing
                {subscription.auto_renew ? ' · Auto-renew on' : ' · Auto-renew off'}
                {subscription.end_date
                  ? ` · Renews ${formatDate(subscription.end_date)}`
                  : ''}
                {subscription.days_until_expiry != null
                  ? ` (${subscription.days_until_expiry} days)`
                  : ''}
              </p>
            </div>
            <Link to="/subscriptions" className="btn-secondary shrink-0 text-sm !px-3 !py-1.5">
              Change plan
            </Link>
          </div>

          <div className="space-y-5 px-5 py-5">
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-app-muted">
                Usage
              </p>
              <div className="space-y-4">
                <UsageMeter
                  label="Ask Terra credits"
                  unlimited={subscription.assistant_credits?.unlimited}
                  remaining={subscription.assistant_credits?.remaining}
                  limit={subscription.assistant_credits?.limit}
                  periodLabel={creditPeriod}
                  fallback={`${plan.included_assistant_credits ?? defaultCredits} / month`}
                />
                {showsDeepExplore ? (
                  <UsageMeter
                    label="Mineral deep-explores"
                    unlimited={mineralExploration?.unlimited}
                    used={mineralExploration?.used}
                    remaining={mineralExploration?.remaining}
                    limit={
                      mineralExploration?.limit ??
                      (plan.max_explorable_minerals == null
                        ? null
                        : plan.max_explorable_minerals)
                    }
                    periodLabel={
                      mineralExploration?.unlimited
                        ? mineralExplorationSummary(mineralExploration)
                        : creditPeriod
                    }
                    fallback={`Up to ${formatMineralExplorationLimit(plan.max_explorable_minerals)} / month`}
                  />
                ) : null}
                <UsageMeter
                  label="Report downloads"
                  unlimited={subscription.download_quota?.unlimited}
                  remaining={subscription.download_quota?.remaining}
                  limit={subscription.download_quota?.limit}
                  periodLabel={downloadPeriod}
                  fallback={`${plan.included_report_downloads ?? defaultDownloads} / ${plan.billing_cycle === 'annual' ? 'year' : 'month'}`}
                />
              </div>
            </div>

            <div>
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-app-muted">
                Included
              </p>
              <ul className="flex flex-wrap gap-2">
                <li
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                    canUseAnalytics
                      ? 'bg-terra-500/10 text-terra-800 ring-terra-500/25 dark:text-terra-300'
                      : 'bg-app-subtle text-app-muted ring-app-border'
                  }`}
                >
                  Analytics & heatmaps{canUseAnalytics ? '' : ' · Plus/Pro'}
                </li>
                <li
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                    canSaveExplorations
                      ? 'bg-terra-500/10 text-terra-800 ring-terra-500/25 dark:text-terra-300'
                      : 'bg-app-subtle text-app-muted ring-app-border'
                  }`}
                >
                  {canSaveExplorations
                    ? 'Saved map exploration areas'
                    : 'Saved areas · Plus/Pro'}
                </li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          message={`You are on ${planName}: map browse, commodity table, and report teasers. Upgrade for Terra insights, show-on-map, full intelligence, analytics, and downloads.`}
          action={
            <Link to="/subscriptions" className="btn-primary text-sm">
              View subscription plans
            </Link>
          }
        />
      )}
    </>
  )
}
