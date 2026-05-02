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
    <div>
      <div className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-3">{t('language')}</div>
      <div className="grid grid-cols-2 gap-2">
        {LANGUAGES.map(lang => (
          <button
            key={lang.code}
            onClick={() => changeLang(lang.code)}
            className={`px-3 py-2 rounded-xl text-sm border transition-colors text-left ${
              i18n.language === lang.code
                ? 'bg-amber-500 text-white border-amber-500 font-medium'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-transparent'
            }`}>
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  )
}
