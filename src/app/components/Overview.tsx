'use client'
import { useMemo, useEffect, useRef } from 'react'
import { Entry, CAT_COLORS, getCurrencySymbol, formatAmount } from '../types'
import { useSettings } from '../useSettings'
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

interface Props { entries: Entry[]; month: string }

export default function Overview({ entries, month }: Props) {
  const catChartRef = useRef<HTMLCanvasElement>(null)
  const locChartRef = useRef<HTMLCanvasElement>(null)
  const catChartInstance = useRef<Chart | null>(null)
  const locChartInstance = useRef<Chart | null>(null)
  const { activeContext, convert } = useSettings()

  const cur = activeContext?.currency || 'USD'
  const homeCur = activeContext?.homeCurrency || cur
  const showConversion = cur !== homeCur
  const sym = getCurrencySymbol(cur)

  const monthEntries = useMemo(() =>
    entries.filter(e => e.date.startsWith(month) && e.context === activeContext?.id),
    [entries, month, activeContext])

  const expenses = useMemo(() =>
    monthEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0),
    [monthEntries])

  const income = useMemo(() =>
    monthEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0),
    [monthEntries])

  const net = income - expenses

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
      const loc = e.location.trim()
      locs[loc] = (locs[loc] || 0) + e.amount
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
        datasets: [{
          data: byCategory.map(([, v]) => parseFloat(v.toFixed(2))),
          backgroundColor: byCategory.map(([c]) => CAT_COLORS[c] || '#888'),
          borderRadius: 5,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
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
        datasets: [{
          data: byLocation.map(([, v]) => parseFloat(v.toFixed(2))),
          backgroundColor: '#BA7517',
          borderRadius: 5,
          borderSkipped: false,
        }]
      },
      options: {
        indexAxis: 'y' as const,
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${sym}${(ctx.raw as number).toLocaleString()}` } } },
        scales: {
          x: { grid: { color: 'rgba(128,128,128,0.1)' }, ticks: { callback: v => sym + Number(v).toLocaleString(), font: { size: 11 } } },
          y: { grid: { display: false }, ticks: { font: { size: 11 } } }
        }
      }
    })
    return () => { locChartInstance.current?.destroy() }
  }, [byLocation, sym])

  const fmt = (n: number) => formatAmount(Math.abs(n), cur)
  const fmtConverted = (n: number) =>
    showConversion ? ` (≈${formatAmount(convert(Math.abs(n), cur, homeCur), homeCur)})` : ''

  return (
    <div className="px-4 pb-8">
      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          { label: 'Expenses', value: fmt(expenses), sub: fmtConverted(expenses), color: 'text-red-600 dark:text-red-400' },
          { label: 'Income', value: fmt(income), sub: fmtConverted(income), color: 'text-green-700 dark:text-green-400' },
          { label: 'Net', value: (net < 0 ? '-' : '') + fmt(net), sub: fmtConverted(net), color: net < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400' },
        ].map(m => (
          <div key={m.label} className="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-3">
            <div className="text-xs text-zinc-500 mb-1">{m.label}</div>
            <div className={`text-sm font-medium ${m.color} leading-tight`}>{m.value}</div>
            {m.sub && <div className="text-xs text-zinc-400 mt-0.5 leading-tight">{m.sub}</div>}
          </div>
        ))}
      </div>

      {/* By category */}
      <div className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-3">By category</div>
      <div className="grid grid-cols-2 gap-2 mb-5">
        {byCategory.map(([cat, amt]) => {
          const pct = expenses > 0 ? ((amt / expenses) * 100).toFixed(1) : '0'
          const col = CAT_COLORS[cat] || '#888'
          return (
            <div key={cat} className="bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 py-2 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col }} />
                  <span className="text-sm text-zinc-800 dark:text-zinc-200">{cat}</span>
                </div>
                <div className="text-xs text-zinc-400 mt-0.5 pl-3.5">{pct}%</div>
              </div>
              <div className="text-xs font-medium text-zinc-800 dark:text-zinc-100 text-right">
                {formatAmount(amt, cur)}
              </div>
            </div>
          )
        })}
      </div>

      {/* Category chart */}
      {byCategory.length > 0 && (
        <>
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-3">Spending chart</div>
          <div className="relative w-full mb-6" style={{ height: 220 }}>
            <canvas ref={catChartRef} />
          </div>
        </>
      )}

      {/* By location */}
      {byLocation.length > 0 && (
        <>
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-3">By location</div>
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
                      <div className="h-full rounded-full bg-amber-500"
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100 flex-shrink-0 w-24 text-right">
                    {formatAmount(amt, cur)}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="relative w-full mb-6" style={{ height: Math.max(120, byLocation.length * 36) }}>
            <canvas ref={locChartRef} />
          </div>
        </>
      )}

      {monthEntries.length === 0 && (
        <div className="text-center text-zinc-400 py-12 text-sm">No entries for this month</div>
      )}
    </div>
  )
}
