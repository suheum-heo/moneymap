'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Entry,
  Context,
  EntrySortOrder,
  allocateTimeForNewEntry,
  getCurrencySymbol,
  CURRENCIES,
  formatAmount,
  getAmountInputProps,
  getEntryFormPlaceholders,
  getMonthLabels,
  normalizeAmountInputValue,
  parseCurrencyInput,
} from '../types'
import { RecurringItem } from '../useRecurring'
import { getContextPlaceSuggestions } from '../lib/placeSuggestions'
import { addEntryCopiesToContexts, getCopyTargetContexts } from '../lib/entryCopy'
import { getContextImportLabel } from '../lib/contextTree'
import VenueLocationFields from './VenueLocationFields'
import ActualChargedFields from './ActualChargedFields'

interface Props {
  onAdd: (e: Entry) => Promise<void> | void
  onDone: () => void
  entries?: Entry[]
  defaultDate?: string | null
  activeContext?: Context
  contexts?: Context[]
  items: RecurringItem[]
  expenseCategories: string[]
  incomeCategories: string[]
  sortOrder?: EntrySortOrder
}

function toDateStr(m: number, day: number, y: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function daysInMonth(m: number, y: number) {
  return new Date(y, m + 1, 0).getDate()
}

export default function AddEntry({ onAdd, onDone, entries = [], defaultDate, activeContext, contexts = [], items, expenseCategories, incomeCategories, sortOrder = 'newest' }: Props) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage || i18n.language
  const contextCur = activeContext?.currency || 'USD'
  const homeCur = activeContext?.homeCurrency || contextCur
  const sym = getCurrencySymbol(contextCur)

  const saved = typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem('addentry-draft') || '{}') : {}

  const initDate = defaultDate ? new Date(defaultDate + 'T12:00:00') : new Date()
  const [month, setMonth] = useState<number>(saved.month ?? initDate.getMonth())
  const [day, setDay] = useState<number>(saved.day ?? initDate.getDate())
  const [year, setYear] = useState<number>(saved.year ?? initDate.getFullYear())
  const [entryType, setEntryType] = useState<'expense' | 'income'>(saved.entryType || 'expense')
  const [amount, setAmount] = useState(saved.amount || '')
  const [currency, setCurrency] = useState(contextCur)
  const [actualCharged, setActualCharged] = useState('')
  const [actualChargedCurrency, setActualChargedCurrency] = useState(homeCur)
  const [summary, setSummary] = useState(saved.summary || '')
  const [venue, setVenue] = useState(saved.venue || '')
  const [location, setLocation] = useState(saved.location || '')
  const [category, setCategory] = useState(saved.category || '')
  const [paymentMethod, setPaymentMethod] = useState(saved.paymentMethod || '')
  const [remarks, setRemarks] = useState(saved.remarks || '')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const savingRef = useRef(false)
  const [showRecurring, setShowRecurring] = useState(false)
  const [showCurrencyOverride, setShowCurrencyOverride] = useState(false)
  const [alsoCopyEnabled, setAlsoCopyEnabled] = useState(false)
  const [copyTargetIds, setCopyTargetIds] = useState<string[]>([])
  const contextRecurring = items.filter(i => i.context === activeContext?.id && i.type === entryType)
  const copyTargets = useMemo(
    () => getCopyTargetContexts(contexts, activeContext?.id),
    [contexts, activeContext?.id],
  )

  useEffect(() => {
    if (savingRef.current || isSaving) return
    sessionStorage.setItem('addentry-draft', JSON.stringify({
      entryType, amount, summary, venue, location, category, paymentMethod, remarks,
      month, day, year,
    }))
  }, [entryType, amount, summary, venue, location, category, paymentMethod, remarks, month, day, year, isSaving])

  const cats = entryType === 'expense' ? expenseCategories : incomeCategories
  const maxDay = daysInMonth(month, year)
  const days = Array.from({ length: maxDay }, (_, i) => i + 1)
  const years = Array.from({ length: 80 }, (_, i) => 2020 + i)
  const monthLabels = getMonthLabels(language)
  const primaryAmountCurrency = showCurrencyOverride ? currency : contextCur
  const primaryAmountProps = getAmountInputProps(primaryAmountCurrency)
  const placeholders = getEntryFormPlaceholders(language, contextCur, entryType)

  useEffect(() => {
    if (!showCurrencyOverride) setCurrency(contextCur)
  }, [contextCur, showCurrencyOverride])

  useEffect(() => {
    if (!showCurrencyOverride) setActualChargedCurrency(homeCur)
  }, [homeCur, showCurrencyOverride])

  useEffect(() => {
    setAmount((prev: string) => normalizeAmountInputValue(prev, primaryAmountCurrency))
  }, [primaryAmountCurrency])

  const placeSuggestions = useMemo(
    () => getContextPlaceSuggestions(entries, activeContext?.id, items),
    [entries, activeContext?.id, items],
  )

  const handleTypeChange = (tp: 'expense' | 'income') => {
    setEntryType(tp)
    setCategory('')
    setShowRecurring(false)
  }

  const applyRecurring = (r: typeof contextRecurring[0]) => {
    setSummary(r.summary)
    setAmount(r.amount == null ? '' : r.amount.toString())
    setCategory(r.category)
    setPaymentMethod(r.paymentMethod || '')
    setRemarks(r.remarks || '')
    setCurrency(r.currency)
    setShowCurrencyOverride(r.currency !== contextCur)
    setActualCharged('')
    setActualChargedCurrency(homeCur)
    setVenue(r.venue || ''); setLocation(r.location || '')
    setShowRecurring(false)
  }

  useEffect(() => {
    const valid = new Set(copyTargets.map(context => context.id))
    setCopyTargetIds(prev => prev.filter(id => valid.has(id)))
    if (copyTargets.length === 0) setAlsoCopyEnabled(false)
  }, [copyTargets])

  const toggleCopyTarget = (id: string) => {
    setCopyTargetIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]))
  }

  const handleSubmit = async () => {
    if (savingRef.current || isSaving) return
    if (!amount) {
      setError(t('amountRequired', { amountLabel: t('amount') }))
      return
    }
    if (!summary.trim()) {
      const proceed = window.confirm(t('summaryEmptyConfirm', { summaryLabel: t('summary') }))
      if (!proceed) return
    }
    const parsed = parseCurrencyInput(amount, primaryAmountCurrency)
    if (isNaN(parsed) || parsed <= 0) { setError(t('invalidAmount')); return }
    if (!category) { setError(t('selectCategoryError')); return }
    const parsedActual = actualCharged.trim()
      ? parseCurrencyInput(actualCharged.trim(), actualChargedCurrency)
      : undefined
    if (actualCharged.trim() && (parsedActual == null || isNaN(parsedActual) || parsedActual <= 0)) {
      setError(t('invalidAmount'))
      return
    }
    if (alsoCopyEnabled && copyTargetIds.length === 0) {
      setError(t('selectCopyContextsError'))
      return
    }
    setError('')
    savingRef.current = true
    setIsSaving(true)
    // Prevent a mid-save remount from restoring the filled draft and looking like a no-op.
    sessionStorage.removeItem('addentry-draft')

    const date = toDateStr(month, day, year)
    const sameDayEntries = entries.filter(
      entry => entry.date === date && entry.context === (activeContext?.id || ''),
    )
    const createdAt = new Date().toISOString()
    const entry: Entry = {
      id: Date.now().toString(),
      type: entryType,
      date,
      time: allocateTimeForNewEntry(sameDayEntries, sortOrder),
      summary: summary.trim(),
      venue: venue.trim(),
      location: location.trim(),
      category,
      amount: parsed,
      paymentMethod: paymentMethod.trim(),
      remarks: remarks.trim(),
      currency: showCurrencyOverride ? currency : contextCur,
      context: activeContext?.id || '',
      createdAt,
      homeAmount: parsedActual,
      homeAmountCurrency: parsedActual && actualChargedCurrency !== homeCur ? actualChargedCurrency : undefined,
    }

    try {
      await onAdd(entry)
      if (alsoCopyEnabled && copyTargetIds.length > 0) {
        await addEntryCopiesToContexts(entry, copyTargetIds, [...entries, entry], onAdd, sortOrder)
      }
      setSummary(''); setAmount(''); setVenue(''); setLocation(''); setPaymentMethod(''); setRemarks('')
      setCurrency(contextCur); setShowCurrencyOverride(false); setActualCharged('')
      setAlsoCopyEnabled(false); setCopyTargetIds([])
      onDone()
    } catch (err) {
      console.error('Failed to save entry', err)
      setError(t('saveEntryFailed'))
      savingRef.current = false
      setIsSaving(false)
    }
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

      {contextRecurring.length > 0 && (
        <div className="app-panel-soft p-4 sm:p-5">
          <button onClick={() => setShowRecurring(v => !v)}
            className="flex w-full items-center justify-between rounded-[20px] border border-[#dbe8ff] bg-[#eef5ff] px-4 py-3 text-left text-sm font-medium text-[#1f5fbf] dark:border-sky-400/15 dark:bg-sky-500/10 dark:text-sky-300">
            <span>{t('recurringTransactions')}</span>
            <span>{showRecurring ? '▲' : '▼'}</span>
          </button>
          {showRecurring && (
            <div className="mt-3 flex flex-col gap-2">
              {contextRecurring.map(r => (
                <button key={r.id} onClick={() => applyRecurring(r)}
                  className="app-list-row flex w-full items-center justify-between text-left">
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-800 dark:text-zinc-100">{r.summary}</span>
                    {(r.venue || r.location) && <span className="mt-1 block truncate text-xs text-slate-400">{r.venue}{r.location ? ` · ${r.location}` : ''}</span>}
                    {r.paymentMethod && <span className="mt-1 block truncate text-xs text-slate-400">{r.paymentMethod}</span>}
                    {r.remarks && <span className="mt-1 block text-xs text-slate-400">{r.remarks}</span>}
                  </div>
                  <span className={`ml-3 text-sm font-semibold ${r.type === 'income' ? 'app-positive' : 'text-[#3182f6] dark:text-sky-300'}`}>
                    {r.amount == null ? t('amountNotSet') : `${formatAmount(r.amount, r.currency)}${r.currency !== contextCur ? ` ${r.currency}` : ''}`}
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
              {monthLabels.map((monthLabel, i) => <option key={`${monthLabel}-${i}`} value={i}>{monthLabel}</option>)}
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
            <button onClick={() => {
              setShowCurrencyOverride(v => !v)
              setCurrency(contextCur)
              setActualCharged('')
              setActualChargedCurrency(homeCur)
            }} className="text-xs font-medium text-[#3182f6] dark:text-sky-300">
              {showCurrencyOverride ? t('useDefaultCurrency') : t('differentCurrency')}
            </button>
          </div>
          <div className="flex gap-2">
            <input type="text" value={amount} onChange={e => setAmount(normalizeAmountInputValue(e.target.value, primaryAmountCurrency))}
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
          <ActualChargedFields
            amount={actualCharged}
            currency={actualChargedCurrency}
            onAmountChange={setActualCharged}
            onCurrencyChange={setActualChargedCurrency}
            inputCls={inputCls}
          />
        )}

        <div>
          <label className="app-kicker mb-2 block">{t('summary')}</label>
          <input type="text" value={summary} onChange={e => setSummary(e.target.value)}
            placeholder={placeholders.summary} className={inputCls} style={{ fontSize: '16px' }} />
          {!summary.trim() && (
            <p className="mt-1.5 text-xs text-slate-400">{t('summaryRecommended')}</p>
          )}
        </div>

        {entryType === 'expense' && (
          <VenueLocationFields
            venue={venue}
            location={location}
            onVenueChange={setVenue}
            onLocationChange={setLocation}
            placeholders={placeholders}
            inputCls={inputCls}
            venueListId="venue-list"
            locationListId="location-list"
            venueLocationOptions={placeSuggestions.venueLocationOptions}
          />
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
            <label className="app-kicker mb-2 block">{t('paymentMethod')}</label>
            <input type="text" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
              placeholder={t('paymentMethodPlaceholder')} className={inputCls} style={{ fontSize: '16px' }} list="payment-method-list" />
          </div>
        </div>

        <div>
          <label className="app-kicker mb-2 block">{t('remarks')}</label>
          <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)}
            placeholder={placeholders.remarks} className={inputCls} style={{ fontSize: '16px' }} />
        </div>

        {error && <div className="text-xs text-rose-500">{error}</div>}

        {copyTargets.length > 0 && (
          <div className="app-panel-soft space-y-3 p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={alsoCopyEnabled}
                onChange={e => {
                  setAlsoCopyEnabled(e.target.checked)
                  if (!e.target.checked) setCopyTargetIds([])
                }}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#3182f6] focus:ring-[#3182f6]"
              />
              <span>
                <span className="block text-sm font-medium text-slate-800 dark:text-zinc-100">{t('alsoAddToOtherContexts')}</span>
                <span className="mt-0.5 block text-xs text-slate-400">{t('alsoAddToOtherContextsHint')}</span>
              </span>
            </label>
            {alsoCopyEnabled && (
              <div className="flex flex-col gap-2">
                {copyTargets.map(context => {
                  const checked = copyTargetIds.includes(context.id)
                  return (
                    <label
                      key={context.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-[16px] border px-3 py-2.5 text-sm transition ${
                        checked
                          ? 'border-[#b9d4ff] bg-[#eef5ff] text-[#245ec6] dark:border-sky-400/25 dark:bg-sky-500/10 dark:text-sky-200'
                          : 'border-slate-200/80 bg-white/90 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCopyTarget(context.id)}
                        className="h-4 w-4 rounded border-slate-300 text-[#3182f6] focus:ring-[#3182f6]"
                      />
                      <span className="min-w-0 flex-1 truncate">{getContextImportLabel(context, contexts)}</span>
                      <span className="flex-shrink-0 text-xs opacity-60">{context.currency}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving}
          className="app-button-primary mt-1 w-full disabled:cursor-not-allowed disabled:opacity-60">
          {isSaving
            ? t('loading')
            : alsoCopyEnabled && copyTargetIds.length > 0
              ? t('addEntryAndCopy', { count: copyTargetIds.length })
              : t('addEntry')}
        </button>

        <datalist id="venue-list">{placeSuggestions.venues.map(v => <option key={v} value={v} />)}</datalist>
        <datalist id="location-list">{placeSuggestions.locations.map(l => <option key={l} value={l} />)}</datalist>
        <datalist id="payment-method-list">{placeSuggestions.paymentMethods.map(method => <option key={method} value={method} />)}</datalist>
      </div>
      </div>
    </div>
  )
}
