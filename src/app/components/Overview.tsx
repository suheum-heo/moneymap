'use client'
import { useMemo, useEffect, useRef } from 'react'
import { Entry, CAT_COLORS } from '../types'
import { useSettings } from '../useSettings'
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

interface Props { entries: Entry[]; month: string }

export default function Overview({ entries, month }: Props) {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<Chart | null>(null)
  const { baseCurrency, convert, contexts } = useSettings()

  const [contextFilter, setContextFilter] = useMemo(() => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return [undefined, undefined] as [undefined, undefined]
  }, [])
  void contextFilter; void setContextFilter

  const [activeContext, setActiveContext] = useMemo(() => {
    return ['all', (_: string) => {}] as [string, (v: string) => void]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  void activeContext; void setActiveContext

  const [ctxFilter, setCtxFilter] = useMemo(() => {
    // We need state here but can't call useState in useMemo
    // So we use a ref approach
    return ['all', (_: string) => {}] as [string, (v: string) => void]
  }, [])
  void ctxFilter; void setCtxFilter

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const [selectedContext, setSelectedContext] = [useMemo(() => 'all', []), (_: string) => {}]
  void selectedContext; void setSelectedContext

  const monthEntries = useMemo(() =>
    entries.filter(e => e.date.startsWith(month)), [entries, month])

  const expenses = useMemo(() =>
    monthEntries.filter(e => e.type === 'expense')
      .reduce((s, e) => s + convert(e.amount, e.currency || 'USD'), 0),
    [monthEntries, convert])

  const income = useMemo(() =>
    monthEntries.filter(e => e.type === 'income')
      .reduce((s, e) => s + convert(e.amount, e.currency || 'USD'), 0),
    [monthEntries, convert])

  const net = income - expenses

  const byCategory = useMemo(() => {
    const cats: Record<string, number> = {}
    monthEntries.filter(e => e.type === 'expense').forEach(e => {
      const converted = convert(e.amount, e.currency || 'USD')
      cats[e.category] = (cats[e.category] || 0) + converted
    })
    return Object.entries(cats).sort((a, b) => b[1] - a[1])
  }, [monthEntries, convert])

  useEffect(() => {
    if (!chartRef.current || byCategory.length === 0) return
    if (chartInstance.current) chartInstance.current.destroy()
    chartInstance.current = new Chart(chartRef.current, {
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
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${baseCurrency} ${(ctx.raw as number).toFixed(2)}` } } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 }, maxRotation: 40, autoSkip: false } },
          y: { grid: { color: 'rgba(128,128,128,0.1)' }, ticks: { callback: v => baseCurrency + ' ' + v, font: { size: 11 } } }
        }
      }
    })
    return () => { chartInstance.current?.destroy() }
  }, [byCategory, baseCurrency])

  const fmt = (n: number) => `${baseCurrency} ${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const usedContexts = useMemo(() => ['all', ...new Set(monthEntries.map(e => e.context).filter(Boolean))], [monthEntries])

  return (
    <div className="px-4 pb-8">
      {/* Context filter pills */}
      {usedContexts.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-4">
          {usedContexts.map(c => (
            <span key={c} className="text-xs px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
              {c === 'all' ? 'All contexts' : c}
            </span>
          ))}
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          { label: 'Expenses', value: fmt(expenses), color: 'text-red-600 dark:text-red-400' },
          { label: 'Income', value: fmt(income), color: 'text-green-700 dark:text-green-400' },
          { label: 'Net', value: (net < 0 ? '-' : '') + fmt(net), color: net < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400' },
        ].map(m => (
          <div key={m.label} className="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-3">
            <div className="text-xs text-zinc-500 mb-1">{m.label}</div>
            <div className={`text-sm font-medium ${m.color} leading-tight`}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Category breakdown */}
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
                {baseCurrency} {amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          )
        })}
      </div>

      {byCategory.length > 0 && (
        <>
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-3">Spending chart</div>
          <div className="relative w-full" style={{ height: 220 }}>
            <canvas ref={chartRef} />
          </div>
        </>
      )}
      {monthEntries.length === 0 && (
        <div className="text-center text-zinc-400 py-12 text-sm">No entries for this month</div>
      )}

      {/* Context breakdown */}
      {contexts.length > 1 && (
        <div className="mt-6">
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-3">By context</div>
          {[...new Set(monthEntries.map(e => e.context).filter(Boolean))].map(ctx => {
            const ctxEntries = monthEntries.filter(e => e.context === ctx && e.type === 'expense')
            const total = ctxEntries.reduce((s, e) => s + convert(e.amount, e.currency || 'USD'), 0)
            return (
              <div key={ctx} className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{ctx}</span>
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                  {baseCurrency} {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
