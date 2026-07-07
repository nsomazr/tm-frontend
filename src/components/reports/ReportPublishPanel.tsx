import { Link } from 'react-router-dom'
import type { Report } from '../../types'

interface PlanOption {
  id: number
  name: string
}

interface ReportPublishPanelProps {
  title: string
  layersSummary: string
  locationsSummary: string
  contentSummary: string
  reportMode: 'write' | 'upload'
  accessType: Report['access_type']
  price: string
  reportFormat: Report['report_format']
  isActive: boolean
  regeneratePdf: boolean
  allowedPlanIds: number[]
  plans: PlanOption[]
  isNew: boolean
  hasPdf?: boolean
  hasArticle?: boolean
  reportSlug?: string
  onAccessTypeChange: (value: Report['access_type']) => void
  onPriceChange: (value: string) => void
  onReportFormatChange: (value: Report['report_format']) => void
  onIsActiveChange: (value: boolean) => void
  onRegeneratePdfChange: (value: boolean) => void
  onAllowedPlanIdsChange: (ids: number[]) => void
}

export default function ReportPublishPanel({
  title,
  layersSummary,
  locationsSummary,
  contentSummary,
  reportMode,
  accessType,
  price,
  reportFormat,
  isActive,
  regeneratePdf,
  allowedPlanIds,
  plans,
  isNew,
  hasPdf,
  hasArticle,
  reportSlug,
  onAccessTypeChange,
  onPriceChange,
  onReportFormatChange,
  onIsActiveChange,
  onRegeneratePdfChange,
  onAllowedPlanIdsChange,
}: ReportPublishPanelProps) {
  const showSubscriberPlans =
    accessType === 'subscriber_only' || accessType === 'subscriber_or_paid'

  return (
    <section className="report-publish">
      <header className="report-publish__header">
        <h2 className="report-publish__title">Publish settings</h2>
        <p className="report-publish__lead">
          Confirm your report details, then choose how it appears in the catalog.
        </p>
      </header>

      <div className="report-publish__review">
        <p className="report-publish__review-title">{title || 'Untitled report'}</p>
        <ul className="report-publish__review-meta">
          <li>{layersSummary}</li>
          <li>{locationsSummary}</li>
          <li>{contentSummary}</li>
        </ul>
      </div>

      <div className="report-publish__card">
        <div className="report-publish__section">
          <h3 className="report-publish__section-title">Access &amp; pricing</h3>
          <div className="report-publish__fields report-publish__fields--access">
            <label className="report-publish__field">
              <span className="report-publish__label">Access type</span>
              <select
                value={accessType}
                onChange={(e) => onAccessTypeChange(e.target.value as Report['access_type'])}
                className="input report-publish__input"
              >
                <option value="free">Free</option>
                <option value="paid">Paid</option>
                <option value="subscriber_only">Subscriber only</option>
                <option value="subscriber_or_paid">Subscriber or paid</option>
              </select>
            </label>

            {accessType !== 'free' && (
              <label className="report-publish__field">
                <span className="report-publish__label">Price (TZS)</span>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => onPriceChange(e.target.value)}
                  className="input report-publish__input"
                />
              </label>
            )}

            {reportMode === 'write' && (
              <label className="report-publish__field">
                <span className="report-publish__label">Output format</span>
                <select
                  value={reportFormat}
                  onChange={(e) => onReportFormatChange(e.target.value as Report['report_format'])}
                  className="input report-publish__input"
                >
                  <option value="pdf">PDF only</option>
                  <option value="web_article">Web article only</option>
                  <option value="pdf_and_article">PDF and web article</option>
                </select>
              </label>
            )}
          </div>

          {showSubscriberPlans && plans.length > 0 && (
            <div className="report-publish__plans">
              <span className="report-publish__label">Allowed subscription plans</span>
              <div className="report-publish__plan-chips">
                {plans.map((plan) => {
                  const checked = allowedPlanIds.includes(plan.id)
                  return (
                    <label
                      key={plan.id}
                      className={`report-publish__plan-chip ${checked ? 'report-publish__plan-chip--active' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          onAllowedPlanIdsChange(
                            checked
                              ? allowedPlanIds.filter((id) => id !== plan.id)
                              : [...allowedPlanIds, plan.id],
                          )
                        }}
                        className="checkbox checkbox--sm"
                      />
                      {plan.name}
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {reportMode === 'write' && reportFormat !== 'pdf' && !isNew && hasArticle && reportSlug && (
            <Link to={`/downloads/${reportSlug}/read`} className="report-publish__article-link">
              Preview web article
            </Link>
          )}
        </div>

        <div className="report-publish__section report-publish__section--bordered">
          <h3 className="report-publish__section-title">Catalog</h3>
          <div className="report-publish__toggles">
            <label className="report-publish__toggle">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => onIsActiveChange(e.target.checked)}
                className="checkbox mt-0.5"
              />
              <span>
                <span className="report-publish__toggle-title">Visible in catalog</span>
                <span className="report-publish__toggle-hint">
                  {isActive
                    ? 'Appears in the public catalog after you save.'
                    : 'Saved as a draft, hidden from the catalog.'}
                </span>
              </span>
            </label>

            {!isNew && hasPdf && reportMode === 'write' && (
              <label className="report-publish__toggle">
                <input
                  type="checkbox"
                  checked={regeneratePdf}
                  onChange={(e) => onRegeneratePdfChange(e.target.checked)}
                  className="checkbox mt-0.5"
                />
                <span>
                  <span className="report-publish__toggle-title">Regenerate PDF after save</span>
                  <span className="report-publish__toggle-hint">
                    Rebuilds the PDF from your latest written content.
                  </span>
                </span>
              </label>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
