import { Link } from 'react-router-dom'
import { useTranslation } from '../../i18n/LocaleContext'
import { interpolate } from '../../i18n/utils'
import type { Report } from '../../types'

interface ReportPaywallProps {
  report: Report
  user: { id: number } | null
  onPurchase: () => void
  purchasePending?: boolean
}

export default function ReportPaywall({ report, user, onPurchase, purchasePending }: ReportPaywallProps) {
  const { m } = useTranslation()
  const r = m.reports

  return (
    <div className="rounded-xl border border-app-border bg-app-elevated shadow-sm p-5 sm:p-6 space-y-4">
      <div className="text-center space-y-1">
        <p className="text-base font-semibold map-text">{r.previewEndsTitle}</p>
        <p className="text-sm map-text-secondary max-w-md mx-auto">{r.previewEndsDesc}</p>
      </div>
      {!user ? (
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link to="/login" className="btn-primary text-sm text-center">
            {r.signInCta}
          </Link>
          <Link to="/register" className="btn-secondary text-sm text-center">
            {m.pricing.createAccount}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <Link to="/subscriptions" className="btn-primary text-sm text-center flex-1">
            {r.subscribeToDownload}
          </Link>
          <button
            type="button"
            onClick={onPurchase}
            disabled={purchasePending}
            className="btn-secondary text-sm flex-1 disabled:opacity-50"
          >
            {interpolate(r.purchaseForPrice, {
              price: `${Number(report.price).toLocaleString()} ${report.currency}`,
            })}
          </button>
        </div>
      )}
    </div>
  )
}
