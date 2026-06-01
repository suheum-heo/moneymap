'use client'
import { useState } from 'react'
import { CURRENCIES } from '../types'

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

  const selCls = "app-select w-full px-3 py-2.5 text-sm"
  const inputCls = "app-input py-3 text-sm"

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="app-panel px-6 py-7">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-indigo-50 text-2xl text-indigo-500 shadow-[0_18px_28px_-20px_rgba(92,108,255,0.45)] dark:bg-indigo-500/15 dark:text-indigo-300">◎</div>
            <h1 className="mb-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">가계부</h1>
            <p className="text-sm text-zinc-400">Let's set up your first budget</p>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="app-kicker mb-2 block">Budget name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Seoul 2026, NYC Life, Student Budget"
                className={inputCls} style={{ fontSize: '16px' }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
              <p className="text-xs text-zinc-400 mt-1">You can add more budgets later in Settings</p>
            </div>

            <div>
              <label className="app-kicker mb-2 block">Local currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className={selCls} style={{ fontSize: '16px' }}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>)}
              </select>
              <p className="text-xs text-zinc-400 mt-1">The currency you spend in day-to-day</p>
            </div>

            <div>
              <label className="app-kicker mb-2 block">Home currency</label>
              <select value={homeCurrency} onChange={e => setHomeCurrency(e.target.value)} className={selCls} style={{ fontSize: '16px' }}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>)}
              </select>
              <p className="text-xs text-zinc-400 mt-1">Used to show converted totals (can be same as local)</p>
            </div>

            <div>
              <label className="app-kicker mb-2 block">Start from</label>
              <input type="month" value={startDate} onChange={e => setStartDate(e.target.value)}
                className={inputCls} style={{ fontSize: '16px' }} />
            </div>

            {error && <div className="text-xs text-red-500">{error}</div>}

            <button onClick={handleSubmit}
              className="app-button-primary mt-2 w-full">
              Get started
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
