'use client'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Context,
  Entry,
  EXPENSE_CATEGORIES,
  getAmountInputProps,
  getCurrencySymbol,
  getEntryCurrency,
  getEntryFormPlaceholders,
  getMonthLabels,
  INCOME_CATEGORIES,
  normalizeAmountInputValue,
  parseCurrencyInput,
} from '../types'
import type { RecurringItem } from '../useRecurring'
import { getContextPlaceSuggestions } from '../lib/placeSuggestions'
import VenueLocationFields from './VenueLocationFields'

interface Props {
  entry: Entry | null
  entries: Entry[]
  items?: RecurringItem[]
  activeContext?: Context
  expenseCategories: string[]
  incomeCategories: string[]
  onClose: () => void
  onUpdate: (entry: Entry) => void
}

function daysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate()
}

export default function EntryEditModal({
  entry,
  entries,
  items = [],
  activeContext,
  expenseCategories,
  incomeCategories,
  onClose,
  onUpdate,
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
  const [editRemarks, setEditRemarks] = useState('')
  const [editType, setEditType] = useState<'expense' | 'income'>('expense')
  const [editActualCharged, setEditActualCharged] = useState('')

  const cur = activeContext?.currency || 'USD'
  const homeCur = activeContext?.homeCurrency || cur

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
    setEditRemarks(entry.remarks || '')
    setEditType(entry.type)
    setEditActualCharged(entry.homeAmount == null ? '' : entry.homeAmount.toString())
  }, [entry])

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
  const editActualChargedProps = getAmountInputProps(homeCur)
  const canEditActualCharged = editCurrency !== homeCur
  const monthLabels = getMonthLabels(language)
  const placeholders = getEntryFormPlaceholders(language, activeContext?.currency || editCurrency, editType)
  const inputCls = 'app-input py-3 text-sm'
  const miniSelCls = 'app-select w-full px-3 py-2.5 text-sm'

  const handleSave = () => {
    const parsed = parseCurrencyInput(editAmount, editCurrency)
    if (isNaN(parsed) || parsed <= 0 || !editSummary.trim()) return
    const parsedActual = editActualCharged.trim()
      ? parseCurrencyInput(editActualCharged.trim(), homeCur)
      : undefined
    if (
      canEditActualCharged &&
      editActualCharged.trim() &&
      (parsedActual == null || isNaN(parsedActual) || parsedActual <= 0)
    ) {
      return
    }
    const dateStr = `${editYear}-${String(editMonth + 1).padStart(2, '0')}-${String(editDay).padStart(2, '0')}`
    onUpdate({
      ...entry,
      type: editType,
      date: dateStr,
      amount: parsed,
      currency: editCurrency,
      summary: editSummary.trim(),
      venue: editVenue.trim(),
      location: editLocation.trim(),
      category: editCategory,
      remarks: editRemarks.trim(),
      homeAmount: canEditActualCharged ? parsedActual : undefined,
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-4 backdrop-blur-sm md:items-center"
      onClick={onClose}
    >
      <div className="app-panel w-full max-w-lg p-5" onClick={event => event.stopPropagation()}>
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
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <label className="app-kicker">
                {t('actualCharged')} ({homeCur} {getCurrencySymbol(homeCur)})
              </label>
              <span className="text-xs text-slate-300 dark:text-zinc-600">{t('optional')}</span>
            </div>
            <input
              type="text"
              value={editActualCharged}
              onChange={event => setEditActualCharged(normalizeAmountInputValue(event.target.value, homeCur))}
              className={inputCls}
              step={editActualChargedProps.step}
              inputMode={editActualChargedProps.inputMode}
              placeholder={editActualChargedProps.placeholder}
              style={{ fontSize: '16px' }}
            />
            <p className="mt-1 text-xs text-slate-400">{t('actualChargedHint')}</p>
          </div>
        )}
        <div>
          <label className="app-kicker mb-2 block">{t('summary')}</label>
          <input type="text" value={editSummary} onChange={event => setEditSummary(event.target.value)} placeholder={placeholders.summary} className={inputCls} style={{ fontSize: '16px' }} />
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
            <label className="app-kicker mb-2 block">{t('remarks')}</label>
            <input type="text" value={editRemarks} onChange={event => setEditRemarks(event.target.value)} placeholder={placeholders.remarks} className={inputCls} style={{ fontSize: '16px' }} list="edit-remarks-list" />
          </div>
        </div>
        <button onClick={handleSave} className="app-button-primary mt-1 w-full">{t('saveChanges')}</button>
        <datalist id="edit-venue-list">{placeSuggestions.venues.map(venue => <option key={venue} value={venue} />)}</datalist>
        <datalist id="edit-location-list">{placeSuggestions.locations.map(location => <option key={location} value={location} />)}</datalist>
        <datalist id="edit-remarks-list">{placeSuggestions.remarks.map(remarks => <option key={remarks} value={remarks} />)}</datalist>
      </div>
    </div>
  )
}
