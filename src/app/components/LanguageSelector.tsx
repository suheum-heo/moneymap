'use client'
import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../i18n'
import ChevronDownIcon from './ChevronDownIcon'

interface Props {
  variant?: 'panel' | 'inline'
}

export default function LanguageSelector({ variant = 'panel' }: Props) {
  const { t, i18n } = useTranslation()
  const activeLanguage = i18n.resolvedLanguage || i18n.language
  const activeLabel = LANGUAGES.find(lang => lang.code === activeLanguage)?.label || LANGUAGES[0].label

  const changeLang = (code: string) => {
    i18n.changeLanguage(code)
    localStorage.setItem('gagyebu-lang', code)
  }

  if (variant === 'inline') {
    return (
      <div className="relative inline-flex">
        <div className="pointer-events-none inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200/85 bg-white/88 px-3 py-2 text-sm text-slate-600 shadow-[0_10px_24px_-22px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-slate-900/75 dark:text-zinc-300">
          <span className="text-[13px] opacity-70" aria-hidden="true">🌐</span>
          <span className="max-w-[96px] truncate font-medium">{activeLabel}</span>
          <ChevronDownIcon className="h-3.5 w-3.5 flex-shrink-0 text-slate-400 dark:text-slate-500" />
        </div>
        <select
          value={activeLanguage}
          onChange={e => changeLang(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-full opacity-0"
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
