'use client'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import {
  CURRENCIES,
  Context,
  EntryType,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  formatAmount,
  formatAmountValue,
  formatLocaleTime,
  formatMonthYear,
  getAmountInputProps,
  getCategoryBadgeStyle,
  getCategoryColor,
  normalizeAmountInputValue,
  parseCurrencyInput,
} from '../types'
import { RecurringItem } from '../useRecurring'
import { Category } from '../useCategories'
import LanguageSelector from './LanguageSelector'
import CategorySettings from './CategorySettings'
import LocalizedMonthPicker from './LocalizedMonthPicker'

interface Props {
  userEmail: string
  contexts: Context[]
  addContext: (ctx: Context) => void
  removeContext: (id: string) => void
  updateContext: (ctx: Context) => void
  convert: (amount: number, from: string, to: string) => number
  activeContext?: Context
  ratesUpdated: Date | null
  setBudget: (context: string, category: string, amount: number) => void
  getBudget: (context: string, category: string) => number | null
  items: RecurringItem[]
  addItem: (item: RecurringItem) => void
  updateItem: (item: RecurringItem) => void
  deleteItem: (id: string) => void
  categories: Category[]
  expenseCategories: string[]
  incomeCategories: string[]
  addCategory: (name: string, type: 'expense' | 'income') => void
  updateCategory: (id: string, name: string) => void | Promise<void>
  removeCategory: (id: string) => void
}

export default function Settings({ userEmail, contexts, addContext, removeContext, updateContext, convert, activeContext, ratesUpdated, setBudget, getBudget, items, addItem, updateItem, deleteItem, categories, expenseCategories, incomeCategories, addCategory, updateCategory, removeCategory }: Props) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage || i18n.language
  const expenseCategoryOptions = expenseCategories.length > 0 ? expenseCategories : EXPENSE_CATEGORIES
  const incomeCategoryOptions = incomeCategories.length > 0 ? incomeCategories : INCOME_CATEGORIES
  const getRecurringCategoryOptions = (type: EntryType, currentCategory?: string) => {
    const options = type === 'expense' ? expenseCategoryOptions : incomeCategoryOptions
    return currentCategory && !options.includes(currentCategory) ? [currentCategory, ...options] : options
  }
  const getDefaultRecurringCategory = (type: EntryType) => (
    getRecurringCategoryOptions(type)[0] || (type === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0])
  )

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

  const [budgetCat, setBudgetCat] = useState(expenseCategoryOptions[0] || EXPENSE_CATEGORIES[0])
  const [budgetAmt, setBudgetAmt] = useState('')

  const [recType, setRecType] = useState<EntryType>('expense')
  const [recCategory, setRecCategory] = useState(getDefaultRecurringCategory('expense'))
  const [recAmount, setRecAmount] = useState('')
  const [recCurrency, setRecCurrency] = useState(activeContext?.currency || 'USD')
  const [recSummary, setRecSummary] = useState('')
  const [recRemarks, setRecRemarks] = useState('')
  const [editingRecId, setEditingRecId] = useState<string | null>(null)
  const [editRec, setEditRec] = useState<RecurringItem | null>(null)
  const [editRecAmount, setEditRecAmount] = useState('')
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)
  const [deleteConfirmWord, setDeleteConfirmWord] = useState('')
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('')
  const [deleteAccountError, setDeleteAccountError] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)

  const contextRecurring = items.filter(i => i.context === activeContext?.id)
  const recCategoryOptions = getRecurringCategoryOptions(recType, recCategory)
  const recurringAmountProps = getAmountInputProps(recCurrency)
  const budgetAmountProps = getAmountInputProps(activeContext?.currency || 'USD')
  const editRecurringAmountProps = getAmountInputProps(editRec?.currency || activeContext?.currency || 'USD')
  const deleteKeyword = t('deleteAccountKeyword')
  const requiresEmailConfirmation = Boolean(userEmail)
  const deleteWordMatches = deleteConfirmWord.trim().toUpperCase() === deleteKeyword.toUpperCase()
  const deleteEmailMatches = !requiresEmailConfirmation || deleteConfirmEmail.trim().toLowerCase() === userEmail.trim().toLowerCase()
  const canDeleteAccount = deleteWordMatches && deleteEmailMatches && !deletingAccount

  useEffect(() => {
    if (activeContext?.currency) setRecCurrency(activeContext.currency)
  }, [activeContext?.currency])

  useEffect(() => {
    if (!expenseCategoryOptions.length) return
    if (!expenseCategoryOptions.includes(budgetCat)) setBudgetCat(expenseCategoryOptions[0])
  }, [budgetCat, expenseCategoryOptions])

  useEffect(() => {
    const options = getRecurringCategoryOptions(recType)
    if (!options.length) return
    if (!options.includes(recCategory)) setRecCategory(options[0])
  }, [expenseCategoryOptions, incomeCategoryOptions, recCategory, recType])

  const inputCls = "app-input py-3 text-sm"
  const selCls = "app-select px-3 py-2.5 text-sm"

  const handleAddContext = () => {
    if (!name.trim()) return
    const ctx: Context = { id: Date.now().toString(), name: name.trim(), currency, homeCurrency, startDate }
    addContext(ctx)
    setName('')
  }

  const handleRecurringTypeChange = (type: EntryType) => {
    setRecType(type)
    setRecCategory(getDefaultRecurringCategory(type))
  }

  const handleAddRecurring = async () => {
    if (!recSummary.trim() || !activeContext || !recCategory) return
    const amt = recAmount.trim() ? parseCurrencyInput(recAmount, recCurrency) : null
    if (amt != null && (isNaN(amt) || amt <= 0)) return
    const item: RecurringItem = {
      id: `rec_${recType}_${Date.now()}`,
      type: recType,
      context: activeContext.id,
      category: recCategory,
      amount: amt,
      currency: recCurrency,
      summary: recSummary.trim(),
      remarks: recRemarks.trim(),
    }
    try {
      await addItem(item)
      setRecAmount(''); setRecSummary(''); setRecRemarks('')
    } catch {}
  }

  const handleSaveRec = async () => {
    if (!editRec) return
    const amt = editRecAmount.trim() ? parseCurrencyInput(editRecAmount, editRec.currency) : null
    if (amt != null && (isNaN(amt) || amt <= 0)) return
    try {
      await updateItem({ ...editRec, amount: amt })
      setEditingRecId(null); setEditRec(null); setEditRecAmount('')
    } catch {}
  }

  const handleDeleteAccount = async () => {
    if (!canDeleteAccount) return

    setDeletingAccount(true)
    setDeleteAccountError('')

    try {
      const { data, error } = await supabase.auth.getSession()
      const accessToken = data.session?.access_token
      if (error || !accessToken) {
        setDeleteAccountError(t('deleteAccountMissingSession'))
        setDeletingAccount(false)
        return
      }

      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!res.ok) {
        setDeleteAccountError(t('deleteAccountFailed'))
        setDeletingAccount(false)
        return
      }

      try {
        localStorage.removeItem('gagyebu-active-context')
        localStorage.removeItem('gagyebu-rates')
        localStorage.removeItem('gagyebu-rates-timestamp')
        localStorage.removeItem('gagyebu-entry-sort-order')
        localStorage.removeItem('theme')
        localStorage.removeItem('gagyebu-lang')
        sessionStorage.removeItem('addentry-draft')
      } catch {}

      await supabase.auth.signOut()
      window.location.href = '/'
    } catch {
      setDeleteAccountError(t('deleteAccountFailed'))
      setDeletingAccount(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 px-4 pb-6">

      {deleteAccountOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 backdrop-blur-sm md:items-center" onClick={() => !deletingAccount && setDeleteAccountOpen(false)}>
          <div className="app-panel w-full max-w-lg p-5" onClick={e => e.stopPropagation()}>
            <div className="mb-1 flex items-center justify-between">
              <div>
                <div className="app-kicker mb-2 text-rose-400 dark:text-rose-300">{t('dangerZone')}</div>
                <span className="text-base font-semibold text-slate-900 dark:text-zinc-50">{t('deleteAccountModalTitle')}</span>
              </div>
              <button onClick={() => !deletingAccount && setDeleteAccountOpen(false)} className="text-slate-400 text-lg">✕</button>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-zinc-300">{t('deleteAccountModalDescription')}</p>
            <div className="mt-4 rounded-[22px] border border-rose-200/75 bg-rose-50/80 p-4 dark:border-rose-400/20 dark:bg-rose-500/10">
              <div className="text-sm font-medium text-rose-500 dark:text-rose-300">{t('deleteAccountWarning')}</div>
              <div className="mt-2 text-xs leading-5 text-rose-400 dark:text-rose-200/80">{t('deleteAccountWarningBody')}</div>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label className="app-kicker mb-2 block">{t('deleteAccountTypeDeleteLabel', { keyword: deleteKeyword })}</label>
                <input
                  value={deleteConfirmWord}
                  onChange={e => setDeleteConfirmWord(e.target.value)}
                  placeholder={deleteKeyword}
                  className={inputCls}
                  style={{ fontSize: '16px' }}
                  autoFocus
                />
              </div>
              {requiresEmailConfirmation && (
                <div>
                  <label className="app-kicker mb-2 block">{t('deleteAccountTypeEmailLabel', { email: userEmail })}</label>
                  <input
                    value={deleteConfirmEmail}
                    onChange={e => setDeleteConfirmEmail(e.target.value)}
                    placeholder={userEmail}
                    className={inputCls}
                    style={{ fontSize: '16px' }}
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </div>
              )}
              {deleteAccountError ? <div className="text-xs text-rose-500">{deleteAccountError}</div> : null}
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setDeleteAccountOpen(false)} className="app-button-secondary flex-1" disabled={deletingAccount}>{t('cancel')}</button>
              <button onClick={handleDeleteAccount} className="app-button-danger flex-1 disabled:cursor-not-allowed disabled:opacity-60" disabled={!canDeleteAccount}>
                {deletingAccount ? t('deleteAccountDeleting') : t('deleteAccountAction')}
              </button>
            </div>
          </div>
        </div>
      )}

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
              <LocalizedMonthPicker value={editCtxStartDate} onChange={setEditCtxStartDate} placeholder={t('startDate')} />
            </div>
            <button onClick={handleSaveCtx} className="app-button-primary w-full">{t('saveChanges')}</button>
          </div>
        </div>
      )}

      <LanguageSelector />
      <CategorySettings categories={categories} addCategory={addCategory} updateCategory={updateCategory} removeCategory={removeCategory} />

      {/* Contexts */}
      <div className="app-panel p-4">
        <div className="app-kicker mb-3">{t('contexts')}</div>
        <div className="flex flex-col gap-2 mb-4">
          {contexts.map((c: Context) => (
            <div key={c.id} className="app-list-row">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-800 dark:text-zinc-100">{c.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{c.currency}{c.currency !== c.homeCurrency ? ` → ${c.homeCurrency}` : ''} · {t('from')} {formatMonthYear(c.startDate, language)}</div>
                </div>
                <div className="flex gap-3 ml-3">
                  <button onClick={() => openEditCtx(c)} className="app-accent text-xs font-medium">{t('edit')}</button>
                  <button onClick={() => removeContext(c.id)} className="text-xs font-medium text-rose-400 dark:text-rose-300">{t('remove')}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="app-panel-soft flex flex-col gap-3 p-3.5">
          <div className="app-kicker">{t('newContext')}</div>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder={t('contextExamplePlaceholder')} className={inputCls} style={{ fontSize: '16px' }} />
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
            <LocalizedMonthPicker value={startDate} onChange={setStartDate} placeholder={t('startDate')} />
          </div>
          <button onClick={handleAddContext} className="app-button-primary w-full">{t('addContext')}</button>
        </div>
      </div>

      {/* Recurring payments */}
      <div className="app-panel p-4">
        <div className="app-kicker mb-3">{t('recurringTransactions').replace('⟳ ', '')}</div>
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
                      <div className="mb-2 flex items-center gap-1.5">
                        <label className="app-kicker">{t('amount')}</label>
                        <span className="text-xs text-slate-300 dark:text-zinc-600">{t('optional')}</span>
                      </div>
                      <input type="text" value={editRecAmount} onChange={e => setEditRecAmount(normalizeAmountInputValue(e.target.value, editRec.currency))} className={inputCls} step={editRecurringAmountProps.step} inputMode={editRecurringAmountProps.inputMode} placeholder={editRecurringAmountProps.placeholder} style={{ fontSize: '16px' }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="app-kicker block mb-2">{t('currency')}</label>
                      <select value={editRec.currency} onChange={e => {
                        setEditRec({ ...editRec, currency: e.target.value })
                        setEditRecAmount(value => normalizeAmountInputValue(value, e.target.value))
                      }} className={`${selCls} w-full`} style={{ fontSize: '16px' }}>
                        {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="app-kicker block mb-2">{t('category')}</label>
                      <select value={editRec.category} onChange={e => setEditRec({ ...editRec, category: e.target.value })} className={`${selCls} w-full`} style={{ fontSize: '16px' }}>
                        {getRecurringCategoryOptions(editRec.type, editRec.category).map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="app-kicker block mb-2">{t('remarks')}</label>
                    <input value={editRec.remarks} onChange={e => setEditRec({ ...editRec, remarks: e.target.value })} className={inputCls} style={{ fontSize: '16px' }} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveRec} className="app-button-primary flex-1">{t('save')}</button>
                    <button onClick={() => { setEditingRecId(null); setEditRec(null); setEditRecAmount('') }} className="app-button-secondary flex-1">{t('cancel')}</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-800 dark:text-zinc-100">{item.summary}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                      <span>{item.amount == null ? t('amountNotSet') : `${formatAmount(item.amount, item.currency)} ${item.currency}`}</span>
                      <span aria-hidden="true">·</span>
                      <span className={`font-medium ${item.type === 'income' ? 'app-positive' : 'app-negative'}`}>
                        {item.type === 'income' ? t('income2') : t('expense')}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex rounded-full px-2 py-0.5 font-medium" style={getCategoryBadgeStyle(item.category, item.type, 0.16)}>
                        {item.category}
                      </span>
                      {item.remarks ? <span>· {item.remarks}</span> : null}
                    </div>
                  </div>
                  <div className="flex gap-3 ml-3">
                    <button onClick={() => { setEditingRecId(item.id); setEditRec({ ...item }); setEditRecAmount(item.amount == null ? '' : item.amount.toString()) }} className="app-accent text-xs font-medium">{t('edit')}</button>
                    <button onClick={() => deleteItem(item.id)} className="text-xs font-medium text-rose-400 dark:text-rose-300">{t('remove')}</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {contextRecurring.length === 0 && <div className="app-panel-soft py-8 text-center text-xs text-slate-400">—</div>}
        </div>
        <div className="app-panel-soft flex flex-col gap-3 p-3.5">
          <div className="app-kicker">{t('addRecurring')}</div>
          <div className="flex gap-2">
            {(['expense', 'income'] as const).map(type => (
              <button key={type} onClick={() => handleRecurringTypeChange(type)}
                className={`app-segment flex-1 ${recType === type ? 'app-segment-active' : ''}`}>
                {type === 'expense' ? t('expense') : t('income2')}
              </button>
            ))}
          </div>
          <div>
            <label className="app-kicker block mb-2">{t('summary')}</label>
            <input value={recSummary} onChange={e => setRecSummary(e.target.value)} placeholder={t('recurringSummaryPlaceholder')} className={inputCls} style={{ fontSize: '16px' }} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="mb-2 flex items-center gap-1.5">
                <label className="app-kicker">{t('amount')}</label>
                <span className="text-xs text-slate-300 dark:text-zinc-600">{t('optional')}</span>
              </div>
              <input type="text" value={recAmount} onChange={e => setRecAmount(normalizeAmountInputValue(e.target.value, recCurrency))} placeholder={recurringAmountProps.placeholder} step={recurringAmountProps.step} inputMode={recurringAmountProps.inputMode} className={inputCls} style={{ fontSize: '16px' }} />
            </div>
            <div>
              <label className="app-kicker block mb-2">{t('currency')}</label>
              <select value={recCurrency} onChange={e => setRecCurrency(e.target.value)} className={`${selCls} w-full`} style={{ fontSize: '16px' }}>
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="app-kicker block mb-2">{t('category')}</label>
              <select value={recCategory} onChange={e => setRecCategory(e.target.value)} className={`${selCls} w-full`} style={{ fontSize: '16px' }}>
                {recCategoryOptions.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="app-kicker block mb-2">{t('remarks')}</label>
              <input value={recRemarks} onChange={e => setRecRemarks(e.target.value)} placeholder={t('recurringRemarksPlaceholder')} className={inputCls} style={{ fontSize: '16px' }} />
            </div>
          </div>
          <button onClick={handleAddRecurring} className="app-button-primary w-full">{t('addEntry')}</button>
        </div>
      </div>

      {/* Budgets */}
      <div className="app-panel p-4">
        <div className="app-kicker mb-3">{t('monthlyBudgets')}</div>
        <p className="text-xs text-slate-400 mb-3">{activeContext?.name}</p>
        <div className="flex flex-col gap-2 mb-3">
          {expenseCategoryOptions.map(cat => {
            const b = activeContext ? getBudget(activeContext.id, cat) : null
            return b ? (
              <div key={cat} className="app-list-row flex items-center justify-between !py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: getCategoryColor(cat, 'expense') }} />
                  <span className="text-sm text-slate-800 dark:text-zinc-100">{cat}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="app-accent text-sm font-semibold">{formatAmount(b, activeContext?.currency || 'USD')}</span>
                  <button onClick={() => activeContext && setBudget(activeContext.id, cat, 0)} className="text-xs font-medium text-rose-400 dark:text-rose-300">{t('remove')}</button>
                </div>
              </div>
            ) : null
          })}
        </div>
        <div className="app-panel-soft flex flex-col gap-3 p-3.5">
          <select value={budgetCat} onChange={e => setBudgetCat(e.target.value)} className={`${selCls} w-full`} style={{ fontSize: '16px' }}>
            {expenseCategoryOptions.map(c => <option key={c}>{c}</option>)}
          </select>
          <input type="number" value={budgetAmt} onChange={e => setBudgetAmt(normalizeAmountInputValue(e.target.value, activeContext?.currency || 'USD'))} placeholder={t('monthlyLimitPlaceholder')} step={budgetAmountProps.step} inputMode={budgetAmountProps.inputMode} className={inputCls} style={{ fontSize: '16px' }} />
          <button onClick={() => {
            if (!activeContext) return
            const amt = parseCurrencyInput(budgetAmt, activeContext.currency)
            if (!isNaN(amt) && amt > 0) { setBudget(activeContext.id, budgetCat, amt); setBudgetAmt('') }
          }} className="app-button-primary w-full">{t('save')}</button>
        </div>
      </div>

      {/* Exchange rates */}
      <div className="app-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="app-kicker">{t('exchangeRates')}</div>
          {ratesUpdated && <div className="text-xs text-slate-400">{t('updatedAt', { time: formatLocaleTime(ratesUpdated, language) })}</div>}
        </div>
        <div className="app-panel-soft p-3.5">
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
              1 {rateFrom} = {formatAmountValue(convert(1, rateFrom, rateTo), rateTo)} {rateTo}
            </div>
          )}
        </div>
      </div>

      {/* Reset */}
      <div className="app-panel p-4">
        <div className="app-kicker mb-3">{t('reset')}</div>
        <div className="app-panel-soft p-3.5">
          <p className="text-xs text-slate-400 mb-3">{t('resetLocalSettingsDescription')}</p>
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

      <div className="app-panel p-4">
        <div className="app-kicker mb-3 text-rose-400 dark:text-rose-300">{t('dangerZone')}</div>
        <div className="app-panel-soft border border-rose-200/70 bg-rose-50/70 p-3.5 dark:border-rose-400/15 dark:bg-rose-500/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-zinc-50">{t('deleteAccountTitle')}</div>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-zinc-300">{t('deleteAccountDescription')}</p>
            </div>
            <button onClick={() => {
              setDeleteConfirmWord('')
              setDeleteConfirmEmail('')
              setDeleteAccountError('')
              setDeleteAccountOpen(true)
            }} className="app-button-danger w-full sm:w-auto">
              {t('deleteAccountAction')}
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
