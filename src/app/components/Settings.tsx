'use client'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CURRENCIES, Context, EXPENSE_CATEGORIES, getCurrencySymbol } from '../types'
import { useSettings, ExchangeRate } from '../useSettings'
import { useBudgets } from '../useBudgets'
import { useRecurring, RecurringItem } from '../useRecurring'
import LanguageSelector from './LanguageSelector'

export default function Settings({ userId }: { userId?: string }) {
  const { t } = useTranslation()
  const { contexts, addContext, removeContext, renameContext, rates, updateRate, activeContext } = useSettings(userId)
  const { setBudget, getBudget } = useBudgets(userId)
  const { items, addItem, updateItem, deleteItem } = useRecurring(userId)

  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [homeCurrency, setHomeCurrency] = useState('USD')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 7))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const [rateFrom, setRateFrom] = useState('KRW')
  const [rateTo, setRateTo] = useState('USD')
  const [rateVal, setRateVal] = useState('')

  const [budgetCat, setBudgetCat] = useState(EXPENSE_CATEGORIES[0])
  const [budgetAmt, setBudgetAmt] = useState('')

  const [recCategory, setRecCategory] = useState(EXPENSE_CATEGORIES[3])
  const [recAmount, setRecAmount] = useState('')
  const [recCurrency, setRecCurrency] = useState(activeContext?.currency || 'USD')
  const [recSummary, setRecSummary] = useState('')
  const [recRemarks, setRecRemarks] = useState('')
  const [editingRecId, setEditingRecId] = useState<string | null>(null)
  const [editRec, setEditRec] = useState<RecurringItem | null>(null)

  const contextRecurring = items.filter(i => i.context === activeContext?.id)

  const inputCls = "w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 outline-none text-sm"
  const selCls = "px-2 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 outline-none text-sm"

  const handleAddContext = () => {
    if (!name.trim()) return
    const ctx: Context = { id: Date.now().toString(), name: name.trim(), currency, homeCurrency, startDate }
    addContext(ctx)
    setName('')
  }

  const handleAddRecurring = () => {
    if (!recSummary.trim() || !recAmount || !activeContext) return
    const amt = parseFloat(recAmount)
    if (isNaN(amt) || amt <= 0) return
    const item: RecurringItem = {
      id: Date.now().toString(),
      context: activeContext.id,
      category: recCategory,
      amount: amt,
      currency: recCurrency,
      summary: recSummary.trim(),
      remarks: recRemarks.trim(),
    }
    addItem(item)
    setRecAmount(''); setRecSummary(''); setRecRemarks('')
  }

  const handleSaveRec = () => {
    if (!editRec) return
    const amt = parseFloat(editRec.amount.toString())
    if (isNaN(amt) || amt <= 0) return
    updateItem({ ...editRec, amount: amt })
    setEditingRecId(null); setEditRec(null)
  }

  return (
    <div className="px-4 pb-8 flex flex-col gap-6">

      {/* Language */}
      <LanguageSelector />

      {/* Contexts */}
      <div>
        <div className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-3">{t('contexts')}</div>
        <div className="flex flex-col gap-2 mb-4">
          {contexts.map((c: Context) => (
            <div key={c.id} className="bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 py-2.5">
              {editingId === c.id ? (
                <div className="flex gap-2 items-center">
                  <input value={editName} onChange={e => setEditName(e.target.value)}
                    className={inputCls} style={{ fontSize: '16px' }} autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') { renameContext(c.id, editName); setEditingId(null) } }} />
                  <button onClick={() => { renameContext(c.id, editName); setEditingId(null) }}
                    className="text-xs text-amber-500 font-medium whitespace-nowrap">{t('save')}</button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-zinc-400 whitespace-nowrap">{t('cancel')}</button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{c.name}</div>
                    <div className="text-xs text-zinc-400 mt-0.5">{c.currency}{c.currency !== c.homeCurrency ? ` → ${c.homeCurrency}` : ''} · {t('from')} {c.startDate}</div>
                  </div>
                  <div className="flex gap-3 ml-3">
                    <button onClick={() => { setEditingId(c.id); setEditName(c.name) }} className="text-xs text-amber-500">{t('rename')}</button>
                    {c.id !== 'madison' && c.id !== 'korea' && (
                      <button onClick={() => removeContext(c.id)} className="text-xs text-red-400">{t('remove')}</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-3 flex flex-col gap-2">
          <div className="text-xs text-zinc-400 mb-1">{t('newContext')}</div>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Europe Trip 2027" className={inputCls} style={{ fontSize: '16px' }} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">{t('localCurrency')}</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className={`${selCls} w-full`} style={{ fontSize: '16px' }}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">{t('homeCurrency')}</label>
              <select value={homeCurrency} onChange={e => setHomeCurrency(e.target.value)} className={`${selCls} w-full`} style={{ fontSize: '16px' }}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">{t('startDate')}</label>
            <input type="month" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} style={{ fontSize: '16px' }} />
          </div>
          <button onClick={handleAddContext} className="w-full py-2 rounded-xl bg-amber-500 text-white text-sm font-medium">{t('addContext')}</button>
        </div>
      </div>

      {/* Recurring payments */}
      <div>
        <div className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-3">{t('recurringPayments').replace('⟳ ', '')}</div>
        <p className="text-xs text-zinc-400 mb-3">{t('for', { name: activeContext?.name })}{activeContext?.name}</p>
        <div className="flex flex-col gap-2 mb-3">
          {contextRecurring.map(item => (
            <div key={item.id} className="bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 py-2.5">
              {editingRecId === item.id && editRec ? (
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">{t('summary')}</label>
                      <input value={editRec.summary} onChange={e => setEditRec({ ...editRec, summary: e.target.value })} className={inputCls} style={{ fontSize: '16px' }} />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">{t('amount')}</label>
                      <input type="number" value={editRec.amount} onChange={e => setEditRec({ ...editRec, amount: parseFloat(e.target.value) })} className={inputCls} style={{ fontSize: '16px' }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Currency</label>
                      <select value={editRec.currency} onChange={e => setEditRec({ ...editRec, currency: e.target.value })} className={`${selCls} w-full`} style={{ fontSize: '16px' }}>
                        {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">{t('category')}</label>
                      <select value={editRec.category} onChange={e => setEditRec({ ...editRec, category: e.target.value })} className={`${selCls} w-full`} style={{ fontSize: '16px' }}>
                        {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">{t('remarks')}</label>
                    <input value={editRec.remarks} onChange={e => setEditRec({ ...editRec, remarks: e.target.value })} className={inputCls} style={{ fontSize: '16px' }} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveRec} className="flex-1 py-2 rounded-xl bg-amber-500 text-white text-sm font-medium">{t('save')}</button>
                    <button onClick={() => { setEditingRecId(null); setEditRec(null) }} className="flex-1 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 text-sm">{t('cancel')}</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{item.summary}</div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      {getCurrencySymbol(item.currency)}{item.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} {item.currency} · {item.category}
                      {item.remarks ? ` · ${item.remarks}` : ''}
                    </div>
                  </div>
                  <div className="flex gap-3 ml-3">
                    <button onClick={() => { setEditingRecId(item.id); setEditRec({ ...item }) }} className="text-xs text-amber-500">{t('edit')}</button>
                    <button onClick={() => deleteItem(item.id)} className="text-xs text-red-400">{t('remove')}</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {contextRecurring.length === 0 && <div className="text-xs text-zinc-400 text-center py-3">—</div>}
        </div>
        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-3 flex flex-col gap-2">
          <div className="text-xs text-zinc-400 mb-1">{t('addEntry')}</div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">{t('summary')}</label>
            <input value={recSummary} onChange={e => setRecSummary(e.target.value)} placeholder="e.g. Monthly Rent" className={inputCls} style={{ fontSize: '16px' }} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">{t('amount')}</label>
              <input type="number" value={recAmount} onChange={e => setRecAmount(e.target.value)} placeholder="0.00" className={inputCls} style={{ fontSize: '16px' }} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Currency</label>
              <select value={recCurrency} onChange={e => setRecCurrency(e.target.value)} className={`${selCls} w-full`} style={{ fontSize: '16px' }}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">{t('category')}</label>
              <select value={recCategory} onChange={e => setRecCategory(e.target.value)} className={`${selCls} w-full`} style={{ fontSize: '16px' }}>
                {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">{t('remarks')}</label>
              <input value={recRemarks} onChange={e => setRecRemarks(e.target.value)} placeholder="e.g. Spectrum" className={inputCls} style={{ fontSize: '16px' }} />
            </div>
          </div>
          <button onClick={handleAddRecurring} className="w-full py-2 rounded-xl bg-amber-500 text-white text-sm font-medium">{t('addEntry')}</button>
        </div>
      </div>

      {/* Budgets */}
      <div>
        <div className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-3">{t('monthlyBudgets')}</div>
        <p className="text-xs text-zinc-400 mb-3">{activeContext?.name}</p>
        <div className="flex flex-col gap-2 mb-3">
          {EXPENSE_CATEGORIES.map(cat => {
            const b = activeContext ? getBudget(activeContext.id, cat) : null
            return b ? (
              <div key={cat} className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 py-2">
                <span className="text-sm text-zinc-800 dark:text-zinc-100">{cat}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-amber-600 dark:text-amber-400">{activeContext?.currency} {b.toLocaleString()}</span>
                  <button onClick={() => activeContext && setBudget(activeContext.id, cat, 0)} className="text-xs text-red-400">{t('remove')}</button>
                </div>
              </div>
            ) : null
          })}
        </div>
        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-3 flex flex-col gap-2">
          <select value={budgetCat} onChange={e => setBudgetCat(e.target.value)} className={`${selCls} w-full`} style={{ fontSize: '16px' }}>
            {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <input type="number" value={budgetAmt} onChange={e => setBudgetAmt(e.target.value)} placeholder="Monthly limit" className={inputCls} style={{ fontSize: '16px' }} />
          <button onClick={() => {
            if (!activeContext) return
            const amt = parseFloat(budgetAmt)
            if (!isNaN(amt) && amt > 0) { setBudget(activeContext.id, budgetCat, amt); setBudgetAmt('') }
          }} className="w-full py-2 rounded-xl bg-amber-500 text-white text-sm font-medium">{t('save')}</button>
        </div>
      </div>

      {/* Exchange rates */}
      <div>
        <div className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-3">{t('exchangeRates')}</div>
        <div className="flex flex-col gap-2 mb-3">
          {rates.map((r: ExchangeRate) => (
            <div key={`${r.from}-${r.to}`} className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 py-2">
              <span className="text-sm text-zinc-800 dark:text-zinc-100">1 {r.from} = {r.rate} {r.to}</span>
              <button onClick={() => { setRateFrom(r.from); setRateTo(r.to); setRateVal(r.rate.toString()) }} className="text-xs text-amber-500">{t('edit')}</button>
            </div>
          ))}
        </div>
        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-3 flex flex-col gap-2">
          <div className="text-xs text-zinc-400 mb-1">{t('addUpdateRate')}</div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-zinc-500">1</span>
            <select value={rateFrom} onChange={e => setRateFrom(e.target.value)} className={selCls} style={{ fontSize: '16px' }}>
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
            </select>
            <span className="text-xs text-zinc-500">=</span>
            <input type="number" value={rateVal} onChange={e => setRateVal(e.target.value)} placeholder="0.00" step="any" className={`${inputCls} w-28`} style={{ fontSize: '16px' }} />
            <select value={rateTo} onChange={e => setRateTo(e.target.value)} className={selCls} style={{ fontSize: '16px' }}>
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
            </select>
          </div>
          <button onClick={() => {
            const r = parseFloat(rateVal)
            if (!isNaN(r) && r > 0) { updateRate(rateFrom, rateTo, r); setRateVal('') }
          }} className="w-full py-2 rounded-xl bg-amber-500 text-white text-sm font-medium">{t('saveRate')}</button>
        </div>
      </div>

      {/* Reset */}
      <div>
        <div className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-3">{t('reset')}</div>
        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-3">
          <p className="text-xs text-zinc-400 mb-3">Clear local settings (exchange rates, theme). Contexts and entries in Google Sheets are not affected.</p>
          <button onClick={() => {
            if (confirm(t('reset') + '?')) {
              localStorage.removeItem('gagyebu-active-context')
              localStorage.removeItem('gagyebu-rates')
              localStorage.removeItem('theme')
              localStorage.removeItem('gagyebu-lang')
              window.location.reload()
            }
          }} className="w-full py-2 rounded-xl bg-red-500 text-white text-sm font-medium">{t('resetLocalSettings')}</button>
        </div>
      </div>
    </div>
  )
}
