'use client'

import { useTranslation } from 'react-i18next'
import {
  CURRENCIES,
  getAmountInputProps,
  getCurrencySymbol,
  normalizeAmountInputValue,
} from '../types'

interface Props {
  amount: string
  currency: string
  onAmountChange: (value: string) => void
  onCurrencyChange: (value: string) => void
  inputCls: string
}

export default function ActualChargedFields({
  amount,
  currency,
  onAmountChange,
  onCurrencyChange,
  inputCls,
}: Props) {
  const { t } = useTranslation()
  const amountProps = getAmountInputProps(currency)

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        <label className="app-kicker">
          {t('actualCharged')} ({currency} {getCurrencySymbol(currency)})
        </label>
        <span className="text-xs text-slate-300 dark:text-zinc-600">{t('optional')}</span>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={amount}
          onChange={event => onAmountChange(normalizeAmountInputValue(event.target.value, currency))}
          placeholder={amountProps.placeholder}
          className={inputCls}
          step={amountProps.step}
          inputMode={amountProps.inputMode}
          style={{ fontSize: '16px' }}
        />
        <select
          value={currency}
          onChange={event => onCurrencyChange(event.target.value)}
          className="app-select flex-shrink-0 px-3 py-2.5 text-sm"
          style={{ fontSize: '16px' }}
        >
          {CURRENCIES.map(item => (
            <option key={item.code} value={item.code}>{item.symbol} {item.code}</option>
          ))}
        </select>
      </div>
      <p className="mt-1 text-xs text-slate-400">{t('actualChargedHint')}</p>
    </div>
  )
}
