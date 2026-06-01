'use client'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CURRENCIES, Context, EXPENSE_CATEGORIES, getCurrencySymbol } from '../types'
import { useSettings } from '../useSettings'
import { useBudgets } from '../useBudgets'
import { useRecurring, RecurringItem } from '../useRecurring'
import LanguageSelector from './LanguageSelector'
import CategorySettings from './CategorySettings'

export default function Settings() {
  const { t } = useTranslation()
  const { contexts, addContext, removeContext, updateContext, convert, activeContext, ratesUpdated } = useSettings()
  const { setBudget, getBudget } = useBudgets()
  const { items, addItem, updateItem, deleteItem } = useRecurring()

  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [homeCurrency, setHomeCurrency] = useState('USD')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 7))

  // Context edit modal state
  const [editingCtx, setEditingCtx] = useState<Context | null>(null)
  const [editCtxName, setEditCtxName] = useState('')
  const [editCtxCurrency, setEditCtxCurrency] = useState('USD')
  const [editCtxHomeCurrency, setEditCtxHomeCurrency] = useState('USD')
  const [editCtxStartDate, setEditCtxStartDate] = useState('')

  const openEditCtx = (c: Context) => {
    setEditingCtx(c)
    setEditCtxName(c.name)
    setEditCtxCurrency(c.currency)
    setEditCtxHomeCurrency(c.homeCurrency)
    setEditCtxStartDate(c.startDate)
  }

  const handleSaveCtx = () => {
    if (!editingCtx || !editCtxName.trim()) return
    updateContext({ ...editingCtx, name: editCtxName.trim(), currency: editCtxCurrency, homeCurrency: editCtxHomeCurrency, startDate: editCtxStartDate })
    setEditingCtx(null)
  }

  const [rateFrom, setRateFrom] = useState('USD')
  const [rateTo, setRateTo] = useState('KRW')

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

  const inputCls = "app-input py-3 text-sm"
  const selCls = "app-select px-3 py-2.5 text-sm"

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
    <div className="px-4 pb-8 flex flex-col gap-4">

      {/* Context edit modal */}
      {editingCtx && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-4 backdrop-blur-sm md:items-center" onClick={() => setEditingCtx(null)}>
          <div className="app-panel w-full max-w-lg p-5" onClick={e => e.stopPropagation()}>
            <div className="mb-1 flex items-center justify-between">
              <div>
                <div className="app-kicker mb-2">{t('settings')}</div>
                <span className="text-base font-semibold text-slate-900 dark:text-zinc-50">{t('editContext')}</span>
              </div>
              <button onClick={() => setEditingCtx(null)} className="text-slate-400 text-lg">✕</button>
            </div>
            <div className="mt-4">
              <label className="app-kicker block mb-2">{t('newContext')}</label>
              <input value={editCtxName} onChange={e => setEditCtxName(e.target.value)}
                className={inputCls} style={{ fontSize: '16px' }} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="app-kicker block mb-2">{t('localCurrency')}</label>
                <select value={editCtxCurrency} onChange={e => setEditCtxCurrency(e.target.value)} className={`${selCls} w-full`} style={{ fontSize: '16px' }}>
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="app-kicker block mb-2">{t('homeCurrency')}</label>
                <select value={editCtxHomeCurrency} onChange={e => setEditCtxHomeCurrency(e.target.value)} className={`${selCls} w-full`} style={{ fontSize: '16px' }}>
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="app-kicker block mb-2">{t('startDate')}</label>
              <input type="month" value={editCtxStartDate} onChange={e => setEditCtxStartDate(e.target.value)} className={inputCls} style={{ fontSize: '16px' }} />
            </div>
            <button onClick={handleSaveCtx} className="app-button-primary w-full">{t('saveChanges')}</button>
          </div>
        </div>
      )}

      <LanguageSelector />
      <CategorySettings />

      {/* Contexts */}
      <div className="app-panel p-4 sm:p-5">
        <div className="app-kicker mb-3">{t('contexts')}</div>
        <div className="flex flex-col gap-2 mb-4">
          {contexts.map((c: Context) => (
            <div key={c.id} className="app-list-row">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-800 dark:text-zinc-100">{c.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{c.currency}{c.currency !== c.homeCurrency ? ` → ${c.homeCurrency}` : ''} · {t('from')} {c.startDate}</div>
                </div>
                <div className="flex gap-3 ml-3">
                  <button onClick={() => openEditCtx(c)} className="text-xs font-medium text-[#3182f6] dark:text-sky-300">{t('edit')}</button>
                  <button onClick={() => removeContext(c.id)} className="text-xs font-medium text-rose-500 dark:text-rose-300">{t('remove')}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="app-panel-soft flex flex-col gap-3 p-4">
          <div className="app-kicker">{t('newContext')}</div>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Europe Trip 2027" className={inputCls} style={{ fontSize: '16px' }} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="app-kicker block mb-2">{t('localCurrency')}</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className={`${selCls} w-full`} style={{ fontSize: '16px' }}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="app-kicker block mb-2">{t('homeCurrency')}</label>
              <select value={homeCurrency} onChange={e => setHomeCurrency(e.target.value)} className={`${selCls} w-full`} style={{ fontSize: '16px' }}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="app-kicker block mb-2">{t('startDate')}</label>
            <input type="month" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} style={{ fontSize: '16px' }} />
          </div>
          <button onClick={handleAddContext} className="app-button-primary w-full">{t('addContext')}</button>
        </div>
      </div>

      {/* Recurring payments */}
      <div className="app-panel p-4 sm:p-5">
        <div className="app-kicker mb-3">{t('recurringPayments').replace('⟳ ', '')}</div>
        <p className="text-xs text-slate-400 mb-3">{activeContext?.name}</p>
        <div className="flex flex-col gap-2 mb-3">
          {contextRecurring.map(item => (
            <div key={item.id} className="app-list-row">
              {editingRecId === item.id && editRec ? (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="app-kicker block mb-2">{t('summary')}</label>
                      <input value={editRec.summary} onChange={e => setEditRec({ ...editRec, summary: e.target.value })} className={inputCls} style={{ fontSize: '16px' }} />
                    </div>
                    <div>
                      <label className="app-kicker block mb-2">{t('amount')}</label>
                      <input type="number" value={editRec.amount} onChange={e => setEditRec({ ...editRec, amount: parseFloat(e.target.value) })} className={inputCls} style={{ fontSize: '16px' }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="app-kicker block mb-2">Currency</label>
                      <select value={editRec.currency} onChange={e => setEditRec({ ...editRec, currency: e.target.value })} className={`${selCls} w-full`} style={{ fontSize: '16px' }}>
                        {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="app-kicker block mb-2">{t('category')}</label>
                      <select value={editRec.category} onChange={e => setEditRec({ ...editRec, category: e.target.value })} className={`${selCls} w-full`} style={{ fontSize: '16px' }}>
                        {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="app-kicker block mb-2">{t('remarks')}</label>
                    <input value={editRec.remarks} onChange={e => setEditRec({ ...editRec, remarks: e.target.value })} className={inputCls} style={{ fontSize: '16px' }} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveRec} className="app-button-primary flex-1">{t('save')}</button>
                    <button onClick={() => { setEditingRecId(null); setEditRec(null) }} className="app-button-secondary flex-1">{t('cancel')}</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-800 dark:text-zinc-100">{item.summary}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {getCurrencySymbol(item.currency)}{item.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} {item.currency} · {item.category}
                      {item.remarks ? ` · ${item.remarks}` : ''}
                    </div>
                  </div>
                  <div className="flex gap-3 ml-3">
                    <button onClick={() => { setEditingRecId(item.id); setEditRec({ ...item }) }} className="text-xs font-medium text-[#3182f6] dark:text-sky-300">{t('edit')}</button>
                    <button onClick={() => deleteItem(item.id)} className="text-xs font-medium text-rose-500 dark:text-rose-300">{t('remove')}</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {contextRecurring.length === 0 && <div className="app-panel-soft py-8 text-center text-xs text-slate-400">—</div>}
        </div>
        <div className="app-panel-soft flex flex-col gap-3 p-4">
          <div className="app-kicker">Add recurring</div>
          <div>
            <label className="app-kicker block mb-2">{t('summary')}</label>
            <input value={recSummary} onChange={e => setRecSummary(e.target.value)} placeholder="e.g. Monthly Rent" className={inputCls} style={{ fontSize: '16px' }} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="app-kicker block mb-2">{t('amount')}</label>
              <input type="number" value={recAmount} onChange={e => setRecAmount(e.target.value)} placeholder="0.00" className={inputCls} style={{ fontSize: '16px' }} />
            </div>
            <div>
              <label className="app-kicker block mb-2">Currency</label>
              <select value={recCurrency} onChange={e => setRecCurrency(e.target.value)} className={`${selCls} w-full`} style={{ fontSize: '16px' }}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="app-kicker block mb-2">{t('category')}</label>
              <select value={recCategory} onChange={e => setRecCategory(e.target.value)} className={`${selCls} w-full`} style={{ fontSize: '16px' }}>
                {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="app-kicker block mb-2">{t('remarks')}</label>
              <input value={recRemarks} onChange={e => setRecRemarks(e.target.value)} placeholder="e.g. Spectrum" className={inputCls} style={{ fontSize: '16px' }} />
            </div>
          </div>
          <button onClick={handleAddRecurring} className="app-button-primary w-full">{t('addEntry')}</button>
        </div>
      </div>

      {/* Budgets */}
      <div className="app-panel p-4 sm:p-5">
        <div className="app-kicker mb-3">{t('monthlyBudgets')}</div>
        <p className="text-xs text-slate-400 mb-3">{activeContext?.name}</p>
        <div className="flex flex-col gap-2 mb-3">
          {EXPENSE_CATEGORIES.map(cat => {
            const b = activeContext ? getBudget(activeContext.id, cat) : null
            return b ? (
              <div key={cat} className="app-list-row flex items-center justify-between !py-3">
                <span className="text-sm text-slate-800 dark:text-zinc-100">{cat}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[#3182f6] dark:text-sky-300">{activeContext?.currency} {b.toLocaleString()}</span>
                  <button onClick={() => activeContext && setBudget(activeContext.id, cat, 0)} className="text-xs font-medium text-rose-500 dark:text-rose-300">{t('remove')}</button>
                </div>
              </div>
            ) : null
          })}
        </div>
        <div className="app-panel-soft flex flex-col gap-3 p-4">
          <select value={budgetCat} onChange={e => setBudgetCat(e.target.value)} className={`${selCls} w-full`} style={{ fontSize: '16px' }}>
            {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <input type="number" value={budgetAmt} onChange={e => setBudgetAmt(e.target.value)} placeholder="Monthly limit" className={inputCls} style={{ fontSize: '16px' }} />
          <button onClick={() => {
            if (!activeContext) return
            const amt = parseFloat(budgetAmt)
            if (!isNaN(amt) && amt > 0) { setBudget(activeContext.id, budgetCat, amt); setBudgetAmt('') }
          }} className="app-button-primary w-full">{t('save')}</button>
        </div>
      </div>

      {/* Exchange rates */}
      <div className="app-panel p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="app-kicker">{t('exchangeRates')}</div>
          {ratesUpdated && <div className="text-xs text-slate-400">Updated {ratesUpdated.toLocaleTimeString()}</div>}
        </div>
        <div className="app-panel-soft p-4">
          <div className="flex items-center gap-2 mb-3">
            <select value={rateFrom} onChange={e => setRateFrom(e.target.value)} className={`${selCls} flex-1`} style={{ fontSize: '16px' }}>
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
            </select>
            <span className="text-zinc-400 text-sm flex-shrink-0">→</span>
            <select value={rateTo} onChange={e => setRateTo(e.target.value)} className={`${selCls} flex-1`} style={{ fontSize: '16px' }}>
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
            </select>
          </div>
          {rateFrom !== rateTo && (
            <div className="text-lg font-semibold text-slate-800 dark:text-zinc-100">
              1 {rateFrom} = {convert(1, rateFrom, rateTo).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {rateTo}
            </div>
          )}
        </div>
      </div>

      {/* Reset */}
      <div className="app-panel p-4 sm:p-5">
        <div className="app-kicker mb-3">{t('reset')}</div>
        <div className="app-panel-soft p-4">
          <p className="text-xs text-slate-400 mb-3">Clear local settings (exchange rates, theme). Your data in Supabase is not affected.</p>
          <button onClick={() => {
            if (confirm(t('reset') + '?')) {
              localStorage.removeItem('gagyebu-active-context')
              localStorage.removeItem('gagyebu-rates')
              localStorage.removeItem('gagyebu-rates-timestamp')
              localStorage.removeItem('theme')
              localStorage.removeItem('gagyebu-lang')
              window.location.reload()
            }
          }} className="app-button-danger w-full">{t('resetLocalSettings')}</button>
        </div>
      </div>

    </div>
  )
}
