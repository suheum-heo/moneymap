'use client'
import { useState, useMemo } from 'react'
import { Entry, CAT_COLORS, getCurrencySymbol, formatAmount, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../types'
import { useSettings } from '../useSettings'

interface Props {
  entries: Entry[]
  month: string
  onDelete: (id: string) => void
  onUpdate: (entry: Entry) => void
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function daysInMonth(m: number, y: number) { return new Date(y, m + 1, 0).getDate() }

export default function Entries({ entries, month, onDelete, onUpdate }: Props) {
  const [typeFilter, setTypeFilter] = useState('all')
  const [catFilter, setCatFilter] = useState('all')
  const { activeContext, convert } = useSettings()
  const [editEntry, setEditEntry] = useState<Entry | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const cur = activeContext?.currency || 'USD'
  const homeCur = activeContext?.homeCurrency || cur
  const showConversion = cur !== homeCur

  const monthEntries = useMemo(() =>
    entries.filter(e => e.date.startsWith(month) && e.context === activeContext?.id),
    [entries, month, activeContext])

  const allCats = useMemo(() =>
    [...new Set(monthEntries.map(e => e.category))].sort(), [monthEntries])

  const filtered = useMemo(() => {
    let f = monthEntries
    if (typeFilter !== 'all') f = f.filter(e => e.type === typeFilter)
    if (catFilter !== 'all') f = f.filter(e => e.category === catFilter)
    return [...f].sort((a, b) => a.date.localeCompare(b.date))
  }, [monthEntries, typeFilter, catFilter])

  const pastVenues = useMemo(() => [...new Set(entries.map(e => e.venue).filter(Boolean))].sort(), [entries])
  const pastLocations = useMemo(() => [...new Set(entries.map(e => e.location).filter(Boolean))].sort(), [entries])

  const exportCSV = () => {
    const headers = ['Date','Type','Summary','Venue','Location','Category','Amount','Currency','Remarks']
    const rows = filtered.map(e => [
      e.date, e.type, e.summary, e.venue || '', e.location || '',
      e.category, e.amount, e.currency || cur, e.remarks || ''
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('
')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeContext?.name || 'entries'}-${month}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Edit form state
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

  const openEdit = (e: Entry) => {
    const [y, m, d] = e.date.split('-').map(Number)
    setEditMonth(m - 1)
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

  const selCls = "text-sm px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
  const inputCls = "w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 outline-none text-sm focus:border-amber-400"
  const miniSelCls = "w-full px-2 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 outline-none text-sm"
  const years = Array.from({ length: 80 }, (_, i) => 2020 + i)
  const days = Array.from({ length: daysInMonth(editMonth, editYear) }, (_, i) => i + 1)
  const editCats = editType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

  return (
    <div className="px-4 pb-8">
      {/* Edit modal */}
      {editEntry && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-4"
          onClick={() => setEditEntry(null)}>
          <div className="bg-[#fafaf8] dark:bg-[#1a1a18] rounded-2xl p-4 w-full max-w-md flex flex-col gap-3"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">Edit entry</span>
              <button onClick={() => setEditEntry(null)} className="text-zinc-400 text-lg">✕</button>
            </div>

            {/* Type toggle */}
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

            {/* Date */}
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Date</label>
              <div className="grid grid-cols-3 gap-2">
                <select value={editMonth} onChange={e => setEditMonth(Number(e.target.value))} className={miniSelCls} style={{fontSize:'16px'}}>
                  {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <select value={editDay} onChange={e => setEditDay(Number(e.target.value))} className={miniSelCls} style={{fontSize:'16px'}}>
                  {days.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={editYear} onChange={e => setEditYear(Number(e.target.value))} className={miniSelCls} style={{fontSize:'16px'}}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Amount ({cur})</label>
              <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)}
                className={inputCls} step="0.01" inputMode="decimal" style={{fontSize:'16px'}} />
            </div>

            {/* Summary */}
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Summary</label>
              <input type="text" value={editSummary} onChange={e => setEditSummary(e.target.value)}
                className={inputCls} style={{fontSize:'16px'}} />
            </div>

            {/* Venue + Location */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Venue</label>
                <input type="text" value={editVenue} onChange={e => setEditVenue(e.target.value)}
                  className={inputCls} style={{fontSize:'16px'}} list="edit-venue-list" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Location</label>
                <input type="text" value={editLocation} onChange={e => setEditLocation(e.target.value)}
                  className={inputCls} style={{fontSize:'16px'}} list="edit-location-list" />
              </div>
            </div>

            {/* Category + Remarks */}
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

            <datalist id="edit-venue-list">{pastVenues.map(v => <option key={v} value={v} />)}</datalist>
            <datalist id="edit-location-list">{pastLocations.map(l => <option key={l} value={l} />)}</datalist>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={selCls}>
          <option value="all">All types</option>
          <option value="expense">Expenses</option>
          <option value="income">Income</option>
        </select>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className={selCls}>
          <option value="all">All categories</option>
          {allCats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={exportCSV}
          className="ml-auto text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-300 transition-colors">
          ↓ Export CSV
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-zinc-400 py-12 text-sm">No entries found</div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {filtered.map(e => {
            const col = e.type === 'income' ? '#3B6D11' : (CAT_COLORS[e.category] || '#888')
            const isIncome = e.type === 'income'
            const converted = showConversion ? convert(e.amount, cur, homeCur) : null
            return (
              <div key={e.id}
                className="flex items-start gap-3 rounded-xl px-3 py-2.5"
                style={{ background: col + '14', borderLeft: `3px solid ${col}` }}>
                <div className="text-xs text-zinc-400 pt-0.5 w-12 flex-shrink-0">{e.date.slice(5)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-zinc-800 dark:text-zinc-100 leading-snug truncate font-medium">{e.summary}</div>
                  {e.venue && <div className="text-xs text-zinc-400 mt-0.5 truncate">{e.venue}{e.location ? ` · ${e.location}` : ''}</div>}
                  {e.remarks && <div className="text-xs text-zinc-400 truncate">{e.remarks}</div>}
                  <span className="inline-block text-xs px-2 py-0.5 rounded-full mt-1"
                    style={{ background: col + '25', color: col }}>
                    {e.category}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <div className="text-sm font-medium" style={{ color: col }}>
                    {isIncome ? '+' : '-'}{formatAmount(e.amount, e.currency || cur)}
                  </div>
                  {converted !== null && (
                    <div className="text-xs text-zinc-400">≈{formatAmount(converted, homeCur)}</div>
                  )}
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => openEdit(e)}
                      className="text-xs text-amber-500 hover:text-amber-600">Edit</button>
                    {confirmId === e.id ? (
                      <>
                        <button onClick={() => { onDelete(e.id); setConfirmId(null) }}
                          className="text-xs text-red-500 border border-red-300 rounded px-1.5 py-0.5">Delete</button>
                        <button onClick={() => setConfirmId(null)}
                          className="text-xs text-zinc-400 border border-zinc-300 dark:border-zinc-600 rounded px-1.5 py-0.5">Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmId(e.id)}
                        className="text-xs text-zinc-300 dark:text-zinc-600 hover:text-red-400">✕</button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
