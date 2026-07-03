import { useTranslation } from '../../i18n/LocaleContext'
import { interpolate } from '../../i18n/utils'
import type { DownloadQuota } from '../../types'

export function ReportQuotaBanner({ quota }: { quota: DownloadQuota }) {
  const { m } = useTranslation()
  const r = m.reports

  if (quota.unlimited) return null

  const periodLabel = quota.billing_cycle === 'annual' ? r.quotaPeriodYear : r.quotaPeriodMonth

  if (quota.remaining === 0) {
    return (
      <div className="mb-8 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-950">
        <p className="font-medium">
          {interpolate(r.quotaExhausted, { limit: quota.limit ?? 0, period: periodLabel })}
        </p>
        <p className="mt-1 text-amber-900/80">{r.quotaExhaustedHint}</p>
      </div>
    )
  }

  return (
    <div className="mb-8 rounded-xl bg-terra-50 border border-terra-100 px-4 py-3 text-sm text-terra-900">
      {interpolate(r.quotaRemaining, {
        remaining: quota.remaining ?? 0,
        limit: quota.limit ?? 0,
        period: periodLabel,
      })}
    </div>
  )
}
