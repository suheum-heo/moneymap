'use client'
import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../i18n'

interface Props {
  variant?: 'panel' | 'inline'
}

export default function LanguageSelector({ variant = 'panel' }: Props) {
  const { t, i18n } = useTranslation()
  const activeLanguage = i18n.resolvedLanguage || i18n.language

  const changeLang = (code: string) => {
    i18n.changeLanguage(code)
    localStorage.setItem('gagyebu-lang', code)
  }

  if (variant === 'inline') {
    return (
      <div className="min-w-[180px]">
        <label className="app-kicker mb-2 block text-right">{t('language')}</label>
        <select
          value={activeLanguage}
          onChange={e => changeLang(e.target.value)}
          className="app-select w-full px-3 py-2 text-sm"
          style={{ fontSize: '16px' }}
          aria-label={t('language')}
        >
          {LANGUAGES.map(lang => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div className="app-panel p-4 sm:p-5">
      <div className="app-kicker mb-3">{t('language')}</div>
      <div className="grid grid-cols-2 gap-2">
        {LANGUAGES.map(lang => (
          <button
            key={lang.code}
            onClick={() => changeLang(lang.code)}
            className={`rounded-[18px] px-3 py-3 text-left text-sm transition-colors ${
              activeLanguage === lang.code
                ? 'border border-[#3182f6] bg-[#3182f6] text-white font-medium shadow-[0_12px_22px_-16px_rgba(49,130,246,0.72)]'
                : 'border border-slate-200/80 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-slate-900/70 dark:text-zinc-300'
            }`}>
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  )
}
