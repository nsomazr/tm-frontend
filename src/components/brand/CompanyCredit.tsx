import { useTranslation } from '../../i18n/LocaleContext'

const COMPANY_URL = 'https://5ggeology.com'

export default function CompanyCredit({ className = '' }: { className?: string }) {
  const { m } = useTranslation()

  return (
    <p className={`text-sm text-slate-500 ${className}`}>
      {m.footer.byLine}{' '}
      <a
        href={COMPANY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-terra-600 hover:text-terra-700 font-medium"
      >
        {m.footer.company}
      </a>
    </p>
  )
}
