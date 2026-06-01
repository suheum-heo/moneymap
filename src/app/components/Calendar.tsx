'use client'
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Entry, Context, formatAmount, EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCategoryBadgeStyle, getCategoryColor, getCurrencySymbol, getAmountInputProps, getEntryCurrency, normalizeAmountInputValue, parseCurrencyInput } from '../types'

interface Props {
  entries: Entry[]
  month: string
  onUpdate: (entry: Entry) => void
  onDelete: (id: string) => void
  onAddForDate: (date: string) => void
  activeContext?: Context
  expenseCategories: string[]
  incomeCategories: string[]
}

const DAYS_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function daysInMonth(m: number, y: number) { return new Date(y, m + 1, 0).getDate() }

export default function Calendar({ entries, month, onUpdate, onDelete, onAddForDate, activeContext, expenseCategories, incomeCategories }: Props) {
  const { t } = useTranslation()
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [editEntry, setEditEntry] = useState<Entry | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

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

  const monthEntries = useMemo(() =>
    entries.filter(e => e.date.startsWith(month) && e.context === activeContext?.id),
    [entries, month, activeContext])

  const dayTotals = useMemo(() => {
    const totals: Record<string, { expense: number; income: number }> = {}
    monthEntries.forEach(e => {
      if (!totals[e.date]) totals[e.date] = { expense: 0, income: 0 }
      if (e.type === 'expense') totals[e.date].expense += e.amount
      else totals[e.date].income += e.amount
    })
    return totals
  }, [monthEntries])

  const [year, m] = month.split('-').map(Number)
  const firstDay = new Date(year, m - 1, 1).getDay()
  const totalDays = new Date(year, m, 0).getDate()
  const d = new Date()
  const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

  const cells: (string | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let day = 1; day <= totalDays; day++) {
    cells.push(`${month}-${String(day).padStart(2, '0')}`)
  }

  const selectedEntries = useMemo(() =>
    selectedDay ? monthEntries.filter(e => e.date === selectedDay).sort((a, b) => a.type.localeCompare(b.type)) : [],
    [selectedDay, monthEntries])

  const selectedExpense = selectedEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const selectedIncome = selectedEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const maxExpense = Math.max(...Object.values(dayTotals).map(d => d.expense), 1)

  const openEdit = (e: Entry) => {
    const [y, mo, day] = e.date.split('-').map(Number)
    setEditMonth(mo - 1); setEditDay(day); setEditYear(y)
    setEditAmount(e.amount.toString()); setEditSummary(e.summary)
    setEditVenue(e.venue || ''); setEditLocation(e.location || '')
    setEditCategory(e.category); setEditRemarks(e.remarks || '')
    setEditType(e.type); setEditEntry(e)
  }

  const handleSave = () => {
    if (!editEntry) return
    const parsed = parseCurrencyInput(editAmount, editCurrency)
    if (isNaN(parsed) || parsed <= 0 || !editSummary.trim()) return
    const dateStr = `${editYear}-${String(editMonth + 1).padStart(2, '0')}-${String(editDay).padStart(2, '0')}`
    onUpdate({ ...editEntry, type: editType, date: dateStr, amount: parsed, currency: editCurrency, summary: editSummary.trim(), venue: editVenue.trim(), location: editLocation.trim(), category: editCategory, remarks: editRemarks.trim() })
    setEditEntry(null)
  }

  const editCats = editType === 'expense' ? expenseCategories : incomeCategories
  const editDays = Array.from({ length: daysInMonth(editMonth, editYear) }, (_, i) => i + 1)
  const years = Array.from({ length: 80 }, (_, i) => 2020 + i)
  const editCurrency = editEntry ? getEntryCurrency(editEntry, cur, homeCur) : cur
  const editAmountProps = getAmountInputProps(editCurrency)

  const inputCls = "app-input py-3 text-sm"
  const miniSelCls = "app-select w-full px-3 py-2.5 text-sm"

  return (
    <div className="px-4 pb-6 space-y-3">
      {editEntry && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-4 backdrop-blur-sm md:items-center" onClick={() => setEditEntry(null)}>
          <div className="app-panel w-full max-w-lg p-5" onClick={e => e.stopPropagation()}>
            <div className="mb-1 flex items-center justify-between">
              <div>
                <div className="app-kicker mb-2">{t('calendar')}</div>
                <span className="text-base font-semibold text-slate-900 dark:text-zinc-50">{t('editEntry')}</span>
              </div>
              <button onClick={() => setEditEntry(null)} className="text-slate-400 text-lg">✕</button>
            </div>
            <div className="mt-4 flex gap-2">
              {(['expense', 'income'] as const).map(tp => (
                <button key={tp} onClick={() => { setEditType(tp); setEditCategory(tp === 'expense' ? EXPENSE_CATEGORIES[3] : INCOME_CATEGORIES[0]) }}
                  className={`app-segment flex-1 ${editType === tp ? 'app-segment-active' : ''}`}>
                  {tp === 'expense' ? t('expense') : t('income2')}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <label className="app-kicker mb-2 block">{t('date')}</label>
              <div className="grid grid-cols-3 gap-2">
                <select value={editMonth} onChange={e => setEditMonth(Number(e.target.value))} className={miniSelCls} style={{fontSize:'16px'}}>
                  {MONTHS.map((mo, i) => <option key={mo} value={i}>{mo}</option>)}
                </select>
                <select value={editDay} onChange={e => setEditDay(Number(e.target.value))} className={miniSelCls} style={{fontSize:'16px'}}>
                  {editDays.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={editYear} onChange={e => setEditYear(Number(e.target.value))} className={miniSelCls} style={{fontSize:'16px'}}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="app-kicker mb-2 block">{t('amount')} ({editCurrency} {getCurrencySymbol(editCurrency)})</label>
              <input type="number" value={editAmount} onChange={e => setEditAmount(normalizeAmountInputValue(e.target.value, editCurrency))} className={inputCls} step={editAmountProps.step} inputMode={editAmountProps.inputMode} placeholder={editAmountProps.placeholder} style={{fontSize:'16px'}} />
            </div>
            <div>
              <label className="app-kicker mb-2 block">{t('summary')}</label>
              <input type="text" value={editSummary} onChange={e => setEditSummary(e.target.value)} className={inputCls} style={{fontSize:'16px'}} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="app-kicker mb-2 block">{t('venue')}</label>
                <input type="text" value={editVenue} onChange={e => setEditVenue(e.target.value)} className={inputCls} style={{fontSize:'16px'}} />
              </div>
              <div>
                <label className="app-kicker mb-2 block">{t('location')}</label>
                <input type="text" value={editLocation} onChange={e => setEditLocation(e.target.value)} className={inputCls} style={{fontSize:'16px'}} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="app-kicker mb-2 block">{t('category')}</label>
                <select value={editCategory} onChange={e => setEditCategory(e.target.value)} className={miniSelCls} style={{fontSize:'16px'}}>
                  {editCats.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="app-kicker mb-2 block">{t('remarks')}</label>
                <input type="text" value={editRemarks} onChange={e => setEditRemarks(e.target.value)} className={inputCls} style={{fontSize:'16px'}} />
              </div>
            </div>
            <button onClick={handleSave} className="app-button-primary mt-1 w-full">{t('saveChanges')}</button>
          </div>
        </div>
      )}

      <div className="app-panel p-4">
        <div className="app-kicker mb-3">{t('calendar')}</div>
        <div className="mb-2 grid grid-cols-7">
          {DAYS_EN.map(day => (
            <div key={day} className="py-2 text-center text-[11px] font-medium tracking-[0.08em] text-slate-400/90">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {cells.map((date, i) => {
            if (!date) return <div key={`empty-${i}`} />
            const totals = dayTotals[date]
            const isToday = date === today
            const isSelected = date === selectedDay
            const dayNum = parseInt(date.slice(-2))
            const hasData = !!totals
            const intensity = totals ? Math.min(totals.expense / maxExpense, 1) : 0
            return (
              <button key={date} onClick={() => setSelectedDay(isSelected ? null : date)}
                className={`relative aspect-square rounded-[22px] border flex flex-col items-center justify-center p-1.5 transition-all ${isSelected ? 'border-[#3182f6] ring-4 ring-[#3182f6]/10 dark:border-sky-400 dark:ring-sky-400/10' : 'border-slate-200/80 dark:border-white/10'}`}
                style={{
                  background: hasData ? `rgba(49, 130, 246, ${0.06 + intensity * 0.18})` : 'rgba(255,255,255,0.92)',
                  borderColor: isToday ? '#3182f6' : undefined,
                }}>
                <span className={`text-xs md:text-base ${isToday ? 'font-bold text-[#3182f6] dark:text-sky-300' : 'text-slate-600 dark:text-zinc-400'}`}>
                  {dayNum}
                </span>
                {isToday && <span className="rounded-full bg-[#3182f6] px-1.5 py-0.5 text-[8px] leading-tight text-white md:text-[10px]">{t('today')}</span>}
                {totals?.expense > 0 && (
                  <span className="text-[10px] text-rose-500 dark:text-rose-300 md:text-sm">
                    -{formatAmount(totals.expense, cur).replace(/[^0-9.,]/g, '')}
                  </span>
                )}
                {totals?.income > 0 && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-300 md:text-sm">
                    +{formatAmount(totals.income, cur).replace(/[^0-9.,]/g, '')}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {selectedDay && (
        <div className="app-panel p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-slate-800 dark:text-zinc-100">
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => onAddForDate(selectedDay)}
                className="app-button-primary px-4 py-2.5 text-xs">
                + Add entry
              </button>
              <button onClick={() => setSelectedDay(null)} className="text-slate-400 text-sm">✕</button>
            </div>
          </div>
          {selectedEntries.length === 0 ? (
            <div className="app-panel-soft py-8 text-center text-sm text-slate-400">{t('noEntriesFound')}</div>
          ) : (
            <>
              <div className="mb-4 grid grid-cols-2 gap-3">
                {selectedExpense > 0 && (
                  <div className="app-panel-soft p-3.5">
                    <div className="app-kicker mb-2">{t('spent')}</div>
                    <div className="app-negative text-base font-semibold">{formatAmount(selectedExpense, cur)}</div>
                  </div>
                )}
                {selectedIncome > 0 && (
                  <div className="app-panel-soft p-3.5">
                    <div className="app-kicker mb-2">{t('earned')}</div>
                    <div className="app-positive text-base font-semibold">{formatAmount(selectedIncome, cur)}</div>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-3">
                {selectedEntries.map(e => {
                  const entryCurrency = getEntryCurrency(e, cur, homeCur)
                  const col = getCategoryColor(e.category, e.type)
                  const badgeStyle = getCategoryBadgeStyle(e.category, e.type, 0.16)
                  return (
                    <div key={e.id} className="app-list-row flex cursor-pointer items-center gap-3"
                      onClick={() => openEdit(e)}>
                      <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: col }} />
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-sm font-medium text-slate-800 dark:text-zinc-100">{e.summary}</div>
                        {e.venue && <div className="mt-1 truncate text-xs text-slate-400">{e.venue}{e.location ? ` · ${e.location}` : ''}</div>}
                        <span className="mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-medium" style={badgeStyle}>{e.category}</span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-sm font-semibold" style={{ color: col }}>
                          {e.type === 'income' ? '+' : '-'}{formatAmount(e.amount, entryCurrency)}
                        </div>
                        {confirmId === e.id ? (
                          <div className="flex gap-1" onClick={ev => ev.stopPropagation()}>
                            <button onClick={() => { onDelete(e.id); setConfirmId(null) }} className="rounded-full border border-rose-200/90 px-2 py-1 text-xs font-medium text-rose-400 dark:border-rose-400/20 dark:text-rose-300">{t('deleteEntry')}</button>
                            <button onClick={() => setConfirmId(null)} className="rounded-full border border-slate-300/80 px-2 py-1 text-xs text-slate-400 dark:border-white/10">{t('cancel')}</button>
                          </div>
                        ) : (
                          <button onClick={ev => { ev.stopPropagation(); setConfirmId(e.id) }} className="text-xs text-slate-300 transition-colors hover:text-rose-300 dark:text-slate-600">✕</button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {monthEntries.length === 0 && (
        <div className="app-panel py-12 text-center text-sm text-slate-400">{t('noEntries')}</div>
      )}
    </div>
  )
}
