'use client'
import { useState } from 'react'
import { CURRENCIES, Context } from '../types'
import { useSettings, ExchangeRate } from '../useSettings'

export default function Settings() {
  const { contexts, addContext, removeContext, rates, updateRate } = useSettings()

  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [homeCurrency, setHomeCurrency] = useState('USD')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 7))

  const [rateFrom, setRateFrom] = useState('KRW')
  const [rateTo, setRateTo] = useState('USD')
  const [rateVal, setRateVal] = useState('')

  const inputCls = "w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 outline-none text-sm"
  const selCls = "px-2 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 outline-none text-sm"

  const handleAddContext = () => {
    if (!name.trim()) return
    const ctx: Context = {
      id: Date.now().toString(),
      name: name.trim(),
      currency,
      homeCurrency,
      startDate,
    }
    addContext(ctx)
    setName('')
  }

  return (
    <div className="px-4 pb-8 flex flex-col gap-6">

      {/* Contexts */}
      <div>
        <div className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-3">Contexts</div>
        <div className="flex flex-col gap-2 mb-4">
          {contexts.map((c: Context) => (
            <div key={c.id} className="bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 py-2.5 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{c.name}</div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  {c.currency}{c.currency !== c.homeCurrency ? ` → ${c.homeCurrency}` : ''} · from {c.startDate}
                </div>
              </div>
              {c.id !== 'madison' && c.id !== 'korea' && (
                <button onClick={() => removeContext(c.id)} className="text-xs text-red-400 hover:text-red-500 ml-3">Remove</button>
              )}
            </div>
          ))}
        </div>

        {/* Add context form */}
        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-3 flex flex-col gap-2">
          <div className="text-xs text-zinc-400 mb-1">New context</div>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Europe Trip 2027" className={inputCls} style={{fontSize:'16px'}} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Local currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className={`${selCls} w-full`} style={{fontSize:'16px'}}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Home currency</label>
              <select value={homeCurrency} onChange={e => setHomeCurrency(e.target.value)} className={`${selCls} w-full`} style={{fontSize:'16px'}}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Start date</label>
            <input type="month" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} style={{fontSize:'16px'}} />
          </div>
          <button onClick={handleAddContext}
            className="w-full py-2 rounded-xl bg-amber-500 text-white text-sm font-medium">
            Add context
          </button>
        </div>
      </div>

      {/* Exchange rates */}
      <div>
        <div className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-3">Exchange rates</div>
        <div className="flex flex-col gap-2 mb-3">
          {rates.map((r: ExchangeRate) => (
            <div key={`${r.from}-${r.to}`} className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 py-2">
              <span className="text-sm text-zinc-800 dark:text-zinc-100">1 {r.from} = {r.rate} {r.to}</span>
              <button onClick={() => { setRateFrom(r.from); setRateTo(r.to); setRateVal(r.rate.toString()) }}
                className="text-xs text-amber-500">Edit</button>
            </div>
          ))}
        </div>
        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-3 flex flex-col gap-2">
          <div className="text-xs text-zinc-400 mb-1">Add / update rate</div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-zinc-500">1</span>
            <select value={rateFrom} onChange={e => setRateFrom(e.target.value)} className={selCls} style={{fontSize:'16px'}}>
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
            </select>
            <span className="text-xs text-zinc-500">=</span>
            <input type="number" value={rateVal} onChange={e => setRateVal(e.target.value)}
              placeholder="0.00" step="any" className={`${inputCls} w-28`} style={{fontSize:'16px'}} />
            <select value={rateTo} onChange={e => setRateTo(e.target.value)} className={selCls} style={{fontSize:'16px'}}>
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
            </select>
          </div>
          <button onClick={() => {
            const r = parseFloat(rateVal)
            if (!isNaN(r) && r > 0) { updateRate(rateFrom, rateTo, r); setRateVal('') }
          }} className="w-full py-2 rounded-xl bg-amber-500 text-white text-sm font-medium">
            Save rate
          </button>
        </div>
      </div>
    </div>
  )
}
