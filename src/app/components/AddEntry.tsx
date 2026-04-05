'use client'
import { useState } from 'react'
import { Entry, EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCurrencySymbol, CURRENCIES } from '../types'
import { useSettings } from '../useSettings'
import { useRecurring } from '../useRecurring'

interface Props { onAdd: (e: Entry) => void; onDone: () => void; entries?: Entry[] }

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function todayParts() {
  const d = new Date()
  return { m: d.getMonth(), day: d.getDate(), y: d.getFullYear() }
}

function toDateStr(m: number, day: number, y: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function daysInMonth(m: number, y: number) {
  return new Date(y, m + 1, 0).getDate()
}

export default function AddEntry({ onAdd, onDone, entries = [] }: Props) {
  const { activeContext } = useSettings()
  const { items } = useRecurring()
  const contextCur = activeContext?.currency || 'USD'
  const sym = getCurrencySymbol(contextCur)

  const contextRecurring = items.filter(i => i.context === activeContext?.id)

  const init = todayParts()
  const [month, setMonth] = useState(init.m)
  const [day, setDay] = useState(init.day)
  const [year, setYear] = useState(init.y)
  const [entryType, setEntryType] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(contextCur)
  const [summary, setSummary] = useState('')
  const [venue, setVenue] = useState('')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[3])
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState('')
  const [showRecurring, setShowRecurring] = useState(false)
  const [showCurrencyOverride, setShowCurrencyOverride] = useState(false)

  const cats = entryType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
  const maxDay = daysInMonth(month, year)
  const days = Array.from({ length: maxDay }, (_, i) => i + 1)
  const years = Array.from({ length: 80 }, (_, i) => 2020 + i)

  const pastVenues = [...new Set(entries.map(e => e.venue).filter(Boolean))].sort()
  const pastLocations = [...new Set(entries.map(e => e.location).filter(Boolean))].sort()

  const handleTypeChange = (t: 'expense' | 'income') => {
    setEntryType(t)
    setCategory(t === 'expense' ? EXPENSE_CATEGORIES[3] : INCOME_CATEGORIES[0])
    setShowRecurring(false)
  }

  const applyRecurring = (r: typeof contextRecurring[0]) => {
    setSummary(r.summary)
    setAmount(r.amount.toString())
    setCategory(r.category)
    setRemarks(r.remarks || '')
    setCurrency(r.currency)
    setShowCurrencyOverride(r.currency !== contextCur)
    setVenue('')
    setLocation('')
    setShowRecurring(false)
  }

  const handleSubmit = () => {
    if (!amount || !summary.trim()) { setError('Please fill in amount and summary.'); return }
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) { setError('Enter a valid amount.'); return }
    setError('')
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
      currency,
      context: activeContext?.id || 'madison',
    })
    setSummary(''); setAmount(''); setVenue(''); setLocation(''); setRemarks('')
    setCurrency(contextCur); setShowCurrencyOverride(false)
    onDone()
  }

  const selCls = "w-full px-2 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 outline-none text-sm"
  const inputCls = "w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 outline-none focus:border-amber-400 dark:focus:border-amber-500"

  return (
    <div className="px-4 pb-8">
      <div className="flex gap-2 mb-4">
        {(['expense', 'income'] as const).map(t => (
          <button key={t} onClick={() => handleTypeChange(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${entryType === t
              ? 'bg-amber-500 text-white border-amber-500'
              : 'bg-transparent border-zinc-200 dark:border-zinc-700 text-zinc-500'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {entryType === 'expense' && contextRecurring.length > 0 && (
        <div className="mb-4">
          <button onClick={() => setShowRecurring(v => !v)}
            className="text-xs text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900 rounded-lg px-3 py-1.5 w-full text-left flex justify-between items-center bg-amber-50 dark:bg-amber-950/30">
            <span>⟳ Recurring payments</span>
            <span>{showRecurring ? '▲' : '▼'}</span>
          </button>
          {showRecurring && (
            <div className="mt-2 flex flex-col gap-1.5">
              {contextRecurring.map(r => (
                <button key={r.id} onClick={() => applyRecurring(r)}
                  className="flex justify-between items-center px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-left w-full">
                  <div>
                    <span className="text-sm text-zinc-800 dark:text-zinc-100">{r.summary}</span>
                    {r.remarks && <span className="text-xs text-zinc-400 ml-1.5">{r.remarks}</span>}
                  </div>
                  <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                    {getCurrencySymbol(r.currency)}{r.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} {r.currency !== contextCur ? r.currency : ''}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Date</label>
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
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-zinc-400">Amount ({showCurrencyOverride ? currency : contextCur} {showCurrencyOverride ? getCurrencySymbol(currency) : sym})</label>
            <button onClick={() => { setShowCurrencyOverride(v => !v); setCurrency(contextCur) }}
              className="text-xs text-amber-500">
              {showCurrencyOverride ? 'Use default currency' : 'Different currency?'}
            </button>
          </div>
          <div className="flex gap-2">
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0.00" step="0.01" inputMode="decimal" className={inputCls} style={{ fontSize: '16px' }} />
            {showCurrencyOverride && (
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="px-2 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 outline-none text-sm flex-shrink-0"
                style={{ fontSize: '16px' }}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
              </select>
            )}
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Summary</label>
          <input type="text" value={summary} onChange={e => setSummary(e.target.value)}
            placeholder="e.g. Chipotle before class" className={inputCls} style={{ fontSize: '16px' }} />
        </div>

        {entryType === 'expense' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Venue</label>
              <input type="text" value={venue} onChange={e => setVenue(e.target.value)}
                placeholder="e.g. Chipotle" className={inputCls} style={{ fontSize: '16px' }} list="venue-list" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Location</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Madison, WI" className={inputCls} style={{ fontSize: '16px' }} list="location-list" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={selCls} style={{ fontSize: '16px' }}>
              {cats.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Remarks</label>
            <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)}
              placeholder="e.g. Amazon, Uber…" className={inputCls} style={{ fontSize: '16px' }} />
          </div>
        </div>

        {error && <div className="text-xs text-red-500">{error}</div>}

        <button onClick={handleSubmit}
          className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium mt-1 transition-colors">
          Add entry
        </button>

        <datalist id="venue-list">{pastVenues.map(v => <option key={v} value={v} />)}</datalist>
        <datalist id="location-list">{pastLocations.map(l => <option key={l} value={l} />)}</datalist>
      </div>
    </div>
  )
}
