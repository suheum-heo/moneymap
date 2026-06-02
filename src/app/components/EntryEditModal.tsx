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
  getMonthLabels,
  INCOME_CATEGORIES,
  normalizeAmountInputValue,
  parseCurrencyInput,
} from '../types'

interface Props {
  entry: Entry | null
  entries: Entry[]
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
  }, [entry])

  const pastVenues = useMemo(
    () => [...new Set(entries.map(item => item.venue).filter(Boolean))].sort(),
    [entries],
  )
  const pastLocations = useMemo(
    () => [...new Set(entries.map(item => item.location).filter(Boolean))].sort(),
    [entries],
  )

  if (!entry) return null

  const editDays = Array.from({ length: daysInMonth(editMonth, editYear) }, (_, i) => i + 1)
  const years = Array.from({ length: 80 }, (_, i) => 2020 + i)
  const editCats = editType === 'expense' ? expenseCategories : incomeCategories
  const editCurrency = getEntryCurrency(entry, cur, homeCur)
  const editAmountProps = getAmountInputProps(editCurrency)
  const monthLabels = getMonthLabels(language)
  const inputCls = 'app-input py-3 text-sm'
  const miniSelCls = 'app-select w-full px-3 py-2.5 text-sm'

  const handleSave = () => {
    const parsed = parseCurrencyInput(editAmount, editCurrency)
    if (isNaN(parsed) || parsed <= 0 || !editSummary.trim()) return
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
                setEditCategory(type === 'expense' ? EXPENSE_CATEGORIES[3] : INCOME_CATEGORIES[0])
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
            type="number"
            value={editAmount}
            onChange={event => setEditAmount(normalizeAmountInputValue(event.target.value, editCurrency))}
            className={inputCls}
            step={editAmountProps.step}
            inputMode={editAmountProps.inputMode}
            placeholder={editAmountProps.placeholder}
            style={{ fontSize: '16px' }}
          />
        </div>
        <div>
          <label className="app-kicker mb-2 block">{t('summary')}</label>
          <input type="text" value={editSummary} onChange={event => setEditSummary(event.target.value)} className={inputCls} style={{ fontSize: '16px' }} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="app-kicker mb-2 block">{t('venue')}</label>
            <input type="text" value={editVenue} onChange={event => setEditVenue(event.target.value)} className={inputCls} style={{ fontSize: '16px' }} list="edit-venue-list" />
          </div>
          <div>
            <label className="app-kicker mb-2 block">{t('location')}</label>
            <input type="text" value={editLocation} onChange={event => setEditLocation(event.target.value)} className={inputCls} style={{ fontSize: '16px' }} list="edit-location-list" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="app-kicker mb-2 block">{t('category')}</label>
            <select value={editCategory} onChange={event => setEditCategory(event.target.value)} className={miniSelCls} style={{ fontSize: '16px' }}>
              {editCats.map(category => <option key={category}>{category}</option>)}
            </select>
          </div>
          <div>
            <label className="app-kicker mb-2 block">{t('remarks')}</label>
            <input type="text" value={editRemarks} onChange={event => setEditRemarks(event.target.value)} className={inputCls} style={{ fontSize: '16px' }} />
          </div>
        </div>
        <button onClick={handleSave} className="app-button-primary mt-1 w-full">{t('saveChanges')}</button>
        <datalist id="edit-venue-list">{pastVenues.map(venue => <option key={venue} value={venue} />)}</datalist>
        <datalist id="edit-location-list">{pastLocations.map(location => <option key={location} value={location} />)}</datalist>
      </div>
    </div>
  )
}
