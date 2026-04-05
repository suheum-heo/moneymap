'use client'
import { useState } from 'react'
import { MAJOR_CURRENCIES } from '../types'
import { useSettings, ExchangeRate } from '../useSettings'

export default function Settings() {
  const {
    contexts, addContext, removeContext,
    rates, updateRate,
    baseCurrency, setBaseCurrency,
  } = useSettings()

  const [newContext, setNewContext] = useState('')
  const [rateFrom, setRateFrom] = useState('KRW')
  const [rateTo, setRateTo] = useState('USD')
  const [rateVal, setRateVal] = useState('')

  const inputCls = "w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 outline-none text-sm"
  const selCls = "px-2 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 outline-none text-sm"

  return (
    <div className="px-4 pb-8 flex flex-col gap-6">

      {/* Base currency */}
      <div>
        <div className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-3">Base currency</div>
        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-3 flex items-center justify-between">
          <span className="text-sm text-zinc-600 dark:text-zinc-300">Show totals in</span>
          <select value={baseCurrency} onChange={e => setBaseCurrency(e.target.value)} className={selCls}>
            {MAJOR_CURRENCIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Contexts */}
      <div>
        <div className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-3">Contexts</div>
        <div className="flex flex-col gap-2 mb-3">
          {contexts.map(c => (
            <div key={c} className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 py-2">
              <span className="text-sm text-zinc-800 dark:text-zinc-100">{c}</span>
              {c !== 'Madison' && (
                <button onClick={() => removeContext(c)} className="text-xs text-red-400 hover:text-red-500">Remove</button>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text" value={newContext} onChange={e => setNewContext(e.target.value)}
            placeholder="e.g. Korea Summer 2026"
            className={inputCls}
            onKeyDown={e => { if (e.key === 'Enter') { addContext(newContext); setNewContext('') } }}
          />
          <button onClick={() => { addContext(newContext); setNewContext('') }}
            className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-medium flex-shrink-0">
            Add
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
              <button onClick={() => {
                setRateFrom(r.from); setRateTo(r.to); setRateVal(r.rate.toString())
              }} className="text-xs text-amber-500">Edit</button>
            </div>
          ))}
        </div>
        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-3 flex flex-col gap-2">
          <div className="text-xs text-zinc-400 mb-1">Add / update rate</div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">1</span>
            <select value={rateFrom} onChange={e => setRateFrom(e.target.value)} className={selCls}>
              {MAJOR_CURRENCIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <span className="text-xs text-zinc-500">=</span>
            <input type="number" value={rateVal} onChange={e => setRateVal(e.target.value)}
              placeholder="0.00" step="any" className={`${inputCls} w-24`} />
            <select value={rateTo} onChange={e => setRateTo(e.target.value)} className={selCls}>
              {MAJOR_CURRENCIES.map(c => <option key={c}>{c}</option>)}
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
