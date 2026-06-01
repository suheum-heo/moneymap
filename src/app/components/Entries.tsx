'use client'
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Entry, CAT_COLORS, getCurrencySymbol, formatAmount, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../types'
import { useSettings } from '../useSettings'
import { useCategories } from '../useCategories'

interface Props {
  entries: Entry[]
  month: string
  onDelete: (id: string) => void
  onUpdate: (entry: Entry) => void
  initialTypeFilter?: string
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function daysInMonth(m: number, y: number) { return new Date(y, m + 1, 0).getDate() }

function getWeekRange() {
  const now = new Date()
  const day = now.getDay()
  const mon = new Date(now)
  mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  mon.setHours(0,0,0,0)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  sun.setHours(23,59,59,999)
  return { start: mon.toISOString().slice(0,10), end: sun.toISOString().slice(0,10) }
}

export default function Entries({ entries, month, onDelete, onUpdate, initialTypeFilter = 'all' }: Props) {
  const { t } = useTranslation()
  const [typeFilter, setTypeFilter] = useState(initialTypeFilter)
  const [catFilter, setCatFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [weekOnly, setWeekOnly] = useState(false)
  const { activeContext, convert } = useSettings()
  const [editEntry, setEditEntry] = useState<Entry | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const { expenseCategories, incomeCategories } = useCategories()

  const cur = activeContext?.currency || 'USD'
  const homeCur = activeContext?.homeCurrency || cur
  const showConversion = cur !== homeCur

  const weekRange = useMemo(() => getWeekRange(), [])

  const monthEntries = useMemo(() =>
    entries.filter(e => e.date.startsWith(month) && e.context === activeContext?.id),
    [entries, month, activeContext])

  const allCats = useMemo(() =>
    [...new Set(monthEntries.map(e => e.category))].sort(), [monthEntries])

  const filtered = useMemo(() => {
    let f = monthEntries
    if (typeFilter !== 'all') f = f.filter(e => e.type === typeFilter)
    if (catFilter !== 'all') f = f.filter(e => e.category === catFilter)
    if (weekOnly) f = f.filter(e => e.date >= weekRange.start && e.date <= weekRange.end)
    if (search.trim()) {
      const q = search.toLowerCase()
      f = f.filter(e =>
        e.summary.toLowerCase().includes(q) ||
        (e.venue || '').toLowerCase().includes(q) ||
        (e.location || '').toLowerCase().includes(q) ||
        (e.remarks || '').toLowerCase().includes(q)
      )
    }
    return [...f].sort((a, b) => a.date.localeCompare(b.date))
  }, [monthEntries, typeFilter, catFilter, search, weekOnly, weekRange])

  const pastVenues = useMemo(() => [...new Set(entries.map(e => e.venue).filter(Boolean))].sort(), [entries])
  const pastLocations = useMemo(() => [...new Set(entries.map(e => e.location).filter(Boolean))].sort(), [entries])

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
    setEditMonth(m - 1); setEditDay(d); setEditYear(y)
    setEditAmount(e.amount.toString()); setEditSummary(e.summary)
    setEditVenue(e.venue || ''); setEditLocation(e.location || '')
    setEditCategory(e.category); setEditRemarks(e.remarks || '')
    setEditType(e.type); setEditEntry(e)
  }

  const handleSave = () => {
    if (!editEntry) return
    const parsed = parseFloat(editAmount)
    if (isNaN(parsed) || parsed <= 0 || !editSummary.trim()) return
    const dateStr = `${editYear}-${String(editMonth + 1).padStart(2, '0')}-${String(editDay).padStart(2, '0')}`
    onUpdate({ ...editEntry, type: editType, date: dateStr, amount: parsed, summary: editSummary.trim(), venue: editVenue.trim(), location: editLocation.trim(), category: editCategory, remarks: editRemarks.trim() })
    setEditEntry(null)
  }

  const exportCSV = () => {
    const headers = [t('date'), t('expense') + '/' + t('income2'), t('summary'), t('venue'), t('location'), t('category'), t('amount'), 'Currency', t('remarks')]
    const rows = filtered.map(e => [e.date, e.type, e.summary, e.venue || '', e.location || '', e.category, e.amount, e.currency || cur, e.remarks || ''])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${activeContext?.name || 'entries'}-${month}${weekOnly ? '-week' : ''}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const weekTotal = useMemo(() => {
    if (!weekOnly) return null
    return filtered.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  }, [filtered, weekOnly])

  const selCls = "app-select px-3 py-2.5 text-sm"
  const inputCls = "app-input py-3 text-sm"
  const miniSelCls = "app-select w-full px-3 py-2.5 text-sm"
  const years = Array.from({ length: 80 }, (_, i) => 2020 + i)
  const editDays = Array.from({ length: daysInMonth(editMonth, editYear) }, (_, i) => i + 1)
  const editCats = editType === 'expense' ? expenseCategories : incomeCategories
  return (
    <div className="px-4 pb-8 space-y-4">
      {editEntry && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-4 backdrop-blur-sm md:items-center" onClick={() => setEditEntry(null)}>
          <div className="app-panel w-full max-w-lg p-5" onClick={e => e.stopPropagation()}>
            <div className="mb-1 flex items-center justify-between">
              <div>
                <div className="app-kicker mb-2">{t('entries')}</div>
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
              <label className="app-kicker mb-2 block">{t('amount')} ({cur})</label>
              <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} className={inputCls} step="0.01" inputMode="decimal" style={{fontSize:'16px'}} />
            </div>
            <div>
              <label className="app-kicker mb-2 block">{t('summary')}</label>
              <input type="text" value={editSummary} onChange={e => setEditSummary(e.target.value)} className={inputCls} style={{fontSize:'16px'}} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="app-kicker mb-2 block">{t('venue')}</label>
                <input type="text" value={editVenue} onChange={e => setEditVenue(e.target.value)} className={inputCls} style={{fontSize:'16px'}} list="edit-venue-list" />
              </div>
              <div>
                <label className="app-kicker mb-2 block">{t('location')}</label>
                <input type="text" value={editLocation} onChange={e => setEditLocation(e.target.value)} className={inputCls} style={{fontSize:'16px'}} list="edit-location-list" />
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
            <datalist id="edit-venue-list">{pastVenues.map(v => <option key={v} value={v} />)}</datalist>
            <datalist id="edit-location-list">{pastLocations.map(l => <option key={l} value={l} />)}</datalist>
          </div>
        </div>
      )}

      <div className="app-panel p-4 sm:p-5">
        <div className="app-kicker mb-3">{t('entries')}</div>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchEntries')}
          className={`${inputCls} mb-3`} style={{fontSize:'16px'}} />

        <div className="flex flex-wrap items-center gap-2">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={selCls}>
            <option value="all">{t('allTypes')}</option>
            <option value="expense">{t('expenses')}</option>
            <option value="income">{t('income')}</option>
          </select>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className={selCls}>
            <option value="all">{t('allCategories')}</option>
            {allCats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => setWeekOnly(v => !v)}
            className={weekOnly ? 'app-segment app-segment-active' : 'app-button-secondary'}>
            {t('thisWeek')}
          </button>
          <button onClick={exportCSV} className="app-button-secondary ml-auto px-4 py-2.5 text-xs">
            {t('exportCSV')}
          </button>
        </div>
      </div>

      {weekOnly && weekTotal !== null && (
        <div className="app-panel flex items-center justify-between gap-3 px-4 py-3">
          <span className="text-xs font-medium text-[#3182f6] dark:text-sky-300">{t('thisWeek')} ({weekRange.start.slice(5)} – {weekRange.end.slice(5)})</span>
          <span className="text-sm font-semibold text-rose-500 dark:text-rose-300">-{formatAmount(weekTotal, cur)}</span>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="app-panel py-14 text-center text-sm text-slate-400">{t('noEntriesFound')}</div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(e => {
            const col = e.type === 'income' ? '#3B6D11' : (CAT_COLORS[e.category] || '#888')
            const isIncome = e.type === 'income'
            const converted = showConversion ? (e.homeAmount ?? convert(e.amount, cur, homeCur)) : null
            return (
              <div key={e.id} className="app-list-row flex items-start gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[18px] bg-slate-50 text-xs font-medium text-slate-500 dark:bg-slate-900/80 dark:text-slate-300">
                  {e.date.slice(5)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: col }} />
                    <div className="truncate text-sm font-medium leading-snug text-slate-800 dark:text-zinc-100">{e.summary}</div>
                  </div>
                  {e.venue && <div className="mt-1 truncate text-xs text-slate-400">{e.venue}{e.location ? ` · ${e.location}` : ''}</div>}
                  {e.remarks && <div className="text-xs text-slate-400 truncate">{e.remarks}</div>}
                  <span className="mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: col + '14', color: col }}>{e.category}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="text-sm font-semibold" style={{ color: col }}>
                    {isIncome ? '+' : '-'}{formatAmount(e.amount, e.currency || cur)}
                  </div>
                  {converted !== null && <div className="text-xs text-slate-400">≈{formatAmount(converted, homeCur)}</div>}
                  <div className="mt-1 flex gap-2">
                    <button onClick={() => openEdit(e)} className="text-xs font-medium text-[#3182f6] hover:text-[#2272e7] dark:text-sky-300 dark:hover:text-sky-200">{t('edit')}</button>
                    {confirmId === e.id ? (
                      <>
                        <button onClick={() => { onDelete(e.id); setConfirmId(null) }} className="rounded-full border border-rose-200 px-2 py-1 text-xs font-medium text-rose-500 dark:border-rose-400/20 dark:text-rose-300">{t('deleteEntry')}</button>
                        <button onClick={() => setConfirmId(null)} className="rounded-full border border-slate-300/80 px-2 py-1 text-xs text-slate-400 dark:border-white/10">{t('cancel')}</button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmId(e.id)} className="text-xs text-slate-300 transition-colors hover:text-rose-400 dark:text-slate-600">✕</button>
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
