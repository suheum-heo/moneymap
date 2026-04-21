'use client'
import { useState, useMemo } from 'react'
import { Entry, CAT_COLORS, formatAmount, EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCurrencySymbol } from '../types'
import { useSettings } from '../useSettings'

interface Props {
  entries: Entry[]
  month: string
  onUpdate: (entry: Entry) => void
  onDelete: (id: string) => void
}

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function daysInMonth(m: number, y: number) { return new Date(y, m + 1, 0).getDate() }

export default function Calendar({ entries, month, onUpdate, onDelete }: Props) {
  const { activeContext } = useSettings()
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
  const today = new Date().toISOString().slice(0, 10)

  const cells: (string | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) {
    cells.push(`${month}-${String(d).padStart(2, '0')}`)
  }

  const selectedEntries = useMemo(() =>
    selectedDay ? monthEntries.filter(e => e.date === selectedDay).sort((a, b) => a.type.localeCompare(b.type)) : [],
    [selectedDay, monthEntries])

  const selectedExpense = selectedEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const selectedIncome = selectedEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const maxExpense = Math.max(...Object.values(dayTotals).map(d => d.expense), 1)

  const openEdit = (e: Entry) => {
    const [y, mo, d] = e.date.split('-').map(Number)
    setEditMonth(mo - 1)
    setEditDay(d)
    setEditYear(y)
    setEditAmount(e.amount.toString())
    setEditSummary(e.summary)
    setEditVenue(e.venue || '')
    setEditLocation(e.location || '')
    setEditCategory(e.category)
    setEditRemarks(e.remarks || '')
    setEditType(e.type)
    setEditEntry(e)
  }

  const handleSave = () => {
    if (!editEntry) return
    const parsed = parseFloat(editAmount)
    if (isNaN(parsed) || parsed <= 0 || !editSummary.trim()) return
    const dateStr = `${editYear}-${String(editMonth + 1).padStart(2, '0')}-${String(editDay).padStart(2, '0')}`
    onUpdate({ ...editEntry, type: editType, date: dateStr, amount: parsed, summary: editSummary.trim(), venue: editVenue.trim(), location: editLocation.trim(), category: editCategory, remarks: editRemarks.trim() })
    setEditEntry(null)
  }

  const editCats = editType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
  const editDays = Array.from({ length: daysInMonth(editMonth, editYear) }, (_, i) => i + 1)
  const years = Array.from({ length: 80 }, (_, i) => 2020 + i)

  const inputCls = "w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 outline-none text-sm focus:border-amber-400"
  const miniSelCls = "w-full px-2 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 outline-none text-sm"

  return (
    <div className="px-4 pb-8">
      {editEntry && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-4"
          onClick={() => setEditEntry(null)}>
          <div className="bg-[#fafaf8] dark:bg-[#1a1a18] rounded-2xl p-4 w-full max-w-md flex flex-col gap-3"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">Edit entry</span>
              <button onClick={() => setEditEntry(null)} className="text-zinc-400 text-lg">✕</button>
            </div>
            <div className="flex gap-2">
              {(['expense', 'income'] as const).map(t => (
                <button key={t} onClick={() => { setEditType(t); setEditCategory(t === 'expense' ? EXPENSE_CATEGORIES[3] : INCOME_CATEGORIES[0]) }}
                  className={`flex-1 py-1.5 rounded-xl text-sm font-medium border transition-colors ${editType === t
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-transparent border-zinc-200 dark:border-zinc-700 text-zinc-500'}`}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Date</label>
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
              <label className="text-xs text-zinc-400 mb-1 block">Amount ({cur} {getCurrencySymbol(cur)})</label>
              <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)}
                className={inputCls} step="0.01" inputMode="decimal" style={{fontSize:'16px'}} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Summary</label>
              <input type="text" value={editSummary} onChange={e => setEditSummary(e.target.value)}
                className={inputCls} style={{fontSize:'16px'}} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Venue</label>
                <input type="text" value={editVenue} onChange={e => setEditVenue(e.target.value)}
                  className={inputCls} style={{fontSize:'16px'}} />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Location</label>
                <input type="text" value={editLocation} onChange={e => setEditLocation(e.target.value)}
                  className={inputCls} style={{fontSize:'16px'}} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Category</label>
                <select value={editCategory} onChange={e => setEditCategory(e.target.value)} className={miniSelCls} style={{fontSize:'16px'}}>
                  {editCats.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Remarks</label>
                <input type="text" value={editRemarks} onChange={e => setEditRemarks(e.target.value)}
                  className={inputCls} style={{fontSize:'16px'}} />
              </div>
            </div>
            <button onClick={handleSave}
              className="w-full py-2.5 rounded-xl bg-amber-500 text-white text-sm font-medium mt-1">
              Save changes
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-xs text-zinc-400 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 mb-6">
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />
          const totals = dayTotals[date]
          const isToday = date === today
          const isSelected = date === selectedDay
          const day = parseInt(date.slice(-2))
          const hasData = !!totals
          const intensity = totals ? Math.min(totals.expense / maxExpense, 1) : 0
          return (
            <button key={date} onClick={() => setSelectedDay(isSelected ? null : date)}
              className={`relative aspect-square rounded-lg flex flex-col items-center justify-center transition-all ${isSelected ? 'ring-2 ring-amber-500' : ''}`}
              style={{
                background: hasData ? `rgba(186, 117, 23, ${0.1 + intensity * 0.4})` : 'transparent',
                border: isToday ? '1.5px solid #BA7517' : '1px solid transparent',
              }}>
              <span className={`text-xs md:text-base ${isToday ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-zinc-600 dark:text-zinc-400'}`}>
                {day}
              </span>
              {totals?.expense > 0 && (
                <span className="text-red-500 dark:text-red-400 text-[10px] md:text-sm">
                  -{formatAmount(totals.expense, cur).replace(/[^0-9.,]/g, '')}
                </span>
              )}
              {totals?.income > 0 && (
                <span className="text-green-600 dark:text-green-400 text-[10px] md:text-sm">
                  +{formatAmount(totals.income, cur).replace(/[^0-9.,]/g, '')}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {selectedDay && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            <button onClick={() => setSelectedDay(null)} className="text-zinc-400 text-sm">✕</button>
          </div>
          {selectedEntries.length === 0 ? (
            <div className="text-center text-zinc-400 py-6 text-sm">No entries</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {selectedExpense > 0 && (
                  <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-3">
                    <div className="text-xs text-zinc-500 mb-1">Spent</div>
                    <div className="text-sm font-medium text-red-600 dark:text-red-400">{formatAmount(selectedExpense, cur)}</div>
                  </div>
                )}
                {selectedIncome > 0 && (
                  <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-3">
                    <div className="text-xs text-zinc-500 mb-1">Earned</div>
                    <div className="text-sm font-medium text-green-700 dark:text-green-400">{formatAmount(selectedIncome, cur)}</div>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                {selectedEntries.map(e => {
                  const col = e.type === 'income' ? '#3B6D11' : (CAT_COLORS[e.category] || '#888')
                  return (
                    <div key={e.id} className="flex items-center gap-3 rounded-xl px-3 py-2 cursor-pointer"
                      style={{ background: col + '14', borderLeft: `3px solid ${col}` }}
                      onClick={() => openEdit(e)}>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-zinc-800 dark:text-zinc-100 truncate font-medium">{e.summary}</div>
                        {e.venue && <div className="text-xs text-zinc-400 truncate">{e.venue}{e.location ? ` · ${e.location}` : ''}</div>}
                        <span className="inline-block text-xs px-2 py-0.5 rounded-full mt-0.5"
                          style={{ background: col + '25', color: col }}>{e.category}</span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-sm font-medium" style={{ color: col }}>
                          {e.type === 'income' ? '+' : '-'}{formatAmount(e.amount, e.currency || cur)}
                        </div>
                        {confirmId === e.id ? (
                          <div className="flex gap-1" onClick={ev => ev.stopPropagation()}>
                            <button onClick={() => { onDelete(e.id); setConfirmId(null) }}
                              className="text-xs text-red-500 border border-red-300 rounded px-1.5 py-0.5">Delete</button>
                            <button onClick={() => setConfirmId(null)}
                              className="text-xs text-zinc-400 border border-zinc-300 dark:border-zinc-600 rounded px-1.5 py-0.5">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={ev => { ev.stopPropagation(); setConfirmId(e.id) }}
                            className="text-xs text-zinc-300 dark:text-zinc-600 hover:text-red-400">✕</button>
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
        <div className="text-center text-zinc-400 py-12 text-sm">No entries for this month</div>
      )}
    </div>
  )
}
