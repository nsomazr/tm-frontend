import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { subscriptionsApi } from '../../api'
import { EmptyState, PageHeader } from './DashboardUi'

export default function DashboardSubscription() {
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: () => subscriptionsApi.me().then((r) => r.data).catch(() => null),
  })

  return (
    <>
      <PageHeader title="Subscription" description="Your current plan and access level." />

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : subscription?.is_active ? (
        <div className="card space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-terra-700 dark:text-terra-400">{subscription.plan_detail.name}</p>
              <p className="text-sm text-app-muted capitalize mt-1">Status: {subscription.status}</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20">
              Active
            </span>
          </div>
          {subscription.end_date && (
            <dl className="grid sm:grid-cols-2 gap-4 text-sm pt-4 border-t app-divider">
              <div>
                <dt className="text-app-text-muted text-xs uppercase tracking-wide">Renews / expires</dt>
                <dd className="font-medium text-app-text mt-0.5">{subscription.end_date}</dd>
              </div>
              {subscription.days_until_expiry != null && (
                <div>
                  <dt className="text-app-text-muted text-xs uppercase tracking-wide">Days remaining</dt>
                  <dd className="font-medium text-app-text mt-0.5">{subscription.days_until_expiry}</dd>
                </div>
              )}
              <div>
                <dt className="text-app-text-muted text-xs uppercase tracking-wide">Billing</dt>
                <dd className="font-medium text-app-text mt-0.5 capitalize">
                  {subscription.plan_detail.billing_cycle}
                </dd>
              </div>
              <div>
                <dt className="text-app-text-muted text-xs uppercase tracking-wide">Ask Terra credits</dt>
                <dd className="font-medium text-app-text mt-0.5">
                  {subscription.assistant_credits?.unlimited
                    ? 'Unlimited'
                    : subscription.assistant_credits
                      ? `${subscription.assistant_credits.remaining ?? 0} of ${subscription.assistant_credits.limit ?? 0} remaining this month`
                      : `${subscription.plan_detail.included_assistant_credits ?? (subscription.plan_detail.billing_cycle === 'annual' ? 5000 : 3000)} included per month`}
                </dd>
              </div>
              <div>
                <dt className="text-app-text-muted text-xs uppercase tracking-wide">Report downloads</dt>
                <dd className="font-medium text-app-text mt-0.5">
                  {subscription.download_quota?.unlimited
                    ? 'Unlimited'
                    : subscription.download_quota
                      ? `${subscription.download_quota.remaining ?? 0} of ${subscription.download_quota.limit ?? 0} remaining this ${subscription.plan_detail.billing_cycle === 'annual' ? 'year' : 'month'}`
                      : `${subscription.plan_detail.included_report_downloads ?? (subscription.plan_detail.billing_cycle === 'annual' ? 10 : 3)} included per ${subscription.plan_detail.billing_cycle === 'annual' ? 'year' : 'month'}`}
                </dd>
              </div>
              <div>
                <dt className="text-app-text-muted text-xs uppercase tracking-wide">Auto-renew</dt>
                <dd className="font-medium text-app-text mt-0.5">{subscription.auto_renew ? 'Yes' : 'No'}</dd>
              </div>
            </dl>
          )}
          <Link to="/subscriptions" className="inline-block text-sm text-terra-600 hover:text-terra-700 font-medium">
            Change or upgrade plan →
          </Link>
        </div>
      ) : (
        <EmptyState
          message="You are on Explorer: map browse, commodity table, and report teasers. Upgrade for Terra insights, show-on-map, full AI, analytics, and downloads."
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
