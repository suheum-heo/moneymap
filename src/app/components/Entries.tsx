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
import type { RecurringItem } from '../useRecurring'
import EntryEditModal from './EntryEditModal'

interface Props {
  entries: Entry[]
  items?: RecurringItem[]
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

function formatManualOrderTime(index: number, total: number, sortOrder: EntrySortOrder) {
  const orderedIndex = sortOrder === 'newest' ? total - index - 1 : index
  const seconds = Math.max(0, Math.min(86399, orderedIndex))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export default function Entries({ entries, items = [], month, onDelete, onUpdate, initialTypeFilter = 'all', initialCategoryFilter = 'all', sortOrder, onSortOrderChange, activeContext, convert, expenseCategories, incomeCategories }: Props) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage || i18n.language
  const [typeFilter, setTypeFilter] = useState(initialTypeFilter)
  const [catFilter, setCatFilter] = useState(initialCategoryFilter)
  const [search, setSearch] = useState('')
  const [weekOnly, setWeekOnly] = useState(false)
  const [editEntry, setEditEntry] = useState<Entry | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [reorderMode, setReorderMode] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)

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
        (e.paymentMethod || '').toLowerCase().includes(q) ||
        (e.remarks || '').toLowerCase().includes(q)
      )
    }
    return sortEntriesForDisplay(f, sortOrder)
  }, [monthEntries, typeFilter, catFilter, search, weekOnly, weekRange, sortOrder])

  const sameDateEntriesByDate = useMemo(() => {
    const groups = new Map<string, Entry[]>()
    monthEntries.forEach(entry => {
      const group = groups.get(entry.date) || []
      group.push(entry)
      groups.set(entry.date, group)
    })
    groups.forEach((group, date) => {
      groups.set(date, sortEntriesForDisplay(group, sortOrder))
    })
    return groups
  }, [monthEntries, sortOrder])

  const openEdit = (e: Entry) => setEditEntry(e)

  const toggleReorderMode = () => {
    setReorderMode(value => !value)
    setDraggedId(null)
    setDropTargetId(null)
  }

  const saveSameDateOrder = (ordered: Entry[]) => {
    ordered.forEach((entry, index) => {
      const time = formatManualOrderTime(index, ordered.length, sortOrder)
      if (entry.time === time) return
      onUpdate({ ...entry, time })
    })
  }

  const moveEntryWithinDate = (entryId: string, direction: -1 | 1) => {
    const entry = monthEntries.find(item => item.id === entryId)
    if (!entry) return
    const sameDateEntries = sameDateEntriesByDate.get(entry.date) || []
    const fromIndex = sameDateEntries.findIndex(item => item.id === entryId)
    const toIndex = fromIndex + direction
    if (fromIndex < 0 || toIndex < 0 || toIndex >= sameDateEntries.length) return

    const ordered = [...sameDateEntries]
    const [moved] = ordered.splice(fromIndex, 1)
    ordered.splice(toIndex, 0, moved)
    saveSameDateOrder(ordered)
  }

  const reorderEntryToTarget = (entryId: string, targetId: string) => {
    if (entryId === targetId) return
    const entry = monthEntries.find(item => item.id === entryId)
    const target = monthEntries.find(item => item.id === targetId)
    if (!entry || !target || entry.date !== target.date) return

    const sameDateEntries = sameDateEntriesByDate.get(entry.date) || []
    const fromIndex = sameDateEntries.findIndex(item => item.id === entryId)
    const targetIndex = sameDateEntries.findIndex(item => item.id === targetId)
    if (fromIndex < 0 || targetIndex < 0) return

    const ordered = [...sameDateEntries]
    const [moved] = ordered.splice(fromIndex, 1)
    ordered.splice(targetIndex, 0, moved)
    saveSameDateOrder(ordered)
  }

  const exportCSV = () => {
    const headers = [t('date'), t('expense') + '/' + t('income2'), t('summary'), t('venue'), t('location'), t('category'), t('amount'), t('currency'), t('paymentMethod'), t('remarks')]
    const rows = filtered.map(e => [e.date, e.type, e.summary, e.venue || '', e.location || '', e.category, e.amount, getEntryCurrency(e, cur, homeCur), e.paymentMethod || '', e.remarks || ''])
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
        items={items}
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
          <div className="flex w-full items-center justify-end gap-2 sm:ml-auto sm:w-auto">
            <button
              type="button"
              onClick={toggleReorderMode}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2.5 text-xs font-semibold transition-all ${reorderMode
                ? 'border-[#b9d4ff] bg-[#eef5ff] text-[#245ec6] shadow-[0_12px_22px_-18px_rgba(49,130,246,0.35)] dark:border-sky-400/25 dark:bg-sky-500/10 dark:text-sky-200'
                : 'border-slate-200/85 bg-white/90 text-slate-500 hover:border-[#cfe0ff] hover:text-[#3578e5] dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:border-sky-400/25 dark:hover:text-sky-300'}`}
            >
              <span aria-hidden="true">↕</span>
              <span>{reorderMode ? t('doneReordering') : t('reorderEntries')}</span>
            </button>
            <button onClick={exportCSV} className="app-button-secondary whitespace-nowrap px-4 py-2.5 text-xs">
              {t('exportCSV')}
            </button>
          </div>
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
            const sameDateEntries = sameDateEntriesByDate.get(e.date) || []
            const dateIndex = sameDateEntries.findIndex(item => item.id === e.id)
            const canReorder = sameDateEntries.length > 1
            const isDragged = draggedId === e.id
            const isDropTarget = dropTargetId === e.id && draggedId !== e.id
            return (
              <div
                key={e.id}
                onDragOver={event => {
                  if (!reorderMode || !draggedId || draggedId === e.id) return
                  const dragged = monthEntries.find(item => item.id === draggedId)
                  if (!dragged || dragged.date !== e.date) return
                  event.preventDefault()
                  event.dataTransfer.dropEffect = 'move'
                  setDropTargetId(e.id)
                }}
                onDragLeave={() => setDropTargetId(current => current === e.id ? null : current)}
                onDrop={event => {
                  if (!reorderMode) return
                  event.preventDefault()
                  const entryId = draggedId || event.dataTransfer.getData('text/plain')
                  reorderEntryToTarget(entryId, e.id)
                  setDraggedId(null)
                  setDropTargetId(null)
                }}
                className={`app-list-row flex min-w-0 items-start gap-3 transition-all ${reorderMode ? 'border-[#dce8fb] bg-[#fbfdff] dark:border-sky-400/15 dark:bg-slate-900/80' : ''} ${isDragged ? 'opacity-45' : ''} ${isDropTarget ? 'border-[#8eb6f7] bg-[#f5f9ff] ring-4 ring-[#3182f6]/10 dark:border-sky-400/25 dark:bg-slate-900/80' : ''}`}
              >
                {reorderMode && (
                  <div className="flex w-8 flex-shrink-0 flex-col items-center gap-1">
                    <button
                      type="button"
                      draggable={canReorder}
                      onDragStart={event => {
                        if (!canReorder) {
                          event.preventDefault()
                          return
                        }
                        event.dataTransfer.effectAllowed = 'move'
                        event.dataTransfer.setData('text/plain', e.id)
                        setDraggedId(e.id)
                      }}
                      onDragEnd={() => {
                        setDraggedId(null)
                        setDropTargetId(null)
                      }}
                      title={t('reorderEntry')}
                      aria-label={t('reorderEntry')}
                      className={`grid h-9 w-8 place-items-center rounded-[14px] border transition-colors ${canReorder
                        ? 'cursor-grab border-[#cfe0ff] bg-white text-[#5b8ef0] active:cursor-grabbing hover:border-[#9fc2fb] dark:border-sky-400/20 dark:bg-slate-950/70 dark:text-sky-300 dark:hover:border-sky-400/40'
                        : 'cursor-default border-slate-100 bg-slate-50 text-slate-200 dark:border-white/5 dark:bg-white/5 dark:text-slate-700'}`}
                    >
                      <span className="grid grid-cols-2 gap-0.5" aria-hidden="true">
                        <span className="h-1 w-1 rounded-full bg-current" />
                        <span className="h-1 w-1 rounded-full bg-current" />
                        <span className="h-1 w-1 rounded-full bg-current" />
                        <span className="h-1 w-1 rounded-full bg-current" />
                        <span className="h-1 w-1 rounded-full bg-current" />
                        <span className="h-1 w-1 rounded-full bg-current" />
                      </span>
                    </button>
                    {canReorder && (
                      <div className="grid gap-0.5 rounded-[14px] border border-slate-200/70 bg-white/85 p-0.5 shadow-[0_10px_18px_-18px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-slate-950/70">
                        <button
                          type="button"
                          onClick={() => moveEntryWithinDate(e.id, -1)}
                          disabled={dateIndex <= 0}
                          title={t('moveEntryUp')}
                          aria-label={t('moveEntryUp')}
                          className="flex h-6 w-7 items-center justify-center rounded-[10px] text-[11px] text-slate-400 transition-colors enabled:hover:bg-[#eef5ff] enabled:hover:text-[#3578e5] disabled:opacity-25 dark:text-slate-500 dark:enabled:hover:bg-sky-500/10 dark:enabled:hover:text-sky-300"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveEntryWithinDate(e.id, 1)}
                          disabled={dateIndex < 0 || dateIndex >= sameDateEntries.length - 1}
                          title={t('moveEntryDown')}
                          aria-label={t('moveEntryDown')}
                          className="flex h-6 w-7 items-center justify-center rounded-[10px] text-[11px] text-slate-400 transition-colors enabled:hover:bg-[#eef5ff] enabled:hover:text-[#3578e5] disabled:opacity-25 dark:text-slate-500 dark:enabled:hover:bg-sky-500/10 dark:enabled:hover:text-sky-300"
                        >
                          ↓
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[18px] bg-slate-50 text-xs font-medium text-slate-500 dark:bg-slate-900/80 dark:text-slate-300">
                  {formatEntryDate(e.date, language)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: col }} />
                    <div className="truncate text-sm font-medium leading-snug text-slate-800 dark:text-zinc-100">{e.summary}</div>
                  </div>
                  {e.venue && <div className="mt-1 truncate text-xs text-slate-400">{e.venue}{e.location ? ` · ${e.location}` : ''}</div>}
                  {e.paymentMethod && <div className="text-xs text-slate-400 truncate">{e.paymentMethod}</div>}
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
