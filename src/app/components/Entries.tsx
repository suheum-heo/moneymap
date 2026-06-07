'use client'
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Entry,
  Context,
  EntrySortOrder,
  convertEntryAmount,
  formatAmount,
  formatEntryDate,
  getCategoryBadgeStyle,
  getCategoryColor,
  getEntryCurrency,
  sortEntriesForDisplay,
} from '../types'
import EntryEditModal from './EntryEditModal'

interface Props {
  entries: Entry[]
  month: string
  onDelete: (id: string) => void
  onUpdate: (entry: Entry) => void
  initialTypeFilter?: string
  initialCategoryFilter?: string
  sortOrder: EntrySortOrder
  onSortOrderChange: (sortOrder: EntrySortOrder) => void
  activeContext?: Context
  convert: (amount: number, from: string, to: string) => number
  expenseCategories: string[]
  incomeCategories: string[]
}

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

export default function Entries({ entries, month, onDelete, onUpdate, initialTypeFilter = 'all', initialCategoryFilter = 'all', sortOrder, onSortOrderChange, activeContext, convert, expenseCategories, incomeCategories }: Props) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage || i18n.language
  const [typeFilter, setTypeFilter] = useState(initialTypeFilter)
  const [catFilter, setCatFilter] = useState(initialCategoryFilter)
  const [search, setSearch] = useState('')
  const [weekOnly, setWeekOnly] = useState(false)
  const [editEntry, setEditEntry] = useState<Entry | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

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
    return sortEntriesForDisplay(f, sortOrder)
  }, [monthEntries, typeFilter, catFilter, search, weekOnly, weekRange, sortOrder])

  const openEdit = (e: Entry) => setEditEntry(e)

  const exportCSV = () => {
    const headers = [t('date'), t('expense') + '/' + t('income2'), t('summary'), t('venue'), t('location'), t('category'), t('amount'), t('currency'), t('remarks')]
    const rows = filtered.map(e => [e.date, e.type, e.summary, e.venue || '', e.location || '', e.category, e.amount, getEntryCurrency(e, cur, homeCur), e.remarks || ''])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${activeContext?.name || 'entries'}-${month}${weekOnly ? '-week' : ''}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const weekTotal = useMemo(() => {
    if (!weekOnly) return null
    return filtered
      .filter(e => e.type === 'expense')
      .reduce((s, e) => s + convertEntryAmount(e, cur, homeCur, cur, convert), 0)
  }, [filtered, weekOnly, cur, homeCur, convert])

  const selCls = "app-select px-3 py-2.5 text-sm"
  const inputCls = "app-input py-3 text-sm"
  return (
    <div className="px-4 pb-6 space-y-3">
      <EntryEditModal
        entry={editEntry}
        entries={entries}
        activeContext={activeContext}
        expenseCategories={expenseCategories}
        incomeCategories={incomeCategories}
        onClose={() => setEditEntry(null)}
        onUpdate={onUpdate}
      />

      <div className="app-panel p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="app-kicker">{t('entries')}</div>
          <div className="inline-flex rounded-full border border-slate-200/80 bg-slate-50/90 p-1 dark:border-white/10 dark:bg-slate-900/80">
            {([
              ['newest', t('newest')],
              ['oldest', t('oldest')],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => onSortOrderChange(value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${sortOrder === value
                  ? 'bg-white text-slate-900 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.26)] dark:bg-slate-950 dark:text-zinc-100'
                  : 'text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-zinc-200'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
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
          <span className="app-accent text-xs font-medium">{t('thisWeek')} ({formatEntryDate(weekRange.start, language)} – {formatEntryDate(weekRange.end, language)})</span>
          <span className="app-negative text-sm font-semibold">-{formatAmount(weekTotal, cur)}</span>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="app-panel py-12 text-center text-sm text-slate-400">{t('noEntriesFound')}</div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(e => {
            const entryCurrency = getEntryCurrency(e, cur, homeCur)
            const col = getCategoryColor(e.category, e.type)
            const badgeStyle = getCategoryBadgeStyle(e.category, e.type)
            const isIncome = e.type === 'income'
            const converted = showConversion ? convertEntryAmount(e, cur, homeCur, homeCur, convert) : null
            return (
              <div key={e.id} className="app-list-row flex items-start gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[18px] bg-slate-50 text-xs font-medium text-slate-500 dark:bg-slate-900/80 dark:text-slate-300">
                  {formatEntryDate(e.date, language)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: col }} />
                    <div className="truncate text-sm font-medium leading-snug text-slate-800 dark:text-zinc-100">{e.summary}</div>
                  </div>
                  {e.venue && <div className="mt-1 truncate text-xs text-slate-400">{e.venue}{e.location ? ` · ${e.location}` : ''}</div>}
                  {e.remarks && <div className="text-xs text-slate-400 truncate">{e.remarks}</div>}
                  <span className="mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium" style={badgeStyle}>{e.category}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="text-sm font-semibold" style={{ color: col }}>
                    {isIncome ? '+' : '-'}{formatAmount(e.amount, entryCurrency)}
                  </div>
                  {converted !== null && <div className="text-xs text-slate-400">≈{formatAmount(converted, homeCur)}</div>}
                  <div className="mt-1 flex gap-2">
                    <button onClick={() => openEdit(e)} className="app-accent text-xs font-medium transition-colors hover:text-[#255fcb] dark:hover:text-sky-200">{t('edit')}</button>
                    {confirmId === e.id ? (
                      <>
                        <button onClick={() => { onDelete(e.id); setConfirmId(null) }} className="rounded-full border border-rose-200/90 px-2 py-1 text-xs font-medium text-rose-400 dark:border-rose-400/20 dark:text-rose-300">{t('deleteEntry')}</button>
                        <button onClick={() => setConfirmId(null)} className="rounded-full border border-slate-300/80 px-2 py-1 text-xs text-slate-400 dark:border-white/10">{t('cancel')}</button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmId(e.id)} className="text-xs text-slate-300 transition-colors hover:text-rose-300 dark:text-slate-600">✕</button>
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
