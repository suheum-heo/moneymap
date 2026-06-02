'use client'
import { useMemo, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Entry,
  Context,
  EntrySortOrder,
  formatAmount,
  formatEntryDate,
  getCategoryColor,
  getEntryCurrency,
  sortEntriesForDisplay,
} from '../types'
import EntryEditModal from './EntryEditModal'
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

interface Props {
  entries: Entry[]
  month: string
  onNavigate: (tab: string, filter?: string, categoryFilter?: string) => void
  onUpdate: (entry: Entry) => void
  sortOrder: EntrySortOrder
  activeContext?: Context
  convert: (amount: number, from: string, to: string) => number
  getBudget: (context: string, category: string) => number | null
  expenseCategories: string[]
  incomeCategories: string[]
}

function softenColor(hex: string, mix = 0.16, alpha = 0.88) {
  const raw = hex.replace('#', '')
  if (raw.length !== 3 && raw.length !== 6) return hex
  const full = raw.length === 3 ? raw.split('').map(char => char + char).join('') : raw
  const channels = [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16))
  const softened = channels.map(channel => Math.round(channel + (255 - channel) * mix))
  return `rgba(${softened[0]}, ${softened[1]}, ${softened[2]}, ${alpha})`
}

export default function Overview({ entries, month, onNavigate, onUpdate, sortOrder, activeContext, convert, getBudget, expenseCategories, incomeCategories }: Props) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage || i18n.language
  const catChartRef = useRef<HTMLCanvasElement>(null)
  const locChartRef = useRef<HTMLCanvasElement>(null)
  const catChartInstance = useRef<Chart | null>(null)
  const locChartInstance = useRef<Chart | null>(null)
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [expandedLocation, setExpandedLocation] = useState<string | null>(null)
  const [editEntry, setEditEntry] = useState<Entry | null>(null)

  const cur = activeContext?.currency || 'USD'
  const homeCur = activeContext?.homeCurrency || cur
  const showConversion = cur !== homeCur
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  const chartGridColor = isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.62)'
  const chartTextColor = isDark ? '#95a2b3' : '#7b8794'
  const accentBarColor = isDark ? 'rgba(112, 167, 250, 0.8)' : 'rgba(91, 142, 240, 0.86)'
  const tooltipBackground = isDark ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.97)'
  const tooltipBorder = isDark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(203, 213, 225, 0.9)'
  const tooltipTitle = isDark ? '#f8fafc' : '#0f172a'
  const tooltipBody = isDark ? '#dbe4ef' : '#334155'

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
  const toHome = (e: Entry) => e.homeAmount ?? convert(e.amount, getEntryCurrency(e, cur, homeCur), homeCur)

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

  const locationEntries = useMemo(() => {
    if (!expandedLocation) return []
    return sortEntriesForDisplay(
      monthEntries.filter(e => e.type === 'expense' && e.location?.trim() === expandedLocation),
      sortOrder,
    )
  }, [expandedLocation, monthEntries, sortOrder])

  useEffect(() => {
    if (expandedLocation && !byLocation.some(([loc]) => loc === expandedLocation)) {
      setExpandedLocation(null)
    }
  }, [byLocation, expandedLocation])

  useEffect(() => {
    if (!catChartRef.current || byCategory.length === 0) return
    if (catChartInstance.current) catChartInstance.current.destroy()
    catChartInstance.current = new Chart(catChartRef.current, {
      type: 'bar',
      data: {
        labels: byCategory.map(([c]) => c),
        datasets: [{
          data: byCategory.map(([, v]) => parseFloat(v.toFixed(2))),
          backgroundColor: byCategory.map(([c]) => softenColor(getCategoryColor(c, 'expense'), isDark ? 0.08 : 0.16, isDark ? 0.78 : 0.9)),
          borderRadius: 12,
          borderSkipped: false,
          maxBarThickness: 26,
          categoryPercentage: 0.74,
          barPercentage: 0.88,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: tooltipBackground,
            borderColor: tooltipBorder,
            borderWidth: 1,
            displayColors: false,
            cornerRadius: 14,
            padding: 12,
            titleColor: tooltipTitle,
            bodyColor: tooltipBody,
            callbacks: { label: ctx => ` ${formatAmount(ctx.raw as number, cur)}` }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: chartTextColor, font: { size: 11, weight: 500 }, maxRotation: 32, autoSkipPadding: 12 }
          },
          y: {
            grid: { color: chartGridColor, drawTicks: false },
            border: { display: false },
            ticks: { color: chartTextColor, callback: v => formatAmount(Number(v), cur), font: { size: 11, weight: 500 }, padding: 8 }
          }
        }
      }
    })
    return () => { catChartInstance.current?.destroy() }
  }, [byCategory, chartGridColor, chartTextColor, cur])

  useEffect(() => {
    if (!locChartRef.current || byLocation.length === 0) return
    if (locChartInstance.current) locChartInstance.current.destroy()
    locChartInstance.current = new Chart(locChartRef.current, {
      type: 'bar',
      data: {
        labels: byLocation.map(([l]) => l),
        datasets: [{
          data: byLocation.map(([, v]) => parseFloat(v.toFixed(2))),
          backgroundColor: accentBarColor,
          borderRadius: 12,
          borderSkipped: false,
          maxBarThickness: 20,
          categoryPercentage: 0.76,
          barPercentage: 0.88,
        }]
      },
      options: {
        indexAxis: 'y' as const, responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: tooltipBackground,
            borderColor: tooltipBorder,
            borderWidth: 1,
            displayColors: false,
            cornerRadius: 14,
            padding: 12,
            titleColor: tooltipTitle,
            bodyColor: tooltipBody,
            callbacks: { label: ctx => ` ${formatAmount(ctx.raw as number, cur)}` }
          }
        },
        scales: {
          x: {
            grid: { color: chartGridColor, drawTicks: false },
            border: { display: false },
            ticks: { color: chartTextColor, callback: v => formatAmount(Number(v), cur), font: { size: 11, weight: 500 }, padding: 8 }
          },
          y: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: chartTextColor, font: { size: 11, weight: 500 } }
          }
        }
      }
    })
    return () => { locChartInstance.current?.destroy() }
  }, [byLocation, chartGridColor, chartTextColor, cur])

  // Big number = local cur, small grey = home cur equivalent
  const fmt = (n: number) => formatAmount(Math.abs(n), cur)
  const fmtHome = (n: number) => showConversion ? `(≈${formatAmount(Math.abs(n), homeCur)})` : ''

  const catRows = useMemo(() => {
    const rows = []
    for (let i = 0; i < byCategory.length; i += 2) rows.push(byCategory.slice(i, i + 2))
    return rows
  }, [byCategory])

  return (
    <div className="px-4 pb-6">
      <EntryEditModal
        entry={editEntry}
        entries={entries}
        activeContext={activeContext}
        expenseCategories={expenseCategories}
        incomeCategories={incomeCategories}
        onClose={() => setEditEntry(null)}
        onUpdate={onUpdate}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: t('expenses'), value: fmt(expenses), sub: fmtHome(expensesHome), color: 'app-negative', filter: 'expense' },
          { label: t('income'), value: fmt(income), sub: fmtHome(incomeHome), color: 'app-positive', filter: 'income' },
          { label: t('net'), value: (net < 0 ? '-' : '') + fmt(net), sub: fmtHome(netHome), color: net < 0 ? 'app-negative' : 'app-accent', filter: 'all' },
        ].map(m => (
          <button
            key={m.label}
            onClick={() => onNavigate('entries', m.filter)}
            className="app-panel flex flex-col items-start gap-2.5 p-5 text-left transition-transform hover:-translate-y-0.5"
          >
            <span className="app-kicker">{m.label}</span>
            <span className={`whitespace-nowrap text-[1.58rem] font-semibold tracking-tight sm:text-[1.72rem] xl:text-[1.82rem] ${m.color}`}>{m.value}</span>
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
              <span className={expenses <= lastMonthExpenses ? 'app-positive font-medium' : 'app-negative font-medium'}>
                {expenses <= lastMonthExpenses ? '▼' : '▲'} {fmt(Math.abs(expenses - lastMonthExpenses))} {expenses <= lastMonthExpenses ? t('less') : t('more')}
              </span>
            </div>
            {isCurrentMonth && sameDayLastMonth > 0 && (
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500 dark:text-zinc-300">{t('vsSameDay')}</span>
                <span className={expenses <= sameDayLastMonth ? 'app-positive font-medium' : 'app-negative font-medium'}>
                  {expenses <= sameDayLastMonth ? '▼' : '▲'} {fmt(Math.abs(expenses - sameDayLastMonth))} {expenses <= sameDayLastMonth ? t('less') : t('more')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {monthEntries.length === 0 && (
        <div className="app-panel mt-5 py-12 text-center text-sm text-slate-400">{t('noEntries')}</div>
      )}

      {monthEntries.length > 0 && (
        <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.95fr)]">
          <div className="app-panel p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="app-kicker mb-2">{t('byCategory')}</div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-zinc-50">{t('expenses')}</h3>
              </div>
              <div className="text-right text-xs text-slate-400">{t('categoryCount', { count: byCategory.length })}</div>
            </div>

            <div className="space-y-3">
              {catRows.map((row, rowIdx) => {
                const expandedInRow = row.find(([cat]) => cat === expandedCat)
                return (
                  <div key={rowIdx} className="space-y-2">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {row.map(([cat, amt]) => {
                        const pct = expenses > 0 ? ((amt / expenses) * 100).toFixed(1) : '0'
                        const col = getCategoryColor(cat, 'expense')
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
                                  {isDanger && <span className="app-negative text-xs font-medium">{t('overBudget')}</span>}
                                  {isWarning && <span className="text-xs font-medium text-amber-500">80%</span>}
                                </div>
                                <div className="mt-2 text-xs text-slate-400">{pct}%</div>
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
                                  style={{ width: `${Math.min(budgetPct || 0, 100)}%`, background: isDanger ? '#d97784' : isWarning ? '#e7ae4b' : softenColor(col, 0.12, 0.95) }}
                                />
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>

                    {expandedInRow && (() => {
                      const [cat, amt] = expandedInRow
                      const col = getCategoryColor(cat, 'expense')
                      const catEntriesForCat = sortEntriesForDisplay(
                        monthEntries.filter(e => e.type === 'expense' && e.category === cat),
                        sortOrder,
                      )
                      return (
                        <div className="rounded-[22px] border border-slate-200/75 bg-slate-50/75 px-3 py-3 dark:border-white/10 dark:bg-slate-950/50">
                          <div className="space-y-2">
                            {catEntriesForCat.map(e => {
                              const entryCurrency = getEntryCurrency(e, cur, homeCur)
                              return (
                                <button
                                  key={e.id}
                                  onClick={() => setEditEntry(e)}
                                  className="app-list-row flex w-full cursor-pointer items-center gap-3 !rounded-[20px] !px-3 !py-3 text-left transition-all hover:border-slate-300/85 hover:bg-white/92 dark:hover:border-white/15 dark:hover:bg-slate-900/80"
                                >
                                  <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: col }} />
                                  <div className="w-12 flex-shrink-0 text-xs text-slate-400">{formatEntryDate(e.date, language)}</div>
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-medium text-slate-800 dark:text-zinc-100">{e.summary}</div>
                                    {e.venue && <div className="truncate text-xs text-slate-400">{e.venue}{e.location ? ` · ${e.location}` : ''}</div>}
                                  </div>
                                  <div className="flex-shrink-0">
                                    <div className="text-sm font-semibold" style={{ color: col }}>
                                      -{formatAmount(e.amount, entryCurrency)}
                                    </div>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                          <div className="flex items-center justify-between gap-3 px-2 pt-3">
                            <div className="text-xs text-slate-400">
                              {t('entryCount', { count: catEntriesForCat.length })} · {t('total')} {formatAmount(amt, cur)}
                            </div>
                            <button
                              onClick={() => onNavigate('entries', 'expense', cat)}
                              className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#5b8ef0] transition-colors hover:text-[#255fcb] dark:text-sky-300 dark:hover:text-sky-200"
                            >
                              {t('viewAllInEntries')}
                            </button>
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
            <div className="app-panel p-4 sm:p-5">
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
        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,1.05fr)]">
          <div className="app-panel p-4 sm:p-5">
            <div className="mb-4">
              <div className="app-kicker mb-2">{t('byLocation')}</div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{t('byLocation')}</h3>
            </div>
            <div className="space-y-3">
              {byLocation.map(([loc, amt]) => {
                const pct = expenses > 0 ? ((amt / expenses) * 100).toFixed(1) : '0'
                const isExpanded = expandedLocation === loc
                return (
                  <div key={loc} className="space-y-2">
                    <button
                      onClick={() => setExpandedLocation(prev => prev === loc ? null : loc)}
                      className={`app-list-row w-full cursor-pointer text-left transition-all hover:-translate-y-0.5 hover:border-slate-300/80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#3182f6]/10 dark:hover:border-white/15 ${isExpanded ? 'border-[#d7e4fb] bg-[#f8fbff] shadow-[0_16px_28px_-24px_rgba(49,130,246,0.28)] dark:border-sky-400/15 dark:bg-slate-950/70' : ''}`}
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-800 dark:text-zinc-100">{loc}</div>
                          <div className="mt-1 text-xs text-slate-400">{pct}%</div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{isExpanded ? '▲' : '▼'}</div>
                        </div>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
                        <div className="h-full rounded-full bg-[#5b8ef0]" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="mt-3 text-right text-sm font-semibold text-slate-900 dark:text-zinc-50">{formatAmount(amt, cur)}</div>
                    </button>

                    {isExpanded && (
                      <div className="ml-3 rounded-[20px] border border-[#d7e4fb] bg-slate-50/90 px-3 py-3 shadow-[0_12px_22px_-24px_rgba(49,130,246,0.35)] dark:border-sky-400/15 dark:bg-slate-950/55">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="app-kicker mb-1">{loc}</div>
                            <div className="truncate text-sm font-medium text-slate-800 dark:text-zinc-100">
                              {t('entryCount', { count: locationEntries.length })}
                            </div>
                          </div>
                          <button
                            onClick={() => setExpandedLocation(null)}
                            className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-zinc-200"
                          >
                            {t('close')}
                          </button>
                        </div>

                        {locationEntries.length === 0 ? (
                          <div className="app-panel-soft py-5 text-center text-sm text-slate-400">{t('noEntriesForLocation')}</div>
                        ) : (
                          <div className="max-h-[400px] space-y-2 overflow-y-auto pr-1">
                            {locationEntries.map(e => {
                              const entryCurrency = getEntryCurrency(e, cur, homeCur)
                              const col = getCategoryColor(e.category, e.type)
                              return (
                                <button
                                  key={e.id}
                                  onClick={() => setEditEntry(e)}
                                  className="app-list-row flex w-full cursor-pointer items-start gap-3 !rounded-[18px] !px-3 !py-3 text-left transition-all hover:border-slate-300/85 hover:bg-white/92 dark:hover:border-white/15 dark:hover:bg-slate-900/80"
                                >
                                  <div className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: col }} />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <div className="truncate text-sm font-medium text-slate-800 dark:text-zinc-100">{e.summary}</div>
                                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                                          <span>{formatEntryDate(e.date, language)}</span>
                                          <span aria-hidden="true">·</span>
                                          <span className="truncate">{e.location}</span>
                                          {e.venue ? (
                                            <>
                                              <span aria-hidden="true">·</span>
                                              <span className="truncate">{e.venue}</span>
                                            </>
                                          ) : null}
                                        </div>
                                        {e.remarks && <div className="mt-1 truncate text-xs text-slate-400">{e.remarks}</div>}
                                      </div>
                                      <div className="flex-shrink-0 text-sm font-semibold" style={{ color: col }}>
                                        {e.type === 'income' ? '+' : '-'}{formatAmount(e.amount, entryCurrency)}
                                      </div>
                                    </div>
                                    <div className="mt-2">
                                      <span
                                        className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                                        style={{ background: softenColor(col, 0.18, 0.14), color: col }}
                                      >
                                        {e.category}
                                      </span>
                                    </div>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="app-panel p-4 sm:p-5">
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
