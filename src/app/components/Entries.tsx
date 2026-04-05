'use client'
import { useState, useMemo } from 'react'
import { Entry, CAT_COLORS, getCurrencySymbol, formatAmount } from '../types'
import { useSettings } from '../useSettings'

interface Props { entries: Entry[]; month: string; onDelete: (id: string) => void }

export default function Entries({ entries, month, onDelete }: Props) {
  const [typeFilter, setTypeFilter] = useState('all')
  const [catFilter, setCatFilter] = useState('all')
  const { activeContext, convert } = useSettings()

  const cur = activeContext?.currency || 'USD'
  const homeCur = activeContext?.homeCurrency || cur
  const showConversion = cur !== homeCur
  const sym = getCurrencySymbol(cur)
  const homeSym = getCurrencySymbol(homeCur)

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

  const [confirmId, setConfirmId] = useState<string | null>(null)

  const selCls = "text-sm px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"

  return (
    <div className="px-4 pb-8">
      <div className="flex gap-2 mb-4 flex-wrap">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={selCls}>
          <option value="all">All types</option>
          <option value="expense">Expenses</option>
          <option value="income">Income</option>
        </select>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className={selCls}>
          <option value="all">All categories</option>
          {allCats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-zinc-400 py-12 text-sm">No entries found</div>
      ) : (
        <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
          {filtered.map(e => {
            const col = CAT_COLORS[e.category] || '#888'
            const isIncome = e.type === 'income'
            const entrySym = getCurrencySymbol(e.currency || cur)
            const converted = showConversion ? convert(e.amount, cur, homeCur) : null
            return (
              <div key={e.id} className="py-3 flex items-start gap-3">
                <div className="text-xs text-zinc-400 pt-0.5 w-12 flex-shrink-0">{e.date.slice(5)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-zinc-800 dark:text-zinc-100 leading-snug truncate">{e.summary}</div>
                  {e.venue && <div className="text-xs text-zinc-400 mt-0.5 truncate">{e.venue}{e.location ? ` · ${e.location}` : ''}</div>}
                  {e.remarks && <div className="text-xs text-zinc-400 truncate">{e.remarks}</div>}
                  <span className="inline-block text-xs px-2 py-0.5 rounded-full mt-1" style={{ background: col + '22', color: col }}>{e.category}</span>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <div className={`text-sm font-medium ${isIncome ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {isIncome ? '+' : '-'}{formatAmount(e.amount, e.currency || cur)}
                  </div>
                  {converted !== null && (
                    <div className="text-xs text-zinc-400">≈{formatAmount(converted, homeCur)}</div>
                  )}
                  {confirmId === e.id ? (
                    <div className="flex gap-1 mt-1">
                      <button onClick={() => { onDelete(e.id); setConfirmId(null) }} className="text-xs text-red-500 border border-red-300 rounded px-1.5 py-0.5">Delete</button>
                      <button onClick={() => setConfirmId(null)} className="text-xs text-zinc-400 border border-zinc-300 dark:border-zinc-600 rounded px-1.5 py-0.5">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmId(e.id)} className="text-xs text-zinc-300 dark:text-zinc-600 hover:text-red-400">✕</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
