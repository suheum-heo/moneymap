'use client'
import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../i18n'

export default function LanguageSelector() {
  const { t, i18n } = useTranslation()

  const changeLang = (code: string) => {
    i18n.changeLanguage(code)
    localStorage.setItem('gagyebu-lang', code)
  }

  return (
    <div className="app-panel p-4 sm:p-5">
      <div className="app-kicker mb-3">{t('language')}</div>
      <div className="grid grid-cols-2 gap-2">
        {LANGUAGES.map(lang => (
          <button
            key={lang.code}
            onClick={() => changeLang(lang.code)}
            className={`rounded-2xl px-3 py-3 text-left text-sm transition-colors ${
              i18n.language === lang.code
                ? 'border border-indigo-500 bg-indigo-500 text-white font-medium'
                : 'border border-zinc-200/70 bg-white/70 text-zinc-700 dark:border-white/10 dark:bg-slate-950/45 dark:text-zinc-300'
            }`}>
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  )
}
