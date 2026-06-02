'use client'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CURRENCIES } from '../types'
import LanguageSelector from './LanguageSelector'
import LocalizedMonthPicker from './LocalizedMonthPicker'

interface Props {
  onDone: (ctx: { name: string; currency: string; homeCurrency: string; startDate: string }) => void
}

export default function Onboarding({ onDone }: Props) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [homeCurrency, setHomeCurrency] = useState('USD')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 7))
  const [error, setError] = useState('')

  const handleSubmit = () => {
    if (!name.trim()) { setError(t('budgetNameRequired')); return }
    onDone({ name: name.trim(), currency, homeCurrency, startDate })
  }

  const selCls = "app-select w-full px-3 py-2.5 text-sm"
  const inputCls = "app-input py-3 text-sm"

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="app-panel px-6 py-8 sm:px-7">
          <div className="mb-6 flex justify-end">
            <LanguageSelector variant="inline" />
          </div>

          <div className="mb-8 text-center">
            <img src="/moneymap-logo.png" alt={t('appName')} className="mx-auto mb-4 h-14 w-14 rounded-[20px] object-cover" />
            <h1 className="mb-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">{t('appName')}</h1>
            <p className="text-sm text-slate-400">{t('onboardingSubtitle')}</p>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="app-kicker mb-2 block">{t('budgetName')}</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder={t('onboardingExamplePlaceholder')}
                className={inputCls} style={{ fontSize: '16px' }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
              <p className="text-xs text-slate-400 mt-1">{t('onboardingLaterHint')}</p>
            </div>

            <div>
              <label className="app-kicker mb-2 block">{t('localCurrency')}</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className={selCls} style={{ fontSize: '16px' }}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>)}
              </select>
              <p className="text-xs text-slate-400 mt-1">{t('onboardingLocalCurrencyHint')}</p>
            </div>

            <div>
              <label className="app-kicker mb-2 block">{t('homeCurrency')}</label>
              <select value={homeCurrency} onChange={e => setHomeCurrency(e.target.value)} className={selCls} style={{ fontSize: '16px' }}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>)}
              </select>
              <p className="text-xs text-slate-400 mt-1">{t('onboardingHomeCurrencyHint')}</p>
            </div>

            <div>
              <label className="app-kicker mb-2 block">{t('startFrom')}</label>
              <LocalizedMonthPicker value={startDate} onChange={setStartDate} placeholder={t('startFrom')} />
            </div>

            {error && <div className="text-xs text-rose-500">{error}</div>}

            <button onClick={handleSubmit}
              className="app-button-primary mt-2 w-full">
              {t('getStarted')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
