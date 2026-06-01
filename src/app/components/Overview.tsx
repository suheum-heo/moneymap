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
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  const chartGridColor = isDark ? 'rgba(148,163,184,0.16)' : 'rgba(191,201,212,0.55)'
  const chartTextColor = isDark ? '#94a3b8' : '#6b7684'

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
        datasets: [{ data: byCategory.map(([, v]) => parseFloat(v.toFixed(2))), backgroundColor: byCategory.map(([c]) => CAT_COLORS[c] || '#888'), borderRadius: 10, borderSkipped: false }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${sym}${(ctx.raw as number).toLocaleString()}` } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: chartTextColor, font: { size: 11 }, maxRotation: 40, autoSkip: false } },
          y: { grid: { color: chartGridColor }, ticks: { color: chartTextColor, callback: v => sym + Number(v).toLocaleString(), font: { size: 11 } } }
        }
      }
    })
    return () => { catChartInstance.current?.destroy() }
  }, [byCategory, chartGridColor, chartTextColor, sym])

  useEffect(() => {
    if (!locChartRef.current || byLocation.length === 0) return
    if (locChartInstance.current) locChartInstance.current.destroy()
    locChartInstance.current = new Chart(locChartRef.current, {
      type: 'bar',
      data: {
        labels: byLocation.map(([l]) => l),
        datasets: [{ data: byLocation.map(([, v]) => parseFloat(v.toFixed(2))), backgroundColor: '#3182f6', borderRadius: 10, borderSkipped: false }]
      },
      options: {
        indexAxis: 'y' as const, responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${sym}${(ctx.raw as number).toLocaleString()}` } } },
        scales: {
          x: { grid: { color: chartGridColor }, ticks: { color: chartTextColor, callback: v => sym + Number(v).toLocaleString(), font: { size: 11 } } },
          y: { grid: { display: false }, ticks: { color: chartTextColor, font: { size: 11 } } }
        }
      }
    })
    return () => { locChartInstance.current?.destroy() }
  }, [byLocation, chartGridColor, chartTextColor, sym])

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
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: t('expenses'), value: fmt(expenses), sub: fmtHome(expensesHome), color: 'text-rose-500 dark:text-rose-300', filter: 'expense' },
          { label: t('income'), value: fmt(income), sub: fmtHome(incomeHome), color: 'text-emerald-600 dark:text-emerald-300', filter: 'income' },
          { label: t('net'), value: (net < 0 ? '-' : '') + fmt(net), sub: fmtHome(netHome), color: net < 0 ? 'text-rose-500 dark:text-rose-300' : 'text-[#3182f6] dark:text-sky-300', filter: 'all' },
        ].map(m => (
          <button
            key={m.label}
            onClick={() => onNavigate('entries', m.filter)}
            className="app-panel flex flex-col items-start gap-3 p-6 text-left transition-transform hover:-translate-y-0.5"
          >
            <span className="app-kicker">{m.label}</span>
            <span className={`text-[1.9rem] font-semibold tracking-tight sm:text-[2.1rem] ${m.color}`}>{m.value}</span>
            {m.sub && <span className="text-sm text-slate-400">{m.sub}</span>}
          </button>
        ))}
      </div>

      {lastMonthExpenses > 0 && (
        <div className="app-panel mt-4 px-4 py-4 sm:px-5">
          <div className="app-kicker mb-3">{t('vsLastMonth')}</div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-500 dark:text-zinc-300">{t('vsLastMonth')}</span>
              <span className={expenses <= lastMonthExpenses ? 'font-medium text-emerald-600 dark:text-emerald-300' : 'font-medium text-rose-500 dark:text-rose-300'}>
                {expenses <= lastMonthExpenses ? '▼' : '▲'} {fmt(Math.abs(expenses - lastMonthExpenses))} {expenses <= lastMonthExpenses ? t('less') : t('more')}
              </span>
            </div>
            {isCurrentMonth && sameDayLastMonth > 0 && (
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500 dark:text-zinc-300">{t('vsSameDay')}</span>
                <span className={expenses <= sameDayLastMonth ? 'font-medium text-emerald-600 dark:text-emerald-300' : 'font-medium text-rose-500 dark:text-rose-300'}>
                  {expenses <= sameDayLastMonth ? '▼' : '▲'} {fmt(Math.abs(expenses - sameDayLastMonth))} {expenses <= sameDayLastMonth ? t('less') : t('more')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {monthEntries.length === 0 && (
        <div className="app-panel mt-6 py-14 text-center text-sm text-slate-400">{t('noEntries')}</div>
      )}

      {monthEntries.length > 0 && (
        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.95fr)]">
          <div className="app-panel p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="app-kicker mb-2">{t('byCategory')}</div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-zinc-50">{t('expenses')}</h3>
              </div>
              <div className="text-right text-xs text-slate-400">{byCategory.length} {byCategory.length === 1 ? 'category' : 'categories'}</div>
            </div>

            <div className="space-y-3">
              {catRows.map((row, rowIdx) => {
                const expandedInRow = row.find(([cat]) => cat === expandedCat)
                return (
                  <div key={rowIdx} className="space-y-2">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {row.map(([cat, amt]) => {
                        const pct = expenses > 0 ? ((amt / expenses) * 100).toFixed(1) : '0'
                        const col = CAT_COLORS[cat] || '#888'
                        const budget = activeContext ? getBudget(activeContext.id, cat) : null
                        const budgetPct = budget ? (amt / budget) * 100 : null
                        const isWarning = budgetPct !== null && budgetPct >= 80 && budgetPct < 100
                        const isDanger = budgetPct !== null && budgetPct >= 100
                        const isExpanded = expandedCat === cat
                        return (
                          <button
                            key={cat}
                            onClick={() => setExpandedCat(isExpanded ? null : cat)}
                            className="app-list-row text-left transition-transform hover:-translate-y-0.5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: col }} />
                                  <span className="truncate text-sm font-medium text-slate-800 dark:text-zinc-100">{cat}</span>
                                  {isDanger && <span className="text-xs font-medium text-rose-500 dark:text-rose-300">Over!</span>}
                                  {isWarning && <span className="text-xs font-medium text-amber-500">80%</span>}
                                </div>
                                <div className="mt-2 text-xs text-slate-400">{pct}% of spending</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-slate-900 dark:text-zinc-50">{formatAmount(amt, cur)}</div>
                                {budget && <div className="mt-1 text-xs text-slate-400">/ {formatAmount(budget, cur)}</div>}
                                <div className="mt-2 text-xs text-slate-400">{isExpanded ? '▲' : '▼'}</div>
                              </div>
                            </div>
                            {budget && (
                              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{ width: `${Math.min(budgetPct || 0, 100)}%`, background: isDanger ? '#e15854' : isWarning ? '#f59e0b' : col }}
                                />
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>

                    {expandedInRow && (() => {
                      const [cat, amt] = expandedInRow
                      const col = CAT_COLORS[cat] || '#888'
                      const catEntriesForCat = monthEntries.filter(e => e.type === 'expense' && e.category === cat).sort((a, b) => a.date.localeCompare(b.date))
                      return (
                        <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-3 py-3 dark:border-white/10 dark:bg-slate-950/50">
                          <div className="space-y-2">
                            {catEntriesForCat.map(e => (
                              <div
                                key={e.id}
                                className="app-list-row flex items-center gap-3 !rounded-[20px] !px-3 !py-3"
                              >
                                <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: col }} />
                                <div className="w-10 flex-shrink-0 text-xs text-slate-400">{e.date.slice(5)}</div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-medium text-slate-800 dark:text-zinc-100">{e.summary}</div>
                                  {e.venue && <div className="truncate text-xs text-slate-400">{e.venue}{e.location ? ` · ${e.location}` : ''}</div>}
                                </div>
                                <div className="flex-shrink-0 text-sm font-semibold" style={{ color: col }}>
                                  -{formatAmount(e.amount, e.currency || cur)}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="px-2 pt-3 text-xs text-slate-400">
                            {catEntriesForCat.length} {catEntriesForCat.length === 1 ? 'entry' : 'entries'} · total {formatAmount(amt, cur)}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )
              })}
            </div>
          </div>

          {byCategory.length > 0 && (
            <div className="app-panel p-5 sm:p-6">
              <div className="mb-4">
                <div className="app-kicker mb-2">{t('spendingChart')}</div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-zinc-50">{t('spendingChart')}</h3>
              </div>
              <div className="relative w-full" style={{ height: 280 }}>
                <canvas ref={catChartRef} />
              </div>
            </div>
          )}
        </div>
      )}

      {byLocation.length > 0 && (
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,1.05fr)]">
          <div className="app-panel p-5 sm:p-6">
            <div className="mb-4">
              <div className="app-kicker mb-2">{t('byLocation')}</div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{t('byLocation')}</h3>
            </div>
            <div className="space-y-3">
              {byLocation.map(([loc, amt]) => {
                const pct = expenses > 0 ? ((amt / expenses) * 100).toFixed(1) : '0'
                return (
                  <div key={loc} className="app-list-row">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium text-slate-800 dark:text-zinc-100">{loc}</span>
                      <span className="flex-shrink-0 text-xs text-slate-400">{pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
                      <div className="h-full rounded-full bg-[#3182f6]" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-3 text-right text-sm font-semibold text-slate-900 dark:text-zinc-50">{formatAmount(amt, cur)}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="app-panel p-5 sm:p-6">
              <div className="mb-4">
                <div className="app-kicker mb-2">{t('spendingChart')}</div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-zinc-50">{t('byLocation')}</h3>
              </div>
            <div className="relative w-full" style={{ height: Math.max(180, byLocation.length * 42) }}>
              <canvas ref={locChartRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
