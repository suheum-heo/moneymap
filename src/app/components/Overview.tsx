'use client'
import { useMemo, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Entry, CAT_COLORS, getCurrencySymbol, formatAmount } from '../types'
import { useSettings } from '../useSettings'
import { useBudgets } from '../useBudgets'
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

interface Props {
  entries: Entry[]
  month: string
  onNavigate: (tab: string, filter?: string) => void
}

export default function Overview({ entries, month, onNavigate }: Props) {
  const { t } = useTranslation()
  const catChartRef = useRef<HTMLCanvasElement>(null)
  const locChartRef = useRef<HTMLCanvasElement>(null)
  const catChartInstance = useRef<Chart | null>(null)
  const locChartInstance = useRef<Chart | null>(null)
  const { activeContext, convert } = useSettings()
  const { getBudget } = useBudgets()
  const [expandedCat, setExpandedCat] = useState<string | null>(null)

  const cur = activeContext?.currency || 'USD'
  const homeCur = activeContext?.homeCurrency || cur
  const showConversion = cur !== homeCur
  const sym = getCurrencySymbol(cur)

  const monthEntries = useMemo(() =>
    entries.filter(e => e.date.startsWith(month) && e.context === activeContext?.id),
    [entries, month, activeContext])

  // Sum in local currency (cur) for display
  const expenses = useMemo(() =>
    monthEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0),
    [monthEntries])

  const income = useMemo(() =>
    monthEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0),
    [monthEntries])

  const net = income - expenses

  // Sum in home currency: use homeAmount if set, otherwise convert via live rate
  const toHome = (e: Entry) => e.homeAmount ?? convert(e.amount, cur, homeCur)

  const expensesHome = useMemo(() =>
    monthEntries.filter(e => e.type === 'expense').reduce((s, e) => s + toHome(e), 0),
    [monthEntries, showConversion])

  const incomeHome = useMemo(() =>
    monthEntries.filter(e => e.type === 'income').reduce((s, e) => s + toHome(e), 0),
    [monthEntries, showConversion])

  const netHome = incomeHome - expensesHome

  const lastMonth = useMemo(() => {
    const [y, m] = month.split('-').map(Number)
    return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
  }, [month])

  const lastMonthEntries = useMemo(() =>
    entries.filter(e => e.date.startsWith(lastMonth) && e.context === activeContext?.id),
    [entries, lastMonth, activeContext])

  const lastMonthExpenses = useMemo(() =>
    lastMonthEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0),
    [lastMonthEntries])

  const sameDayLastMonth = useMemo(() => {
    const today = new Date()
    const cutoff = `${lastMonth}-${String(today.getDate()).padStart(2, '0')}`
    return lastMonthEntries.filter(e => e.type === 'expense' && e.date <= cutoff).reduce((s, e) => s + e.amount, 0)
  }, [lastMonthEntries, lastMonth])

  const isCurrentMonth = useMemo(() => {
    const now = new Date()
    return month === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [month])

  const byCategory = useMemo(() => {
    const cats: Record<string, number> = {}
    monthEntries.filter(e => e.type === 'expense').forEach(e => {
      cats[e.category] = (cats[e.category] || 0) + e.amount
    })
    return Object.entries(cats).sort((a, b) => b[1] - a[1])
  }, [monthEntries])

  const byLocation = useMemo(() => {
    const locs: Record<string, number> = {}
    monthEntries.filter(e => e.type === 'expense' && e.location?.trim()).forEach(e => {
      locs[e.location.trim()] = (locs[e.location.trim()] || 0) + e.amount
    })
    return Object.entries(locs).sort((a, b) => b[1] - a[1])
  }, [monthEntries])

  useEffect(() => {
    if (!catChartRef.current || byCategory.length === 0) return
    if (catChartInstance.current) catChartInstance.current.destroy()
    catChartInstance.current = new Chart(catChartRef.current, {
      type: 'bar',
      data: {
        labels: byCategory.map(([c]) => c),
        datasets: [{ data: byCategory.map(([, v]) => parseFloat(v.toFixed(2))), backgroundColor: byCategory.map(([c]) => CAT_COLORS[c] || '#888'), borderRadius: 5, borderSkipped: false }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${sym}${(ctx.raw as number).toLocaleString()}` } } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 }, maxRotation: 40, autoSkip: false } },
          y: { grid: { color: 'rgba(128,128,128,0.1)' }, ticks: { callback: v => sym + Number(v).toLocaleString(), font: { size: 11 } } }
        }
      }
    })
    return () => { catChartInstance.current?.destroy() }
  }, [byCategory, sym])

  useEffect(() => {
    if (!locChartRef.current || byLocation.length === 0) return
    if (locChartInstance.current) locChartInstance.current.destroy()
    locChartInstance.current = new Chart(locChartRef.current, {
      type: 'bar',
      data: {
        labels: byLocation.map(([l]) => l),
        datasets: [{ data: byLocation.map(([, v]) => parseFloat(v.toFixed(2))), backgroundColor: '#BA7517', borderRadius: 5, borderSkipped: false }]
      },
      options: {
        indexAxis: 'y' as const, responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${sym}${(ctx.raw as number).toLocaleString()}` } } },
        scales: {
          x: { grid: { color: 'rgba(128,128,128,0.1)' }, ticks: { callback: v => sym + Number(v).toLocaleString(), font: { size: 11 } } },
          y: { grid: { display: false }, ticks: { font: { size: 11 } } }
        }
      }
    })
    return () => { locChartInstance.current?.destroy() }
  }, [byLocation, sym])

  // Big number = local cur, small grey = home cur equivalent
  const fmt = (n: number) => formatAmount(Math.abs(n), cur)
  const fmtHome = (n: number) => showConversion ? `(≈${formatAmount(Math.abs(n), homeCur)})` : ''

  const catRows = useMemo(() => {
    const rows = []
    for (let i = 0; i < byCategory.length; i += 2) rows.push(byCategory.slice(i, i + 2))
    return rows
  }, [byCategory])

  return (
    <div className="px-4 pb-8">
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          { label: t('expenses'), value: fmt(expenses), sub: fmtHome(expensesHome), color: 'text-red-600 dark:text-red-400', filter: 'expense' },
          { label: t('income'),   value: fmt(income),   sub: fmtHome(incomeHome),   color: 'text-green-700 dark:text-green-400', filter: 'income' },
          { label: t('net'),      value: (net < 0 ? '-' : '') + fmt(net), sub: fmtHome(netHome), color: net < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400', filter: 'all' },
        ].map(m => (
          <div key={m.label} onClick={() => onNavigate('entries', m.filter)}
            className="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-3 cursor-pointer hover:ring-1 hover:ring-amber-400 transition-all">
            <div className="text-xs text-zinc-500 mb-1">{m.label}</div>
            <div className={`text-sm font-medium ${m.color} leading-tight`}>{m.value}</div>
            {m.sub && <div className="text-xs text-zinc-400 mt-0.5 leading-tight">{m.sub}</div>}
          </div>
        ))}
      </div>

      {lastMonthExpenses > 0 && (
        <div className="mb-5 bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 py-2.5 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">{t('vsLastMonth')}</span>
            <span className={expenses <= lastMonthExpenses ? 'text-green-600 dark:text-green-400 font-medium' : 'text-red-500 font-medium'}>
              {expenses <= lastMonthExpenses ? '▼' : '▲'} {fmt(Math.abs(expenses - lastMonthExpenses))} {expenses <= lastMonthExpenses ? t('less') : t('more')}
            </span>
          </div>
          {isCurrentMonth && sameDayLastMonth > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">{t('vsSameDay')}</span>
              <span className={expenses <= sameDayLastMonth ? 'text-green-600 dark:text-green-400 font-medium' : 'text-red-500 font-medium'}>
                {expenses <= sameDayLastMonth ? '▼' : '▲'} {fmt(Math.abs(expenses - sameDayLastMonth))} {expenses <= sameDayLastMonth ? t('less') : t('more')}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-3">{t('byCategory')}</div>
      <div className="mb-5">
        {catRows.map((row, rowIdx) => {
          const expandedInRow = row.find(([cat]) => cat === expandedCat)
          return (
            <div key={rowIdx} className="mb-2">
              <div className="grid grid-cols-2 gap-2">
                {row.map(([cat, amt]) => {
                  const pct = expenses > 0 ? ((amt / expenses) * 100).toFixed(1) : '0'
                  const col = CAT_COLORS[cat] || '#888'
                  const budget = activeContext ? getBudget(activeContext.id, cat) : null
                  const budgetPct = budget ? (amt / budget) * 100 : null
                  const isWarning = budgetPct !== null && budgetPct >= 80 && budgetPct < 100
                  const isDanger = budgetPct !== null && budgetPct >= 100
                  const isExpanded = expandedCat === cat
                  return (
                    <div key={cat} onClick={() => setExpandedCat(isExpanded ? null : cat)}
                      className="bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 py-2 cursor-pointer hover:ring-1 hover:ring-amber-300 transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col }} />
                            <span className="text-sm text-zinc-800 dark:text-zinc-200">{cat}</span>
                            {isDanger && <span className="text-xs text-red-500">Over!</span>}
                            {isWarning && <span className="text-xs text-amber-500">80%</span>}
                          </div>
                          <div className="text-xs text-zinc-400 mt-0.5 pl-3.5">{pct}%</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-medium text-zinc-800 dark:text-zinc-100">{formatAmount(amt, cur)}</div>
                          {budget && <div className="text-xs text-zinc-400">/ {formatAmount(budget, cur)}</div>}
                          <div className="text-zinc-400 text-xs mt-0.5">{isExpanded ? '▲' : '▼'}</div>
                        </div>
                      </div>
                      {budget && (
                        <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden mt-1.5">
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${Math.min(budgetPct || 0, 100)}%`, background: isDanger ? '#E24B4A' : isWarning ? '#BA7517' : col }} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {expandedInRow && (() => {
                const [cat, amt] = expandedInRow
                const col = CAT_COLORS[cat] || '#888'
                const catEntriesForCat = monthEntries.filter(e => e.type === 'expense' && e.category === cat).sort((a, b) => a.date.localeCompare(b.date))
                return (
                  <div className="mt-1.5 flex flex-col gap-1">
                    {catEntriesForCat.map(e => (
                      <div key={e.id} className="flex items-center gap-3 rounded-xl px-3 py-2"
                        style={{ background: col + '12', borderLeft: `2px solid ${col}` }}>
                        <div className="text-xs text-zinc-400 w-10 flex-shrink-0">{e.date.slice(5)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-zinc-800 dark:text-zinc-100 truncate">{e.summary}</div>
                          {e.venue && <div className="text-xs text-zinc-400 truncate">{e.venue}{e.location ? ` · ${e.location}` : ''}</div>}
                        </div>
                        <div className="text-sm font-medium flex-shrink-0" style={{ color: col }}>
                          -{formatAmount(e.amount, e.currency || cur)}
                        </div>
                      </div>
                    ))}
                    <div className="text-xs text-zinc-400 px-3 pb-1">
                      {catEntriesForCat.length} {catEntriesForCat.length === 1 ? 'entry' : 'entries'} · total {formatAmount(amt, cur)}
                    </div>
                  </div>
                )
              })()}
            </div>
          )
        })}
      </div>

      {byCategory.length > 0 && (
        <>
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-3">{t('spendingChart')}</div>
          <div className="relative w-full mb-6" style={{ height: 220 }}><canvas ref={catChartRef} /></div>
        </>
      )}

      {byLocation.length > 0 && (
        <>
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-3">{t('byLocation')}</div>
          <div className="flex flex-col gap-1.5 mb-4">
            {byLocation.map(([loc, amt]) => {
              const pct = expenses > 0 ? ((amt / expenses) * 100).toFixed(1) : '0'
              return (
                <div key={loc} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">{loc}</span>
                      <span className="text-xs text-zinc-400 ml-2 flex-shrink-0">{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div className="h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100 flex-shrink-0 w-24 text-right">{formatAmount(amt, cur)}</div>
                </div>
              )
            })}
          </div>
          <div className="relative w-full mb-6" style={{ height: Math.max(120, byLocation.length * 36) }}><canvas ref={locChartRef} /></div>
        </>
      )}

      {monthEntries.length === 0 && (
        <div className="text-center text-zinc-400 py-12 text-sm">{t('noEntries')}</div>
      )}
    </div>
  )
}
