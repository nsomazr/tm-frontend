import { useTranslation } from '../../i18n/LocaleContext'

export default function LanguageSwitch({ compact }: { compact?: boolean }) {
  const { locale, setLocale } = useTranslation()

  const btn = (code: 'en' | 'sw', label: string) => (
    <button
      type="button"
      onClick={() => setLocale(code)}
      className={`segmented-btn px-2.5 py-1 ${locale === code ? 'segmented-btn-active' : ''}`}
      aria-pressed={locale === code}
    >
      {label}
    </button>
  )

  if (compact) {
    return (
      <div className="segmented min-w-0 shrink" role="group" aria-label="Language">
        {btn('en', 'EN')}
        {btn('sw', 'SW')}
      </div>
    )
  }

  return (
    <div className="segmented p-1 gap-0.5" role="group" aria-label="Language">
      {btn('en', 'English')}
      {btn('sw', 'Kiswahili')}
    </div>
  )
}
