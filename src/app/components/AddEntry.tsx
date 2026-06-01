'use client'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Entry, Context, getCurrencySymbol, CURRENCIES, formatAmountValue, getAmountInputProps, normalizeAmountInputValue, parseCurrencyInput } from '../types'
import { RecurringItem } from '../useRecurring'

interface Props {
  onAdd: (e: Entry) => void
  onDone: () => void
  entries?: Entry[]
  defaultDate?: string | null
  activeContext?: Context
  items: RecurringItem[]
  expenseCategories: string[]
  incomeCategories: string[]
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function toDateStr(m: number, day: number, y: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function daysInMonth(m: number, y: number) {
  return new Date(y, m + 1, 0).getDate()
}

export default function AddEntry({ onAdd, onDone, entries = [], defaultDate, activeContext, items, expenseCategories, incomeCategories }: Props) {
  const { t } = useTranslation()
  const contextCur = activeContext?.currency || 'USD'
  const homeCur = activeContext?.homeCurrency || contextCur
  const sym = getCurrencySymbol(contextCur)
  const homeSym = getCurrencySymbol(homeCur)

  const contextRecurring = items.filter(i => i.context === activeContext?.id)

  const saved = typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem('addentry-draft') || '{}') : {}

  const initDate = defaultDate ? new Date(defaultDate + 'T12:00:00') : new Date()
  const [month, setMonth] = useState<number>(saved.month ?? initDate.getMonth())
  const [day, setDay] = useState<number>(saved.day ?? initDate.getDate())
  const [year, setYear] = useState<number>(saved.year ?? initDate.getFullYear())
  const [entryType, setEntryType] = useState<'expense' | 'income'>(saved.entryType || 'expense')
  const [amount, setAmount] = useState(saved.amount || '')
  const [currency, setCurrency] = useState(contextCur)
  const [actualCharged, setActualCharged] = useState('')
  const [summary, setSummary] = useState(saved.summary || '')
  const [venue, setVenue] = useState(saved.venue || '')
  const [location, setLocation] = useState(saved.location || '')
  const [category, setCategory] = useState(saved.category || '')
  const [remarks, setRemarks] = useState(saved.remarks || '')
  const [error, setError] = useState('')
  const [showRecurring, setShowRecurring] = useState(false)
  const [showCurrencyOverride, setShowCurrencyOverride] = useState(false)

  useEffect(() => {
    sessionStorage.setItem('addentry-draft', JSON.stringify({
      entryType, amount, summary, venue, location, category, remarks,
      month, day, year,
    }))
  }, [entryType, amount, summary, venue, location, category, remarks, month, day, year])

  const cats = entryType === 'expense' ? expenseCategories : incomeCategories
  const maxDay = daysInMonth(month, year)
  const days = Array.from({ length: maxDay }, (_, i) => i + 1)
  const years = Array.from({ length: 80 }, (_, i) => 2020 + i)
  const primaryAmountCurrency = showCurrencyOverride ? currency : contextCur
  const primaryAmountProps = getAmountInputProps(primaryAmountCurrency)
  const actualChargedProps = getAmountInputProps(homeCur)

  useEffect(() => {
    if (!showCurrencyOverride) setCurrency(contextCur)
  }, [contextCur, showCurrencyOverride])

  useEffect(() => {
    setAmount((prev: string) => normalizeAmountInputValue(prev, primaryAmountCurrency))
  }, [primaryAmountCurrency])

  useEffect(() => {
    setActualCharged((prev: string) => normalizeAmountInputValue(prev, homeCur))
  }, [homeCur])

  const pastVenues = [...new Set(entries.map(e => e.venue).filter(Boolean))].sort()
  const pastLocations = [...new Set(entries.map(e => e.location).filter(Boolean))].sort()

  const handleTypeChange = (tp: 'expense' | 'income') => {
    setEntryType(tp)
    setCategory('')
    setShowRecurring(false)
  }

  const applyRecurring = (r: typeof contextRecurring[0]) => {
    setSummary(r.summary)
    setAmount(r.amount.toString())
    setCategory(r.category)
    setRemarks(r.remarks || '')
    setCurrency(r.currency)
    setShowCurrencyOverride(r.currency !== contextCur)
    setActualCharged('')
    setVenue(''); setLocation('')
    setShowRecurring(false)
  }

  const handleSubmit = () => {
    if (!amount || !summary.trim()) { setError(t('amount') + ' & ' + t('summary') + ' required'); return }
    const parsed = parseCurrencyInput(amount, primaryAmountCurrency)
    if (isNaN(parsed) || parsed <= 0) { setError('Invalid amount'); return }
    if (!category) { setError('Please select a category'); return }
    setError('')

    const parsedActual = actualCharged.trim() ? parseCurrencyInput(actualCharged.trim(), homeCur) : undefined

    onAdd({
      id: Date.now().toString(),
      type: entryType,
      date: toDateStr(month, day, year),
      summary: summary.trim(),
      venue: venue.trim(),
      location: location.trim(),
      category,
      amount: parsed,
      remarks: remarks.trim(),
      currency: showCurrencyOverride ? currency : contextCur,
      context: activeContext?.id || '',
      homeAmount: parsedActual,
    })
    setSummary(''); setAmount(''); setVenue(''); setLocation(''); setRemarks('')
    setCurrency(contextCur); setShowCurrencyOverride(false); setActualCharged('')
    onDone()
    sessionStorage.removeItem('addentry-draft')
  }

  const selCls = "app-select w-full px-3 py-2.5 text-sm"
  const inputCls = "app-input py-3"

  return (
    <div className="px-4 pb-8 space-y-4">
      <div className="app-panel p-4 sm:p-5">
        <div className="app-kicker mb-3">{t('add')}</div>
        <div className="flex gap-2">
        {(['expense', 'income'] as const).map(tp => (
          <button key={tp} onClick={() => handleTypeChange(tp)}
            className={`app-segment flex-1 ${entryType === tp ? 'app-segment-active' : ''}`}>
            {tp === 'expense' ? t('expense') : t('income2')}
          </button>
        ))}
      </div>
      </div>

      {entryType === 'expense' && contextRecurring.length > 0 && (
        <div className="app-panel-soft p-4 sm:p-5">
          <button onClick={() => setShowRecurring(v => !v)}
            className="flex w-full items-center justify-between rounded-[20px] border border-[#dbe8ff] bg-[#eef5ff] px-4 py-3 text-left text-sm font-medium text-[#1f5fbf] dark:border-sky-400/15 dark:bg-sky-500/10 dark:text-sky-300">
            <span>{t('recurringPayments')}</span>
            <span>{showRecurring ? '▲' : '▼'}</span>
          </button>
          {showRecurring && (
            <div className="mt-3 flex flex-col gap-2">
              {contextRecurring.map(r => (
                <button key={r.id} onClick={() => applyRecurring(r)}
                  className="app-list-row flex w-full items-center justify-between text-left">
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-800 dark:text-zinc-100">{r.summary}</span>
                    {r.remarks && <span className="mt-1 block text-xs text-slate-400">{r.remarks}</span>}
                  </div>
                  <span className="ml-3 text-sm font-semibold text-[#3182f6] dark:text-sky-300">
                    {getCurrencySymbol(r.currency)}{formatAmountValue(r.amount, r.currency)} {r.currency !== contextCur ? r.currency : ''}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="app-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4">
        <div>
          <label className="app-kicker mb-2 block">{t('date')}</label>
          <div className="grid grid-cols-3 gap-2">
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className={selCls} style={{ fontSize: '16px' }}>
              {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select value={day} onChange={e => setDay(Number(e.target.value))} className={selCls} style={{ fontSize: '16px' }}>
              {days.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className={selCls} style={{ fontSize: '16px' }}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="app-kicker">{t('amount')} ({showCurrencyOverride ? currency : contextCur} {showCurrencyOverride ? getCurrencySymbol(currency) : sym})</label>
            <button onClick={() => { setShowCurrencyOverride(v => !v); setCurrency(contextCur); setActualCharged('') }} className="text-xs font-medium text-[#3182f6] dark:text-sky-300">
              {showCurrencyOverride ? t('useDefaultCurrency') : t('differentCurrency')}
            </button>
          </div>
          <div className="flex gap-2">
            <input type="number" value={amount} onChange={e => setAmount(normalizeAmountInputValue(e.target.value, primaryAmountCurrency))}
              placeholder={primaryAmountProps.placeholder} step={primaryAmountProps.step} inputMode={primaryAmountProps.inputMode} className={inputCls} style={{ fontSize: '16px' }} />
            {showCurrencyOverride && (
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="app-select flex-shrink-0 px-3 py-2.5 text-sm"
                style={{ fontSize: '16px' }}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
              </select>
            )}
          </div>
        </div>

        {showCurrencyOverride && (
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <label className="app-kicker">
                {t('actualCharged')} ({homeCur} {homeSym})
              </label>
              <span className="text-xs text-slate-300 dark:text-zinc-600">{t('optional')}</span>
            </div>
            <input
              type="number"
              value={actualCharged}
              onChange={e => setActualCharged(normalizeAmountInputValue(e.target.value, homeCur))}
              placeholder={t('actualChargedHint')}
              className={inputCls}
              step={actualChargedProps.step}
              inputMode={actualChargedProps.inputMode}
              style={{ fontSize: '16px' }}
            />
          </div>
        )}

        <div>
          <label className="app-kicker mb-2 block">{t('summary')}</label>
          <input type="text" value={summary} onChange={e => setSummary(e.target.value)}
            placeholder="e.g. Chipotle before class" className={inputCls} style={{ fontSize: '16px' }} />
        </div>

        {entryType === 'expense' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="app-kicker mb-2 block">{t('venue')}</label>
              <input type="text" value={venue} onChange={e => setVenue(e.target.value)}
                placeholder="e.g. Chipotle" className={inputCls} style={{ fontSize: '16px' }} list="venue-list" />
            </div>
            <div>
              <label className="app-kicker mb-2 block">{t('location')}</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Madison, WI" className={inputCls} style={{ fontSize: '16px' }} list="location-list" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="app-kicker mb-2 block">{t('category')}</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={selCls} style={{ fontSize: '16px' }}>
              <option value="">{t('selectCategory')}</option>
              {cats.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="app-kicker mb-2 block">{t('remarks')}</label>
            <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)}
              placeholder="e.g. Uber, Amazon…" className={inputCls} style={{ fontSize: '16px' }} />
          </div>
        </div>

        {error && <div className="text-xs text-rose-500">{error}</div>}

        <button onClick={handleSubmit}
          className="app-button-primary mt-1 w-full">
          {t('addEntry')}
        </button>

        <datalist id="venue-list">{pastVenues.map(v => <option key={v} value={v} />)}</datalist>
        <datalist id="location-list">{pastLocations.map(l => <option key={l} value={l} />)}</datalist>
      </div>
      </div>
    </div>
  )
}
