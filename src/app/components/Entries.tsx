'use client'
import { useState, useMemo, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Entry,
  Context,
  EntrySortOrder,
  convertEntryAmount,
  formatAmount,
  formatEntryDate,
  formatSecondsAsEntryTime,
  getCategoryBadgeStyle,
  getCategoryColor,
  getEntryCurrency,
  sortEntriesForDisplay,
} from '../types'
import type { RecurringItem } from '../useRecurring'
import EntryEditModal from './EntryEditModal'

const ENTRIES_PAGE_SIZE = 20

/** Compact page list: 1 … 4 5 6 … 20 */
function getVisiblePageNumbers(current: number, total: number): Array<number | 'ellipsis'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages = new Set<number>([1, total, current])
  for (let delta = 1; delta <= 1; delta++) {
    if (current - delta > 1) pages.add(current - delta)
    if (current + delta < total) pages.add(current + delta)
  }
  // Keep a bit more context near the ends
  if (current <= 3) {
    pages.add(2)
    pages.add(3)
    pages.add(4)
  }
  if (current >= total - 2) {
    pages.add(total - 1)
    pages.add(total - 2)
    pages.add(total - 3)
  }

  const sorted = Array.from(pages).filter(page => page >= 1 && page <= total).sort((a, b) => a - b)
  const result: Array<number | 'ellipsis'> = []
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) result.push('ellipsis')
    result.push(page)
  })
  return result
}

interface Props {
  entries: Entry[]
  items?: RecurringItem[]
  month: string
  onDelete: (id: string) => void
  onUpdate: (entry: Entry) => void
  onAdd?: (entry: Entry) => Promise<void> | void
  initialTypeFilter?: string
  initialCategoryFilter?: string
  sortOrder: EntrySortOrder
  onSortOrderChange: (sortOrder: EntrySortOrder) => void
  activeContext?: Context
  contexts?: Context[]
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
  return formatSecondsAsEntryTime(orderedIndex)
}

function formatManualOrderCreatedAt(index: number, total: number, sortOrder: EntrySortOrder, baseMs: number) {
  // Newest sort shows highest createdAt first, so the top row gets the largest timestamp.
  const orderedIndex = sortOrder === 'newest' ? total - index : index + 1
  return new Date(baseMs + orderedIndex).toISOString()
}

export default function Entries({ entries, items = [], month, onDelete, onUpdate, onAdd, initialTypeFilter = 'all', initialCategoryFilter = 'all', sortOrder, onSortOrderChange, activeContext, contexts = [], convert, expenseCategories, incomeCategories }: Props) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage || i18n.language
  const [typeFilter, setTypeFilter] = useState(initialTypeFilter)
  const [catFilter, setCatFilter] = useState(initialCategoryFilter)
  const [search, setSearch] = useState('')
  const [weekOnly, setWeekOnly] = useState(false)
  const [dateScope, setDateScope] = useState<'month' | 'year' | 'all'>('month')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [editEntry, setEditEntry] = useState<Entry | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [reorderMode, setReorderMode] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const listTopRef = useRef<HTMLDivElement | null>(null)

  const cur = activeContext?.currency || 'USD'
  const homeCur = activeContext?.homeCurrency || cur
  const showConversion = cur !== homeCur

  const weekRange = useMemo(() => getWeekRange(), [])

  const selectedYear = month.slice(0, 4)

  const contextEntries = useMemo(() =>
    entries.filter(e => e.context === activeContext?.id),
    [entries, activeContext])

  const scopedEntries = useMemo(() => {
    if (dateScope === 'all') return contextEntries
    if (dateScope === 'year') return contextEntries.filter(e => e.date.startsWith(selectedYear))
    return contextEntries.filter(e => e.date.startsWith(month))
  }, [contextEntries, dateScope, month, selectedYear])

  // Keep same-day reorder helpers scoped to the currently selected month.
  const monthEntries = useMemo(() =>
    contextEntries.filter(e => e.date.startsWith(month)),
    [contextEntries, month])

  const allCats = useMemo(() =>
    [...new Set(scopedEntries.map(e => e.category))].sort(), [scopedEntries])

  const minAmountValue = minAmount.trim() === '' ? null : Number(minAmount)
  const maxAmountValue = maxAmount.trim() === '' ? null : Number(maxAmount)

  const filtered = useMemo(() => {
    let f = scopedEntries
    if (typeFilter !== 'all') f = f.filter(e => e.type === typeFilter)
    if (catFilter !== 'all') f = f.filter(e => e.category === catFilter)
    if (weekOnly) f = f.filter(e => e.date >= weekRange.start && e.date <= weekRange.end)
    if (minAmountValue != null && Number.isFinite(minAmountValue)) {
      f = f.filter(e => convertEntryAmount(e, cur, homeCur, cur, convert) >= minAmountValue)
    }
    if (maxAmountValue != null && Number.isFinite(maxAmountValue)) {
      f = f.filter(e => convertEntryAmount(e, cur, homeCur, cur, convert) <= maxAmountValue)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      f = f.filter(e =>
        e.summary.toLowerCase().includes(q) ||
        (e.venue || '').toLowerCase().includes(q) ||
        (e.location || '').toLowerCase().includes(q) ||
        (e.paymentMethod || '').toLowerCase().includes(q) ||
        (e.remarks || '').toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      )
    }
    return sortEntriesForDisplay(f, sortOrder)
  }, [scopedEntries, typeFilter, catFilter, search, weekOnly, weekRange, sortOrder, minAmountValue, maxAmountValue, cur, homeCur, convert])

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

  // Reorder needs every same-day sibling visible, so skip paging while reordering.
  const pageSize = reorderMode ? Math.max(filtered.length, 1) : ENTRIES_PAGE_SIZE
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageStart = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize
  const pageEnd = Math.min(filtered.length, pageStart + pageSize)
  const pagedEntries = useMemo(
    () => filtered.slice(pageStart, pageEnd),
    [filtered, pageStart, pageEnd],
  )
  const showPagination = !reorderMode && filtered.length > ENTRIES_PAGE_SIZE
  const visiblePageNumbers = useMemo(
    () => getVisiblePageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  )

  useEffect(() => {
    setPage(1)
  }, [
    typeFilter,
    catFilter,
    search,
    weekOnly,
    dateScope,
    minAmount,
    maxAmount,
    month,
    activeContext?.id,
    sortOrder,
    reorderMode,
  ])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const goToPage = (nextPage: number) => {
    const clamped = Math.min(Math.max(1, nextPage), totalPages)
    setPage(clamped)
    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const openEdit = (e: Entry) => setEditEntry(e)

  const toggleReorderMode = () => {
    setReorderMode(value => !value)
    setDraggedId(null)
    setDropTargetId(null)
  }

  const saveSameDateOrder = (ordered: Entry[]) => {
    const baseMs = Date.now()
    ordered.forEach((entry, index) => {
      const time = formatManualOrderTime(index, ordered.length, sortOrder)
      const createdAt = formatManualOrderCreatedAt(index, ordered.length, sortOrder, baseMs)
      if (entry.time === time && entry.createdAt === createdAt) return
      onUpdate({ ...entry, time, createdAt })
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
    const scopeLabel = dateScope === 'all' ? 'all' : dateScope === 'year' ? selectedYear : month
    a.href = url; a.download = `${activeContext?.name || 'entries'}-${scopeLabel}${weekOnly ? '-week' : ''}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const weekTotal = useMemo(() => {
    if (!weekOnly) return null
    return filtered
      .filter(e => e.type === 'expense')
      .reduce((s, e) => s + convertEntryAmount(e, cur, homeCur, cur, convert), 0)
  }, [filtered, weekOnly, cur, homeCur, convert])

  const filterTotals = useMemo(() => {
    let expense = 0
    let income = 0
    for (const e of filtered) {
      const amount = convertEntryAmount(e, cur, homeCur, cur, convert)
      if (e.type === 'income') income += amount
      else expense += amount
    }
    return { expense, income, net: income - expense, count: filtered.length }
  }, [filtered, cur, homeCur, convert])

  const scopeLabel = dateScope === 'all'
    ? t('allTime')
    : dateScope === 'year'
      ? selectedYear
      : month

  const inputCls = "app-input py-3 text-sm"
  // Shared chip style so selects, amount fields, and action buttons match height/radius.
  const chipBase =
    'h-10 box-border rounded-full border border-slate-200/85 bg-white/95 text-xs font-medium leading-none text-slate-600 outline-none transition dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
  const selectChevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`
  const chipSelectCls =
    `${chipBase} appearance-none bg-[length:12px] bg-[position:right_12px_center] bg-no-repeat py-0 pl-3.5 pr-9`
  const chipAmountCls =
    `${chipBase} w-[10rem] min-w-[10rem] px-3.5 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`
  const chipBtnCls =
    `${chipBase} inline-flex items-center justify-center gap-1.5 whitespace-nowrap px-3.5 hover:border-[#cfe0ff] hover:text-[#3578e5] dark:hover:border-sky-400/25 dark:hover:text-sky-300`
  const chipBtnActiveCls =
    'h-10 box-border inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-[#b9d4ff] bg-[#eef5ff] px-3.5 text-xs font-semibold leading-none text-[#245ec6] shadow-[0_12px_22px_-18px_rgba(49,130,246,0.35)] transition dark:border-sky-400/25 dark:bg-sky-500/10 dark:text-sky-200'

  return (
    <div className="px-4 pb-6 space-y-3">
      <EntryEditModal
        entry={editEntry}
        entries={entries}
        items={items}
        activeContext={activeContext}
        contexts={contexts}
        expenseCategories={expenseCategories}
        incomeCategories={incomeCategories}
        sortOrder={sortOrder}
        onClose={() => setEditEntry(null)}
        onUpdate={onUpdate}
        onAdd={onAdd}
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

        <div className="mb-3 inline-flex max-w-full flex-wrap rounded-full border border-slate-200/80 bg-slate-50/90 p-1 dark:border-white/10 dark:bg-slate-900/80">
          {([
            ['month', t('thisMonth')],
            ['year', t('year')],
            ['all', t('allTime')],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setDateScope(value)
                if (value !== 'month') {
                  setWeekOnly(false)
                  setReorderMode(false)
                  setDraggedId(null)
                  setDropTargetId(null)
                }
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${dateScope === value
                ? 'bg-white text-slate-900 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.26)] dark:bg-slate-950 dark:text-zinc-100'
                : 'text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-zinc-200'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={chipSelectCls} style={{ backgroundImage: selectChevron }}>
            <option value="all">{t('allTypes')}</option>
            <option value="expense">{t('expenses')}</option>
            <option value="income">{t('income')}</option>
          </select>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className={chipSelectCls} style={{ backgroundImage: selectChevron }}>
            <option value="all">{t('allCategories')}</option>
            {allCats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            type="number"
            inputMode="decimal"
            value={minAmount}
            onChange={e => setMinAmount(e.target.value)}
            placeholder={t('minAmount')}
            className={chipAmountCls}
            style={{ fontSize: '16px' }}
          />
          <span className="inline-flex h-10 items-center text-xs text-slate-400" aria-hidden="true">–</span>
          <input
            type="number"
            inputMode="decimal"
            value={maxAmount}
            onChange={e => setMaxAmount(e.target.value)}
            placeholder={t('maxAmount')}
            className={chipAmountCls}
            style={{ fontSize: '16px' }}
          />
          {dateScope === 'month' && (
            <button
              type="button"
              onClick={() => setWeekOnly(v => !v)}
              className={weekOnly ? chipBtnActiveCls : chipBtnCls}
            >
              {t('thisWeek')}
            </button>
          )}
          <div className="flex w-full items-center justify-end gap-2 sm:ml-auto sm:w-auto">
            {dateScope === 'month' && (
              <button
                type="button"
                onClick={toggleReorderMode}
                className={reorderMode ? chipBtnActiveCls : chipBtnCls}
              >
                <span aria-hidden="true">↕</span>
                <span>{reorderMode ? t('doneReordering') : t('reorderEntries')}</span>
              </button>
            )}
            <button type="button" onClick={exportCSV} className={chipBtnCls}>
              {t('exportCSV')}
            </button>
          </div>
        </div>
      </div>

      {(dateScope !== 'month' || weekOnly || minAmountValue != null || maxAmountValue != null || typeFilter !== 'all' || catFilter !== 'all' || search.trim()) && (
        <div className="app-panel space-y-2 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="app-accent text-xs font-medium">
              {weekOnly
                ? `${t('thisWeek')} (${formatEntryDate(weekRange.start, language)} – ${formatEntryDate(weekRange.end, language)})`
                : scopeLabel}
            </span>
            <span className="text-xs text-slate-400">{t('entriesInPeriod', { count: filterTotals.count })}</span>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap gap-4 text-xs">
              <div>
                <div className="text-slate-400">{t('expenses')}</div>
                <div className="app-negative font-semibold">-{formatAmount(filterTotals.expense, cur)}</div>
              </div>
              <div>
                <div className="text-slate-400">{t('income')}</div>
                <div className="font-semibold text-emerald-600 dark:text-emerald-400">+{formatAmount(filterTotals.income, cur)}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">{t('total')}</div>
              <div className={`text-sm font-semibold ${filterTotals.net < 0 ? 'app-negative' : 'app-accent'}`}>
                {(filterTotals.net < 0 ? '-' : '') + formatAmount(Math.abs(filterTotals.net), cur)}
              </div>
            </div>
          </div>
          {weekOnly && weekTotal !== null && (
            <div className="text-xs text-slate-400">{t('thisWeek')}: <span className="app-negative font-medium">-{formatAmount(weekTotal, cur)}</span></div>
          )}
        </div>
      )}

      <div ref={listTopRef} />

      {filtered.length === 0 ? (
        <div className="app-panel py-12 text-center text-sm text-slate-400">{t('noEntriesFound')}</div>
      ) : (
        <div className="flex flex-col gap-3">
          {pagedEntries.map(e => {
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

          {showPagination && (
            <div className="app-panel flex flex-col gap-3 px-4 py-3">
              <div className="flex flex-col gap-1 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                <span>{t('entriesPageRange', { start: pageStart + 1, end: pageEnd, count: filtered.length })}</span>
                <span>{t('entriesPage', { page: currentPage, total: totalPages })}</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-between">
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className={`${chipBtnCls} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200/85 disabled:hover:text-slate-600 dark:disabled:hover:border-white/10 dark:disabled:hover:text-slate-300`}
                >
                  {t('entriesPagePrev')}
                </button>
                <div className="flex flex-wrap items-center justify-center gap-1">
                  {visiblePageNumbers.map((item, index) => (
                    item === 'ellipsis' ? (
                      <span
                        key={`ellipsis-${index}`}
                        className="inline-flex h-10 min-w-8 items-center justify-center px-1 text-xs text-slate-400"
                        aria-hidden="true"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        onClick={() => goToPage(item)}
                        aria-current={item === currentPage ? 'page' : undefined}
                        aria-label={t('entriesPage', { page: item, total: totalPages })}
                        className={item === currentPage
                          ? 'inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-[#b9d4ff] bg-[#eef5ff] px-3 text-xs font-semibold text-[#245ec6] shadow-[0_12px_22px_-18px_rgba(49,130,246,0.35)] dark:border-sky-400/25 dark:bg-sky-500/10 dark:text-sky-200'
                          : `${chipBtnCls} min-w-10 px-3`}
                      >
                        {item}
                      </button>
                    )
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className={`${chipBtnCls} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200/85 disabled:hover:text-slate-600 dark:disabled:hover:border-white/10 dark:disabled:hover:text-slate-300`}
                >
                  {t('entriesPageNext')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
