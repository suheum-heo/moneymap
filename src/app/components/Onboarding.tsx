'use client'
import { useState } from 'react'
import { CURRENCIES, getCurrencySymbol } from '../types'

interface Props {
  onDone: (ctx: { name: string; currency: string; homeCurrency: string; startDate: string }) => void
}

export default function Onboarding({ onDone }: Props) {
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [homeCurrency, setHomeCurrency] = useState('USD')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 7))
  const [error, setError] = useState('')

  const handleSubmit = () => {
    if (!name.trim()) { setError('Please enter a name for your budget'); return }
    onDone({ name: name.trim(), currency, homeCurrency, startDate })
  }

  const selCls = "w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 outline-none text-sm"
  const inputCls = "w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 outline-none focus:border-amber-400 text-sm"

  return (
    <div className="min-h-screen bg-[#fafaf8] dark:bg-[#0f0f0d] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">가계부</h1>
          <p className="text-zinc-400 text-sm">Let's set up your first budget</p>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Budget name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Seoul 2026, NYC Life, Student Budget"
              className={inputCls} style={{ fontSize: '16px' }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            <p className="text-xs text-zinc-400 mt-1">You can add more budgets later in Settings</p>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Local currency</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)} className={selCls} style={{ fontSize: '16px' }}>
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>)}
            </select>
            <p className="text-xs text-zinc-400 mt-1">The currency you spend in day-to-day</p>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Home currency</label>
            <select value={homeCurrency} onChange={e => setHomeCurrency(e.target.value)} className={selCls} style={{ fontSize: '16px' }}>
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>)}
            </select>
            <p className="text-xs text-zinc-400 mt-1">Used to show converted totals (can be same as local)</p>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">Start from</label>
            <input type="month" value={startDate} onChange={e => setStartDate(e.target.value)}
              className={inputCls} style={{ fontSize: '16px' }} />
          </div>

          {error && <div className="text-xs text-red-500">{error}</div>}

          <button onClick={handleSubmit}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-colors mt-2">
            Get started
          </button>
        </div>
      </div>
    </div>
  )
}
