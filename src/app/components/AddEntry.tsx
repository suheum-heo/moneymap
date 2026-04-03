'use client'
import { useState } from 'react'
import { Entry, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../types'

interface Props { onAdd: (e: Entry) => void; onDone: () => void }

export default function AddEntry({ onAdd, onDone }: Props) {
  const [entryType, setEntryType] = useState<'expense' | 'income'>('expense')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState('')
  const [summary, setSummary] = useState('')
  const [venue, setVenue] = useState('')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[3])
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState('')

  const cats = entryType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

  const handleTypeChange = (t: 'expense' | 'income') => {
    setEntryType(t)
    setCategory(t === 'expense' ? EXPENSE_CATEGORIES[3] : INCOME_CATEGORIES[0])
  }

  const handleSubmit = () => {
    if (!date || !amount || !summary.trim()) {
      setError('Please fill in date, amount, and summary.')
      return
    }
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) { setError('Enter a valid amount.'); return }
    setError('')
    onAdd({
      id: Date.now().toString(),
      type: entryType,
      date,
      summary: summary.trim(),
      venue: venue.trim(),
      location: location.trim(),
      category,
      amount: parsed,
      remarks: remarks.trim(),
    })
    setSummary(''); setAmount(''); setVenue(''); setLocation(''); setRemarks('')
    onDone()
  }

  const inputCls = "w-full text-sm px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 outline-none focus:border-zinc-400 dark:focus:border-zinc-500"

  return (
    <div className="px-4 pb-8">
      {/* Toggle */}
      <div className="flex gap-2 mb-5">
        {(['expense', 'income'] as const).map(t => (
          <button key={t} onClick={() => handleTypeChange(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${entryType === t
              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
              : 'bg-transparent border-zinc-200 dark:border-zinc-700 text-zinc-500'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Amount ($)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" step="0.01" className={inputCls} />
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Summary</label>
          <input type="text" value={summary} onChange={e => setSummary(e.target.value)} placeholder="e.g. Chipotle before class" className={inputCls} />
        </div>

        {entryType === 'expense' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Venue</label>
              <input type="text" value={venue} onChange={e => setVenue(e.target.value)} placeholder="e.g. Chipotle" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Location</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Madison, WI" className={inputCls} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
              {cats.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Remarks</label>
            <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="e.g. Amazon, Uber…" className={inputCls} />
          </div>
        </div>

        {error && <div className="text-xs text-red-500">{error}</div>}

        <button onClick={handleSubmit}
          className="w-full py-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium mt-1">
          Add entry
        </button>
      </div>
    </div>
  )
}
