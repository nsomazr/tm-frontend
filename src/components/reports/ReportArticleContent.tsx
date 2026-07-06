import { Link } from 'react-router-dom'
import type { ArticleBlock, Report } from '../../types'
import ReportDocumentChrome from './ReportDocumentChrome'
import ReportHtmlContent from './ReportHtmlContent'
import { looksLikeHtml } from './reportEditorText'

function ArticleBlockView({ block }: { block: ArticleBlock }) {
  if (block.type === 'heading') {
    if (block.level <= 1) {
      return <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">{block.text}</h2>
    }
    return <h3 className="text-xl font-semibold text-emerald-800 mt-8 mb-3">{block.text}</h3>
  }
  if (block.type === 'list') {
    return (
      <ul className="list-disc pl-5 space-y-2 text-slate-700 my-4">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    )
  }
  if (block.type === 'callout') {
    return (
      <div className="my-6 rounded-xl border border-terra-200 bg-terra-50 px-4 py-3 text-slate-800">{block.text}</div>
    )
  }
  if (looksLikeHtml(block.text)) {
    return <ReportHtmlContent html={block.text} className="my-4" />
  }
  return <p className="text-slate-700 leading-relaxed my-4">{block.text}</p>
}

interface ReportArticleBodyProps {
  report: Report
  blocks: ArticleBlock[]
}

export function ReportArticleBody({ report, blocks }: ReportArticleBodyProps) {
  return (
    <article className="report-html-content max-w-none">
      {blocks.map((block, index) => (
        <ArticleBlockView key={`${block.type}-${index}`} block={block} />
      ))}
      {report.has_pdf && (
        <div className="mt-10 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="font-medium text-slate-900">Download the full PDF</p>
            <p className="text-sm text-slate-600">Includes charts, tables, and the complete technical appendix.</p>
          </div>
          <Link to={`/downloads/${report.slug}`} className="btn-primary text-sm shrink-0 text-center">
            Open report page
          </Link>
        </div>
      )}
    </article>
  )
}

interface ReportArticleHeroProps {
  report: Report
}

export function ReportArticleHero({ report }: ReportArticleHeroProps) {
  return (
    <header className="mb-8">
      <p className="text-sm font-medium text-terra-600">{report.mineral_name}</p>
      <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mt-2">{report.title}</h1>
      {report.region_name && <p className="text-slate-600 mt-2">{report.region_name}</p>}
      {report.description && <p className="text-slate-600 mt-4 max-w-2xl">{report.description}</p>}
    </header>
  )
}

export function ReportArticlePaywall({ report }: { report: Report }) {
  return (
    <div className="my-8 rounded-xl border border-slate-200 bg-slate-50 px-5 py-6 text-center space-y-3">
      <p className="font-semibold text-slate-900">Subscribe or purchase to read the full article</p>
      <p className="text-sm text-slate-600 max-w-md mx-auto">
        Unlock the complete web article, key findings, and PDF download for {report.title}.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <Link to="/subscriptions" className="btn-primary text-sm">
          View plans
        </Link>
        <Link to={`/downloads/${report.slug}`} className="btn-secondary text-sm">
          Open report page
        </Link>
      </div>
    </div>
  )
}
