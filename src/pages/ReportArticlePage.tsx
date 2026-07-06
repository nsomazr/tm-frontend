import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { reportsApi } from '../api'
import { useAuth } from '../auth/AuthContext'
import { ReportArticleBody, ReportArticleHero, ReportArticlePaywall } from '../components/reports/ReportArticleContent'
import ReportDocumentChrome from '../components/reports/ReportDocumentChrome'
import { useTranslation } from '../i18n/LocaleContext'

export default function ReportArticlePage() {
  const { slug } = useParams<{ slug: string }>()
  const { user } = useAuth()
  const { m } = useTranslation()
  const r = m.reports

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['report', slug],
    queryFn: () => reportsApi.get(slug!).then((res) => res.data),
    enabled: !!slug,
  })

  if (isLoading) {
    return <p className="text-sm text-slate-500 px-4 py-10">{r.loading}</p>
  }

  if (isError || !report) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <p className="text-slate-600">{r.notFound}</p>
        <Link to="/downloads" className="text-sm text-terra-600 mt-4 inline-block">
          ← {r.backToCatalog}
        </Link>
      </div>
    )
  }

  if (!report.has_article) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <p className="text-slate-600">This report does not have a web article.</p>
        <Link to={`/downloads/${report.slug}`} className="btn-primary text-sm mt-4 inline-block">
          Open report preview
        </Link>
      </div>
    )
  }

  const blocks = report.article_body ?? []
  const hasAccess = report.has_full_access

  return (
    <div className="animate-fade-in max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <Link to="/downloads" className="text-sm text-terra-600 hover:text-terra-700 font-medium">
        ← {r.backToCatalog}
      </Link>

      <div className="mt-6 card overflow-hidden !p-0">
        <ReportDocumentChrome report={report}>
          <div className="px-5 sm:px-6 py-6">
            <ReportArticleHero report={report} />
            {hasAccess ? (
              <ReportArticleBody report={report} blocks={blocks} />
            ) : (
              <>
                {blocks.slice(0, 3).length > 0 && <ReportArticleBody report={report} blocks={blocks.slice(0, 3)} />}
                <ReportArticlePaywall report={report} />
                {!user && (
                  <p className="text-sm text-slate-600 text-center">
                    <Link to="/login" className="text-terra-600 font-medium">
                      Sign in
                    </Link>{' '}
                    to check your subscription or purchases.
                  </p>
                )}
              </>
            )}
          </div>
        </ReportDocumentChrome>
      </div>
    </div>
  )
}
