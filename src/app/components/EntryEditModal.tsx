'use client'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Context,
  Entry,
  EntrySortOrder,
  EXPENSE_CATEGORIES,
  getAmountInputProps,
  getCurrencySymbol,
  getEntryCurrency,
  getEntryHomeAmountCurrency,
  getEntryFormPlaceholders,
  getMonthLabels,
  INCOME_CATEGORIES,
  normalizeAmountInputValue,
  parseCurrencyInput,
} from '../types'
import type { RecurringItem } from '../useRecurring'
import { getContextPlaceSuggestions } from '../lib/placeSuggestions'
import { addEntryCopiesToContexts, createCopyGroupId, findCopiedContextIds, getCopyTargetContexts } from '../lib/entryCopy'
import { getContextImportLabel } from '../lib/contextTree'
import VenueLocationFields from './VenueLocationFields'
import ActualChargedFields from './ActualChargedFields'

interface Props {
  entry: Entry | null
  entries: Entry[]
  items?: RecurringItem[]
  activeContext?: Context
  contexts?: Context[]
  expenseCategories: string[]
  incomeCategories: string[]
  sortOrder?: EntrySortOrder
  onClose: () => void
  onUpdate: (entry: Entry) => void
  onAdd?: (entry: Entry) => Promise<void> | void
}

function daysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate()
}

export default function EntryEditModal({
  entry,
  entries,
  items = [],
  activeContext,
  contexts = [],
  expenseCategories,
  incomeCategories,
  sortOrder = 'newest',
  onClose,
  onUpdate,
  onAdd,
}: Props) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage || i18n.language
  const [editMonth, setEditMonth] = useState(0)
  const [editDay, setEditDay] = useState(1)
  const [editYear, setEditYear] = useState(2026)
  const [editAmount, setEditAmount] = useState('')
  const [editSummary, setEditSummary] = useState('')
  const [editVenue, setEditVenue] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editPaymentMethod, setEditPaymentMethod] = useState('')
  const [editRemarks, setEditRemarks] = useState('')
  const [editType, setEditType] = useState<'expense' | 'income'>('expense')
  const [editActualCharged, setEditActualCharged] = useState('')
  const [editActualChargedCurrency, setEditActualChargedCurrency] = useState('USD')
  const [copyTargetIds, setCopyTargetIds] = useState<string[]>([])
  const [copyError, setCopyError] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const [isCopying, setIsCopying] = useState(false)

  const cur = activeContext?.currency || 'USD'
  const homeCur = activeContext?.homeCurrency || cur
  const copyTargets = useMemo(
    () => getCopyTargetContexts(contexts, entry?.context || activeContext?.id),
    [contexts, entry?.context, activeContext?.id],
  )
  const alreadyCopiedIds = useMemo(
    () => (entry ? findCopiedContextIds(entry, entries) : []),
    [entry, entries],
  )
  const pendingCopyIds = useMemo(
    () => copyTargetIds.filter(id => !alreadyCopiedIds.includes(id)),
    [copyTargetIds, alreadyCopiedIds],
  )

  useEffect(() => {
    if (!entry) return
    const [year, month, day] = entry.date.split('-').map(Number)
    setEditMonth(month - 1)
    setEditDay(day)
    setEditYear(year)
    setEditAmount(entry.amount.toString())
    setEditSummary(entry.summary)
    setEditVenue(entry.venue || '')
    setEditLocation(entry.location || '')
    setEditCategory(entry.category)
    setEditPaymentMethod(entry.paymentMethod || '')
    setEditRemarks(entry.remarks || '')
    setEditType(entry.type)
    setEditActualCharged(entry.homeAmount == null ? '' : entry.homeAmount.toString())
    setEditActualChargedCurrency(getEntryHomeAmountCurrency(entry, homeCur) || homeCur)
    setCopyTargetIds([])
    setCopyError('')
    setCopyStatus('')
  }, [entry, homeCur])

  useEffect(() => {
    const valid = new Set(copyTargets.map(context => context.id))
    setCopyTargetIds(prev => prev.filter(id => valid.has(id) && !alreadyCopiedIds.includes(id)))
  }, [copyTargets, alreadyCopiedIds])

  const placeSuggestions = useMemo(
    () => getContextPlaceSuggestions(entries, activeContext?.id, items),
    [entries, activeContext?.id, items],
  )

  if (!entry) return null

  const editDays = Array.from({ length: daysInMonth(editMonth, editYear) }, (_, i) => i + 1)
  const years = Array.from({ length: 80 }, (_, i) => 2020 + i)
  const editCats = editType === 'expense' ? expenseCategories : incomeCategories
  const editCurrency = getEntryCurrency(entry, cur, homeCur)
  const editAmountProps = getAmountInputProps(editCurrency)
  const canEditActualCharged = editCurrency !== homeCur
  const monthLabels = getMonthLabels(language)
  const placeholders = getEntryFormPlaceholders(language, activeContext?.currency || editCurrency, editType)
  const inputCls = 'app-input py-3 text-sm'
  const miniSelCls = 'app-select w-full px-3 py-2.5 text-sm'

  const buildEditedEntry = (): Entry | null => {
    const parsed = parseCurrencyInput(editAmount, editCurrency)
    if (isNaN(parsed) || parsed <= 0) return null
    const parsedActual = editActualCharged.trim()
      ? parseCurrencyInput(editActualCharged.trim(), editActualChargedCurrency)
      : undefined
    if (
      canEditActualCharged &&
      editActualCharged.trim() &&
      (parsedActual == null || isNaN(parsedActual) || parsedActual <= 0)
    ) {
      return null
    }
    const dateStr = `${editYear}-${String(editMonth + 1).padStart(2, '0')}-${String(editDay).padStart(2, '0')}`
    return {
      ...entry,
      type: editType,
      date: dateStr,
      amount: parsed,
      currency: editCurrency,
      summary: editSummary.trim(),
      venue: editVenue.trim(),
      location: editLocation.trim(),
      category: editCategory,
      paymentMethod: editPaymentMethod.trim(),
      remarks: editRemarks.trim(),
      homeAmount: canEditActualCharged ? parsedActual : undefined,
      homeAmountCurrency: canEditActualCharged && parsedActual && editActualChargedCurrency !== homeCur
        ? editActualChargedCurrency
        : undefined,
    }
  }

  const handleSave = () => {
    if (!editSummary.trim()) {
      const proceed = window.confirm(t('summaryEmptyConfirm', { summaryLabel: t('summary') }))
      if (!proceed) return
    }
    const next = buildEditedEntry()
    if (!next) return
    onUpdate(next)
    onClose()
  }

  const toggleCopyTarget = (id: string) => {
    if (alreadyCopiedIds.includes(id)) return
    setCopyTargetIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]))
    setCopyError('')
    setCopyStatus('')
  }

  const handleCopy = async () => {
    if (!onAdd) return
    if (pendingCopyIds.length === 0) {
      setCopyError(t('selectCopyContextsError'))
      return
    }
    const next = buildEditedEntry()
    if (!next) return
    setIsCopying(true)
    setCopyError('')
    setCopyStatus('')
    try {
      const groupId = next.copyGroupId || createCopyGroupId()
      const sourceWithGroup = { ...next, copyGroupId: groupId }
      if (!entry.copyGroupId || entry.copyGroupId !== groupId) {
        onUpdate(sourceWithGroup)
      }
      const result = await addEntryCopiesToContexts(
        sourceWithGroup,
        pendingCopyIds,
        entries.map(item => (item.id === entry.id ? sourceWithGroup : item)),
        onAdd,
        sortOrder,
        groupId,
      )
      setCopyStatus(t('copyEntrySuccess', { count: result.added }))
      setCopyTargetIds([])
    } catch (error) {
      console.error('Failed to copy entry', error)
      setCopyError(t('copyEntryFailed'))
    } finally {
      setIsCopying(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-4 backdrop-blur-sm md:items-center"
      onClick={onClose}
    >
      <div className="app-panel max-h-[90vh] w-full max-w-lg overflow-y-auto p-5" onClick={event => event.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <div>
            <div className="app-kicker mb-2">{t('entries')}</div>
            <span className="text-base font-semibold text-slate-900 dark:text-zinc-50">{t('editEntry')}</span>
          </div>
          <button onClick={onClose} className="text-lg text-slate-400">✕</button>
        </div>
        <div className="mt-4 flex gap-2">
          {(['expense', 'income'] as const).map(type => (
            <button
              key={type}
              onClick={() => {
                setEditType(type)
                setEditCategory(
                  type === 'expense'
                    ? (expenseCategories[0] || EXPENSE_CATEGORIES[0])
                    : (incomeCategories[0] || INCOME_CATEGORIES[0]),
                )
              }}
              className={`app-segment flex-1 ${editType === type ? 'app-segment-active' : ''}`}
            >
              {type === 'expense' ? t('expense') : t('income2')}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <label className="app-kicker mb-2 block">{t('date')}</label>
          <div className="grid grid-cols-3 gap-2">
            <select value={editMonth} onChange={event => setEditMonth(Number(event.target.value))} className={miniSelCls} style={{ fontSize: '16px' }}>
              {monthLabels.map((monthName, index) => <option key={`${monthName}-${index}`} value={index}>{monthName}</option>)}
            </select>
            <select value={editDay} onChange={event => setEditDay(Number(event.target.value))} className={miniSelCls} style={{ fontSize: '16px' }}>
              {editDays.map(day => <option key={day} value={day}>{day}</option>)}
            </select>
            <select value={editYear} onChange={event => setEditYear(Number(event.target.value))} className={miniSelCls} style={{ fontSize: '16px' }}>
              {years.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="app-kicker mb-2 block">{t('amount')} ({editCurrency} {getCurrencySymbol(editCurrency)})</label>
          <input
            type="text"
            value={editAmount}
            onChange={event => setEditAmount(normalizeAmountInputValue(event.target.value, editCurrency))}
            className={inputCls}
            step={editAmountProps.step}
            inputMode={editAmountProps.inputMode}
            placeholder={editAmountProps.placeholder}
            style={{ fontSize: '16px' }}
          />
        </div>
        {canEditActualCharged && (
          <ActualChargedFields
            amount={editActualCharged}
            currency={editActualChargedCurrency}
            onAmountChange={setEditActualCharged}
            onCurrencyChange={setEditActualChargedCurrency}
            inputCls={inputCls}
          />
        )}
        <div>
          <label className="app-kicker mb-2 block">{t('summary')}</label>
          <input type="text" value={editSummary} onChange={event => setEditSummary(event.target.value)} placeholder={placeholders.summary} className={inputCls} style={{ fontSize: '16px' }} />
          {!editSummary.trim() && (
            <p className="mt-1.5 text-xs text-slate-400">{t('summaryRecommended')}</p>
          )}
        </div>
        <VenueLocationFields
          venue={editVenue}
          location={editLocation}
          onVenueChange={setEditVenue}
          onLocationChange={setEditLocation}
          placeholders={placeholders}
          inputCls={inputCls}
          venueListId="edit-venue-list"
          locationListId="edit-location-list"
          venueLocationOptions={placeSuggestions.venueLocationOptions}
          gridClassName="grid grid-cols-2 gap-2"
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="app-kicker mb-2 block">{t('category')}</label>
            <select value={editCategory} onChange={event => setEditCategory(event.target.value)} className={miniSelCls} style={{ fontSize: '16px' }}>
              {editCats.map(category => <option key={category}>{category}</option>)}
            </select>
          </div>
          <div>
            <label className="app-kicker mb-2 block">{t('paymentMethod')}</label>
            <input type="text" value={editPaymentMethod} onChange={event => setEditPaymentMethod(event.target.value)} placeholder={t('paymentMethodPlaceholder')} className={inputCls} style={{ fontSize: '16px' }} list="edit-payment-method-list" />
          </div>
        </div>
        <div>
          <label className="app-kicker mb-2 block">{t('remarks')}</label>
          <input type="text" value={editRemarks} onChange={event => setEditRemarks(event.target.value)} placeholder={placeholders.remarks} className={inputCls} style={{ fontSize: '16px' }} />
        </div>

        {onAdd && copyTargets.length > 0 && (
          <div className="mt-3 space-y-3 rounded-[18px] border border-slate-200/80 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/5">
            <div>
              <div className="text-sm font-medium text-slate-800 dark:text-zinc-100">{t('copyEntryToContext')}</div>
              <div className="mt-0.5 text-xs text-slate-400">{t('alsoAddToOtherContextsHint')}</div>
            </div>
            <div className="flex flex-col gap-2">
              {copyTargets.map(context => {
                const alreadyCopied = alreadyCopiedIds.includes(context.id)
                const checked = alreadyCopied || copyTargetIds.includes(context.id)
                return (
                  <label
                    key={context.id}
                    className={`flex items-center gap-3 rounded-[16px] border px-3 py-2.5 text-sm transition ${
                      alreadyCopied
                        ? 'cursor-default border-emerald-200/90 bg-emerald-50/90 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200'
                        : checked
                          ? 'cursor-pointer border-[#b9d4ff] bg-[#eef5ff] text-[#245ec6] dark:border-sky-400/25 dark:bg-sky-500/10 dark:text-sky-200'
                          : 'cursor-pointer border-slate-200/80 bg-white/90 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={alreadyCopied}
                      onChange={() => toggleCopyTarget(context.id)}
                      className="h-4 w-4 rounded border-slate-300 text-[#3182f6] focus:ring-[#3182f6] disabled:opacity-80"
                    />
                    <span className="min-w-0 flex-1 truncate">{getContextImportLabel(context, contexts)}</span>
                    <span className="flex-shrink-0 text-xs opacity-70">
                      {alreadyCopied ? t('copyEntryAlreadyCopied') : context.currency}
                    </span>
                  </label>
                )
              })}
            </div>
            {copyError && <div className="text-xs text-rose-500">{copyError}</div>}
            {copyStatus && <div className="text-xs text-emerald-600 dark:text-emerald-400">{copyStatus}</div>}
            <button
              type="button"
              onClick={handleCopy}
              disabled={isCopying || pendingCopyIds.length === 0}
              className="app-button-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCopying ? t('loading') : t('copyEntryAction', { count: Math.max(pendingCopyIds.length, 1) })}
            </button>
          </div>
        )}

        <button onClick={handleSave} className="app-button-primary mt-3 w-full">{t('saveChanges')}</button>
        <datalist id="edit-venue-list">{placeSuggestions.venues.map(venue => <option key={venue} value={venue} />)}</datalist>
        <datalist id="edit-location-list">{placeSuggestions.locations.map(location => <option key={location} value={location} />)}</datalist>
        <datalist id="edit-payment-method-list">{placeSuggestions.paymentMethods.map(method => <option key={method} value={method} />)}</datalist>
      </div>
    </div>
  )
}
