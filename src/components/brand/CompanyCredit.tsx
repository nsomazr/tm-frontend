import { useTranslation } from '../../i18n/LocaleContext'

const COMPANY_URL = 'https://5ggeology.com'

export default function CompanyCredit({ className = '' }: { className?: string }) {
  const { m } = useTranslation()

  return (
    <p className={className ? `text-sm ${className}` : 'text-sm text-slate-500'}>
      {m.footer.byLine}{' '}
      <a
        href={COMPANY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={
          className
            ? 'font-medium underline-offset-2 hover:underline'
            : 'font-medium text-terra-600 hover:text-terra-700'
        }
      >
        {m.footer.company}
      </a>
    </p>
  )
}
