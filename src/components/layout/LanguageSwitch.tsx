import { useTranslation } from '../../i18n/LocaleContext'

export default function LanguageSwitch({ compact }: { compact?: boolean }) {
  const { locale, setLocale } = useTranslation()

  const btn = (code: 'en' | 'sw', label: string) => (
    <button
      type="button"
      onClick={() => setLocale(code)}
      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
        locale === code
          ? 'bg-white text-terra-800 shadow-sm'
          : 'text-slate-500 hover:text-slate-800'
      }`}
      aria-pressed={locale === code}
    >
      {label}
    </button>
  )

  if (compact) {
    return (
      <div className="flex items-center rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Language">
        {btn('en', 'EN')}
        {btn('sw', 'SW')}
      </div>
    )
  }

  return (
    <div className="flex items-center rounded-lg bg-slate-100 p-1 gap-0.5" role="group" aria-label="Language">
      {btn('en', 'English')}
      {btn('sw', 'Kiswahili')}
    </div>
  )
}
