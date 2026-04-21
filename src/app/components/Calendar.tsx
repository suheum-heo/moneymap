'use client'
import { useState, useMemo } from 'react'
import { Entry, CAT_COLORS, formatAmount } from '../types'
import { useSettings } from '../useSettings'

interface Props { entries: Entry[]; month: string }

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export default function Calendar({ entries, month }: Props) {
  const { activeContext } = useSettings()
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

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
  const daysInMonth = new Date(year, m, 0).getDate()
  const today = new Date().toISOString().slice(0, 10)

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${month}-${String(d).padStart(2, '0')}`)
  }

  const selectedEntries = useMemo(() =>
    selectedDay ? monthEntries.filter(e => e.date === selectedDay).sort((a, b) => a.type.localeCompare(b.type)) : [],
    [selectedDay, monthEntries])

  const selectedExpense = selectedEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const selectedIncome = selectedEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)

  const maxExpense = Math.max(...Object.values(dayTotals).map(d => d.expense), 1)

  return (
    <div className="px-4 pb-8">
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
              className={`relative aspect-square rounded-lg flex flex-col items-center justify-center transition-all ${
                isSelected ? 'ring-2 ring-amber-500' : ''
              } ${isToday ? 'font-bold' : ''}`}
              style={{
                background: hasData
                  ? `rgba(186, 117, 23, ${0.1 + intensity * 0.4})`
                  : 'transparent',
                border: isToday ? '1.5px solid #BA7517' : '1px solid transparent',
              }}>
              <span className={`text-xs md:text-base ${isToday ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-600 dark:text-zinc-400'}`}>
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
                    <div key={e.id} className="flex items-center gap-3 rounded-xl px-3 py-2"
                      style={{ background: col + '14', borderLeft: `3px solid ${col}` }}>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-zinc-800 dark:text-zinc-100 truncate font-medium">{e.summary}</div>
                        {e.venue && <div className="text-xs text-zinc-400 truncate">{e.venue}{e.location ? ` · ${e.location}` : ''}</div>}
                        <span className="inline-block text-xs px-2 py-0.5 rounded-full mt-0.5"
                          style={{ background: col + '25', color: col }}>{e.category}</span>
                      </div>
                      <div className="text-sm font-medium flex-shrink-0" style={{ color: col }}>
                        {e.type === 'income' ? '+' : '-'}{formatAmount(e.amount, e.currency || cur)}
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
